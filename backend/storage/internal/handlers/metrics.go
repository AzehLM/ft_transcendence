package handlers

import (
	"backend/storage/internal/metrics"

	"github.com/gofiber/fiber/v3"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/valyala/fasthttp/fasthttpadaptor"
	"gorm.io/gorm"
)

type MetricsHandler struct {
	handler	fiber.Handler
}

func NewMetricsHandler(db *gorm.DB) *MetricsHandler {
	collector := metrics.NewStorageCollector(db)
	prometheus.MustRegister(collector)

	h := fasthttpadaptor.NewFastHTTPHandler(promhttp.Handler())
	return &MetricsHandler{
		handler: func(c fiber.Ctx) error {
			h(c.RequestCtx())
			return nil
		},
	}
}

func (h *MetricsHandler) Serve(c fiber.Ctx) error {
	return h.handler(c)
}
