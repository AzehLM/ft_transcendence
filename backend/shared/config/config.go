package config

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Env struct {
	PostgresHost		string
	PostgresPort		string
	PostgresUser		string
	PostgresPassword	string
	PostgresDBname		string
	JwtSecret			string
	RedisPassword		string
	RedisPort			string
	MinioPort			string
}

func LoadEnv() (*Env, error) {
	_ = godotenv.Load()

	postgresPassword, err := ReadSecret("postgres_pwd")
	if  err != nil {
		log.Fatalf("[FATAL] Could not read Postgres password secret: %v", err)
	}

	postgresUser, err := ReadSecret("postgres_user")
	if  err != nil {
		log.Fatalf("[FATAL] Could not read Postgres user secret: %v", err)
	}

	jwtSecret, err := ReadSecret("jwt_secret")
	if  err != nil {
		log.Fatalf("[FATAL] Could not read JWT secret secret: %v", err)
	}

	redisPassword, err := ReadSecret("redis_pwd")
	if  err != nil {
		log.Fatalf("[FATAL] Could not read Redis password secret: %v", err)
	}

	env := &Env{
		PostgresHost:		os.Getenv("POSTGRES_HOST"),
		PostgresPort:		os.Getenv("POSTGRES_PORT"),
		PostgresDBname:		os.Getenv("POSTGRES_DB_NAME"),
		PostgresUser:		postgresUser,
		PostgresPassword:	postgresPassword,
		JwtSecret:			jwtSecret,
		RedisPassword:		redisPassword,
		RedisPort:			os.Getenv("REDIS_PORT"),
		MinioPort:			os.Getenv("MINIO_PORT"),
	}

	if env.PostgresDBname == "" || env.PostgresHost == "" || env.PostgresPassword == "" ||
		env.PostgresPort == "" || env.PostgresUser == "" || env.JwtSecret == "" ||
		env.RedisPassword == "" || env.RedisPort == "" || env.MinioPort == "" {
		return nil, fmt.Errorf("missing required environment variable(s): PostgresHost, PostgresPort, PostgresUser, PostgresPassword, PostgresDBname, JwtSecret, RedisPassword, RedisPort, MinioPort")
	}

	return env, nil
}


func ReadSecret(name string) (string, error) {
	data, err := os.ReadFile("/run/secrets/" + name)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(data)) , nil
}
