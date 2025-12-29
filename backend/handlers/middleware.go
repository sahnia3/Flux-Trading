package handlers

import (
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// AuthMiddleware validates JWT and injects user_id into context.
func AuthMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if auth == "" || !strings.HasPrefix(strings.ToLower(auth), "bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}
		tokenStr := strings.TrimSpace(auth[7:])

		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}
		if expRaw, ok := claims["exp"]; ok {
			switch exp := expRaw.(type) {
			case float64:
				if int64(exp) < time.Now().Unix() {
					c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token expired"})
					return
				}
			}
		}
		userID, _ := claims["sub"].(string)
		if userID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}
		c.Set("user_id", userID)
		c.Next()
	}
}

// GenerateToken issues a short-lived JWT.
func GenerateToken(userID string) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "dev-secret"
	}
	claims := jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(24 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
