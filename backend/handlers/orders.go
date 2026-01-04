package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sahniaditya/flux-backend/models"
)

// PriceChecker defines the interface for fetching asset prices and checking support.
type PriceChecker interface {
	GetPrice(symbol string) (float64, error)
	IsSupported(symbol string) bool
}

// PlaceOrder handles Market, Limit, and Stop orders with full validation.
func PlaceOrder(db *sql.DB, priceCheck PriceChecker) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")
		var req models.PlaceOrderRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input: " + err.Error()})
			return
		}
		req.Symbol = strings.ToUpper(strings.TrimSpace(req.Symbol))

		// 1. Validate Symbol & Get Live Price
		// We fetch price for ALL orders to ensure symbol exists (strict validation).
		// This prevents "APPLE" limit orders.
		livePrice, err := priceCheck.GetPrice(req.Symbol)
		if err != nil || livePrice <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "symbol not found or price unavailable"})
			return
		}

		// Basic Validation for Limit/Stop
		if req.Type == "limit" || req.Type == "stop" {
			if req.Price == nil || *req.Price <= 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "price required for limit/stop orders"})
				return
			}
		}

		tx, err := db.BeginTx(c, &sql.TxOptions{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
			return
		}
		defer tx.Rollback()

		// 2. Setup Cost Basis
		estimatedPrice := livePrice
		if req.Price != nil && *req.Price > 0 {
			// For Limit/Stop, we validate against the limit price cost,
			// BUT we also already validated the symbol exists via livePrice above.
			estimatedPrice = *req.Price
		}

		totalCost := req.Quantity * estimatedPrice

		if req.Side == "buy" {
			// Check wallet balance
			var balance float64
			if err := tx.QueryRowContext(c,
				`SELECT balance FROM wallets WHERE user_id=$1 AND currency='USD' FOR UPDATE`,
				userID).Scan(&balance); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "wallet not found"})
				return
			}

			// Validate sufficient funds
			if balance < totalCost {
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("insufficient funds (need $%.2f, have $%.2f)", totalCost, balance)})
				return
			}
		} else if req.Side == "sell" {
			// Check holdings
			var currentQty float64
			err := tx.QueryRowContext(c,
				`SELECT quantity FROM holdings WHERE user_id=$1 AND symbol=$2`,
				userID, req.Symbol).Scan(&currentQty)

			if err == sql.ErrNoRows {
				c.JSON(http.StatusBadRequest, gin.H{"error": "you don't own this asset"})
				return
			} else if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
				return
			}

			if req.Quantity > currentQty {
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("insufficient holdings (have %.4f, selling %.4f)", currentQty, req.Quantity)})
				return
			}
		}

		// Insert Order into DB
		var orderID string
		status := "pending"
		priceVal := NullFloat64(req.Price)

		err = tx.QueryRowContext(c, `
			INSERT INTO orders (user_id, symbol, side, type, quantity, price, status)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id`,
			userID, req.Symbol, req.Side, req.Type, req.Quantity, priceVal, status).Scan(&orderID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to place order"})
			return
		}

		if err := tx.Commit(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "commit failed"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"message": "order placed", "order_id": orderID, "status": status})
	}
}

// Helper for nullable float
func NullFloat64(v *float64) sql.NullFloat64 {
	if v == nil {
		return sql.NullFloat64{Valid: false}
	}
	return sql.NullFloat64{Float64: *v, Valid: true}
}
