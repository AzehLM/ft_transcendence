package service

import (
	"crypto/rand"
	"encoding/json"
	"fmt"

	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
)

type TOTPService struct {
	//nothing for now
}

func (s *TOTPService) GenerateTOTPSecret(userEmail string) (string, string, error) {

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "ostrom",
		AccountName: userEmail,
	})

	if err != nil {
		return "", "", err
	}

	return key.Secret(), key.URL(), nil
}

func (s *TOTPService) VerifyTOTPCode(secret, userCode string) bool {
	return totp.Validate(userCode, secret)
}

func (s *TOTPService) GenerateRecoveryCodes(count int) ([]string, error) {
	codes := make([]string, count)
	letters := "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	digits := "0123456789"

    for i := 0; i < count; i++ {
	part1, err := s.randomString(3, letters)
 		if err != nil {
 			return nil, err
 		}
 		part2, err := s.randomString(3, digits)
 		if err != nil {
 			return nil, err
 		}
 		part3, err := s.randomString(3, letters)
 		if err != nil {
 			return nil, err
 		}

		codes[i] = fmt.Sprintf("%s-%s-%s", part1, part2, part3)
	}

	return codes, nil
}

func (s *TOTPService) randomString(length int, charset string) (string, error) {
	result := ""
	randomByte := make([]byte, length)
	if _, err := rand.Read(randomByte); err != nil {
		return "", err
	}
	for i := range length {
		randomIndex := int(randomByte[i]) % len(charset)
		result += string(charset[randomIndex])
	}
	return result, nil
}

func (s *TOTPService) HashRecoveryCodes(codes []string) ([]byte, error) {

	hashedCodes := make([][]byte, len(codes))

	for i, code := range codes {
		hash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		hashedCodes[i] = hash
	}

	return json.Marshal(hashedCodes)
}
