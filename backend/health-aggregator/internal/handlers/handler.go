package handlers

import (
	"net/http"
	"time"
)

type HealthHandler struct {
	httpClient *http.Client
}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{
		httpClient: &http.Client{Timeout: 3 * time.Second},
	}
}
