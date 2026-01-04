package worker

import (
	"database/sql"
	"fmt"
	"log"
	"time"
)

const (
	checkInterval = 5 * time.Second
)

type PriceProvider interface {
	GetPrice(symbol string) (float64, error)
}

// Start initializes the background worker to process orders.
func Start(db *sql.DB, provider PriceProvider) {
	fmt.Println("🚀 Order Worker Started (Integrated)...")
	go func() {
		ticker := time.NewTicker(checkInterval)
		for range ticker.C {
			processOrders(db, provider)
		}
	}()
}

func processOrders(db *sql.DB, provider PriceProvider) {
	rows, err := db.Query(`
		SELECT id, user_id, symbol, side, type, quantity, price, created_at 
		FROM orders 
		WHERE status='pending'
	`)
	if err != nil {
		log.Println("Error fetching orders:", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id, userID, symbol, side, orderType string
		var qty float64
		var targetPrice sql.NullFloat64
		var createdAt time.Time

		if err := rows.Scan(&id, &userID, &symbol, &side, &orderType, &qty, &targetPrice, &createdAt); err != nil {
			log.Println("Scan error:", err)
			continue
		}

		price := 0.0
		if targetPrice.Valid && targetPrice.Float64 > 0 {
			// Limit/Stop orders use the set price (simplified)
			price = targetPrice.Float64
		} else {
			// Market order: Get live price
			livePrice, err := provider.GetPrice(symbol)
			if err != nil || livePrice <= 0 {
				log.Printf("⚠️ Skipping order %s: price unavailable for %s", id, symbol)
				continue
			}
			price = livePrice
			log.Printf("ℹ️ Market Price for %s: %f", symbol, price)
		}

		// Execute orders after 5 seconds
		if time.Since(createdAt) > 5*time.Second {
			executeOrder(db, id, userID, symbol, side, qty, price)
		}
	}
}

func executeOrder(db *sql.DB, orderID, userID, symbol, side string, qty, price float64) {
	log.Printf("⚡ Executing Order %s: %s %s %f @ $%f\n", orderID, side, symbol, qty, price)

	tx, err := db.Begin()
	if err != nil {
		log.Println("Tx error:", err)
		return
	}
	defer tx.Rollback()

	total := qty * price

	if side == "buy" {
		// Validate balance before deducting
		var balance float64
		if err := tx.QueryRow(`SELECT balance FROM wallets WHERE user_id=$1 AND currency='USD' FOR UPDATE`, userID).Scan(&balance); err != nil {
			log.Println("Wallet query failed:", err)
			return
		}
		if balance < total {
			log.Printf("❌ Order %s rejected: insufficient funds (%.2f < %.2f)", orderID, balance, total)
			tx.Exec(`UPDATE orders SET status='rejected' WHERE id=$1`, orderID)
			tx.Commit()
			return
		}

		// Deduct Cash
		if _, err := tx.Exec(`UPDATE wallets SET balance = balance - $1 WHERE user_id=$2`, total, userID); err != nil {
			log.Println("Wallet deduct failed:", err)
			return
		}

		// Add Holding
		var currentQty, avgPrice float64
		err := tx.QueryRow(`SELECT quantity, average_buy_price FROM holdings WHERE user_id=$1 AND symbol=$2`, userID, symbol).Scan(&currentQty, &avgPrice)

		if err == sql.ErrNoRows {
			if _, err := tx.Exec(`INSERT INTO holdings (user_id, symbol, quantity, average_buy_price) VALUES ($1, $2, $3, $4)`, userID, symbol, qty, price); err != nil {
				log.Println("Insert holding failed:", err)
				return
			}
		} else if err == nil {
			newQty := currentQty + qty
			newAvg := ((currentQty * avgPrice) + total) / newQty
			if _, err := tx.Exec(`UPDATE holdings SET quantity=$1, average_buy_price=$2 WHERE user_id=$3 AND symbol=$4`, newQty, newAvg, userID, symbol); err != nil {
				log.Println("Update holding failed:", err)
				return
			}
		}
	} else {
		// SELL - Validate holdings first
		var currentQty float64
		if err := tx.QueryRow(`SELECT quantity FROM holdings WHERE user_id=$1 AND symbol=$2 FOR UPDATE`, userID, symbol).Scan(&currentQty); err != nil {
			log.Printf("❌ Order %s rejected: no holdings found for %s", orderID, symbol)
			tx.Exec(`UPDATE orders SET status='rejected' WHERE id=$1`, orderID)
			tx.Commit()
			return
		}
		if currentQty < qty {
			log.Printf("❌ Order %s rejected: insufficient holdings (%.2f < %.2f)", orderID, currentQty, qty)
			tx.Exec(`UPDATE orders SET status='rejected' WHERE id=$1`, orderID)
			tx.Commit()
			return
		}

		// Reduce holding
		newQty := currentQty - qty
		if newQty <= 0 {
			// Delete holding if 0
			if _, err := tx.Exec(`DELETE FROM holdings WHERE user_id=$1 AND symbol=$2`, userID, symbol); err != nil {
				log.Println("Delete holding failed:", err)
				return
			}
		} else {
			if _, err := tx.Exec(`UPDATE holdings SET quantity=$1 WHERE user_id=$2 AND symbol=$3`, newQty, userID, symbol); err != nil {
				log.Println("Update holding failed:", err)
				return
			}
		}

		// Add Cash
		if _, err := tx.Exec(`UPDATE wallets SET balance = balance + $1 WHERE user_id=$2`, total, userID); err != nil {
			log.Println("Wallet add failed:", err)
			return
		}
	}

	// Update Order Status to filled
	if _, err := tx.Exec(`UPDATE orders SET status='filled', executed_at=$1 WHERE id=$2`, time.Now(), orderID); err != nil {
		log.Println("Update status failed:", err)
		return
	}

	if err := tx.Commit(); err != nil {
		log.Println("Commit failed:", err)
		return
	}
	log.Printf("✅ Order %s executed successfully", orderID)
}
