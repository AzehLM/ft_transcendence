package handlers

import (
	"backend/shared/config"

	"github.com/minio/minio-go/v7"

	"gorm.io/gorm"
)

type RegisterRequest struct {
	Email               string `json:"email"`
	ClientSalt          string `json:"salt"`
	AuthHash            string `json:"auth_hash"`
	PublicKey           string `json:"public_key"`
	EncryptedPrivateKey string `json:"encrypted_private_key"`
	Iv                  string `json:"iv"`
}

type SaltRequest struct {
	Email string `json:"email"`
}

type AuthHandler struct {
	DB          *gorm.DB
	Env         *config.Env
	MinioClient *minio.Client
}

type LoginRequest struct {
	Email    string `json:"email"`
	AuthHash string `json:"auth_hash"`
}

type UpdatePasswordRequest struct {
	OldAuthHash         string `json:"old_auth_hash"`
	NewAuthHash         string `json:"new_auth_hash"`
	NewClientSalt       string `json:"new_client_salt"`
	NewIv               string `json:"new_iv"`
	NewEncryptedPrivKey string `json:"new_encrypted_private_key"`
}

func NewAuthHandler(db *gorm.DB, env *config.Env, minioClient *minio.Client) *AuthHandler {
	return &AuthHandler{
		DB:          db,
		Env:         env,
		MinioClient: minioClient,
	}
}
