# TOTP (QR Code 2FA) - Complete Implementation TODO

**Project:** ft_transcendence (Zero-Knowledge App)  
**Pivot Date:** May 6, 2026  
**Status:** Phase 1 - Backend Implementation

---

## Phase 1: Backend Core Services

### [x] Section 1.1: TOTP Service Package

- [x] Create file: `backend/auth/internal/service/totp_service.go`
  - [x] Struct: `TOTPService`
  - [x] Function: `GenerateTOTPSecret(userEmail string) (secret, qrCodeURL string, error)`
    - Generate random 32-byte secret
    - Create QR code data
    - Return both secret and QR URL
  - [x] Function: `VerifyTOTPCode(secret, userCode string) bool`
    - Verify 6-digit code matches current time window
    - Allow ±1 time window (for clock skew)
  - [x] Function: `GenerateRecoveryCodes(count int) []string`
    - Generate 10 random recovery codes
    - Format: ABC-123-DEF (user-friendly)
    - Return as plaintext array
  - [x] Function: `HashRecoveryCodes(codes []string) []byte`
    - Hash each code individually
    - Store as JSON blob or delimited format
    - Return hashed bytes for database

### [x] Section 1.2: Encryption Service Integration

- [x] Check: `backend/shared/crypto/` for existing encryption functions
  - [x] Use existing `encryptWithUserKey()` for TOTP secret
  - [x] Use existing `decryptWithUserKey()` for verification
  - [x] Ensure TOTP secret encrypted before database storage

### [x] Section 1.3: Create Auth Handlers - TOTP Endpoints

**File:** `backend/auth/internal/handlers/auth_handler.go` (extend existing)

#### Endpoint 1: Generate TOTP Secret

- [x] Function: `GenerateTOTPSecret(c fiber.Ctx) error`
  - [x] Extract user_id from JWT context
  - [x] Fetch user from database
  - [x] Check: If 2FA already enabled, return error
  - [x] Call: `totp_service.GenerateTOTPSecret(user.Email)`
  - [x] Store temp secret in memory (5 min expiry): `tempTOTPStore[userID] = secret`
  - [x] Response:
    ```json
    {
      "qrCode": "data:image/png;base64,...",
      "secret": "JBSWY3DPEBLW64TMMQ====",
      "message": "Scan QR with authenticator app",
      "expiresIn": 300
    }
    ```

#### Endpoint 2: Verify TOTP Setup

- [x] Function: `VerifyTOTPSetup(c fiber.Ctx) error`
  - [x] Extract user_id from JWT
  - [x] Parse request: `{ "code": "123456" }`
  - [x] Get temp secret from store: `tempTOTPStore[userID]`
  - [x] Check: Secret exists and not expired
  - [x] Call: `totp_service.VerifyTOTPCode(secret, code)`
  - [x] If invalid: Return 401 with error
  - [x] If valid:
    - [x] Encrypt secret: `encrypted = encryptWithUserKey(secret, user.PublicKey)`
    - [x] Generate recovery codes: `recoveryCodes = totp_service.GenerateRecoveryCodes(10)`
    - [x] Hash recovery codes: `hashedCodes = totp_service.HashRecoveryCodes(recoveryCodes)`
    - [x] Update user:
      ```go
      user.TwoFactorEnabled = true
      user.TOTPSecretEncrypted = encrypted
      user.RecoveryCodesHashed = hashedCodes
      db.Save(user)
      ```
    - [x] Delete temp secret: `delete(tempTOTPStore, userID)`
    - [x] Response: Return recovery codes (ONE-TIME display!)
      ```json
      {
        "success": true,
        "recoveryCodes": ["ABC-123-DEF", "XYZ-789-UVW", ...],
        "message": "Save these 10 codes in a safe place offline!"
      }
      ```

#### Endpoint 3: Verify TOTP During Login

- [x] Function: `VerifyTOTPLogin(c fiber.Ctx) error`
  - [x] Parse request: `{ "code": "123456" }`
  - [x] Get temp_user_id from temporary session (from login step)
  - [x] Fetch user from database
  - [x] Decrypt TOTP secret: `secret = decryptWithUserKey(user.TOTPSecretEncrypted, derivedKey)`
  - [x] Verify code: `totp_service.VerifyTOTPCode(secret, code)`
  - [x] If invalid:
    - [x] Increment failed attempts counter
    - [x] If > 3 attempts: Lock for 5 minutes
    - [x] Return 401 with error
  - [x] If valid:
    - [x] Delete temp session
    - [x] Generate full JWT
    - [x] Response:
      ```json
      {
        "token": "eyJhbGciOiJIUzI1NiIs...",
        "message": "Logged in successfully"
      }
      ```

#### Endpoint 4: Verify Recovery Code

- [x] Function: `VerifyRecoveryCode(c fiber.Ctx) error`
  - [x] Parse request: `{ "code": "ABC-123-DEF" }`
  - [x] Get temp_user_id from temporary session
  - [x] Fetch user from database
  - [x] Parse recovery codes: `codes = parseRecoveryCodes(user.RecoveryCodesHashed)`
  - [x] Find and verify code:
    - [x] For each code:
      - [x] Hash provided code
      - [x] Compare with stored hash
    - [x] If no match: Return 401
    - [x] If match:
      - [x] Mark as used (remove from list)
      - [x] Re-hash remaining codes
      - [x] Save updated codes to database
  - [x] Response:
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIs...",
      "remaining": 9,
      "warning": "Use an authenticator app to add a new recovery code"
    }
    ```

#### Endpoint 5: Get Recovery Codes Status

- [x] Function: `GetRecoveryCodesStatus(c fiber.Ctx) error`
  - [x] Extract user_id from JWT
  - [x] Fetch user from database
  - [x] Parse recovery codes
  - [x] Count remaining
  - [x] Response:
    ```json
    {
      "enabled": true,
      "remaining": 8,
      "message": "You have 8 backup codes remaining"
    }
    ```

#### Endpoint 6: Disable 2FA

- [x] Function: `DisableTwoFactor(c fiber.Ctx) error`
  - [x] Extract user_id from JWT
  - [x] Parse request: `{ "password": "current_password" }`
  - [x] Verify current password
  - [x] If invalid: Return 401
  - [x] If valid:
    - [x] Update user:
      ```go
      user.TwoFactorEnabled = false
      user.TOTPSecretEncrypted = nil
      user.RecoveryCodesHashed = nil
      db.Save(user)
      ```
    - [x] Response:
      ```json
      {
        "success": true,
        "message": "2FA has been disabled"
      }
      ```

---

## Phase 2: Update Login Flow

### [x] Section 2.1: Modify Login Handler

- [x] File: `backend/auth/internal/handlers/auth_handler.go`
- [x] Function: `LoginUser(c fiber.Ctx)` - UPDATE
  - [x] After password verification:
    - [x] Check: `if user.TwoFactorEnabled`
    - [x] If NO 2FA:
      - [x] Generate full JWT
      - [x] Return JWT directly
    - [x] If YES 2FA:
      - [x] Generate temporary session token (5 min expiry)
      - [x] Store in memory: `tempSessions[tempToken] = userID`
      - [x] Response:
        ```json
        {
          "require2FA": true,
          "tempToken": "temp_xyz_123",
          "methods": ["totp", "recovery"],
          "expiresIn": 300
        }
        ```

### [x] Section 2.2: Create Middleware for Temp Sessions

- [x] File: `backend/shared/middleware/temp_session.go` (new)
- [x] Function: `VerifyTempSession()` middleware
  - [x] Extract tempToken from request header
  - [x] Check: Token exists in `tempSessions`
  - [x] Check: Token not expired
  - [x] Extract userID
  - [x] Set in context: `c.Locals("temp_user_id", userID)`
  - [x] Continue
  - [x] If invalid: Return 401

### [x] Section 2.3: Route Updates in main.go

- [x] Add temp session middleware to TOTP endpoints:
  ```go
  api.Post("/auth/2fa/totp/verify", middleware.VerifyTempSession(), authHandler.VerifyTOTPLogin)
  api.Post("/auth/2fa/recovery-code", middleware.VerifyTempSession(), authHandler.VerifyRecoveryCode)
  ```

---

## Phase 3: Testing & Validation

### [x] Section 3.1: Manual Testing with Postman

- [x] Test: Generate TOTP Secret
  - [x] Request: `POST /api/auth/2fa/totp/generate`
  - [x] Verify: QR code returned
  - [x] Verify: Secret returned
  - [x] Verify: Can scan QR with phone app

- [x] Test: Verify TOTP Setup
  - [x] Get code from authenticator app
  - [x] Request: `POST /api/auth/2fa/totp/verify` with code
  - [x] Verify: 200 OK with recovery codes
  - [x] Verify: User.TwoFactorEnabled = true in DB

- [x] Test: Login with 2FA
  - [x] Request: `POST /api/auth/login` with email + password
  - [x] Verify: Returns `require2FA: true` + tempToken
  - [x] Request: `POST /api/auth/2fa/verify` with TOTP code + tempToken
  - [x] Verify: Returns full JWT
  - [x] Verify: Can use JWT for protected endpoints

- [x] Test: Login with Recovery Code
  - [x] Repeat login flow
  - [x] Instead of TOTP: `POST /api/auth/2fa/recovery-code`
  - [x] Verify: Returns full JWT
  - [x] Verify: Recovery code marked as used

- [x] Test: Invalid Code
  - [x] Request with wrong TOTP code
  - [x] Verify: 401 error
  - [x] Verify: Can retry

- [x] Test: Rate Limiting
  - [x] Try 4 invalid codes rapidly
  - [x] Verify: Locked for 5 minutes
  - [x] Verify: Returns rate limit error

- [x] Test: Disable 2FA
  - [x] Request: `POST /api/auth/2fa/disable` with password
  - [x] Verify: 200 OK
  - [x] Verify: User.TwoFactorEnabled = false in DB
  - [x] Login without 2FA (should work)

### [x] Section 3.2: Edge Cases

- [x] Test: Expired temp session
  - [x] Generate temp token
  - [x] Wait 5+ minutes
  - [x] Try to use: should fail

- [x] Test: Multiple 2FA setup attempts
  - [x] Generate secret 1
  - [x] Generate secret 2
  - [x] Only use secret 2: should work

- [x] Test: All recovery codes used
  - [x] Use all 10 recovery codes
  - [x] Try 11th: should fail

- [x] Test: TOTP time sync
  - [x] Code from phone
  - [x] Wait 25 seconds (within 30-sec window)
  - [x] Should still work

---

## Phase 4: Error Handling & Security

### [x] Section 4.1: Error Responses

- [x] Create consistent error responses:
  - [x] 400: Invalid request format
  - [x] 401: Authentication failed (invalid code, expired session)
  - [x] 429: Rate limited (too many attempts)
  - [x] 500: Server error

### [x] Section 4.2: Security Logging

- [x] Log all 2FA events:
  - [x] When TOTP setup started
  - [x] When TOTP verified successfully
  - [x] When 2FA disabled
  - [x] When invalid codes attempted
  - [x] When rate limit triggered

### [x] Section 4.3: Validate HTTPS

- [x] Check: Caddy config enforces HTTPS
- [x] Verify: No HTTP fallback for 2FA endpoints

---

## Phase 5: Frontend Preparation (Placeholders)

### [x] Section 5.1: API Service Layer

- [x] File: `frontend/src/services/totp.service.ts`
  - [x] Function: `generateTOTPSecret()` → GET QR code
  - [x] Function: `verifyTOTPSetup(code)` → POST code
  - [x] Function: `verifyTOTPLogin(code, tempToken)` → POST code
  - [x] Function: `verifyRecoveryCode(code, tempToken)` → POST code
  - [x] Function: `getRecoveryStatus()` → GET status
  - [x] Function: `disableTwoFactor(password)` → POST disable

### [x] Section 5.2: UI Components (Placeholder)

- [x] Create: `SetupTOTP.tsx` component
  - [x] Display QR code
  - [x] Show manual secret option
  - [x] Input for verification code
  - [x] Display recovery codes

- [x] Create: `VerifyTOTP.tsx` component
  - [x] Input for 6-digit code
  - [x] Link to recovery code fallback
  - [x] Loading state

---

## Dependency Installation

### [ ] Install Required Packages

```bash
# Already added to go.mod
# But verify it's installed:
go get github.com/pquerna/otp
go get github.com/pquerna/otp/totp

# Optional (for QR code images):
go get github.com/skip2/go2-qr/qr
```

---

## Checklist Summary

### Backend Core
- [x] TOTP Service created
- [x] 6 HTTP handlers created
- [x] Login flow updated
- [x] Temporary session middleware created
- [x] Routes registered in main.go

### Testing
- [x] All 6 endpoints tested manually
- [x] Edge cases tested
- [x] Error handling verified
- [x] Rate limiting verified

### Security
- [ ] HTTPS enforced
- [ ] Events logged
- [ ] Error responses consistent

### Frontend (Later)
- [x] API service layer created
- [ ] UI components created

---

## Estimated Timeline

| Phase | Task | Duration |
|-------|------|----------|
| 1 | TOTP Service + Handlers | 3-4 hours |
| 2 | Login Flow + Middleware | 1-2 hours |
| 3 | Manual Testing | 1-2 hours |
| 4 | Error Handling + Logging | 1 hour |
| 5 | Frontend (Next sprint) | 2-3 hours |
| **Total** | | **8-12 hours** |

---

## Success Criteria

✅ **Done when:**
- [ ] All 6 endpoints working
- [ ] All manual tests passing
- [ ] Rate limiting working
- [ ] Temporary sessions working
- [ ] Recovery codes working
- [ ] 2FA can be enabled/disabled
- [ ] Documentation updated
- [ ] No compilation errors
