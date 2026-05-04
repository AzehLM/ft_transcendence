# 2FA Implementation Guide

---

## 1. Overview

We use **password + biometric (WebAuthn)** as our two factors. The biometric never leaves the device, our server only ever stores a public key.

---

## 2. Registration Flow

When a user sets up biometric authentication for the first time:

```
User submits email + password
        ↓
Server prompts: "Set up biometric"
        ↓
Server generates a challenge and sends it to the browser
        ↓
Browser asks the device (Phone, Computer...): "Authenticate this user"
        ↓
Device prompts the user for his biometric (Face ID, fingerprint scan..)
        ↓
Device generates a random key pair:
    Private key → locked inside the device secure chip (never leaves)
    Public key  → sent to the server
        ↓
Server stores: { user_id, public_key, credential_id }
        ↓
Registration complete ✓
```

### -> What is a Challenge?

A challenge is a short random string (typically 32 bytes) that the server generates fresh for every single registration or login attempt. It is stored temporarily in the session, and expects the device to sign it. The signed response is only valid for that one request. It has three properties that matter:

- **Unique:** generated from a secure random source, so no two challenges are ever the same.
- **One-time:** once the device signs it and the server verifies it, the challenge is consumed and can never be used again.
- **Proves liveness:** because the device must sign that exact random value, an attacker who intercepted a previous login cannot replay the captured signature, the server would reject it immediately since the challenge it belongs to no longer exists.

In short, the challenge is what ties a biometric response to a specific, live, server-initiated request, making the whole exchange tamper-proof.

---

## 3. Login Flow

On every subsequent login:

```
User enters email + password
        ↓
Server finds the user → fetches all their registered credential IDs
        ↓
Server generates a new challenge (unique to this login attempt)
        ↓
Browser receives the challenge + credential IDs
        ↓
Browser finds the matching credential on the current device
        ↓
Device prompts the user for his biometric (Face ID, fingerprint scan..)
        ↓
Device signs the challenge with the private key
        ↓
Signed response sent to server
        ↓
Server verifies: verify(signature, challenge, public_key) → ✓ or ✗
        ↓
Access granted ✓
```

> **Note:** The browser automatically picks the right credential, the user never manually selects a device.

---

## 4. Database Structure

Two tables are required because one user can register **multiple devices**.

**Users table** — unchanged from standard auth
```
id | email | password_hash | recovery_key_hash [.....]
```

**Credentials table** — one row per registered device
```
id | user_id | credential_id | public_key | device_name | last_used_at
```

> **Note:** The `user_id` column in the credentials table is a **foreign key**, every value in `credentials.user_id` must match an existing `id` in the users table.

After a user registers multiple devices it looks like:

| device_name | last_used_at |
|-------------|--------------|
| iPhone 15   | 2026-04-27   |
| MacBook Pro | 2026-04-24   |
| Windows PC  | 2026-02-10   |

---

## 5. Adding a New Device

The normal flow, user already has an active session:

```
User is logged in
        ↓
Settings → Security → "Add new device"
        ↓
Server generates a new registration challenge
        ↓
New device prompts for biometric
        ↓
New key pair generated on the new device
        ↓
New public key stored in credentials table (same user_id)
        ↓
Both devices work independently ✓
```

The only difficult case is **losing the last registered device** handled by the recovery key below.

---

## 6. Recovery Key

### Why the recovery key is the right choice for a ZK app

The recovery key fits the constraint of a Zero Knowledge app precisely: it is generated entirely in the browser, the server only stores its hash, and verification is nothing more than a hash comparison. The server has no ability to impersonate the user, reconstruct the key, or even learn what the key is. The user retains full and exclusive control over their recovery material, exactly what a ZK architecture demands.

### How the recovery key works

The key is generated **entirely in the browser** — the server only ever stores its hash.

**At registration:**
```
Browser generates a random 128-bit key
        ↓
Key displayed to user: e.g. "A3F2-91BC-4E07-D812-..."
        ↓
User is prompted to save it offline (print it / password manager)
        ↓
Browser hashes the key: SHA-256(recovery_key)
        ↓
Only the hash is sent to and stored on the server
        ↓
Original key is never transmitted ✓
```

**On recovery (lost device):**
```
User enters email + password on new device
        ↓
User enters their recovery key
        ↓
Browser hashes it: SHA-256(recovery_key)
        ↓
Server compares the hash → match confirmed
        ↓
Recovery key immediately invalidated (one-time use)
        ↓
Limited session granted for new device registration only
        ↓
User registers new device biometric (see Registration Flow)
        ↓
User prompted to save a new recovery key
        ↓
Access restored ✓
```

---

