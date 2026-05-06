# How TOTP Works: A Beginner's Guide

**What:** TOTP = Time-based One-Time Password  
**Why:** Secure 2-factor authentication using QR codes  
**How:** Unique 6-digit code that changes every 30 seconds

---

## The Problem: Why Passwords Alone Aren't Enough

### Traditional Login

```
You:        "My password is: SecurePass123!"
Server:     "OK, you logged in!"
Attacker:   "I hacked the password database..."
            "Now I can login as anyone!"
Result:     ❌ Your account is compromised
```

### The Problem

```
Passwords can be:
├─ Stolen from databases
├─ Guessed with brute force
├─ Intercepted (if not HTTPS)
├─ Reused on multiple sites
└─ Forgotten (written on post-it)
```

---

## The Solution: 2FA with TOTP

### How TOTP Login Works

```
You:        "My password is: SecurePass123!"
Server:     "Password correct! Now I need proof you have your phone."
Server:     "Enter the 6-digit code from your authenticator app."

Your Phone: [Shows: 234567 - changes every 30 seconds]
You:        "The code is: 234567"
Server:     "Correct! You're logged in!"

Attacker:   "I have the password, but not the phone..."
            "I can't login because I need the code!"
Result:     ✓ Your account is protected
```

### Why It's Secure

```
Even if attacker has your password:
├─ They don't have your phone ✓
├─ They can't see the 6-digit code ✓
└─ They can't login without it ✓

It's like:
├─ Password = Your house key
├─ TOTP = Your passport (only you have it)
└─ Both needed = Much safer!
```

---

## How TOTP Actually Works (Step by Step)

### The Secret

```
Behind the scenes:

Step 1: First Time Setup
├─ Server generates: Random "secret" (like a password)
│  Example: JBSWY3DPEBLW64TMMQ====
├─ Shows as QR code
└─ You scan with phone

Step 2: Phone Stores Secret
├─ Authenticator app reads QR code
├─ Saves secret on your phone (encrypted)
└─ Secret NEVER leaves your phone
```

### The Algorithm

```
The Magic Formula (happens on your phone, automatically):

Every second, the phone calculates:
├─ Current time (in 30-second chunks)
├─ Secret from earlier
├─ Combines them using math: HMAC-SHA1
└─ Result: 6-digit code

Example timeline:
├─ 10:00:00 - 10:00:30 → Code: 123456
├─ 10:00:30 - 10:01:00 → Code: 234567  ← Changes every 30 seconds!
├─ 10:01:00 - 10:01:30 → Code: 345678
└─ 10:01:30 - 10:02:00 → Code: 456789

The code keeps changing!
```

### Server Verification

```
When you enter the code:

Server does:
├─ Takes the secret (stored in database)
├─ Calculates what the code should be (at current time)
├─ Compares with your code
├─ If they match: "Welcome!" ✓
├─ If they don't match: "Wrong code" ✗
└─ If too old: "Code expired, try next one" ✗

Server calculation:
├─ Current time: 10:00:45
├─ Expected code: 234567
├─ Your code: 234567
├─ Match? YES! ✓ Login approved
```

---

## Real Example: Google Authenticator

### What You See

```
Your Phone Screen:

┌─────────────────────────────┐
│    Google Authenticator     │
├─────────────────────────────┤
│                             │
│  Gmail                      │
│  ┌─────────────────────┐   │
│  │      234567         │   │
│  │   (expires in 15s)  │   │
│  └─────────────────────┘   │
│                             │
│  GitHub                     │
│  ┌─────────────────────┐   │
│  │      890123         │   │
│  │   (expires in 8s)   │   │
│  └─────────────────────┘   │
│                             │
└─────────────────────────────┘

You have multiple accounts!
Each has its own secret and code.
```

### The Secret on Your Phone

```
Behind the scenes (encrypted on phone):

Gmail:  Secret = JBSWY3DPEBLW64TMMQ====
        ├─ App calculates code from secret
        ├─ Uses current time
        └─ Shows: 234567

GitHub: Secret = 4S3JQ2RJ5E2RJVB======
        ├─ App calculates code from secret
        ├─ Uses current time
        └─ Shows: 890123

Facebook: Secret = Z7X9K2P5M8Q1C3N6========
          └─ Shows: 456789

Phone stores ALL secrets encrypted!
```

---

## Visual Timeline: From Setup to Login

### Setup Phase (First Time)

```
You:
├─ Go to Settings → Security → Enable 2FA
│
Server:
├─ Generates random secret: JBSWY3DPEBLW64TMMQ====
├─ Converts to QR code (prettier format)
├─ Shows QR code to you
└─ Temporarily stores secret (not in DB yet!)

You:
├─ Take your phone
├─ Open Google Authenticator
├─ Scan QR code
│
Your Phone:
├─ Reads QR code
├─ Extracts secret: JBSWY3DPEBLW64TMMQ====
├─ Encrypts and stores on phone
├─ Starts showing codes: 345678 (from that secret)
└─ Creates entry: "Your App Name"

You:
├─ See code on phone: 345678
├─ Type it back into browser
│
Server:
├─ Calculates what code should be: 345678
├─ Your code matches! ✓
├─ NOW saves secret to database (encrypted)
├─ Sets: two_factor_enabled = true
└─ Shows: "Here are 10 backup codes, save them!"

Done! 2FA is now enabled.
```

### Login Phase (Later)

```
You (Day 5):
├─ Visit app
├─ Enter email: alice@example.com
├─ Enter password: SecurePass123

Server:
├─ Verifies password: ✓ Correct
├─ Checks: Does this user have 2FA? YES ✓
├─ Returns: "Need 2FA, enter 6-digit code"
├─ Creates temporary session (5 min timeout)

You:
├─ Look at phone
├─ Open Google Authenticator
├─ Find your app entry
├─ See code: 567890 (happens to be showing right now)
├─ Type code: 567890

Server:
├─ Takes secret from database (encrypted, decrypts it)
├─ Calculates what code should be NOW
├─ Expected: 567890
├─ Your code: 567890
├─ Match? YES! ✓
├─ Deletes temporary session
├─ Issues full authentication token (JWT)
└─ Welcome! You're logged in!

Result: Logged in successfully ✓
```

---

## What Makes TOTP Secure?

### 1. Time-Based (Every 30 Seconds)

```
Same secret, different code every 30 seconds:

Secret: JBSWY3DPEBLW64TMMQ====

10:00:00 → Code: 123456
10:00:30 → Code: 234567 ← Different!
10:01:00 → Code: 345678 ← Different again!

Even if attacker sees code 234567:
├─ They can't use it later (it expires)
├─ New code will be different
└─ Old code is useless
```

### 2. Phone-Only Secret

```
Your phone stores the secret:
├─ Encrypted on your phone
├─ Never sent to internet
├─ Never stored unencrypted
└─ Even if server hacked, attacker doesn't have it

Server stores:
├─ Encrypted copy (just to verify)
├─ Can't be used to generate codes
├─ Used only for verification
└─ Your phone still generates the real codes
```

### 3. One-Time Use (Mostly)

```
Code expires in 30 seconds:
├─ User enters: 567890
├─ Server verifies immediately
├─ After 30 seconds: New code needed
├─ Old code can't be reused
└─ Even if attacker intercepts, too late!
```

### 4. Two Factors (Password + Phone)

```
To login, attacker needs BOTH:
├─ Password ❌ (only you know)
├─ Your phone ❌ (only you have)

Has password but not phone?
└─ Can't login! Need both!

Has phone but not password?
└─ Can't login! Need both!

This is why it's called "Two-Factor" (2FA)
```

---

## Recovery Codes: The Backup Plan

### What If You Lose Your Phone?

```
You:        "I lost my phone and need to login!"
Server:     "Do you have your recovery codes?"
You:        "Yes, I saved them!" (check email or note)
You:        "Here's code: ABC-123-DEF"

Server:
├─ Verifies code: ✓ Valid
├─ Marks code as used (can't use again)
├─ Lets you login
├─ Reminds you to re-setup 2FA on new phone

Result: You can still login without phone!
```

### Why 10 Codes?

```
You get 10 recovery codes:
├─ Use 1 when you lose phone → 9 left
├─ Use 1 when access not available → 8 left
├─ Use 1 for emergency → 7 left
├─ ... and so on

Once all 10 used:
├─ Must contact support, OR
├─ Must disable and re-enable 2FA
└─ These are your safety net!
```

---

## TOTP in Zero-Knowledge Apps (Like Yours)

### The Privacy Advantage

```
Traditional 2FA:
├─ Server stores: Your public key, device info, usage patterns
├─ Server knows: What devices you use, when you login
└─ Privacy issue: Server has metadata about you

TOTP in Zero-Knowledge:
├─ Server stores: Only encrypted TOTP secret
├─ Server does NOT know: The actual secret value
├─ Privacy win: Even if DB hacked, attacker can't recover secret
└─ Result: True zero-knowledge! ✓

Why?
├─ Secret encrypted with YOUR encryption key
├─ Server can't decrypt it (doesn't have your key)
├─ Server just uses it for verification
├─ If DB compromised: Only encrypted blobs, useless!
```

---

## Comparison: TOTP vs Other 2FA Methods

| Method | What You Need | Secure? | Easy? | Works Offline? |
|--------|---------------|---------|-------|----------------|
| **TOTP (QR)** | Phone app | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✓ Yes |
| SMS Codes | Phone + carrier | ⭐⭐⭐ | ⭐⭐⭐⭐ | ✓ Yes |
| Email Codes | Email access | ⭐⭐⭐ | ⭐⭐⭐⭐ | ✓ Yes |
| Security Keys | USB key ($40) | ⭐⭐⭐⭐⭐ | ⭐⭐ | ✓ Yes |
| Biometric | Device sensor | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Depends |
| **WebAuthn** | Browser device | ⭐⭐⭐⭐⭐ | ⭐⭐ | ✗ No |

---

## Common Questions

### Q: What if my phone dies?
**A:** Use a recovery code. That's why you get 10 of them!

### Q: What if I share my TOTP secret with someone?
**A:** They can generate codes and login as you. Never share the secret!

### Q: Can someone clone my TOTP?
**A:** Only if they have:
- Your encrypted secret from the server (and can't decrypt)
- Your phone (they'd see the code)
- Both unlikely, so NO

### Q: Does TOTP work offline?
**A:** YES! The app generates codes using only:
- The secret (stored on phone)
- Current time (phone's clock)
- No internet needed ✓

### Q: Why 6 digits and 30 seconds?
**A:** Because:
- 6 digits: Easy to type, 1 million combinations
- 30 seconds: Long enough to enter code, short enough for security

### Q: What's the difference between TOTP and HOTP?
**A:** 
- TOTP: Time-based (changes every 30 sec) ← We use this
- HOTP: Counter-based (changes per press) ← Older version

### Q: Is TOTP the same as Google Authenticator?
**A:** Google Authenticator is an APP that implements TOTP standard

---

## For Your Zero-Knowledge App

### Implementation Flow

```
Setup (First Time):
1. User clicks "Enable 2FA"
2. Your server generates secret
3. Shows QR code to user
4. User scans with Google Authenticator/Authy
5. User enters code from app
6. Server saves encrypted secret
7. User gets 10 backup codes

Login:
1. User enters email + password
2. Your server asks for TOTP code
3. User opens authenticator app
4. Finds your app entry
5. Types 6-digit code
6. Server verifies code
7. User logged in!

Backup:
1. If phone lost/broken
2. User enters recovery code instead
3. Login succeeds
4. User should re-setup 2FA on new phone
```

---

## Summary

```
TOTP in a nutshell:

What:     A code that changes every 30 seconds
Why:      To prove you have your phone (not just password)
How:      Phone calculates code from secret + time
Secure?   Yes! Even if password stolen, attacker can't login
Offline?  Yes! Works without internet
Backup?   Yes! 10 recovery codes for emergencies

Your app benefits:
├─ Users can login from ANY device
├─ Works even without biometric (no fingerprint reader needed)
├─ Better privacy (zero-knowledge app)
├─ Industry standard (Google, GitHub, etc use it)
└─ Simple to use (just scan QR once, then enter codes)
```

---

## Ready to Implement?

Check out: [TOTP_IMPLEMENTATION_TODO.md](TOTP_IMPLEMENTATION_TODO.md) for detailed step-by-step tasks.

Questions? Ask about any part you don't understand!
