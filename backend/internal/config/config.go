package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Env struct {
	PostgresHost     string
	PostgresPort     string
	PostgresUser     string
	PostgresPassword string
	PostgresDBname   string
}

func LoadEnv() (*Env, error) {
	_ = godotenv.Load()

	env := &Env{
		PostgresHost:     os.Getenv("PostgresHost"),
		PostgresPort:     os.Getenv("PostgresPort"),
		PostgresUser:     os.Getenv("PostgresUser"),
		PostgresPassword: os.Getenv("PostgresPassword"),
		PostgresDBname:   os.Getenv("PostgresDBname"),
	}

	if env.PostgresDBname == "" || env.PostgresHost == "" || env.PostgresPassword == "" || env.PostgresPort == "" || env.PostgresUser == "" {
		return nil, fmt.Errorf("missing required environment variable(s): PostgresHost, PostgresPort, PostgresUser, PostgresPassword, PostgresDBname")
	}

	return env, nil
}
