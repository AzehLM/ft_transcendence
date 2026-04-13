# Key Handling

## Information
- When user log in, we get the encrypted private key and uncrypt it to use it in order to read the files it has in its session
- The problem is where to stock the key
    - The safest would be in the front code but if we refresh the page, we lose the uncrytpion so the user would have to reenter its password in order to uncrypt the key again --> not convenient
    - Local Storage is not safe

## Solutions
### Crypted storage in session
- private key is re encrypted with a temporary key
- stored in sessionStorage or IndexedDB
- survive refresh and can disapear when tab is closed
- never stored in clear
- question how to uncrypt to read files
---
### Derived Key in memory + crypted cache
- KEK
- used for uncrypt private key and recrypt a local cache
- when refresh: app reload cache and reuncrypt automatically (if session active)
- When login, we keep the KEK in memory (temporary)
    - we create a crypted cache (session key)
        - SK = crypto.getRandomValues(32 bytes)
        - DEK crypted with SK → IndexedDB
        - SK crypted with KEK → IndexedDB
    - on client sude we have in IndexedDB :   encryptedDEK,  encryptedSK,  salt,  kdfParams (param used to derived a ket from a secret)
- When F5
    - session HTTP still valid (cookie / token)
    - get encryptedSK and encryptedDEK
    - KEK ← implicitely decrypted (see next point)
    - SK = decrypt(encryptedSK, KEK)
    - DEK = decrypt(encryptedDEK, SK)
- How to implicitely decrypt the KEK after F5 -> with session_secret and Salt ?
- session_secret is created at login with session_secret = random()
#### Workflow
- user login
    - password → KEK = KDF(password, salt)
- create session secret and KEK_session
    - session_secret = random()
        - must be generated after login (back side ?)
    - KEK_session = KDF(session_secret, salt)
- generation session key
    - SK = random(32 bytes)
- local encryption 
    - encrypted_DEK = encrypt(DEK, SK)
    - encrypted_SK = encrypt(SK, KEK_session)

- ??? = encrypted_session_secret = encrypt(session_secret, KEK) - maybe not needed as it will no be possible to uncrypt it after an F5 without the KEK → stored session secret directly in DB ?
- in IndexedDB
    - ```{"encryptedDEK": "...", "encryptedSK": "...", "encrypted_session_secret": "...", "salt": "...","kdfParams": {...} }```
- after f5
    - JWT cookie (valid session)
    - IndexedDB (everything crypted)
    - what is done:
        - JWT → backend → return session_secret
        - rebuild KEK
            - KEK_session = KDF(session_secret, salt)
        - uncrypt
            - SK = decrypt(encrypted_SK, KEK_session)
            - DEK = decrypt(encrypted_DEK, SK)

- if we want to encrypt `session_secret` in backend
    - in `.env`, master key:
        - `MASTER_KEY=32_bytes_random_base64`
        - used as the root secret to protect all session secrets
    - encryption of `session_secret` (at login)
        - generate `session_secret`
            - `GenerateSessionSecret()`
        - encrypt it with server master key
            - `EncryptSessionSecret(session_secret, MASTER_KEY)`
        - store in database:
            - `encrypted_session_secret`
            - `IV`
    - return plain session_secret to client (via HTTPS)
        - used immediately to derive `KEK_session`
    - after F5 (session restore)
        - client sends request with session (JWT cookie)
        - backend retrieves encrypted session data
            - `GetSessionFromDB(session_id)`
        - backend decrypts session_secret
            - `DecryptSessionSecret(encrypted_session_secret, nonce, MASTER_KEY)`
        - backend returns `session_secret` to authenticated client
        - client rebuilds crypto context
            - `DeriveKEKSession(session_secret, salt)`
            - `DecryptSK(encrypted_SK, KEK_session)`
            - `DecryptDEK(encrypted_DEK, SK)`

#### Conclusion
- Not a good solution as the backend store a key that can be used to decrypt other keys -> lose the principle of zero knowledge

## New Solutions
### Ask for password after F5
- not what we want but well
- or we set up a PIN (more research to do on this side if we chose that)
### Local encrypted cache
- when login we still have
    - Kek -> KEK = KDF(password, salt)
    - generation session key
        - SK = random(32 bytes)
    - local encryption 
        - encrypted_DEK = encrypt(DEK, SK)
        - encrypted_SK = encrypt(SK, KEK) -> store in DB ?
- in local cache, we add 
    - local_key = generate non-extractable key
- then: encrypted_SK_local = encrypt(SK, local_key)
    - store in IndexedDB
- after F5
    - if cache
        - local_key → decrypt SK
        - SK → decrypt DEK
    - if no cache
        - user password → KEK
        - KEK → decrypt SK
        - SK → decrypt DEK
### User PIN
- at login
    - enter password + PIN
        - password + salt → KEK = KDF(password)
        - PIN + local_salt → local_key = KDF(PIN)
    - generate DEK and SK + encryption
        - encrypted_DEK = encrypt(DEK, SK)
        - encrypted_SK_server = encrypt(SK, KEK)
        - encrypted_SK_local = encrypt(SK, local_key)
    - store in DB
        - encrypted_SK_server
        - encrypted_DEK
        - salt
    - store in IndexedDB
        - encrypted_SK_local
        - local_salt
- after F5
    - user enter PIN
        - PIN → local_key = KDF(PIN, local_salt)
    - decryption
        - SK = decrypt(encrypted_SK_local, local_key)
        - DEK = decrypt(encrypted_DEK, SK)
- if user loses PIN or lost cash
    - ask for password

