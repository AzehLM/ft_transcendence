package main

import (
	"fmt"
	"log"
	"os/user"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)


func SetupDatabase() (*gorm.DB, error) {

	fmt.Printf("-------------------\n")
	host :=""
	port := ""
	user := ""
	password := ""
	dbname := ""

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s",
		host, port, user, password, dbname,
	)

	fmt.Println(dsn)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	return db, nil
}

func main() {
	db, err := SetupDatabase()
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	if err := db.AutoMigrate(&user.User{}); err != nil {
		log.Fatalf("auto migrate failed: %v", err)
	}
	fmt.Printf("YESSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS\n")

}
