package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	postgres "github.com/fergusstrange/embedded-postgres"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	appdb "github.com/sahniaditya/flux-backend/db"
	"github.com/sahniaditya/flux-backend/handlers" // Import handlers
	"github.com/sahniaditya/flux-backend/prices"
)

func main() {
	// Load environment variables from both backend/.env and cmd/api/.env if present.
	_ = godotenv.Load("../.env")
	_ = godotenv.Load(".env")

	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "postgres")
	password := getEnv("DB_PASSWORD", "postgres")
	dbName := getEnv("DB_NAME", "postgres")
	useEmbedded := getEnv("EMBED_PG", "true") != "false"

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbName)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Failed to connect to DB:", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		// If no Postgres is running locally, optionally boot an embedded instance.
		if useEmbedded {
			log.Println("Postgres not reachable; starting embedded Postgres...")
			embedded, startErr := startEmbeddedPostgres(host, port, user, password, dbName)
			if startErr != nil {
				log.Fatal("Failed to start embedded Postgres:", startErr)
			}
			defer embedded.Stop()
			// Reconnect after embedded starts
			db, err = sql.Open("postgres", connStr)
			if err != nil {
				log.Fatal("Failed to connect to embedded DB:", err)
			}
			if pingErr := db.Ping(); pingErr != nil {
				log.Fatal("Failed to ping embedded DB:", pingErr)
			}
		} else {
			log.Fatal("Failed to ping DB:", err)
		}
	}
	fmt.Println("✅ Successfully connected to Postgres!")

	if err := appdb.ApplySchema(context.Background(), db); err != nil {
		log.Fatal("Failed to apply schema:", err)
	}

	// Start price feed (crypto + stocks via Finnhub).
	stockSymbols := strings.Split(getEnv("STOCK_SYMBOLS", "AAPL,MSFT,NVDA,AMZN,GOOGL"), ",")
	for i, s := range stockSymbols {
		stockSymbols[i] = strings.ToUpper(strings.TrimSpace(s))
	}
	feed := prices.NewFeed(prices.FeedConfig{
		StockSymbols:   stockSymbols,
		FinnhubAPIKey:  getEnv("FINNHUB_API_KEY", ""),
		CryptoInterval: 10 * time.Second,
		StockInterval:  45 * time.Second,
	})
	feed.Start(context.Background())

	r := gin.Default()
	// Basic CORS to allow frontend at a different origin (dev: localhost:3000).
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusOK)
			return
		}
		c.Next()
	})

	// ROUTES
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "active"})
	})
	r.GET("/ws/prices", func(c *gin.Context) {
		feed.HandleWS(c.Writer, c.Request)
	})

	// Auth Routes
	r.POST("/register", handlers.RegisterUser(db))
	r.POST("/login", handlers.LoginUser(db))

	secret := getEnv("JWT_SECRET", "dev-secret")
	auth := handlers.AuthMiddleware(secret)
	r.POST("/trade/buy", auth, handlers.TradeBuy(db))
	r.POST("/trade/sell", auth, handlers.TradeSell(db))
	r.POST("/wallet/topup", auth, handlers.TopUpWallet(db))
	r.GET("/portfolio", auth, handlers.GetPortfolio(db))
	// Market data + news (public)
	r.GET("/api/market-data/:symbol/:interval", handlers.MarketData())
	r.GET("/api/news/:symbol", handlers.News())
	// Symbols + company info (public, cached)
	r.GET("/api/symbols", handlers.Symbols())
	r.GET("/api/company/:symbol", handlers.CompanyInfo())

	apiPort := os.Getenv("PORT")
	if apiPort == "" {
		apiPort = "8080"
	}
	r.Run(":" + apiPort)
}

// startEmbeddedPostgres boots a lightweight Postgres instance for local dev.
func startEmbeddedPostgres(host, port, user, password, dbName string) (*postgres.EmbeddedPostgres, error) {
	portInt, err := strconv.Atoi(port)
	if err != nil {
		return nil, fmt.Errorf("invalid DB_PORT: %w", err)
	}

	baseDir := filepath.Join("..", ".embedded-pg")
	// Ensure stale binaries from other architectures are cleared out.
	_ = os.RemoveAll(baseDir)
	if mkErr := os.MkdirAll(baseDir, 0o755); mkErr != nil {
		return nil, fmt.Errorf("cannot prepare embedded pg dir: %w", mkErr)
	}

	cfg := postgres.DefaultConfig().
		Port(uint32(portInt)).
		Username(user).
		Password(password).
		Database(dbName).
		CachePath(filepath.Join(baseDir, "cache")). // keep downloads scoped here for correct arch
		DataPath(filepath.Join(baseDir, "data")).   // persistent between runs
		RuntimePath(filepath.Join(baseDir, "runtime")).
		Version(postgres.V16) // V16+ ships arm64 binaries; V16 is stable

	db := postgres.NewDatabase(cfg)
	if err := db.Start(); err != nil {
		return nil, err
	}
	return db, nil
}

func getEnv(key, def string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return def
}
