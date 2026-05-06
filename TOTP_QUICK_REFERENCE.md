# TOTP Implementation - Visual Quick Reference

## The Big Picture

```
┌─────────────────────────────────────────────────────────────┐
│                    LOGIN WITH 2FA FLOW                      │
└─────────────────────────────────────────────────────────────┘

STEP 1: Email + Password
┌──────────────────────┐         ┌──────────────────────┐
│  User's Browser      │         │  Your Server         │
│                      │         │                      │
│ Email: alice@...     │─────┐   │ Verify password ✓    │
│ Password: ****       │     │   │ Is 2FA enabled?      │
└──────────────────────┘     │   │ YES! Need code       │
                             └──→│ Create temp session  │
                                 │ (5 min timeout)      │
                                 └──────────────────────┘
                                         ↓
                                 "Enter 6-digit code"

STEP 2: Get Code from Phone App
┌──────────────────────┐
│  Your Phone          │
│  Authenticator App   │
│                      │
│  Your App: 567890    │
│  (expires in 15s)    │
└──────────────────────┘
         ↓
      User reads: 567890

STEP 3: Enter Code
┌──────────────────────┐         ┌──────────────────────┐
│  User's Browser      │         │  Your Server         │
│                      │         │                      │
│ 6-digit code: 567890 │─────┐   │ Decrypt secret       │
│ [Submit]             │     │   │ Calculate code NOW   │
└──────────────────────┘     │   │ Expected: 567890     │
                             │   │ Your code: 567890    │
                             └──→│ Match? YES! ✓        │
                                 │ Issue JWT            │
                                 │ User logged in!      │
                                 └──────────────────────┘
```

---

## The Secret Formula (What Phone Does)

```
Every 30 seconds, phone calculates:

HMAC-SHA1(Secret, CurrentTime) → 6 Digits

Example:
├─ Secret stored: JBSWY3DPEBLW64TMMQ====
├─ Time slot: 10:00:30
├─ Math magic happens
└─ Result: 567890

Time advances 30 sec:
├─ Time slot: 10:01:00
├─ Math magic happens again
└─ Result: 890123 ← Different!

That's why codes change every 30 seconds!
```

---

## Setup Flow (First Time)

```
Step 1: Generate Secret
┌─────────────────────┐
│ Your Server         │
│                     │
│ Generate random     │
│ 32-byte secret      │
│ JBSWY3DPEBLW64TMMQ= │
└─────────────────────┘
         ↓
Step 2: Show QR Code
┌─────────────────────┐
│ Browser             │
│                     │
│ ┌───────────────┐   │
│ │ █████████████ │   │
│ │ ██ Secret ██  │   │ ← QR Code
│ │ █████████████ │   │
│ └───────────────┘   │
│ Secret shown too    │
└─────────────────────┘
         ↓
Step 3: Scan QR Code
┌─────────────────────┐
│ Your Phone          │
│ Authenticator App   │
│                     │
│ [Camera opens]      │
│ [Scans QR]          │
│ [Saves secret]      │
│                     │
│ Your App: 234567    │
└─────────────────────┘
         ↓
Step 4: Verify Code
┌─────────────────────┐         ┌─────────────────────┐
│ Browser             │         │ Server              │
│                     │         │                     │
│ Code from app:      │         │ Decrypt secret      │
│ 234567 ──────────→  │─────┐   │ Calc expected: 234567
│ [Submit]            │     │   │ Match? YES!         │
│                     │     └──→│ Save to database    │
│                     │         │ 2FA enabled! ✓      │
│                     │         │ Show backup codes   │
└─────────────────────┘         └─────────────────────┘
```

---

## Database Storage

```
BEFORE 2FA Setup:
User {
  id: "alice-123",
  email: "alice@example.com",
  password_hash: "...",
  two_factor_enabled: false,
  totp_secret_encrypted: null,
  recovery_codes_hashed: null
}

AFTER 2FA Setup:
User {
  id: "alice-123",
  email: "alice@example.com",
  password_hash: "...",
  two_factor_enabled: true,
  totp_secret_encrypted: "encrypted_blob_xyz...", ← Can't recover!
  recovery_codes_hashed: "hash_abc..."            ← One-way hash
}
```

---

## 6 Endpoints Overview

```
┌──────────────────────────────────────────────────────────┐
│ ENDPOINT 1: Generate Secret                              │
├──────────────────────────────────────────────────────────┤
│ POST /api/auth/2fa/totp/generate                         │
│ Headers: Authorization: Bearer <JWT>                     │
│ Response:                                                │
│ {                                                        │
│   "qrCode": "data:image/png;base64,...",                 │
│   "secret": "JBSWY3DPEBLW64TMMQ====",                    │
│   "expiresIn": 300                                       │
│ }                                                        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ENDPOINT 2: Verify Setup Code                            │
├──────────────────────────────────────────────────────────┤
│ POST /api/auth/2fa/totp/verify                           │
│ Headers: Authorization: Bearer <JWT>                     │
│ Body: { "code": "234567" }                               │
│ Response:                                                │
│ {                                                        │
│   "success": true,                                       │
│   "recoveryCodes": ["ABC-123-DEF", ...],                 │
│   "message": "Save codes offline!"                       │
│ }                                                        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ENDPOINT 3: Login with TOTP Code                         │
├──────────────────────────────────────────────────────────┤
│ POST /api/auth/2fa/verify                                │
│ Headers: X-Temp-Token: <tempToken>                       │
│ Body: { "code": "567890" }                               │
│ Response:                                                │
│ {                                                        │
│   "token": "eyJhbGciOiJIUzI1NiIs...",                    │
│   "message": "Logged in successfully"                    │
│ }                                                        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ENDPOINT 4: Login with Recovery Code                     │
├──────────────────────────────────────────────────────────┤
│ POST /api/auth/2fa/recovery-code                         │
│ Headers: X-Temp-Token: <tempToken>                       │
│ Body: { "code": "ABC-123-DEF" }                          │
│ Response:                                                │
│ {                                                        │
│   "token": "eyJhbGciOiJIUzI1NiIs...",                    │
│   "remaining": 9,                                        │
│   "warning": "Add 2FA to another device"                 │
│ }                                                        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ENDPOINT 5: Get Recovery Code Status                     │
├──────────────────────────────────────────────────────────┤
│ GET /api/auth/2fa/recovery-codes                         │
│ Headers: Authorization: Bearer <JWT>                     │
│ Response:                                                │
│ {                                                        │
│   "enabled": true,                                       │
│   "remaining": 8,                                        │
│   "message": "8 codes left"                              │
│ }                                                        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ENDPOINT 6: Disable 2FA                                  │
├──────────────────────────────────────────────────────────┤
│ POST /api/auth/2fa/disable                               │
│ Headers: Authorization: Bearer <JWT>                     │
│ Body: { "password": "current_password" }                 │
│ Response:                                                │
│ {                                                        │
│   "success": true,                                       │
│   "message": "2FA disabled"                              │
│ }                                                        │
└──────────────────────────────────────────────────────────┘
```

---

## Modified Login Flow

```
OLD (Without 2FA):
POST /api/auth/login
  ├─ Email + password verified ✓
  └─ Return JWT ✓

NEW (With 2FA):
POST /api/auth/login
  ├─ Email + password verified ✓
  ├─ Check: two_factor_enabled?
  │
  ├─ If NO:
  │  └─ Return JWT ✓
  │
  └─ If YES:
     ├─ Create temp session (5 min)
     ├─ Return {
     │    require2FA: true,
     │    tempToken: "xyz123",
     │    methods: ["totp", "recovery"]
     │  }
     └─ User must call:
        ├─ POST /auth/2fa/verify (for TOTP), OR
        └─ POST /auth/2fa/recovery-code (for backup)
```

---

## Code Expiration & Timing

```
Phone Clock Time    | Generated Code | Status
────────────────────┼────────────────┼──────────────
10:00:00 - 10:00:30 | 123456         | Active
10:00:30 - 10:01:00 | 234567         | Active (←Current)
10:01:00 - 10:01:30 | 345678         | Not yet
10:01:30 - 10:02:00 | 456789         | Not yet

User enters 234567 at 10:00:45:
├─ Current window: 234567 ✓ Match!
└─ Login succeeds

User enters 234567 at 10:02:00 (1 min later):
├─ Current window: 456789 ✓ NOT 234567
├─ Code too old (window passed)
└─ Login fails ✗

This prevents code reuse!
```

---

## Security Layers

```
Layer 1: Secret Storage
┌─────────────────────────────────────────┐
│ Secret encrypted before storage         │
│ User key → encrypt secret → encrypted   │
│ Server can't decrypt (doesn't have key) │
└─────────────────────────────────────────┘
        ↓
Layer 2: One-Time Use
┌─────────────────────────────────────────┐
│ Code valid for only 30 seconds          │
│ After that, new code needed             │
│ Old codes can't be reused               │
└─────────────────────────────────────────┘
        ↓
Layer 3: Recovery Codes
┌─────────────────────────────────────────┐
│ 10 backup codes hashed                  │
│ One-time use (marked used)              │
│ Fallback if phone lost                  │
└─────────────────────────────────────────┘
        ↓
Layer 4: HTTPS Only
┌─────────────────────────────────────────┐
│ All 2FA endpoints encrypted             │
│ Codes sent over secure connection       │
│ Can't intercept codes in transit        │
└─────────────────────────────────────────┘
        ↓
Layer 5: Rate Limiting
┌─────────────────────────────────────────┐
│ 3 wrong attempts = 5 min lockout        │
│ Prevents brute force guessing           │
│ (1 million combinations is too much)    │
└─────────────────────────────────────────┘
```

---

## Decision Tree: What Endpoint to Call

```
User Actions                           Call Endpoint

[1] User wants to enable 2FA
    └─→ POST /auth/2fa/totp/generate

[2] User got code from app, ready
    └─→ POST /auth/2fa/totp/verify

[3] User trying to login
    └─→ POST /auth/login
        ├─ If require2FA = false
        │  └─ Already logged in ✓
        │
        └─ If require2FA = true
           ├─ Has phone? 
           │  └─→ POST /auth/2fa/verify (with TOTP code)
           │
           └─ Lost phone?
              └─→ POST /auth/2fa/recovery-code (with backup code)

[4] User wants to check how many backup codes left
    └─→ GET /auth/2fa/recovery-codes

[5] User wants to turn off 2FA
    └─→ POST /auth/2fa/disable
```

---

## Implementation Checklist

```
Phase 1: TOTP Service
  ☐ Create totp_service.go with 4 functions
  ☐ Integrate with encryption system
  ☐ Test secret generation locally

Phase 2: HTTP Handlers
  ☐ Create 6 endpoint handlers
  ☐ Update login flow for 2FA check
  ☐ Create temp session middleware

Phase 3: Testing
  ☐ Test each endpoint with Postman
  ☐ Test setup flow end-to-end
  ☐ Test login with 2FA end-to-end
  ☐ Test recovery codes
  ☐ Test rate limiting

Phase 4: Security
  ☐ Verify HTTPS enforced
  ☐ Add event logging
  ☐ Add rate limiting

Phase 5: Frontend (Later)
  ☐ Create TOTP setup UI
  ☐ Create login 2FA prompt
  ☐ Create recovery code input
```

---

## Ready to Start?

1. Read: [TOTP_HOW_IT_WORKS.md](TOTP_HOW_IT_WORKS.md) - Understand concepts
2. Follow: [TOTP_IMPLEMENTATION_TODO.md](TOTP_IMPLEMENTATION_TODO.md) - Build step-by-step
3. Test: Use Postman to verify each endpoint
4. Done: All 6 endpoints working!
