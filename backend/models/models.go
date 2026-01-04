package models

import (
	"time"
)

// User represents a trader in our system
type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Password  string    `json:"-"` // Never return password in JSON
	CreatedAt time.Time `json:"created_at"`
}

// Wallet represents the cash balance
type Wallet struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Balance   float64   `json:"balance"`
	Currency  string    `json:"currency"`
	UpdatedAt time.Time `json:"updated_at"`
}

// RegisterRequest is what the frontend sends us
type RegisterRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents token return.
type LoginResponse struct {
	Token string `json:"token"`
}

// TradeRequest carries buy/sell details.
type TradeRequest struct {
	Symbol   string  `json:"symbol" binding:"required"`
	Quantity float64 `json:"quantity" binding:"required"`
	Price    float64 `json:"price" binding:"required"`
}

// TopUpRequest adds fake USD to wallet.
type TopUpRequest struct {
	Amount float64 `json:"amount" binding:"required"`
}

// PortfolioResponse aggregates wallet + holdings.
type PortfolioResponse struct {
	Balance  float64        `json:"balance"`
	Currency string         `json:"currency"`
	Holdings []HoldingEntry `json:"holdings"`
}

type HoldingEntry struct {
	Symbol          string  `json:"symbol"`
	Quantity        float64 `json:"quantity"`
	AverageBuyPrice float64 `json:"average_buy_price"`
}

type Order struct {
	ID        string   `json:"id"`
	UserID    string   `json:"user_id"`
	Symbol    string   `json:"symbol"`
	Side      string   `json:"side"` // buy, sell
	Type      string   `json:"type"` // market, limit, stop
	Quantity  float64  `json:"quantity"`
	Price     *float64 `json:"price,omitempty"` // For limit/stop
	Status    string   `json:"status"`          // pending, filled, cancelled
	CreatedAt string   `json:"created_at"`
}

type PlaceOrderRequest struct {
	Symbol   string   `json:"symbol" binding:"required"`
	Side     string   `json:"side" binding:"required,oneof=buy sell"`
	Type     string   `json:"type" binding:"required,oneof=market limit stop"`
	Quantity float64  `json:"quantity" binding:"required,gt=0"`
	Price    *float64 `json:"price"` // Required for limit/stop
}
