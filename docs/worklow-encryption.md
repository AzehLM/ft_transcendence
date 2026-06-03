# Workflow d'encryption

## Phases

### Phase 1: Registration Pipeline Cryptographic Blueprint


```

[Form Submission]
├── 1. crypto.getRandomValues() ──> 16-Byte Cryptographic Salt
├── 2. PBKDF2 (100k Iterations, SHA-256) ──> Master Key (AES-GCM 256-bit)
├── 3. crypto.subtle.generateKey() ──> Asymmetric RSA-OAEP 4096-bit KeyPair
├── 4. crypto.subtle.encrypt(AES-GCM) ──> Wrapped User Private Key + 12-Byte IV
├── 5. crypto.subtle.sign(HMAC-SHA256) over "auth_string" ──> AuthHash Proof
└── 6. Base64 Encoding (Chunked 8KB Matrix) ──> POST /api/auth/register

```

#### 1. Low-Level Client Primitives Seeding
Upon triggering `generateRegistrationData(email, password)`, the local browser environment isolates state variables to prevent plain text extraction:
* **Salt Allocation:** A deterministic `Uint8Array` byte structure of 16 bytes (128 bits) is created and mutated via `crypto.getRandomValues(salt)`, filling the vector index placeholders with uniform entropy bytes ranging from 0 to 255.
* **Key Derivation (KDF):** The plain text password is serialized to binary data via a `TextEncoder` abstraction. The engine runs a secure structural key derivation iteration:
$$\text{Master\_Key} = \text{PBKDF2}(\text{Password}_{\text{bytes}}, \text{Salt}, \text{iterations}=100000, \text{hash}=\text{"SHA-256"})$$
The returned `CryptoKey` reference points to an extractable symmetric **AES-GCM 256-bit** implementation layer.

#### 2. KeyPair Allocation & Relational Wrapping
* **Asymmetric Infrastructure:** React calls `generateRSAKeyPair()` to allocate an asymmetric **RSA-OAEP 4096-bit** relationship constraint using the standard public exponent parameters ($65537$, encoded as `[1, 0, 1]`).
* **Symmetric Envelope Encapsulation:** To isolate the critical asymmetric asset before network transport, `wrapPrivateKey` is invoked:
  1. The asymmetric asset is marshaled into raw binary representation using the standard export format `"pkcs8"`.
  2. A random 12-byte (96 bits) hardware-seeded Initialization Vector (`iv`) is generated.
  3. The raw private key byte-stream is encrypted symmetrically via **AES-GCM**:
$$\text{encryptedPrivateKey} = \text{Encrypt}_{\text{AES-GCM}}(\text{PrivateKey}_{\text{pkcs8}}, \text{Master\_Key}, \text{iv})$$

#### 3. Mathematical Proof Generation (The AuthHash)
The client must provide structural verification of password authenticity without transferring raw key patterns over the TLS barrier. The client triggers `generateAuthHash(masterKey)`:
1. The derived Master Key is exported to a native binary payload (`"raw"` specification).
2. The browser mounts this raw buffer directly into a transient signing structure using **HMAC** linked with a **SHA-256** hash constraint.
3. The structural cryptographic context signs a fixed validation constant message: `"auth_string"` via `crypto.subtle.sign`.
$$\text{AuthHash} = \text{HMAC-SHA256}(\text{Master\_Key}_{\text{raw}}, \text{"auth\_string"})$$

#### 4. Transport Mapping & Serialization
To guarantee that high-entropy binary byte streams cross the application boundary without character-set corruption, all blocks are split into chunked arrays ($8\text{ KB}$ segments) and marshaled via `uint8ArrayToBase64` using browser-native `btoa` routines before firing the underlying JSON `POST /api/auth/register`.






![Logo](images/inscription.webp)

---

### Phase 2: Login & Volatile Asset Invalidation

**Prerequisite State Constraint:** The application window has been completely recycled. The operational volatile state engine (RAM) contains zero temporary variables. The client context holds no resident operational secret vectors.

#### 1. Asynchronous Salt Retrieval Handshake
The user populates input text vectors inside the React DOM context interface.
* The frontend initializes a network query containing the plain text email identifier payload: `POST /api/auth/salt`.
* **Database Interception:** The Go API processes the input key index, queries PostgreSQL, and extracts the record's raw `salt` block. If the identity exists, it reflects the block to the user context as an opaque Base64 response parameter.

#### 2. Dynamic Symmetric Reconstruction
React ingests the Base64 block string, processes it via `base64ToUint8Array`, and triggers the underlying client pipeline directly matching the registration sequence:
1. Re-executes `deriveMasterKey` with the input password and the recovered server-side salt payload, generating an identical local instance of the **Master Key** structure.
2. Re-runs `generateAuthHash(masterKey)`, signing the explicit static constant `"auth_string"` to output a fresh verification proof signature.
3. Fires a `POST /api/auth/login` containing the `auth_hash` string block.

#### 3. Zero-Knowledge Clearance & Asset Unwrapping
The Go API validates the matching proof payload against the non-reversible database record signature processed under **Argon2id** constraints. Upon success, the session cookies are set, and the user's specific relational payload variables (`encrypted_private_key`, `iv`) are passed back inside the `200 OK` header block.

The React engine captures the payload response and unrolls the envelope using `unwrapPrivateKey`:
1. The network strings are downsampled to basic byte-stream matrices via `base64ToUint8Array`.
2. The runtime invokes `crypto.subtle.decrypt` using **AES-GCM** backed by the freshly reconstructed local Master Key context to resolve the plain text `pkcs8` binary block:
$$\text{decryptedBuffer} = \text{Decrypt}_{\text{AES-GCM}}(\text{encryptedPrivateKey}, \text{Master\_Key}, \text{iv})$$
3. The resulting binary block is parsed and mounted into a native asymmetric asset primitive through `crypto.subtle.importKey` under **RSA-OAEP** rules.
4. **Persistent Secure Seeding:** The fully unencrypted operational asset is passed to `storePrivateKey(privateKey)`, committing it directly to **IndexedDB** (`idb.service`) to handle runtime file key decryption operations asynchronously.
5. **Memory Sanitization:** The transient Master Key structural parameters are discarded from the browser's active scope layer, rendering client state immune to memory scraping vectors.


![Logo](images/login.webp)

---

### Phase 3 : L'Upload (Chiffrement Hybride par Fichier)

    Génération de la DEK : Dès que l'utilisateur sélectionne un fichier, la Web Crypto API génère une clé symétrique aléatoire, strictement unique à ce fichier : la DEK (Data Encryption Key, AES-GCM 256-bit).


    Génération de l'IV : Création d'un Vecteur d'Initialisation (Initialization Vector) aléatoire de 12 bytes.

    Chiffrement du Fichier : Le contenu brut (plaintext) passe dans AES-GCM avec la DEK et l'IV.

        Résultat : Le Ciphertext (blob illisible). Note d'implémentation : en Web Crypto, l'Auth Tag (MAC) n'est pas séparé, il est automatiquement concaténé à la fin du Ciphertext par l'API.

    Protection de la DEK : Le frontend récupère la Clé Publique de l'utilisateur (depuis l'API ou le store local). Il l'utilise pour chiffrer la DEK via RSA-OAEP.

        Résultat : Encrypted_DEK.

    Routage des données :

        Vers Go (PostgreSQL) : React envoie les métadonnées : nom du fichier, Encrypted_DEK et IV.

        Vers MinIO : React envoie le Ciphertext (le blob) directement via la Presigned URL.

![Logo](images/upload.webp)

### Phase 4 : Le Download (Le Déchiffrement E2EE)

    Requête de métadonnées : React fait un GET sur l'API Go. Le backend interroge PostgreSQL et renvoie : la Encrypted_DEK, l'IV et l'URL présignée MinIO.

    Unwrapping de la DEK : Le frontend récupère la Clé Privée de l'utilisateur depuis Zustand. Il déchiffre la Encrypted_DEK.

        Résultat : La DEK est de retour en clair dans la RAM du navigateur.

    Téléchargement du Blob : React télécharge le Ciphertext depuis MinIO.

    Déchiffrement Final : Le frontend injecte dans crypto.subtle.decrypt : la DEK, l'IV, et le Blob.

        Intégrité : L'algorithme vérifie silencieusement l'Auth Tag inclus dans le blob. Si le hash correspond, il recrache le fichier original. Si un attaquant a modifié un bit sur MinIO, la fonction throw une erreur et refuse de déchiffrer.

![Logo](images/download.webp)

---

### Organisations

#### 1 Organization Creation Workflow


```

[React Client]
├── 1. Generates Org RSA KeyPair & Temporary AES-256 Key
├── 2. Encrypts Org_Priv_Key with AES Key (AES-GCM)
├── 3. Encrypts AES Key with Admin Public Key (RSA-OAEP)
└── 4. POST /api/orgs ──> [Go / Fiber Backend] ──> [PostgreSQL]

```

1. **Trigger & Primitives Generation:**
   The user initiates the creation sequence. The React frontend uses the Web Crypto API to generate:
   * **Organization Identity:** An asymmetric RSA key pair (`Org_Pub_Key` and `Org_Priv_Key`).
   * **Transient Wrapping Key:** A temporary symmetric `AES-GCM 256` key.

2. **Symmetric Layer (Private Key Protection):**
   The client encrypts the organization's private key using the transient AES key:
   $$\text{enc\_org\_priv\_key} = \text{Encrypt}_{\text{AES-GCM}}(\text{Org\_Priv\_Key}, \text{AES\_Key})$$
   This outputs the `enc_org_priv_key` binary payload along with its unique Initialization Vector (`iv`).

3. **Asymmetric Layer (Key Encapsulation):**
   The client retrieves the Admin's personal public RSA key from the session. The transient AES key is exported to raw bytes and encrypted:
   $$\text{enc\_aes\_key} = \text{Encrypt}_{\text{RSA-OAEP}}(\text{AES\_Key}_{\text{raw}}, \text{Admin\_Pub\_Key})$$

4. **API ingestion & Persistence:**
   All binary buffers are encoded to Base64 strings. The client performs a `POST /api/orgs` request.
   The **Go / Fiber** backend opens a PostgreSQL transaction to:
   * Create the organization row (assigning a standard `UUID`).
   * Add the creator as an **Admin** in the `org_members` junction table.
   * Store `enc_org_priv_key`, `enc_aes_key`, and `iv` directly in the admin's relation row.
   * *Zero-Knowledge Architecture:* The server has no access to plaintext keys and only stores opaque blocks.

5. **Real-Time Notification:** The backend publishes an `org_created` event to **Redis**, broadcasting a WebSocket notification to the user's other active devices to update the UI reactively.

---

#### 2 Member Invitation Flow

**Scenario:** Alice (Admin) invites Bob (New Member) into the organization.



1. **Public Key Retrieval:**
   Alice's React client requests Bob's verified asymmetric `Bob_Pub_Key` from the Go API.

2. **Decryption Phase (Admin Client-Side RAM):**
   Alice's client downloads her own organization cryptographic assets. It decrypts `enc_aes_key` using Alice's hardware/browser-bound private RSA key, then uses the recovered AES key and `iv` to decrypt `enc_org_priv_key`.
   *The `Org_Priv_Key` is now available as a plaintext primitive inside Alice's client volatile memory (RAM).*

3. **Secure Re-Wrapping for the Invitee:**
   To securely pass the key to Bob without the server intercepting it, Alice's client performs a new Key Encapsulation Mechanism (KEM):
   * Generates a **brand new temporary symmetric key** (`Bob_Temp_AES_Key`) and a fresh `iv`.
   * Encrypts the `Org_Priv_Key` with this new symmetric key.
   * Encrypts ("wraps") this new symmetric key using **Bob's Public Key** (`Bob_Pub_Key`) via RSA-OAEP.

4. **Payload Storage:**
   Alice sends these new specific Base64 blobs to the backend via `POST /api/orgs/{id}/members`. The Fiber backend inserts this record into the `org_members` table for Bob. 
   *Result:* Bob now has secure mathematical access to the organization. When he connects, his client will pull his specific blobs and decrypt them using his own private RSA key.

![Logo](images/organisations.webp)

#### 3 Secure Upload & Download Flows

    Upload : Lorsqu'un membre upload un fichier dans l'espace de l'organisation, React génère la DEK du fichier, chiffre le fichier, puis chiffre la DEK avec la Org_Pub_Key.

    Download : N'importe quel membre récupère la DEK chiffrée. Il déchiffre d'abord son accès à l'organisation (Encrypted_Org_Priv_Key locale -> Org_Priv_Key), puis utilise l'Org_Priv_Key pour déchiffrer la DEK du fichier.
![Logo](images/orga-upload.webp)
![Logo](images/orga-download.webp)

---

## Définition

- entropie
    - Génération de mot de passe / clé au hasard
- Salt_1
    - une chaîne aléatoire qui est combinée avec un mot de passe avant de calculer son hash
    ```
    mot_de_passe = "azerty123"
    salt = "Salt_1"
    hash = hash(mot_de_passe + salt)
    ```
    - unique par utilisateur
    - généré aléatoirement
    - peut être stocké en clair

- Dérivation (KDF)
    - Key Derivation Function
    - Algorithme qui transforme un mot de passe et un salt en clé d'encryptage
- PBKDF2
    - Password-Based Key Derivation Function 2
    - KDF standardisé
    ```
    clé = PBKDF2(
    mot_de_passe,
    salt,
    nombre_d_iterations,
    fonction_hash
    )
    ```
- KEK
    - Key encryption Key
    - sert à protéger d'autres clés
    ```
    KEK = KDF(
    password,
    salt,
    iterations,
    output_length = 32 bytes
    )
    ```
- Key Wrapping
    - Chiffrer une clé cryptographique avec une autre clé
    - Clé qui protège = KEK 
    - Clé protégée = clé privée RSA
- RSA-OAEP 4096-bit
    - algorithme de cryptographie asymétrique.
    - Clé publique (pour chiffrer)
    - Clé privée (pour déchiffrer)
    - OAEP ajoute : Randomisation et Protection contre certaines attaques
- AES-GCM
    - Advanced Encryption Standard: algorithme de chiffrement symétrique (rapide et moderne) qui utilise une seule clé, est très rapide et est un standard mondial
    - Galois/Counter Mode (GCM): mode de fonctionnement d’AES qui fournit: Confidentialité (chiffrement), Authentification (détection modification), Intégrité
- Encrypted private key
    - clé privée qui a été chiffrée.
    - Private_Key  →  AES-GCM avec KEK  →  Encrypted_Private_Key
- HMAC-SHA256 = Hachage sécurisé basé sur une clé secrète
- AuthHash
    - empreinte cryptographique authentifiée générée à partir d’une clé secrète pour vérifier la bonne valeur du mot de passe
- Au final : 
    - Mot de passe + Salt → PBKDF2 → KEK AES-256-GCM (Key Wrapping) →  Clé Privée RSA chiffrée && AutHash
    - RSA-4096 ==> (Public_Key  → stockée en clair) && (Private_Key → protégée via KEK)
    - Le backend stocke : Encrypted_Private_Key + Public_Key +  Salt + AuthHash
    - Le backend : ne connaît jamais le mot de passe, ni la clé privée et ne peut donc pasdéchiffrer
    -  Architecture "zero knowledge"

---

- JWT
    - JSON Web Token
    - jeton sécurisé utilisé pour authentifier et échanger des informations entre deux parties
    - contient 3 parties séparées par des points : HEADER.PAYLOAD.SIGNATURE
        - Header (en-tête): Indique le type (JWT) et l’algorithme de signature (HS256, RS256, etc.)
        - Payload (corps / claims): Contient les informations à transmettre (claims)
        - Signature: Permet de vérifier que le token n’a pas été modifié

---

- DEK
    - Data Encryption Key
    - chiffre réellement les données
- IV
    - Initialization Vector
    - valeur aléatoire utilisée avec l'algorithme de chiffrement symétrique pour garantir que le même message chiffré plusieurs fois avec la même clé produira des ciphertexts différents
    - rend le chiffrement non déterministe, protégeant contre les attaques par motifs et répétitions
- MinIO
    - stockage objet compatible S3
    - stocker n’importe quelle donnée sous forme d’objet
    - Chaque objet a un nom unique (key) et des métadonnées
- Presigned URL 
    - permet de donner à un client l’accès temporaire à un objet dans MinIO sans partager la clé d’accès globale
- Au final :
    - Upload File → DEK (unique au fichier) & IV → Chiffrement → Ciphertext + Auth Tag (concaténé automatiquement) → Enregistrement dans la DB (nom de fichier, DEK encrypté et IV) & Presigned URL vers MiniIO

---

- E2EE = End-to-End Encryption
    - chiffrement de bout en bout.
    - données sont chiffrées côté émetteur et ne sont déchiffrées que côté destinataire.
- Zustand 
    - bibliothèque JavaScript/React pour la gestion d’état
- Au final :
    - GET (fichier sur API) → backend interroge DB → renvoie DEK encrypté, IV et URL présignée MinIO + front récupère Clé Privée → Déchriffrement de la DEK → front télécharge le Ciphertext → Déchiffrement final (si Auth Tag correspond)

