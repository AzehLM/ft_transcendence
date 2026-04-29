package service

import (
	"encoding/json"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
)

type WebAuthnService struct {
	webauthn       *webauthn.WebAuthn
	challengeStore map[string][]byte
	sessionStore   map[string][]byte // Store SessionData as JSON bytes
}

func NewWebAuthnService(rpID, rpName, origin string) (*WebAuthnService, error) {
	wconfig := &webauthn.Config{
		RPID:     rpID,   // e.g., "example.com"
		RPName:   rpName, // e.g., "ft_box"
		RPOrigin: origin, // e.g., "https://example.com"
	}

	wa, err := webauthn.New(wconfig)
	if err != nil {
		return nil, err
	}

	return &WebAuthnService{
		webauthn:       wa,
		challengeStore: make(map[string][]byte),
		sessionStore:   make(map[string][]byte),
	}, nil
}

func (s *WebAuthnService) StoreChallenge(userID string, challenge []byte) {
	s.challengeStore[userID] = challenge
}

func (s *WebAuthnService) GetChallenge(userID string) ([]byte, bool) {
	challenge, exists := s.challengeStore[userID]
	if exists {
		// Remove challenge after retrieval (one-time use)
		delete(s.challengeStore, userID)
	}
	return challenge, exists
}

func (s *WebAuthnService) BeginRegistration(user *webauthn.User) (*protocol.CredentialCreation, error) {
	options, session, err := s.webauthn.BeginRegistration(user)
	if err != nil {
		return nil, err
	}

	// Store session data as JSON for later verification
	sessionJSON, err := json.Marshal(session)
	if err != nil {
		return nil, err
	}
	s.sessionStore[string(user.ID)] = sessionJSON

	return options, nil
}

// GetSession retrieves and removes the session data for a user
func (s *WebAuthnService) GetSession(userID string) (*webauthn.SessionData, bool) {
	sessionJSON, exists := s.sessionStore[userID]
	if !exists {
		return nil, false
	}

	// Remove session after retrieval (one-time use)
	delete(s.sessionStore, userID)

	var session webauthn.SessionData
	err := json.Unmarshal(sessionJSON, &session)
	if err != nil {
		return nil, false
	}

	return &session, true
}

// FinishRegistration verifies the attestation response and extracts the credential
func (s *WebAuthnService) FinishRegistration(user *webauthn.User, session *webauthn.SessionData, response *protocol.ParsedAttestationResponse) (*webauthn.Credential, error) {
	credential, err := s.webauthn.ValidateRegistration(user, session, response)
	if err != nil {
		return nil, err
	}

	return credential, nil
}

func (s *WebAuthnService) BeginAuthentication(user *webauthn.User) (*protocol.CredentialAssertion, error) {
	options, session, err := s.webauthn.BeginLogin(user)
	if err != nil {
		return nil, err
	}

	s.StoreChallenge(user.ID, session.Challenge)

	return options, nil // Options = Everything the browser needs to know to prompt the user for biometric
}
