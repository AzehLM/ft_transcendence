package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"

	"golang.org/x/crypto/argon2"
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
