package config


import (
	"os"
	"fmt"
	"github.com/joho/godotenv"
)

type Env struct {
	PostgresHost     string
	PostgresPort     string
	PostgresUser     string
	PostgresPassword string
	PostgresDBname   string
	JwtSecret        string
}

func LoadEnv() (*Env, error) {
	_ = godotenv.Load("../../../../../.env")

	env := &Env{
		PostgresHost:     os.Getenv("POSTGRES_HOST"),
		PostgresPort:     os.Getenv("POSTGRES_PORT"),
		PostgresUser:     os.Getenv("POSTGRES_USER"),
		PostgresPassword: os.Getenv("POSTGRES_PASSWORD"),
		PostgresDBname:   os.Getenv("POSTGRES_DB_NAME"),
	}

	if env.PostgresDBname == "" || env.PostgresHost == "" || env.PostgresPassword == "" || env.PostgresPort == "" || env.PostgresUser == "" {
		return nil, fmt.Errorf("missing required environment variable(s): PostgresHost, PostgresPort, PostgresUser, PostgresPassword, PostgresDBname")
	}

	return env, nil
}