package prices

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
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

	return &Feed{
		client: &http.Client{Timeout: 10 * time.Second},
		idToSymbol: map[string]string{
			"bitcoin":  "BTC",
			"ethereum": "ETH",
			"solana":   "SOL",
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
