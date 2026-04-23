package handlers

import (
	"encoding/json"
	"sync"

	"github.com/gofiber/fiber/v3"
)

type serviceStatus struct {
	Liveness     bool              `json:"liveness"`
	Readiness    bool              `json:"readiness"`
	Degraded     bool              `json:"degraded"`
	Dependencies map[string]bool   `json:"dependencies"`
}

func (h *HealthHandler) Checker(c fiber.Ctx) error {

	var (
		mu sync.Mutex
		results = map[string]*serviceStatus{
			"auth":    nil,
			"orga":    nil,
			"storage": nil,
		}
	)

	services := map[string]string{
		"auth":    "http://auth:8081/health",
		"orga":    "http://orga:8082/health",
		"storage": "http://storage:8083/health",
	}

	var wg sync.WaitGroup

	// name = key, url = value
	for name, url := range services {
		wg.Go(func() {
			status := h.checkService(url)
			mu.Lock()
			results[name] = status
			mu.Unlock()
		})
	}

	wg.Wait()

	globalStatus := "ok"
	for _, s := range results {
		if s == nil || !s.Readiness {
			globalStatus = "error"
			break
		}
		if s.Degraded {
			globalStatus = "degraded"
		}
	}

	httpStatus := fiber.StatusOK
	if globalStatus == "error" {
		httpStatus = fiber.StatusServiceUnavailable
	}

	return c.Status(httpStatus).JSON(fiber.Map{
		"status":   globalStatus,
		"services": results,
	})
}

func (h *HealthHandler) checkService(url string) *serviceStatus {
	resp, err := h.httpClient.Get(url)
	if err != nil {
		return &serviceStatus{
			Liveness:  false,
			Readiness: false,
			Degraded:  false,
		}
	}

	defer resp.Body.Close()

	var status serviceStatus

	if err := json.NewDecoder(resp.Body).Decode(&status); err != nil {
		return &serviceStatus{
			Liveness:  true,
			Readiness: false,
			Degraded:  false,
		}
	}

	return &status
}
