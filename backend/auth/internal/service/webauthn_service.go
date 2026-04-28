package service


type WebAuthnService struct {
    webauthn          *webauthn.WebAuthn        
    challengeStore    map[string][]byte 
}

func NewWebAuthnService(rpID, rpName, origin string) (*WebAuthnService, error) {
    // Use the webauthn library to create an instance
    // Store it in the struct
    // Return the service
}

func (s *WebAuthnService) StoreChallenge(userID string, challenge []byte) {
    // Save challenge to challengeStore
}

func (s *WebAuthnService) GetChallenge(userID string) ([]byte, bool) {
    // Get challenge from challengeStore
    // Return it and a boolean saying if it exists
}