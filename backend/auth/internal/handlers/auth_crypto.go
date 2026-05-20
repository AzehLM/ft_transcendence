package handlers

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"log"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/pbkdf2"
)

func hashWithArgon2id(clientAuthHash string) (string, string, error) {

	serverSalt := make([]byte, 16)
	if _, err := rand.Read(serverSalt); err != nil {
		return "", "", err
	}

	var timeCost uint32 = 2
	var memory uint32 = 32768 // 32 MB
	var threads uint8 = 4
	var keyLen uint32 = 32 // 256 bits output

	hash := argon2.IDKey([]byte(clientAuthHash), serverSalt, timeCost, memory, threads, keyLen)

	return base64.StdEncoding.EncodeToString(hash), base64.StdEncoding.EncodeToString(serverSalt), nil
}

func verifyArgon2idHash(clientAuthHash string, serverSalt []byte, storedHashHex string) bool {
	var timeCost uint32 = 2
	var memory uint32 = 32768
	var threads uint8 = 4
	var keyLen uint32 = 32

	computedHash := argon2.IDKey([]byte(clientAuthHash), serverSalt, timeCost, memory, threads, keyLen)
	computedHashHex := base64.StdEncoding.EncodeToString(computedHash)

	return subtle.ConstantTimeCompare([]byte(computedHashHex), []byte(storedHashHex)) == 1
}

func hashToken(rawToken string) string {
	hash := sha256.Sum256([]byte(rawToken))
	return base64.StdEncoding.EncodeToString(hash[:])
}

func encryptTOTPSecret(secret string, clientSalt []byte, userID string) ([]byte, error) {

	log.Printf("[DEBUG] encryptTOTPSecret START - userID=%s, saltLen=%d", userID, len(clientSalt))

	key := pbkdf2.Key(
		[]byte(userID),
		clientSalt,
		100000,
		32,
		sha256.New,
	)

	log.Printf("[DEBUG] encryptTOTPSecret - derived key hash=%x", key[:8])

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	iv := make([]byte, 12)
	if _, err := rand.Read(iv); err != nil {
		return nil, err
	}

	ciphertext := gcm.Seal(iv, iv, []byte(secret), nil)

	log.Printf("[DEBUG] encryptTOTPSecret - result len=%d, iv=%x, secret=%s", len(ciphertext), iv, secret)

	return ciphertext, nil
}

func decryptTOTPSecret(encryptedSecret []byte, clientSalt []byte, userID string) (string, error) {

	// Check if encrypted secret is valid
	if len(encryptedSecret) < 12 {
		return "", fmt.Errorf("invalid_encrypted_secret: too short")
	}

	log.Printf("[DEBUG] decryptTOTPSecret START - encryptedLen=%d, saltLen=%d, userID=%s, userIDLen=%d",
		len(encryptedSecret), len(clientSalt), userID, len(userID))

	key := pbkdf2.Key(
		[]byte(userID),
		clientSalt,
		100000,
		32,
		sha256.New,
	)

	log.Printf("[DEBUG] decryptTOTPSecret - derived key hash=%x", key[:8])

	block, err := aes.NewCipher(key)
	if err != nil {
		log.Printf("[ERROR] AES cipher creation failed: %v", err)
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		log.Printf("[ERROR] GCM creation failed: %v", err)
		return "", err
	}

	iv := encryptedSecret[:12]
	ciphertext := encryptedSecret[12:]

	log.Printf("[DEBUG] extracted iv=%d bytes, ciphertext=%d bytes", len(iv), len(ciphertext))

	// Decrypt
	plaintext, err := gcm.Open(nil, iv, ciphertext, nil)
	if err != nil {
		log.Printf("[ERROR] GCM.Open failed: %v (iv=%x, ciphertext_first_16=%x)",
			err, iv, ciphertext[:min(16, len(ciphertext))])
		return "", err
	}

	log.Printf("[DEBUG] decryption successful, plaintext=%s", string(plaintext))

	return string(plaintext), nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
