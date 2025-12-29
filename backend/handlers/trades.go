package handlers

import (
	"database/sql"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sahniaditya/flux-backend/models"
)

// GetPortfolio returns wallet and holdings for the authenticated user.
func GetPortfolio(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")
		var balance float64
		err := db.QueryRowContext(c,
			`SELECT balance FROM wallets WHERE user_id=$1 AND currency='USD'`, userID).Scan(&balance)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "wallet not found"})
			return
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet lookup failed"})
			return
		}

		rows, err := db.QueryContext(c,
			`SELECT symbol, quantity, average_buy_price FROM holdings WHERE user_id=$1 ORDER BY symbol`, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "holdings lookup failed"})
			return
		}
		defer rows.Close()

		holdings := []models.HoldingEntry{}
		for rows.Next() {
			var h models.HoldingEntry
			if err := rows.Scan(&h.Symbol, &h.Quantity, &h.AverageBuyPrice); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "holdings scan failed"})
				return
			}
			holdings = append(holdings, h)
		}

		c.JSON(http.StatusOK, models.PortfolioResponse{
			Balance:  balance,
			Currency: "USD",
			Holdings: holdings,
		})
	}
}

// TopUpWallet adds fake USD and logs a DEPOSIT transaction.
func TopUpWallet(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")
		var req models.TopUpRequest
		if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "amount must be positive"})
			return
		}

		tx, err := db.BeginTx(c, &sql.TxOptions{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
			return
		}
		defer tx.Rollback()

		if _, err := tx.ExecContext(c,
			`UPDATE wallets SET balance = balance + $1, updated_at=$2 WHERE user_id=$3 AND currency='USD'`,
			req.Amount, time.Now().UTC(), userID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet update failed"})
			return
		}

		if _, err := tx.ExecContext(c,
			`INSERT INTO transactions (user_id, type, total_amount) VALUES ($1,'DEPOSIT',$2)`,
			userID, req.Amount); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "transaction log failed"})
			return
		}

		if err := tx.Commit(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "commit failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "top-up successful", "amount": req.Amount})
	}
}

// TradeBuy handles simulated buys with row-level locking.
func TradeBuy(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")
		var req models.TradeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
			return
		}
		req.Symbol = strings.ToUpper(strings.TrimSpace(req.Symbol))
		if req.Quantity <= 0 || req.Price <= 0 || req.Symbol == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "symbol, quantity, and price must be positive"})
			return
		}

		total := req.Quantity * req.Price

		tx, err := db.BeginTx(c, &sql.TxOptions{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
			return
		}
		defer tx.Rollback()

		var balance float64
		if err := tx.QueryRowContext(c,
			`SELECT balance FROM wallets WHERE user_id=$1 AND currency='USD' FOR UPDATE`,
			userID).Scan(&balance); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "wallet not found"})
			return
		}
		if balance < total {
			c.JSON(http.StatusBadRequest, gin.H{"error": "insufficient funds"})
			return
		}

		if _, err := tx.ExecContext(c,
			`UPDATE wallets SET balance = balance - $1, updated_at=$2 WHERE user_id=$3 AND currency='USD'`,
			total, time.Now().UTC(), userID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet update failed"})
			return
		}

		var qty float64
		var avg float64
		err = tx.QueryRowContext(c,
			`SELECT quantity, average_buy_price FROM holdings WHERE user_id=$1 AND symbol=$2 FOR UPDATE`,
			userID, req.Symbol).Scan(&qty, &avg)

		if err == sql.ErrNoRows {
			if _, err := tx.ExecContext(c,
				`INSERT INTO holdings (user_id, symbol, quantity, average_buy_price) VALUES ($1,$2,$3,$4)`,
				userID, req.Symbol, req.Quantity, req.Price); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "insert holding failed"})
				return
			}
		} else if err == nil {
			newQty := qty + req.Quantity
			newAvg := ((qty * avg) + total) / newQty
			if _, err := tx.ExecContext(c,
				`UPDATE holdings SET quantity=$1, average_buy_price=$2, updated_at=$3 WHERE user_id=$4 AND symbol=$5`,
				newQty, newAvg, time.Now().UTC(), userID, req.Symbol); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "update holding failed"})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "holding query failed"})
			return
		}

		if _, err := tx.ExecContext(c,
			`INSERT INTO transactions (user_id, type, symbol, quantity, price_per_unit, total_amount) 
			 VALUES ($1,'BUY',$2,$3,$4,$5)`,
			userID, req.Symbol, req.Quantity, req.Price, total); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "transaction log failed"})
			return
		}

		if err := tx.Commit(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "commit failed"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "buy executed", "spent": total})
	}
}

// TradeSell handles simulated sells with row-level locking.
func TradeSell(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")
		var req models.TradeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
			return
		}
		req.Symbol = strings.ToUpper(strings.TrimSpace(req.Symbol))
		if req.Quantity <= 0 || req.Price <= 0 || req.Symbol == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "symbol, quantity, and price must be positive"})
			return
		}

		total := req.Quantity * req.Price

		tx, err := db.BeginTx(c, &sql.TxOptions{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
			return
		}
		defer tx.Rollback()

		var qty float64
		var avg float64
		if err := tx.QueryRowContext(c,
			`SELECT quantity, average_buy_price FROM holdings WHERE user_id=$1 AND symbol=$2 FOR UPDATE`,
			userID, req.Symbol).Scan(&qty, &avg); err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusBadRequest, gin.H{"error": "no holdings to sell"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "holding query failed"})
			return
		}
		if qty < req.Quantity {
			c.JSON(http.StatusBadRequest, gin.H{"error": "insufficient quantity"})
			return
		}

		newQty := qty - req.Quantity
		if newQty == 0 {
			if _, err := tx.ExecContext(c,
				`DELETE FROM holdings WHERE user_id=$1 AND symbol=$2`,
				userID, req.Symbol); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "delete holding failed"})
				return
			}
		} else {
			if _, err := tx.ExecContext(c,
				`UPDATE holdings SET quantity=$1, updated_at=$2 WHERE user_id=$3 AND symbol=$4`,
				newQty, time.Now().UTC(), userID, req.Symbol); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "update holding failed"})
				return
			}
		}

		if _, err := tx.ExecContext(c,
			`UPDATE wallets SET balance = balance + $1, updated_at=$2 WHERE user_id=$3 AND currency='USD'`,
			total, time.Now().UTC(), userID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet update failed"})
			return
		}

		if _, err := tx.ExecContext(c,
			`INSERT INTO transactions (user_id, type, symbol, quantity, price_per_unit, total_amount) 
			 VALUES ($1,'SELL',$2,$3,$4,$5)`,
			userID, req.Symbol, req.Quantity, req.Price, total); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "transaction log failed"})
			return
		}

		if err := tx.Commit(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "commit failed"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "sell executed", "received": total})
	}
}
