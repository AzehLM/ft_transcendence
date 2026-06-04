# Two-Factor Authentication (2FA)

TOTP-based 2FA on top of the zero-knowledge auth architecture. Once enabled, a login requires a valid 6-digit TOTP code (or a recovery code) before the full access token is issued.

---

## Flows

### Setup

```
User (logged in)
  │
  ├─ POST /auth/2fa/totp/generate
  │     → server generates TOTP secret, stores it in-memory (5-min TTL)
  │     → returns { qrCodeURL, secret, expiresIn: 300 }
  │
  ├─ User scans QR in authenticator app
  │
  ├─ POST /auth/2fa/totp/verify  { code: "123456" }
  │     → server validates code against the temp secret
  │     → on success: encrypts secret (AES-256-GCM), enables 2FA, generates 10 recovery codes
  │     → returns { success: true, recoveryCodes: [...] }  ← shown once, never again
  │
  └─ User saves recovery codes offline
```

### Login (2FA active)

```
User
  │
  ├─ POST /auth/login  { email, auth_hash }
  │     → 2FA is active → returns:
  │       { requires_2fa: true, tmp_token: "<jwt 5min scope=2fa>",
  │         encrypted_private_key, iv, public_key }
  │
  ├─ Frontend holds tmp_token, shows TOTP or recovery-code input
  │
  ├─ Option A — TOTP code
  │     POST /auth/2fa/verify  { code: "123456" }
  │     Authorization: Bearer <tmp_token>
  │     → returns { access_token, encrypted_private_key, iv, public_key }
  │
  └─ Option B — Recovery code
        POST /auth/2fa/recovery-code  { code: "ABC-123-DEF" }
        Authorization: Bearer <tmp_token>
        → code is consumed (one-time use), same response as above
```

> The `encrypted_private_key` is returned at the login step so the frontend can decrypt it locally as soon as the full `access_token` is obtained — no extra round-trip.

### Disable

```
User (logged in, 2FA active)
  │
  └─ POST /auth/2fa/disable  { password: "..." }
        → server verifies password (Argon2id)
        → clears totp_secret_encrypted + recovery_codes_hashed from DB
        → sets two_factor_enabled = false
        → returns { success: true, message: "2FA has been disabled" }
```

---

## API Endpoints

All routes are under `POST /api/auth/...` (base URL `/api/`).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/2fa/totp/generate` | access token | Generate TOTP secret + QR code URL (5-min temp store) |
| `POST` | `/auth/2fa/totp/verify` | access token | Verify setup code → enable 2FA, get recovery codes |
| `GET` | `/auth/2fa/recovery-codes` | access token | Returns `{ enabled, remaining, message }` |
| `POST` | `/auth/2fa/disable` | access token | Disable 2FA after password check |
| `POST` | `/auth/2fa/verify` | tmp token (scope=2fa) | Verify TOTP code during login → full access token |
| `POST` | `/auth/2fa/recovery-code` | tmp token (scope=2fa) | Verify recovery code during login → full access token |

### Notable response shapes

**`POST /auth/login` when 2FA is active (200)**
```json
{
  "requires_2fa": true,
  "tmp_token": "<jwt>",
  "methods": "",
  "expires_in": "300",
  "encrypted_private_key": "<base64>",
  "iv": "<base64>",
  "public_key": "<base64>"
}
```

**`POST /auth/2fa/totp/generate` (200)**
```json
{
  "qrCodeURL": "otpauth://totp/...",
  "secret": "<base32>",
  "message": "Scan QR with authenticator app",
  "expiresIn": 300
}
```

**`POST /auth/2fa/totp/verify` (200)**
```json
{
  "success": true,
  "recoveryCodes": ["AAAA-BBBB-CCCC", "..."],
  "message": "Save these 10 codes in a safe place offline!"
}
```

**`GET /auth/2fa/recovery-codes` (200)**
```json
{
  "enabled": true,
  "remaining": 10,
  "message": "You have backup codes remaining"
}
```

---

## Security Design

### TOTP Secret Storage

The secret is **never stored in plaintext**. After setup verification:

1. A 32-byte key is derived from `userID + clientSalt` using **PBKDF2** (100 000 iterations, SHA-256).
2. The secret is encrypted with **AES-256-GCM** (random 12-byte IV prepended to ciphertext: `[IV (12 B) || ciphertext]`).
3. The result is stored in `totp_secret_encrypted` (BYTEA).

Decryption reverses the same derivation at login time.

### Recovery Codes

- 10 codes generated at setup, format `ABC-123-DEF`.
- Each code is hashed individually with **bcrypt**.
- The resulting hashes are JSON-marshalled and base64-encoded into `recovery_codes_hashed`.
- Codes are **one-time use**: consumed on successful login.
- Displayed once to the user; never retrievable again.

### Temporary Token (tmp_token)

- Short-lived JWT (**5-minute expiry**), `scope = "2fa"`.
- Required by the `/auth/2fa/verify` and `/auth/2fa/recovery-code` routes.
- Validated by the `VerifyTempSession` middleware, which checks the scope claim.
- Prevents the TOTP verification step from being accessed with a regular access token.

### Brute-force Protection

- **3 consecutive failed attempts** on a user's 2FA verification trigger a **5-minute lockout**.

### Password Verification on Disable

- `POST /auth/2fa/disable` requires the user's current password (auth_hash), verified against the stored Argon2id hash, before clearing any 2FA data.

---

## Database

The 2FA state lives on the `users` table alongside the existing zero-knowledge fields:

| Column | Type | Description |
|--------|------|-------------|
| `two_factor_enabled` | `BOOLEAN` | Whether 2FA is active for this user |
| `totp_secret_encrypted` | `BYTEA` | AES-256-GCM encrypted TOTP secret (base64) |
| `recovery_codes_hashed` | `BYTEA` | JSON array of bcrypt hashes (base64) |

On disable, `totp_secret_encrypted` and `recovery_codes_hashed` are cleared and `two_factor_enabled` is set to `false`.

---

## Frontend

| File | Role |
|------|------|
| `services/totp.service.ts` | All API calls (generate, verify setup, verify login, recovery code, status, disable) |
| `components/SetupTOTP/` | 3-step setup wizard: QR display → code input → recovery code download |
| `components/VerifyTOTP/` | Login-time verification; tabs for TOTP vs recovery code; warns when < 3 codes remain |
| `components/TwoFAModal/` | Settings modal — 6-state machine: choice → enable-qr → enable-verify → enable-recovery → disable-password → disable-confirm |
| `pages/Login/` | Detects `requires_2fa: true`, stores `tmp_token`, renders `VerifyTOTP` |
| `pages/Account/` | Reads `two_factor_enabled` from `/auth/me`, opens `TwoFAModal` |

Recovery codes can be **copied to clipboard** or **downloaded as a `.txt` file** from both the setup wizard and the settings modal.
