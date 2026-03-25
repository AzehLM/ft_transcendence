package handlers

import (
	"auth/backend/services/auth/internal/models"
	"log"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
)

func setRefreshTokenCookie(c fiber.Ctx, token string) {
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    token,
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HTTPOnly: true,
		Secure:   true, // test avec caddy
		SameSite: "Strict",
	})
}

func clearRefreshTokenCookie(c fiber.Ctx) {
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Secure:   true, // test avec caddy
		SameSite: "Strict",
	})
}

func (h *AuthHandler) LogoutUser(c fiber.Ctx) error {
	cookieToken := c.Cookies("refresh_token")

	if cookieToken == "" {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "already_logged_out",
		})
	}

	err := h.DB.Model(&models.User{}).
		Where("refresh_token = ?", cookieToken).
		Update("refresh_token", nil).Error

	if err != nil {
		log.Printf("[WARN] Logout: Could not clear token in DB: %v\n", err)
	}

	clearRefreshTokenCookie(c)

	log.Printf("[INFO] User logged out successfully (token cleared)")
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "logged_out_successfully",
	})
}

func (h *AuthHandler) RefreshToken(c fiber.Ctx) error {

	cookieToken := c.Cookies("refresh_token")

	if cookieToken == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "missing_refresh_token",
		})
	}

	var user models.User
	if err := h.DB.Where("refresh_token = ?", cookieToken).First(&user).Error; err != nil {

		clearRefreshTokenCookie(c)

		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "invalid_refresh_token",
		})
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":    user.ID.String(),
		"user_email": user.Email,
		"exp":        time.Now().Add(15 * time.Minute).Unix(),
	})

	jwtSecret := []byte(h.Env.JwtSecret)
	accessToken, err := token.SignedString(jwtSecret)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "token_generation_failed"})
	}

	log.Printf("[INFO] Access token refreshed for %s", user.Email)
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"access_token": accessToken,
	})
}
