# 2FA Implementation Guide - ostrom

## Overview

Two-Factor Authentication (2FA) is implemented using:
- **TOTP** (Time-based One-Time Password): 6-digit codes from authenticator apps
- **Recovery Codes**: Backup codes (ABC-123-DEF format) for lost device scenarios
- **AES-256-GCM Encryption**: TOTP secrets encrypted with user's ClientSalt
- **Bcrypt Hashing**: Recovery codes hashed and stored

---

## 2FA Setup Flow (During Registration)

```
User registers with email + password
        ↓
User prompted: "Enable 2FA?" (TwoFAPrompt modal)
        ↓
User clicks "Enable 2FA"
        ↓
POST /auth/2fa/totp/generate
    ├─ Generate random TOTP secret
    ├─ Create QR code URL
    ├─ Store secret temporarily (5 min expiry)
    └─ Return QR code + secret
        ↓
User scans QR code with authenticator app
(Google Authenticator, Authy, Microsoft Authenticator, etc.)
        ↓
User enters 6-digit code from authenticator
        ↓
POST /auth/2fa/totp/verify (with code + user token)
    ├─ Verify TOTP code is correct
    ├─ Encrypt TOTP secret with AES-256-GCM
    ├─ Generate 10 recovery codes (ABC-123-DEF format)
    ├─ Bcrypt hash all recovery codes
    ├─ JSON marshal + base64 encode hashes
    ├─ Save to database: TwoFactorEnabled=true, TOTPSecretEncrypted, RecoveryCodesHashed
    └─ Return the 10 recovery codes
        ↓
User saves recovery codes (copy/download)
        ↓
Setup complete! 2FA is now enabled
```

---

## 2FA Login Flow (Subsequent Logins)

```
User enters email + password
        ↓
POST /auth/login
    ├─ Validate email + password
    ├─ Check if TwoFactorEnabled = true
    └─ If YES → Generate temp_token (5 min, scope="2fa")
            → Return: { require_2fa: true, temp_token, methods: [totp, recovery] }
        ↓
Frontend shows 2FA verification modal
        ↓
User chooses method:
  A) Authenticator app → enters 6-digit code
  B) Recovery code → enters backup code (ABC-123-DEF)
        ↓
╔═════════════════════════════════════════╗
║ METHOD A: TOTP Code Verification        ║
╚═════════════════════════════════════════╝
POST /auth/2fa/verify (with code + temp_token)
    ├─ Verify temp_token has scope="2fa"
    ├─ Base64 decode encrypted TOTP secret from DB
    ├─ Decrypt: AES-256-GCM using (userID + ClientSalt)
    ├─ Verify 6-digit code matches decrypted secret
    ├─ On success: Generate full access_token (24 hours)
    └─ Return: { token: "<jwt>" }
        ↓
╔═════════════════════════════════════════╗
║ METHOD B: Recovery Code Verification    ║
╚═════════════════════════════════════════╝
POST /auth/2fa/recovery-code (with code + temp_token)
    ├─ Verify temp_token has scope="2fa"
    ├─ Base64 decode recovery codes hashes from DB
    ├─ JSON unmarshal to [][]byte
    ├─ Compare user input with each bcrypt hash
    ├─ On match: Remove used code from database
    ├─ Save remaining codes (JSON marshal + base64)
    ├─ Generate full access_token (24 hours)
    └─ Return: { token: "<jwt>", remaining: 9 }
        ↓
Frontend stores access_token + navigates to dashboard
```

---

## Encryption Details

### TOTP Secret Encryption

**During Setup (`VerifyTOTPSetup`):**
```
1. Generate random TOTP secret (library pquerna/otp/totp)
2. Derive key: pbkdf2(userID, clientSalt, 100k iterations, SHA256) → 32 bytes
3. Generate random IV: 12 bytes (secure random)
4. Encrypt: AES-256-GCM(key, iv, plaintext=secret)
5. Result: [iv (12 bytes) || ciphertext (48 bytes)] = 60 bytes total
6. Base64 encode for database storage
```

**During Login (`VerifyTOTPLogin`):**
```
1. Retrieve base64 encoded secret from DB
2. Base64 decode → 60 bytes
3. Extract IV: first 12 bytes
4. Extract ciphertext: remaining 48 bytes
5. Derive same key: pbkdf2(userID, clientSalt, 100k iterations, SHA256)
6. Decrypt: AES-256-GCM(key, iv, ciphertext)
7. Verify decrypted secret matches code using totp.Validate()
```

### Recovery Codes Encoding

**During Setup (`VerifyTOTPSetup`):**
```
1. Generate 10 codes: ABC-123-DEF, GHI-456-JKL, etc.
2. Bcrypt hash each code (DefaultCost)
3. Create [][]byte with hashed codes
4. JSON marshal: json.Marshal([][]byte)
5. Base64 encode result for database storage
```

**During Verification (`VerifyRecoveryCode`):**
```
1. Retrieve base64 encoded codes from DB
2. Base64 decode
3. JSON unmarshal → [][]byte
4. Compare user input with each bcrypt hash
5. On match: Remove used code from slice
6. JSON marshal + base64 encode remaining codes
7. Save back to database
```

---

## Frontend Components

### SetupTOTP.tsx
- **Location:** `frontend/src/components/SetupTOTP/`
- **Used during:** Registration, when user enables 2FA
- **Steps:**
  1. QR Code display (with loading)
  2. Verification code input (6 digits)
  3. Recovery codes display + copy/download buttons
  4. Complete setup button

### VerifyTOTP.tsx
- **Location:** `frontend/src/components/VerifyTOTP/`
- **Used during:** Login, when 2FA is enabled
- **Steps:**
  1. Toggle between Authenticator and Recovery Code tabs
  2. Tab A: 6-digit code input
  3. Tab B: Recovery code input (ABC-123-DEF)
  4. Verify button
  5. Error + remaining codes warning display

### LoginPage.tsx
- **Logic:**
  1. Call `/auth/login`
  2. If `require_2fa: true` → Show `VerifyTOTP` modal
  3. Pass `temp_token` to VerifyTOTP component
  4. On success → Store access_token + redirect to dashboard

---

## Backend Handlers

### auth_2fa.go

**1. GenerateTOTPSecret()**
- Called by: Frontend during setup
- Generates TOTP secret + QR code
- Stores temporarily in memory with 5-min expiry

**2. VerifyTOTPSetup()**
- Called by: Frontend after scanning QR code
- Verifies TOTP code
- Encrypts secret
- Generates + hashes recovery codes
- Saves to database
- Returns recovery codes (one-time only)

**3. VerifyTOTPLogin()**
- Called by: Frontend during login with temp_token
- Middleware validates temp_token (scope="2fa")
- Decrypts TOTP secret
- Verifies code
- Returns full access_token

**4. VerifyRecoveryCode()**
- Called by: Frontend during login with temp_token
- Middleware validates temp_token (scope="2fa")
- Verifies recovery code
- Removes used code from database
- Returns full access_token + remaining count

**5. GetRecoveryCodes()**
- Called by: Settings page (GET request)
- Returns remaining recovery code count

**6. DisableTwoFactor()**
- Called by: Settings page (POST with password)
- Verifies password
- Clears 2FA: TwoFactorEnabled=false, secrets cleared
- Returns success

---

## Middleware

### VerifyTempSession (shared/middleware/temp_session.go)

Validates temp_token with scope="2fa":
1. Extract Bearer token from Authorization header
2. Parse JWT
3. Check scope claim == "2fa"
4. Extract user_id → c.Locals("user_id")
5. Proceed to handler

Used by:
- POST /auth/2fa/verify
- POST /auth/2fa/recovery-code

