package main

import (
	"log"

	"ft_transcendence/backend/internal/database"
)

func main() {
	log.Println("Attempting to connect to the database...")
	db := database.InitDB()

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get underlying sql.DB: %v", err)
	}
	defer sqlDB.Close()

	err = sqlDB.Ping()
	if err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Println("Database connection successful!")
}
