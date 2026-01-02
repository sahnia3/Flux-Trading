package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type symbolItem struct {
	Symbol      string `json:"symbol"`
	Description string `json:"description"`
	DisplaySym  string `json:"displaySymbol"`
	Type        string `json:"type"`
}

type symbolCacheItem struct {
	Data []symbolItem
	Exp  time.Time
}

var (
	symbolCache   symbolCacheItem
	symbolCacheMu sync.Mutex
)

// Symbols returns the US stock symbol list (cached) with optional ?q= filtering.
func Symbols() gin.HandlerFunc {
	apiKey := os.Getenv("FINNHUB_API_KEY")
	return func(c *gin.Context) {
		query := strings.ToUpper(strings.TrimSpace(c.Query("q")))

		symbolCacheMu.Lock()
		if len(symbolCache.Data) > 0 && time.Now().Before(symbolCache.Exp) {
			data := filterSymbols(symbolCache.Data, query)
			symbolCacheMu.Unlock()
			c.JSON(http.StatusOK, data)
			return
		}
		symbolCacheMu.Unlock()

		url := fmt.Sprintf("https://finnhub.io/api/v1/stock/symbol?exchange=US&token=%s", apiKey)
		req, _ := http.NewRequestWithContext(context.Background(), http.MethodGet, url, nil)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "upstream error"})
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode >= 300 {
			c.JSON(resp.StatusCode, gin.H{"error": "upstream error"})
			return
		}

		var items []symbolItem
		if err := json.NewDecoder(resp.Body).Decode(&items); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "decode error"})
			return
		}

		symbolCacheMu.Lock()
		symbolCache = symbolCacheItem{Data: items, Exp: time.Now().Add(24 * time.Hour)}
		symbolCacheMu.Unlock()

		c.JSON(http.StatusOK, filterSymbols(items, query))
	}
}

func filterSymbols(items []symbolItem, q string) []symbolItem {
	if q == "" {
		// return a trimmed set to avoid overloading the UI; top 500 by default
		if len(items) > 500 {
			return items[:500]
		}
		return items
	}
	out := make([]symbolItem, 0, 50)
	for _, it := range items {
		if strings.Contains(strings.ToUpper(it.Symbol), q) ||
			strings.Contains(strings.ToUpper(it.Description), q) {
			out = append(out, it)
		}
		if len(out) >= 200 {
			break
		}
	}
	return out
}

type companyCacheItem struct {
	Data map[string]interface{}
	Exp  time.Time
}

var (
	companyCache   = map[string]companyCacheItem{}
	companyCacheMu sync.Mutex
)

// CompanyInfo aggregates profile + metrics + news for a symbol, cached for 30m.
func CompanyInfo() gin.HandlerFunc {
	apiKey := os.Getenv("FINNHUB_API_KEY")
	alphaKey := os.Getenv("ALPHAVANTAGE_API_KEY")
	coingeckoKey := os.Getenv("COINGECKO_API_KEY")
	cryptoMap := map[string]string{
		"BTC": "bitcoin",
		"ETH": "ethereum",
		"SOL": "solana",
		"AVAX": "avalanche-2",
		"BNB": "binancecoin",
		"XRP": "ripple",
		"ADA": "cardano",
		"DOT": "polkadot",
		"MATIC": "polygon",
	}
	return func(c *gin.Context) {
		sym := strings.ToUpper(strings.TrimSpace(c.Param("symbol")))
		if sym == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "symbol required"})
			return
		}

		companyCacheMu.Lock()
		if item, ok := companyCache[sym]; ok && time.Now().Before(item.Exp) {
			companyCacheMu.Unlock()
			c.JSON(http.StatusOK, item.Data)
			return
		}
		companyCacheMu.Unlock()

		// Profile (with fallback search/resolve if empty)
		profile := map[string]interface{}{}
		resolved := sym
		loadProfile := func(target string) (map[string]interface{}, error) {
			out := map[string]interface{}{}
			profileURL := fmt.Sprintf("https://finnhub.io/api/v1/stock/profile2?symbol=%s&token=%s", target, apiKey)
			if err := fetchJSON(profileURL, &out); err != nil {
				return nil, err
			}
			return out, nil
		}
		if p, err := loadProfile(resolved); err == nil {
			profile = p
		}
		// If profile missing or marketCap absent, try search to resolve symbol
		if len(profile) == 0 || profile["marketCapitalization"] == nil {
			var searchResp struct {
				Result []struct {
					Symbol        string `json:"symbol"`
					DisplaySymbol string `json:"displaySymbol"`
					Type          string `json:"type"`
				} `json:"result"`
			}
			searchURL := fmt.Sprintf("https://finnhub.io/api/v1/search?q=%s&token=%s", sym, apiKey)
			_ = fetchJSON(searchURL, &searchResp) // best-effort
			for _, r := range searchResp.Result {
				if strings.EqualFold(r.Type, "Common Stock") && r.DisplaySymbol != "" {
					resolved = r.DisplaySymbol
					if p, err := loadProfile(resolved); err == nil && len(p) > 0 {
						profile = p
					}
					break
				}
			}
		}

		// If still empty, try Alpha Vantage overview (stocks only)
		if (len(profile) == 0 || profile["marketCapitalization"] == nil) && alphaKey != "" {
			var av map[string]interface{}
			overviewURL := fmt.Sprintf("https://www.alphavantage.co/query?function=OVERVIEW&symbol=%s&apikey=%s", resolved, alphaKey)
			if err := fetchJSON(overviewURL, &av); err == nil && len(av) > 0 && av["Name"] != nil {
				// Map key fields
				profile = map[string]interface{}{
					"name":                 av["Name"],
					"ticker":               resolved,
					"industry":             av["Industry"],
					"ipo":                  av["IPODate"],
					"currency":             "USD",
					"marketCapitalization": toFloat(av["MarketCapitalization"]),
				}
			}
		}

		// If still empty and symbol is a known crypto, try CoinGecko
		if (len(profile) == 0 || profile["marketCapitalization"] == nil) && coingeckoKey != "" {
			if id, ok := cryptoMap[resolved]; ok {
				var cg []struct {
					Name       string  `json:"name"`
					Symbol     string  `json:"symbol"`
					MarketCap  float64 `json:"market_cap"`
					Current    float64 `json:"current_price"`
				}
				url := fmt.Sprintf("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=%s&x_cg_demo_api_key=%s", id, coingeckoKey)
				if err := fetchJSON(url, &cg); err == nil && len(cg) > 0 {
					profile = map[string]interface{}{
						"name":                 cg[0].Name,
						"ticker":               resolved,
						"industry":             "Crypto",
						"currency":             "USD",
						"marketCapitalization": cg[0].MarketCap,
						"currentPrice":         cg[0].Current,
					}
				}
			}
		}

		// Metrics (use resolved symbol)
		metricsURL := fmt.Sprintf("https://finnhub.io/api/v1/stock/metric?symbol=%s&metric=all&token=%s", resolved, apiKey)
		var metricsResp struct {
			Metric map[string]interface{} `json:"metric"`
		}
		if err := fetchJSON(metricsURL, &metricsResp); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "metrics error"})
			return
		}

		// News (last 7 days)
		to := time.Now()
		from := to.Add(-7 * 24 * time.Hour)
		newsURL := fmt.Sprintf(
			"https://finnhub.io/api/v1/company-news?symbol=%s&from=%s&to=%s&token=%s",
			resolved, from.Format("2006-01-02"), to.Format("2006-01-02"), apiKey,
		)
		var news []map[string]interface{}
		_ = fetchJSON(newsURL, &news) // non-fatal if fails

		// If no news and we have Alpha key, try Alpha Vantage news sentiment (stocks only)
		if len(news) == 0 && alphaKey != "" {
			var avNews struct {
				Feed []struct {
					Title string `json:"title"`
					URL   string `json:"url"`
					Time  string `json:"time_published"`
					Source string `json:"source"`
				} `json:"feed"`
			}
			avNewsURL := fmt.Sprintf("https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=%s&apikey=%s", resolved, alphaKey)
			if err := fetchJSON(avNewsURL, &avNews); err == nil {
				for _, f := range avNews.Feed {
					news = append(news, map[string]interface{}{
						"headline": f.Title,
						"url":      f.URL,
						"source":   f.Source,
						"datetime": f.Time,
					})
				}
			}
		}

		payload := map[string]interface{}{
			"profile": profile,
			"metrics": metricsResp.Metric,
			"news":    news,
			"symbol":  resolved,
		}

		companyCacheMu.Lock()
		companyCache[sym] = companyCacheItem{Data: payload, Exp: time.Now().Add(30 * time.Minute)}
		companyCacheMu.Unlock()

		c.JSON(http.StatusOK, payload)
	}
}

func fetchJSON(url string, target interface{}) error {
	req, _ := http.NewRequestWithContext(context.Background(), http.MethodGet, url, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("status %d", resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(target)
}

func toFloat(v interface{}) float64 {
	switch t := v.(type) {
	case float64:
		return t
	case float32:
		return float64(t)
	case int:
		return float64(t)
	case int64:
		return float64(t)
	case string:
		if f, err := strconv.ParseFloat(t, 64); err == nil {
			return f
		}
	}
	return 0
}
