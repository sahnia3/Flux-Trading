package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
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

		// Profile
		profileURL := fmt.Sprintf("https://finnhub.io/api/v1/stock/profile2?symbol=%s&token=%s", sym, apiKey)
		profile := map[string]interface{}{}
		if err := fetchJSON(profileURL, &profile); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "profile error"})
			return
		}

		// Metrics
		metricsURL := fmt.Sprintf("https://finnhub.io/api/v1/stock/metric?symbol=%s&metric=all&token=%s", sym, apiKey)
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
			sym, from.Format("2006-01-02"), to.Format("2006-01-02"), apiKey,
		)
		var news []map[string]interface{}
		_ = fetchJSON(newsURL, &news) // non-fatal if fails

		payload := map[string]interface{}{
			"profile": profile,
			"metrics": metricsResp.Metric,
			"news":    news,
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
