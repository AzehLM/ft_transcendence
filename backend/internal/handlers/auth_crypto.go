package handlers

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"

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

	return hex.EncodeToString(hash), hex.EncodeToString(serverSalt), nil
}

func verifyArgon2idHash(clientAuthHash string, serverSalt []byte, storedHashHex string) bool {
	var timeCost uint32 = 2
	var memory uint32 = 32768
	var threads uint8 = 4
	var keyLen uint32 = 32

	computedHash := argon2.IDKey([]byte(clientAuthHash), serverSalt, timeCost, memory, threads, keyLen)
	computedHashHex := hex.EncodeToString(computedHash)

	return subtle.ConstantTimeCompare([]byte(computedHashHex), []byte(storedHashHex)) == 1
}
