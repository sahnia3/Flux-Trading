package prices

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Ticker struct {
	Symbol    string    `json:"symbol"`
	Price     float64   `json:"price"`
	Change24h float64   `json:"change_24h"`
	UpdatedAt time.Time `json:"updated_at"`
}

// FeedConfig controls sources and intervals.
type FeedConfig struct {
	StockSymbols   []string
	FinnhubAPIKey  string
	CryptoInterval time.Duration
	StockInterval  time.Duration
}

// Feed keeps latest prices in memory and broadcasts snapshots to websocket clients.
type Feed struct {
	client         *http.Client
	idToSymbol     map[string]string
	prices         map[string]Ticker
	mu             sync.RWMutex
	subscribers    map[*websocket.Conn]struct{}
	upgrader       websocket.Upgrader
	stockSymbols   []string
	finnhubAPIKey  string
	cryptoInterval time.Duration
	stockInterval  time.Duration
}

func NewFeed(cfg FeedConfig) *Feed {
	cryptoInterval := cfg.CryptoInterval
	if cryptoInterval == 0 {
		cryptoInterval = 10 * time.Second
	}
	stockInterval := cfg.StockInterval
	if stockInterval == 0 {
		stockInterval = 45 * time.Second
	}

	f := &Feed{
		client: &http.Client{Timeout: 10 * time.Second},
		idToSymbol: map[string]string{
			"bitcoin":            "BTC",
			"ethereum":           "ETH",
			"tether":             "USDT",
			"binancecoin":        "BNB",
			"solana":             "SOL",
			"ripple":             "XRP",
			"usd-coin":           "USDC",
			"cardano":            "ADA",
			"avalanche-2":        "AVAX",
			"dogecoin":           "DOGE",
			"tron":               "TRX",
			"polkadot":           "DOT",
			"chainlink":          "LINK",
			"matic-network":      "MATIC",
			"the-open-network":   "TON",
			"shiba-inu":          "SHIB",
			"litecoin":           "LTC",
			"bitcoin-cash":       "BCH",
			"near":               "NEAR",
			"uniswap":            "UNI",
			"leo-token":          "LEO",
			"dai":                "DAI",
			"aptos":              "APT",
			"cosmos":             "ATOM",
			"ethereum-classic":   "ETC",
			"monero":             "XMR",
			"stellar":            "XLM",
			"blockstack":         "STX",
			"filecoin":           "FIL",
			"hedera-hashgraph":   "HBAR",
			"immutable-x":        "IMX",
			"crypto-com-chain":   "CRO",
			"vechain":            "VET",
			"maker":              "MKR",
			"render-token":       "RNDR",
			"the-graph":          "GRT",
			"injective-protocol": "INJ",
			"optimism":           "OP",
			"aave":               "AAVE",
			"theta-token":        "THETA",
			"algorand":           "ALGO",
			"thorchain":          "RUNE",
			"fantom":             "FTM",
			"the-sandbox":        "SAND",
			"decentraland":       "MANA",
		},
		prices:         make(map[string]Ticker),
		subscribers:    make(map[*websocket.Conn]struct{}),
		stockSymbols:   cfg.StockSymbols,
		finnhubAPIKey:  cfg.FinnhubAPIKey,
		cryptoInterval: cryptoInterval,
		stockInterval:  stockInterval,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true }, // allow all origins for dev
		},
	}

	// Allow override list via env CRYPTO_IDS="id:SYM,id2:SYM2" for crypto.
	if env := strings.TrimSpace(strings.Join(strings.FieldsFunc(os.Getenv("CRYPTO_IDS"), func(r rune) bool { return r == ',' || r == ' ' }), ",")); env != "" {
		m := make(map[string]string)
		for _, part := range strings.Split(env, ",") {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			// accept "id:SYMBOL" or just "id" (symbol inferred uppercased)
			if strings.Contains(part, ":") {
				p := strings.SplitN(part, ":", 2)
				m[p[0]] = strings.ToUpper(p[1])
			} else {
				m[part] = strings.ToUpper(part)
			}
		}
		if len(m) > 0 {
			f.idToSymbol = m
		}
	}

	return f
}

// Start kicks off the polling loops for crypto and stocks.
func (f *Feed) Start(ctx context.Context) {
	if len(f.idToSymbol) > 0 {
		go f.loop(ctx, f.cryptoInterval, f.refreshCrypto)
	}
	if len(f.stockSymbols) > 0 && f.finnhubAPIKey != "" {
		go f.loop(ctx, f.stockInterval, f.refreshStocks)
	}
}

func (f *Feed) loop(ctx context.Context, interval time.Duration, fn func() error) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			if err := fn(); err != nil {
				// fail silently; retry on next tick
			}
			select {
			case <-ctx.Done():
				f.closeAll()
				return
			case <-ticker.C:
				continue
			}
		}
	}()
}

// HandleWS upgrades the connection and streams snapshots.
func (f *Feed) HandleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := f.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	f.addSubscriber(conn)
	defer f.removeSubscriber(conn)

	// Send initial snapshot immediately.
	f.sendSnapshot(conn)

	// Simple read loop to detect close; we don't expect messages.
	for {
		if _, _, err := conn.NextReader(); err != nil {
			return
		}
	}
}

func (f *Feed) refreshCrypto() error {
	ids := make([]string, 0, len(f.idToSymbol))
	for id := range f.idToSymbol {
		ids = append(ids, id)
	}
	url := fmt.Sprintf("https://api.coingecko.com/api/v3/simple/price?ids=%s&vs_currencies=usd&include_24hr_change=true",
		strings.Join(ids, ","))

	resp, err := f.client.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("coingecko returned status %d", resp.StatusCode)
	}

	var payload map[string]struct {
		USD           float64 `json:"usd"`
		ChangePercent float64 `json:"usd_24h_change"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return err
	}

	now := time.Now().UTC()
	f.mu.Lock()
	for id, data := range payload {
		symbol := f.idToSymbol[id]
		f.prices[symbol] = Ticker{
			Symbol:    symbol,
			Price:     data.USD,
			Change24h: data.ChangePercent,
			UpdatedAt: now,
		}
	}
	f.mu.Unlock()

	f.broadcastSnapshot()
	return nil
}

func (f *Feed) refreshStocks() error {
	if f.finnhubAPIKey == "" || len(f.stockSymbols) == 0 {
		return nil
	}
	now := time.Now().UTC()
	updated := make(map[string]Ticker)

	for _, sym := range f.stockSymbols {
		sym = strings.ToUpper(strings.TrimSpace(sym))
		if sym == "" {
			continue
		}
		req, err := http.NewRequest("GET", "https://finnhub.io/api/v1/quote", nil)
		if err != nil {
			continue
		}
		q := req.URL.Query()
		q.Set("symbol", sym)
		q.Set("token", f.finnhubAPIKey)
		req.URL.RawQuery = q.Encode()

		resp, err := f.client.Do(req)
		if err != nil {
			log.Printf("finnhub request failed for %s: %v", sym, err)
			continue
		}
		if resp.StatusCode >= 300 {
			log.Printf("finnhub status %d for %s", resp.StatusCode, sym)
			resp.Body.Close()
			continue
		}
		var payload struct {
			Current float64 `json:"c"`
			ChangeP float64 `json:"dp"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
			log.Printf("finnhub decode failed for %s: %v", sym, err)
			resp.Body.Close()
			continue
		}
		resp.Body.Close()

		if payload.Current <= 0 {
			log.Printf("finnhub returned zero price for %s", sym)
			continue
		}
		updated[sym] = Ticker{
			Symbol:    sym,
			Price:     payload.Current,
			Change24h: payload.ChangeP,
			UpdatedAt: now,
		}
	}

	if len(updated) == 0 {
		log.Printf("finnhub update returned zero symbols; check API key/limits/symbols")
		return nil
	}

	f.mu.Lock()
	for k, v := range updated {
		f.prices[k] = v
	}
	f.mu.Unlock()
	f.broadcastSnapshot()
	return nil
}

func (f *Feed) snapshot() map[string]Ticker {
	f.mu.RLock()
	defer f.mu.RUnlock()
	out := make(map[string]Ticker, len(f.prices))
	for k, v := range f.prices {
		out[k] = v
	}
	return out
}

func (f *Feed) addSubscriber(conn *websocket.Conn) {
	f.mu.Lock()
	f.subscribers[conn] = struct{}{}
	f.mu.Unlock()
}

func (f *Feed) removeSubscriber(conn *websocket.Conn) {
	f.mu.Lock()
	delete(f.subscribers, conn)
	f.mu.Unlock()
	conn.Close()
}

func (f *Feed) sendSnapshot(conn *websocket.Conn) {
	snap := f.snapshot()
	if len(snap) == 0 {
		return
	}
	_ = conn.WriteJSON(snap)
}

func (f *Feed) broadcastSnapshot() {
	snap := f.snapshot()
	if len(snap) == 0 {
		return
	}

	f.mu.RLock()
	for conn := range f.subscribers {
		if err := conn.WriteJSON(snap); err != nil {
			// Drop bad connections
			f.mu.RUnlock()
			f.removeSubscriber(conn)
			f.mu.RLock()
		}
	}
	f.mu.RUnlock()
}

func (f *Feed) closeAll() {
	f.mu.Lock()
	for conn := range f.subscribers {
		conn.Close()
	}
	f.subscribers = make(map[*websocket.Conn]struct{})
	f.mu.Unlock()
}

// GetPrice returns the latest price. If not in cache, validation attempts a live fetch.
func (f *Feed) GetPrice(symbol string) (float64, error) {
	symbol = strings.ToUpper(symbol)
	// Normalize Crypto/TradingView symbols: "BINANCE:MKRUSDT" -> "MKRUSDT" -> "MKR"
	if idx := strings.LastIndex(symbol, ":"); idx != -1 {
		symbol = symbol[idx+1:]
	}
	symbol = strings.TrimSuffix(symbol, "USDT")
	symbol = strings.TrimSuffix(symbol, "USD")

	f.mu.RLock()
	ticker, ok := f.prices[symbol]
	f.mu.RUnlock()

	if ok && ticker.Price > 0 {
		return ticker.Price, nil
	}

	// Not in cache?
	// 1. Try Crypto fallback (CoinGecko) - handling case where background loop hasn't populated yet
	var cryptoID string
	for id, s := range f.idToSymbol {
		if s == symbol {
			cryptoID = id
			break
		}
	}
	if cryptoID != "" {
		url := fmt.Sprintf("https://api.coingecko.com/api/v3/simple/price?ids=%s&vs_currencies=usd", cryptoID)
		resp, err := f.client.Get(url)
		if err == nil {
			defer resp.Body.Close()
			if resp.StatusCode == 200 {
				var payload map[string]struct {
					USD float64 `json:"usd"`
				}
				if err := json.NewDecoder(resp.Body).Decode(&payload); err == nil {
					if val, ok := payload[cryptoID]; ok && val.USD > 0 {
						return val.USD, nil
					}
				}
			}
		}
	}

	// 2. Try Stocks fallback (Finnhub)
	// This supports ABT, commodities, forex if Finnhub covers them.
	if f.finnhubAPIKey != "" {
		req, err := http.NewRequest("GET", "https://finnhub.io/api/v1/quote", nil)
		if err != nil {
			return 0, err
		}
		q := req.URL.Query()
		q.Set("symbol", symbol)
		q.Set("token", f.finnhubAPIKey)
		req.URL.RawQuery = q.Encode()

		resp, err := f.client.Do(req)
		if err != nil {
			return 0, err
		}
		defer resp.Body.Close()

		if resp.StatusCode == 200 {
			var payload struct {
				Current float64 `json:"c"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&payload); err == nil && payload.Current > 0 {
				// Cache it for a short while? For now, just return it.
				// We could add it to f.prices so it gets updated in the loop,
				// but let's just return it for validation pass.
				return payload.Current, nil
			}
		}
	}

	// Try CoinGecko for crypto if not in our initial list?
	// The user wants strict crypto list or expanded?
	// For now, if it's not in cache and finnhub failed, it's invalid.
	return 0, fmt.Errorf("price unavailable for %s", symbol)
}

// IsSupported checks if the symbol is valid.
// We now defer to GetPrice validation: if we can get a price, it's supported.
func (f *Feed) IsSupported(symbol string) bool {
	// If it's in our known crypto list, it's supported.
	for _, s := range f.idToSymbol {
		if s == strings.ToUpper(symbol) {
			return true
		}
	}
	// For stocks/others, we assume true and let GetPrice fail if invalid.
	// This allows buying ANY valid US Stock/ETF/Forex that Finnhub supports.
	return true
}
