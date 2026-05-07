package service

import (
	"github.com/pquerna/otp/totp"
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

}

func (s *TOTPService) GenerateRecoveryCodes(count int) []string {

}


func (s *TOTPService) HashRecoveryCodes(codes []string) []byte {

} 