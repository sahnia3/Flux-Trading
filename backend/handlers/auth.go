package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sahniaditya/flux-backend/models" // Make sure this matches your go.mod module name
	"golang.org/x/crypto/bcrypt"
)

// RegisterUser handles creating a new user + wallet atomically
func RegisterUser(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.RegisterRequest

		// 1. Parse JSON Request
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}

		// 2. Hash Password (Security Best Practice)
		hashedPwd, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}

		// 3. START TRANSACTION (ACID Compliance)
		// This ensures we don't create a user without a wallet
		tx, err := db.Begin()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}
		// Defer rollback in case of panic/error
		defer tx.Rollback()

		// 4. Insert User
		var userID string
		err = tx.QueryRow(`
			INSERT INTO users (email, password_hash) 
			VALUES ($1, $2) 
			RETURNING id`,
			req.Email, string(hashedPwd)).Scan(&userID)

		if err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
			return
		}

		// 5. Create Wallet with $100k Paper Money
		_, err = tx.Exec(`
			INSERT INTO wallets (user_id, balance, currency) 
			VALUES ($1, 100000.00, 'USD')`,
			userID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create wallet"})
			return
		}

		// 6. COMMIT TRANSACTION
		if err := tx.Commit(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
			return
		}

		token, err := GenerateToken(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to issue token"})
			return
		}

		// Success Response
		c.JSON(http.StatusCreated, gin.H{
			"message": "User registered successfully",
			"user_id": userID,
			"balance": 100000.00,
			"token":   token,
		})
	}
}

// LoginUser is a simplified login (for now, returns UserID)
func LoginUser(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}

		// Get User by Email
		var user models.User
		var storedHash string
		err := db.QueryRow("SELECT id, password_hash FROM users WHERE email=$1", req.Email).Scan(&user.ID, &storedHash)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}

		// Compare Hash
		if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		token, err := GenerateToken(user.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to issue token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Login successful",
			"user_id": user.ID,
			"token":   token,
		})
	}
}
