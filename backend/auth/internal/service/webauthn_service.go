package service

import (
    "github.com/go-webauthn/webauthn/webauthn"
    "github.com/go-webauthn/webauthn/protocol"
)

type WebAuthnService struct {
    webauthn          *webauthn.WebAuthn        
    challengeStore    map[string][]byte 
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

    s.StoreChallenge(user.ID, session.Challenge)

    return options, nil
}


func (s *WebAuthnService) BeginAuthentication(user *webauthn.User) (*protocol.CredentialAssertion, error) {
    options, session, err := s.webauthn.BeginLogin(user)
    if err != nil {
        return nil, err
    }

    s.StoreChallenge(user.ID, session.Challenge)

    return options, nil // Options = Everything the browser needs to know to prompt the user for biometric
}