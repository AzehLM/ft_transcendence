package service

import (

	"crypto/rand"
    "fmt"
	"encoding/json" 
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
)

type TOTPService struct {
//nothing for now

}

func (s *TOTPService) GenerateTOTPSecret(userEmail string) (string, string, error) {

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer: "ostrom",
		AccountName: userEmail,
	})

	if err != nil {
		return "","", err
	}

	return key.Secret(), key.URL(), nil
}

func (s *TOTPService) VerifyTOTPCode(secret, userCode string) bool {

	return totp.Validate(userCode, secret)

}

func (s *TOTPService) GenerateRecoveryCodes(count int) []string {

    codes := make([]string, count)
    letters := "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    digits := "0123456789"

    for i := 0; i < count; i++ {
        part1 := s.randomString(3, letters)
        part2 := s.randomString(3, digits)
        part3 := s.randomString(3, letters)

        codes[i] = fmt.Sprintf("%s-%s-%s", part1, part2, part3)
    }

    return codes
}


func (s *TOTPService) randomString(length int, charset string) string {
    result := ""
    randomByte := make([]byte, length)
    rand.Read(randomByte)
    
    for i := 0; i < length; i++ {
        randomIndex := int(randomByte[i]) % len(charset)
        result += string(charset[randomIndex])
    }
    return result
}




func (s *TOTPService) HashRecoveryCodes(codes []string) ([]byte, error) {

	hashedCodes := make([]string, len(codes))
    
    for i, code := range codes {
        hash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
        if err != nil {
            return nil, err
        }
        hashedCodes[i] = string(hash)
    }
    
    return json.Marshal(hashedCodes)

} 