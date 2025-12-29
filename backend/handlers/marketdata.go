package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type candlePayload struct {
	T []int64   `json:"t"`
	O []float64 `json:"o"`
	H []float64 `json:"h"`
	L []float64 `json:"l"`
	C []float64 `json:"c"`
	V []float64 `json:"v"`
	S string    `json:"s"`
}

type cachedCandle struct {
	Data []map[string]interface{}
	Exp  time.Time
}

var (
	candleCache   = map[string]cachedCandle{}
	candleCacheMu sync.Mutex
)

// MarketData returns OHLCV data for a symbol/interval using Finnhub.
// Query params: from (unix), to (unix). Falls back to last 30 days.
func MarketData() gin.HandlerFunc {
	apiKey := os.Getenv("FINNHUB_API_KEY")
	return func(c *gin.Context) {
		sym := c.Param("symbol")
		resolution := c.Param("interval") // e.g., 1,5,15,30,60,D,W,M
		if sym == "" || resolution == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "symbol and interval required"})
			return
		}
		to := time.Now().Unix()
		if raw := c.Query("to"); raw != "" {
			if v, err := strconv.ParseInt(raw, 10, 64); err == nil {
				to = v
			}
		}
		from := time.Now().Add(-30 * 24 * time.Hour).Unix()
		if raw := c.Query("from"); raw != "" {
			if v, err := strconv.ParseInt(raw, 10, 64); err == nil {
				from = v
			}
		}

		cacheKey := fmt.Sprintf("%s_%s_%d_%d", sym, resolution, from, to)
		candleCacheMu.Lock()
		if item, ok := candleCache[cacheKey]; ok && time.Now().Before(item.Exp) {
			candleCacheMu.Unlock()
			c.JSON(http.StatusOK, item.Data)
			return
		}
		candleCacheMu.Unlock()

		url := fmt.Sprintf("https://finnhub.io/api/v1/stock/candle?symbol=%s&resolution=%s&from=%d&to=%d&token=%s",
			sym, resolution, from, to, apiKey)
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

		var payload candlePayload
		if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "decode error"})
			return
		}
		candles := []map[string]interface{}{}
		for i := range payload.T {
			candles = append(candles, map[string]interface{}{
				"time":   payload.T[i],
				"open":   payload.O[i],
				"high":   payload.H[i],
				"low":    payload.L[i],
				"close":  payload.C[i],
				"volume": payload.V[i],
			})
		}
		candleCacheMu.Lock()
		candleCache[cacheKey] = cachedCandle{Data: candles, Exp: time.Now().Add(5 * time.Minute)}
		candleCacheMu.Unlock()

		c.JSON(http.StatusOK, candles)
	}
}

// News (optional): minimal structure from Finnhub company-news.
func News() gin.HandlerFunc {
	apiKey := os.Getenv("FINNHUB_API_KEY")
	return func(c *gin.Context) {
		sym := c.Param("symbol")
		if sym == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "symbol required"})
			return
		}
		to := time.Now()
		from := to.Add(-7 * 24 * time.Hour)
		url := fmt.Sprintf("https://finnhub.io/api/v1/company-news?symbol=%s&from=%s&to=%s&token=%s",
			sym, from.Format("2006-01-02"), to.Format("2006-01-02"), apiKey)
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
		var items []struct {
			Datetime int64  `json:"datetime"`
			Headline string `json:"headline"`
			Source   string `json:"source"`
			URL      string `json:"url"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&items); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "decode error"})
			return
		}
		c.JSON(http.StatusOK, items)
	}
}
