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
- generation session key
    - SK = random(32 bytes)
- local encryption 
    - encrypted_DEK = encrypt(DEK, SK)
    - encrypted_SK = encrypt(SK, KEK)
- create sessin secret
    - session_secret = random()
    - encrypted_session_secret = encrypt(session_secret, KEK)
- in IndexedDB
    - ```{
  "encryptedDEK": "...",
  "encryptedSK": "...",
  "encrypted_session_secret": "...",
  "salt": "...",
  "kdfParams": {...}
}```
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