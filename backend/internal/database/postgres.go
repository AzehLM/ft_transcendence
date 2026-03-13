package database

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func readSecret(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		log.Fatalf("Security Error: Unable to read secret from %s: %v", path, err)
	}
	return strings.TrimSpace(string(data))
}

func InitDB() *gorm.DB {
	dbUserFile := os.Getenv("DB_USER_FILE")
	if dbUserFile == "" {
		log.Fatal("Configuration Error: DB_USER_FILE environment variable not set.")
	}
	dbUser := readSecret(dbUserFile)

	dbPwdFile := os.Getenv("DB_PWD_FILE")
	if dbPwdFile == "" {
		log.Fatal("Configuration Error: DB_PWD_FILE environment variable not set.")
	}
	dbPwd := readSecret(dbPwdFile)

	dbNameFile := os.Getenv("DB_NAME_FILE")
	if dbNameFile == "" {
		log.Fatal("Configuration Error: DB_NAME_FILE environment variable not set.")
	}
	dbName := readSecret(dbNameFile)

	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}
	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}

	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Europe/Paris",
		dbHost, dbUser, dbPwd, dbName, dbPort,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		PrepareStmt: true,
		Logger:      logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatalf("Critical DB Error: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get underlying sql.DB: %v", err)
	}
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	return db
}
