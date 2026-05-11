package metrics

import (
	"context"
	"log"

	"github.com/google/uuid"
	"github.com/prometheus/client_golang/prometheus"
	"gorm.io/gorm"
)

type StorageCollector struct {
	db			*gorm.DB
	usedSpace	*prometheus.Desc
	maxSpace	*prometheus.Desc
}

func NewStorageCollector(db *gorm.DB) *StorageCollector {
	return &StorageCollector{
		db: db,
		usedSpace: prometheus.NewDesc(
			"ostrom_user_used_space_bytes",
			"Bytes used by the user",
			[]string{"user_id"},
			nil,
		),
		maxSpace: prometheus.NewDesc(
			"ostrom_user_max_space_bytes",
			"Max storage quota for the user in bytes",
			[]string{"user_id"},
			nil,
		),
	}
}

func (c *StorageCollector) Describe(ch chan<- *prometheus.Desc) {
	ch <- c.usedSpace
	ch <- c.maxSpace
}

func (c *StorageCollector) Collect(ch chan<- prometheus.Metric) {
	var users []struct {
		ID			uuid.UUID
		UsedSpace	int64
		MaxSpace	int64
	}

	err := c.db.WithContext(context.Background()).
		Table("users").
		Select("id, used_space, max_space").
		Find(&users).Error

	if err != nil {
		log.Printf("[WARN] metrics: failed to collect user space: %v", err)
		return
	}

	for _, u := range users {
		ch <- prometheus.MustNewConstMetric(
			c.usedSpace,
			prometheus.GaugeValue,
			float64(u.UsedSpace),
			u.ID.String(),
		)
		ch <- prometheus.MustNewConstMetric(
			c.maxSpace,
			prometheus.GaugeValue,
			float64(u.MaxSpace),
			u.ID.String(),
		)
	}
}

// compile-time check.
var _ prometheus.Collector = (*StorageCollector)(nil)
/*
	Forces the compiler to check that the *StorageCollector interface implementation
	really has Describe and Collect methods.
	There is no other way around this; this is how it works. It can be confusing at first,
	but here is a schema of how the Prometheus Go library works:

	NewMetricsHandler(db) creates the struct -> prometheus.MustRegister registers the handler

	Then, when Prometheus scrapes, it internally does:
	promhttp.Handler() -> registry.Gather() -> StorageCollector.Describe() then .Collect()

	Those methods are called automatically via metricsHandler.Serve in main
	and returned in the Fiber context.
*/
