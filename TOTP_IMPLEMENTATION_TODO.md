# TOTP (QR Code 2FA) - Complete Implementation TODO

**Project:** ft_transcendence (Zero-Knowledge App)  
**Pivot Date:** May 6, 2026  
**Status:** Phase 1 - Backend Implementation

---

## Phase 1: Backend Core Services

### [ ] Section 1.1: TOTP Service Package

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

### [ ] Section 1.2: Encryption Service Integration

- [x] Check: `backend/shared/crypto/` for existing encryption functions
  - [x] Use existing `encryptWithUserKey()` for TOTP secret
  - [x] Use existing `decryptWithUserKey()` for verification
  - [x] Ensure TOTP secret encrypted before database storage

### [ ] Section 1.3: Create Auth Handlers - TOTP Endpoints

**File:** `backend/auth/internal/handlers/auth_handler.go` (extend existing)

#### Endpoint 1: Generate TOTP Secret

- [ ] Function: `GenerateTOTPSecret(c fiber.Ctx) error`
  - [ ] Extract user_id from JWT context
  - [ ] Fetch user from database
  - [ ] Check: If 2FA already enabled, return error
  - [ ] Call: `totp_service.GenerateTOTPSecret(user.Email)`
  - [ ] Store temp secret in memory (5 min expiry): `tempTOTPStore[userID] = secret`
  - [ ] Response:
    ```json
    {
      "qrCode": "data:image/png;base64,...",
      "secret": "JBSWY3DPEBLW64TMMQ====",
      "message": "Scan QR with authenticator app",
      "expiresIn": 300
    }
    ```

#### Endpoint 2: Verify TOTP Setup

- [ ] Function: `VerifyTOTPSetup(c fiber.Ctx) error`
  - [ ] Extract user_id from JWT
  - [ ] Parse request: `{ "code": "123456" }`
  - [ ] Get temp secret from store: `tempTOTPStore[userID]`
  - [ ] Check: Secret exists and not expired
  - [ ] Call: `totp_service.VerifyTOTPCode(secret, code)`
  - [ ] If invalid: Return 401 with error
  - [ ] If valid:
    - [ ] Encrypt secret: `encrypted = encryptWithUserKey(secret, user.PublicKey)`
    - [ ] Generate recovery codes: `recoveryCodes = totp_service.GenerateRecoveryCodes(10)`
    - [ ] Hash recovery codes: `hashedCodes = totp_service.HashRecoveryCodes(recoveryCodes)`
    - [ ] Update user:
      ```go
      user.TwoFactorEnabled = true
      user.TOTPSecretEncrypted = encrypted
      user.RecoveryCodesHashed = hashedCodes
      db.Save(user)
      ```
    - [ ] Delete temp secret: `delete(tempTOTPStore, userID)`
    - [ ] Response: Return recovery codes (ONE-TIME display!)
      ```json
      {
        "success": true,
        "recoveryCodes": ["ABC-123-DEF", "XYZ-789-UVW", ...],
        "message": "Save these 10 codes in a safe place offline!"
      }
      ```

#### Endpoint 3: Verify TOTP During Login

- [ ] Function: `VerifyTOTPLogin(c fiber.Ctx) error`
  - [ ] Parse request: `{ "code": "123456" }`
  - [ ] Get temp_user_id from temporary session (from login step)
  - [ ] Fetch user from database
  - [ ] Decrypt TOTP secret: `secret = decryptWithUserKey(user.TOTPSecretEncrypted, derivedKey)`
  - [ ] Verify code: `totp_service.VerifyTOTPCode(secret, code)`
  - [ ] If invalid:
    - [ ] Increment failed attempts counter
    - [ ] If > 3 attempts: Lock for 5 minutes
    - [ ] Return 401 with error
  - [ ] If valid:
    - [ ] Delete temp session
    - [ ] Generate full JWT
    - [ ] Response:
      ```json
      {
        "token": "eyJhbGciOiJIUzI1NiIs...",
        "message": "Logged in successfully"
      }
      ```

#### Endpoint 4: Verify Recovery Code

- [ ] Function: `VerifyRecoveryCode(c fiber.Ctx) error`
  - [ ] Parse request: `{ "code": "ABC-123-DEF" }`
  - [ ] Get temp_user_id from temporary session
  - [ ] Fetch user from database
  - [ ] Parse recovery codes: `codes = parseRecoveryCodes(user.RecoveryCodesHashed)`
  - [ ] Find and verify code:
    - [ ] For each code:
      - [ ] Hash provided code
      - [ ] Compare with stored hash
    - [ ] If no match: Return 401
    - [ ] If match:
      - [ ] Mark as used (remove from list)
      - [ ] Re-hash remaining codes
      - [ ] Save updated codes to database
  - [ ] Response:
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIs...",
      "remaining": 9,
      "warning": "Use an authenticator app to add a new recovery code"
    }
    ```

#### Endpoint 5: Get Recovery Codes Status

- [ ] Function: `GetRecoveryCodesStatus(c fiber.Ctx) error`
  - [ ] Extract user_id from JWT
  - [ ] Fetch user from database
  - [ ] Parse recovery codes
  - [ ] Count remaining
  - [ ] Response:
    ```json
    {
      "enabled": true,
      "remaining": 8,
      "message": "You have 8 backup codes remaining"
    }
    ```

#### Endpoint 6: Disable 2FA

- [ ] Function: `DisableTwoFactor(c fiber.Ctx) error`
  - [ ] Extract user_id from JWT
  - [ ] Parse request: `{ "password": "current_password" }`
  - [ ] Verify current password
  - [ ] If invalid: Return 401
  - [ ] If valid:
    - [ ] Update user:
      ```go
      user.TwoFactorEnabled = false
      user.TOTPSecretEncrypted = nil
      user.RecoveryCodesHashed = nil
      db.Save(user)
      ```
    - [ ] Response:
      ```json
      {
        "success": true,
        "message": "2FA has been disabled"
      }
      ```

---

## Phase 2: Update Login Flow

### [ ] Section 2.1: Modify Login Handler

- [ ] File: `backend/auth/internal/handlers/auth_handler.go`
- [ ] Function: `LoginUser(c fiber.Ctx)` - UPDATE
  - [ ] After password verification:
    - [ ] Check: `if user.TwoFactorEnabled`
    - [ ] If NO 2FA:
      - [ ] Generate full JWT
      - [ ] Return JWT directly
    - [ ] If YES 2FA:
      - [ ] Generate temporary session token (5 min expiry)
      - [ ] Store in memory: `tempSessions[tempToken] = userID`
      - [ ] Response:
        ```json
        {
          "require2FA": true,
          "tempToken": "temp_xyz_123",
          "methods": ["totp", "recovery"],
          "expiresIn": 300
        }
        ```

### [ ] Section 2.2: Create Middleware for Temp Sessions

- [ ] File: `backend/shared/middleware/temp_session.go` (new)
- [ ] Function: `VerifyTempSession()` middleware
  - [ ] Extract tempToken from request header
  - [ ] Check: Token exists in `tempSessions`
  - [ ] Check: Token not expired
  - [ ] Extract userID
  - [ ] Set in context: `c.Locals("temp_user_id", userID)`
  - [ ] Continue
  - [ ] If invalid: Return 401

### [ ] Section 2.3: Route Updates in main.go

- [ ] Add temp session middleware to TOTP endpoints:
  ```go
  api.Post("/auth/2fa/totp/verify", middleware.VerifyTempSession(), authHandler.VerifyTOTPLogin)
  api.Post("/auth/2fa/recovery-code", middleware.VerifyTempSession(), authHandler.VerifyRecoveryCode)
  ```

---

## Phase 3: Testing & Validation

### [ ] Section 3.1: Manual Testing with Postman

- [ ] Test: Generate TOTP Secret
  - [ ] Request: `POST /api/auth/2fa/totp/generate`
  - [ ] Verify: QR code returned
  - [ ] Verify: Secret returned
  - [ ] Verify: Can scan QR with phone app

- [ ] Test: Verify TOTP Setup
  - [ ] Get code from authenticator app
  - [ ] Request: `POST /api/auth/2fa/totp/verify` with code
  - [ ] Verify: 200 OK with recovery codes
  - [ ] Verify: User.TwoFactorEnabled = true in DB

- [ ] Test: Login with 2FA
  - [ ] Request: `POST /api/auth/login` with email + password
  - [ ] Verify: Returns `require2FA: true` + tempToken
  - [ ] Request: `POST /api/auth/2fa/verify` with TOTP code + tempToken
  - [ ] Verify: Returns full JWT
  - [ ] Verify: Can use JWT for protected endpoints

- [ ] Test: Login with Recovery Code
  - [ ] Repeat login flow
  - [ ] Instead of TOTP: `POST /api/auth/2fa/recovery-code`
  - [ ] Verify: Returns full JWT
  - [ ] Verify: Recovery code marked as used

- [ ] Test: Invalid Code
  - [ ] Request with wrong TOTP code
  - [ ] Verify: 401 error
  - [ ] Verify: Can retry

- [ ] Test: Rate Limiting
  - [ ] Try 4 invalid codes rapidly
  - [ ] Verify: Locked for 5 minutes
  - [ ] Verify: Returns rate limit error

- [ ] Test: Disable 2FA
  - [ ] Request: `POST /api/auth/2fa/disable` with password
  - [ ] Verify: 200 OK
  - [ ] Verify: User.TwoFactorEnabled = false in DB
  - [ ] Login without 2FA (should work)

### [ ] Section 3.2: Edge Cases

- [ ] Test: Expired temp session
  - [ ] Generate temp token
  - [ ] Wait 5+ minutes
  - [ ] Try to use: should fail

- [ ] Test: Multiple 2FA setup attempts
  - [ ] Generate secret 1
  - [ ] Generate secret 2
  - [ ] Only use secret 2: should work

- [ ] Test: All recovery codes used
  - [ ] Use all 10 recovery codes
  - [ ] Try 11th: should fail

- [ ] Test: TOTP time sync
  - [ ] Code from phone
  - [ ] Wait 25 seconds (within 30-sec window)
  - [ ] Should still work

---

## Phase 4: Error Handling & Security

### [ ] Section 4.1: Error Responses

- [ ] Create consistent error responses:
  - [ ] 400: Invalid request format
  - [ ] 401: Authentication failed (invalid code, expired session)
  - [ ] 429: Rate limited (too many attempts)
  - [ ] 500: Server error

### [ ] Section 4.2: Security Logging

- [ ] Log all 2FA events:
  - [ ] When TOTP setup started
  - [ ] When TOTP verified successfully
  - [ ] When 2FA disabled
  - [ ] When invalid codes attempted
  - [ ] When rate limit triggered

### [ ] Section 4.3: Validate HTTPS

- [ ] Check: Caddy config enforces HTTPS
- [ ] Verify: No HTTP fallback for 2FA endpoints

---

## Phase 5: Frontend Preparation (Placeholders)

### [ ] Section 5.1: API Service Layer

- [ ] File: `frontend/src/services/totp.service.ts`
  - [ ] Function: `generateTOTPSecret()` → GET QR code
  - [ ] Function: `verifyTOTPSetup(code)` → POST code
  - [ ] Function: `verifyTOTPLogin(code, tempToken)` → POST code
  - [ ] Function: `verifyRecoveryCode(code, tempToken)` → POST code
  - [ ] Function: `getRecoveryStatus()` → GET status
  - [ ] Function: `disableTwoFactor(password)` → POST disable

### [ ] Section 5.2: UI Components (Placeholder)

- [ ] Create: `SetupTOTP.tsx` component
  - [ ] Display QR code
  - [ ] Show manual secret option
  - [ ] Input for verification code
  - [ ] Display recovery codes

- [ ] Create: `VerifyTOTP.tsx` component
  - [ ] Input for 6-digit code
  - [ ] Link to recovery code fallback
  - [ ] Loading state

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
- [ ] TOTP Service created
- [ ] 6 HTTP handlers created
- [ ] Login flow updated
- [ ] Temporary session middleware created
- [ ] Routes registered in main.go

### Testing
- [ ] All 6 endpoints tested manually
- [ ] Edge cases tested
- [ ] Error handling verified
- [ ] Rate limiting verified

### Security
- [ ] HTTPS enforced
- [ ] Events logged
- [ ] Error responses consistent

### Frontend (Later)
- [ ] API service layer created
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
