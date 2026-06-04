## Glossary & Cryptographic Definitions

### Core Concepts & Derivation

* **Entropy**
    * The measure of randomness or unpredictability used when generating random keys, initialization vectors, or passwords.


* **Salt (Salt_1)**
    * A high-entropy random byte string combined with a plaintext password before processing it through a cryptographic hashing or derivation function.


```javascript
password = "azerty123"
salt = "Salt_1"
hash = cryptographic_hash(password + salt)

```


    * Unique per user to prevent rainbow table attacks.
    * Generated using secure random number generators (`crypto.getRandomValues`).
    * Non-sensitive; can be safely stored in plaintext.


* **KDF (Key Derivation Function)**
    * A cryptographic algorithm designed to transform a low-entropy password and a salt into a mathematically uniform key suitable for encryption.


* **PBKDF2 (Password-Based Key Derivation Function 2)**
    * A standardized, industry-standard KDF that applies a pseudorandom function iteratively to slow down brute-force and dictionary attacks.


```javascript
derived_key = PBKDF2(
    password,
    salt,
    iterations,
    hash_function
)

```


* **KEK (Key Encryption Key)**
    * A symmetric key dedicated exclusively to encrypting and protecting other cryptographic keys rather than raw data.


```javascript
KEK = PBKDF2(
    password,
    salt,
    iterations = 100000,
    output_length = 32_bytes // 256 bits
)

```


* **Key Wrapping**
    * The process of encrypting a sensitive cryptographic key (the payload) using another symmetric key (the wrapping key / KEK) for secure storage or transit.
    * *Wrapping Key:* Master Key (`KEK`).
    * *Protected Payload:* User's asymmetric RSA Private Key.



---

### Encryption Algorithms

* **RSA-OAEP 4096-bit**
    * An asymmetric cryptographic algorithm utilizing a mathematically linked key pair:
* **Public Key:** Distributed openly; used by others to encrypt data or wrap keys for you.
* **Private Key:** Kept strictly confidential; used locally to decrypt received payloads.


* **OAEP (Optimal Asymmetric Encryption Padding):** A padding scheme that introduces asymmetry-based randomization and provides strict semantic security against chosen-ciphertext attacks (CCA).


* **AES-GCM (Advanced Encryption Standard - Galois/Counter Mode)**
    * A high-performance symmetric cryptographic standard utilizing a single shared key.
    * **Galois/Counter Mode (GCM):** An Authenticated Encryption with Associated Data (AEAD) mode that provides:
        * *Confidentiality:* Data encryption.
        * *Authentication & Integrity:* Generation of an authentication tag to instantly detect payload tampering.




* **Encrypted Private Key**
    * The user's core RSA private key transformed into an opaque, secure block prior to database ingestion.

$$\text{User\_Priv\_Key} \longrightarrow \text{Encrypt}_{\text{AES-GCM}}(\text{KEK}) \longrightarrow \text{Encrypted\_Private\_Key}$$




* **HMAC-SHA256**
    * A keyed-hash message authentication code algorithm that couples a secret cryptographic key with a SHA-256 hashing pass to verify data integrity and authenticity.


* **AuthHash**
    * An authenticated cryptographic proof generated locally by the client to verify password validity during handshake challenges without transmitting the actual password.



---

### Architectural Summary (Auth Lifecycle)

* **Data Flow Pipeline:**

$$\text{Password} + \text{Salt} \longrightarrow \text{PBKDF2} \longrightarrow \text{KEK}$$


$$\text{User\_Priv\_Key} \longrightarrow \text{AES-GCM-256}_{\text{(Wrapped by KEK)}} \longrightarrow \text{Encrypted\_Private\_Key}$$


$$\text{KEK} \longrightarrow \text{HMAC-SHA256}_{(\text{signed over "auth\_string"})} \longrightarrow \text{AuthHash}$$


* **RSA Configuration:**
    * `User_Pub_Key` $\rightarrow$ Stored in plaintext inside the database registry.
    * `User_Priv_Key` $\rightarrow$ Protected via client-side symmetric key wrapping (`KEK`).


* **Zero-Knowledge Compliance:**
    * The backend database hosts strictly: `Encrypted_Private_Key` + `Public_Key` + `Salt` + `AuthHash` (which is itself re-hashed with Argon2id).
    * The server remains completely blind to the user's plaintext password and private key. It cannot decrypt any organization data or user files.



---

### Token & Storage Management

* **JWT (JSON Web Token)**
    * A compact, URL-safe standard used for signing and verifying identity payloads securely between two parties.
    * Composed of three distinct blocks concatenated by dots: `HEADER.PAYLOAD.SIGNATURE`
        * **Header:** Identifies the token type (`JWT`) and the underlying cryptographic signature algorithm (e.g., `HS256`, `RS256`).
        * **Payload:** Houses the statement context claims (user claims, metadata, scope, and token lifespan).
        * **Signature:** Formed by combining the encoded header, payload, and a secret key to prove payload integrity.




* **DEK (Data Encryption Key)**
    * A symmetric key (typically AES-GCM) generated on-the-fly to perform bulk encryption over raw data files.


* **IV (Initialization Vector)**
    * A non-repeating, random byte block passed into a symmetric encryption algorithm along with the key. It prevents the generation of identical ciphertexts from matching plaintext blocks, thwarting pattern-recognition and replay vectors.


* **MinIO**
    * A high-performance, S3-compliant distributed object storage engine designed to host unstructured data as immutable objects tagged with unique keys and metadata headers.


* **Presigned URL**
    * A temporary, cryptographically signed hyperlink giving the client direct read/write permission to a specific MinIO storage path without exposing the application's global root access credentials.



---

### Architectural Summary (Storage Lifecycle)

* **File Upload Pipeline:**

$$\text{Upload File} \longrightarrow \text{Generate Unique DEK} + \text{Fresh IV} \longrightarrow \text{Encrypt File via AES-GCM}$$


$$\text{Resulting Package} \longrightarrow \text{Ciphertext} + \text{Auth Tag} \longrightarrow \text{Streamed to MinIO via Presigned URL}$$


$$\text{Metadata Package} \longrightarrow \text{Encrypt DEK via Org\_Pub\_Key} \longrightarrow \text{Insert parameters (Filename, Encrypted DEK, IV) into Postgres}$$