package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/sahniaditya/flux-backend/handlers" // Import handlers
)

func main() {
	if err := godotenv.Load(".env"); err != nil {
		log.Println("Warning: No .env file found")
	}

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"), os.Getenv("DB_NAME"))

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Failed to connect to DB:", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping DB:", err)
	}
	fmt.Println("✅ Successfully connected to Postgres!")

	r := gin.Default()

	// ROUTES
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "active"})
	})

	// Auth Routes
	r.POST("/register", handlers.RegisterUser(db))
	r.POST("/login", handlers.LoginUser(db))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	r.Run(":" + port)
}
