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
		"BTC":   "bitcoin",
		"ETH":   "ethereum",
		"SOL":   "solana",
		"AVAX":  "avalanche-2",
		"BNB":   "binancecoin",
		"XRP":   "ripple",
		"ADA":   "cardano",
		"DOT":   "polkadot",
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

		// If still empty and symbol is a known crypto, try CoinGecko (Rich Data)
		if len(profile) == 0 || profile["marketCapitalization"] == nil {
			if id, ok := cryptoMap[resolved]; ok {
				fmt.Printf("[DEBUG] Checking Crypto: %s -> %s\n", resolved, id)
				var cg struct {
					Name        string `json:"name"`
					Symbol      string `json:"symbol"`
					Description struct {
						En string `json:"en"`
					} `json:"description"`
					MarketData struct {
						CurrentPrice struct {
							USD float64 `json:"usd"`
						} `json:"current_price"`
						MarketCap struct {
							USD float64 `json:"usd"`
						} `json:"market_cap"`
						TotalVolume struct {
							USD float64 `json:"usd"`
						} `json:"total_volume"`
						CirculatingSupply float64 `json:"circulating_supply"`
					} `json:"market_data"`
				}

				url := fmt.Sprintf("https://api.coingecko.com/api/v3/coins/%s?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false", id)
				if coingeckoKey != "" {
					url = fmt.Sprintf("%s&x_cg_demo_api_key=%s", url, coingeckoKey)
				}

				fmt.Printf("[DEBUG] Fetching URL: %s\n", url)
				if err := fetchJSON(url, &cg); err == nil {
					fmt.Println("[DEBUG] CoinGecko Success")
					profile = map[string]interface{}{
						"name":                 cg.Name,
						"ticker":               strings.ToUpper(cg.Symbol),
						"industry":             "Crypto",
						"currency":             "USD",
						"marketCapitalization": cg.MarketData.MarketCap.USD / 1_000_000.0, // Millions
						"currentPrice":         cg.MarketData.CurrentPrice.USD,
						"description":          cg.Description.En, // Rich description
						"volume":               cg.MarketData.TotalVolume.USD,
						"supply":               cg.MarketData.CirculatingSupply,
					}
				} else {
					fmt.Printf("[DEBUG] CoinGecko Error: %v\n", err)
				}
			}
		}

		// 3. Failsafe: DeFi Llama (Open API)
		if len(profile) == 0 || profile["marketCapitalization"] == nil {
			if id, ok := cryptoMap[resolved]; ok {
				fmt.Printf("[DEBUG] Checking DeFi Llama Failsafe: %s\n", id)
				var dl struct {
					Name        string  `json:"name"`
					Symbol      string  `json:"symbol"`
					Description string  `json:"description"`
					Mcap        float64 `json:"mcap"`
					Logo        string  `json:"logo"`
				}
				url := fmt.Sprintf("https://api.llama.fi/protocol/%s", id)
				if err := fetchJSON(url, &dl); err == nil && dl.Name != "" {
					fmt.Println("[DEBUG] DeFi Llama Success")
					profile = map[string]interface{}{
						"name":                 dl.Name,
						"ticker":               strings.ToUpper(dl.Symbol),
						"industry":             "Crypto",
						"currency":             "USD",
						"marketCapitalization": dl.Mcap / 1_000_000.0,
						"description":          dl.Description,
						"logo":                 dl.Logo,
						// Estimate volume/supply if missing? Or just leave nil.
						// UI handles nil supply gracefully.
					}
				} else {
					fmt.Printf("[DEBUG] DeFi Llama Error: %v\n", err)
				}
			}
		}

		// Metrics (use resolved symbol)
		metricsURL := fmt.Sprintf("https://finnhub.io/api/v1/stock/metric?symbol=%s&metric=all&token=%s", resolved, apiKey)
		var metricsResp struct {
			Metric map[string]interface{} `json:"metric"`
		}
		// Best effort - ignore errors as Finnhub often fails for crypto
		_ = fetchJSON(metricsURL, &metricsResp)

		// News (last 7 days)
		to := time.Now()
		from := to.Add(-7 * 24 * time.Hour)
		var news []map[string]interface{}

		// If Crypto, use CryptoCompare (High quality, free)
		if _, isCrypto := cryptoMap[resolved]; isCrypto {
			cryptoNewsURL := "https://min-api.cryptocompare.com/data/v2/news/?lang=EN"
			var ccNews struct {
				Data []struct {
					Id        string `json:"id"`
					Guid      string `json:"guid"`
					Published int64  `json:"published_on"`
					Title     string `json:"title"`
					Url       string `json:"url"`
					Source    string `json:"source"`
					Body      string `json:"body"`
				} `json:"Data"`
			}
			if err := fetchJSON(cryptoNewsURL, &ccNews); err == nil {
				for _, n := range ccNews.Data {
					// Filter vaguely if needed, but for now show global crypto news
					news = append(news, map[string]interface{}{
						"headline": n.Title,
						"url":      n.Url,
						"datetime": n.Published,
						"source":   n.Source,
						"summary":  n.Body,
					})
					if len(news) >= 8 {
						break
					}
				}
			}
		} else {
			// Stock News
			newsURL := fmt.Sprintf(
				"https://finnhub.io/api/v1/company-news?symbol=%s&from=%s&to=%s&token=%s",
				resolved, from.Format("2006-01-02"), to.Format("2006-01-02"), apiKey,
			)
			_ = fetchJSON(newsURL, &news)
		}

		// If no news and we have Alpha key, try Alpha Vantage news sentiment (stocks only)
		if len(news) == 0 && alphaKey != "" {
			var avNews struct {
				Feed []struct {
					Title  string `json:"title"`
					URL    string `json:"url"`
					Time   string `json:"time_published"`
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
