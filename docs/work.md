# ostrom - Architecture Zero-Knowledge

Stack: React (Frontend) / Go + GORM (Backend) / PostgreSQL / Redis / MinIO

* **AuthHash Strategy:** Stored securely using the `Argon2id` password hashing algorithm.
* **JWT Architecture:** Generated exclusively during register and login sequences. Sub-sequent HTTP requests transmit the Access JWT via the `Authorization: Bearer <token>` header. Upon expiration, the client reaches out to `POST /api/auth/refresh` using the HttpOnly `refresh_token` cookie to obtain a fresh pair.

---

## 1. User Registration Flow

1. **Trigger:** The user submits the validated registration form (Email, Password length $\ge$ 8, matching confirmations).
2. **Client-Side Processing (Web Crypto API):**
   * Cryptographic salts are generated randomly via `crypto.getRandomValues()`.
   * Derives a symmetric Master Key (`KEK`) using **PBKDF2**.
   * Generates an asymmetric RSA KeyPair (`Org_Pub_Key` / `Org_Priv_Key`).
   * Encrypts ("wraps") the RSA private key using the Master Key via **AES-GCM**.
   * Computes an `auth_hash` using **HMAC-SHA256** over the Master Key.
3. **API Request:** `POST /api/auth/register` sends the `email`, `salt`, `auth_hash`, `public_key`, `encrypted_private_key`, and `iv` (all sanitized and mapped as Base64 strings).
   * **Zero-Knowledge Guarantee:** The plain text password and the intermediate Master Key never leave the user's browser context.
4. **Backend Processing (Go / Fiber & GORM):**
   * The server runs the incoming `auth_hash` string through **Argon2id**.
   * Commits the new user entity and cryptographic parameters securely inside a single PostgreSQL transaction.
   * Issues an Access JWT (JSON response body) and sets an HttpOnly Refresh JWT cookie.
5. **UI State Transition:** React captures the `access_token`, persists it locally in `localStorage`, and triggers the local 2FA setup wizard (`setShowTwoFAPrompt(true)`).
6. **Real-time Gateway Integration:** Upon completing the initial session validation, the client bridges a WebSocket connection to `wss://api.../ws` backed by the Access JWT.
7. **Broker Routing:** The Go backend authenticates the handshake, registers the stream into the active connection pool, and initiates an asynchronous event loop monitoring the Redis Pub/Sub broker for that explicit user pointer.

![Logo](images/project-register.webp)

---

## 2. Login

### Phase 1 - Recup du salt

- User tape email + mdp
- `GET /api/auth/salt?email=student@42lyon.fr`
- Le back renvoie le salt (base64) si le user existe

### Phase 2 - Calculs coté client

- Derive la KEK via PBKDF2(mdp + salt)
- Calcule AuthHash = HMAC-SHA256(KEK, "ft_box_auth")

### Phase 3 - Requete de login

- `POST /api/auth/login`
  ```json
  { "email": "student@42lyon.fr", "auth_hash": "<base64>" }
  ```
- Backend :
  - Recup le hash Argon2id stocke pour cet email
  - Compare avec l'AuthHash recu
  - Si OK -> genere les JWT (access + refresh cookie)
  - Recup EncryptedPrivKey + IV en DB
- Repond 200 avec tokens + EncryptedPrivKey + IV

### Phase 4 - Dechiffrement local

- Le client utilise la KEK (encore en RAM) + IV pour dechiffrer la privkey (AES-GCM)
- Maintenant le client a sa PubKey et PrivKey RSA dans IndexedDB
- On ecrase la KEK direct de la memoire
- Ouverture websocket + redirect `/dashboard`

![Logo](images/project-login.webp)
---

## 3. Organization Creation

1. **Trigger:** User clicks "Create Org" (e.g., `42_Projects`).
2. **Client-Side Generation:** * Generates an asymmetric RSA Organization Key Pair via the *Web Crypto API*.
   * Generates a temporary symmetric key (`AES-GCM 256`).
3. **Client-Side Encryption:**
   * Encrypts the `Org_Private_Key` with the temporary AES key $\rightarrow$ `encrypted_org_private_key` + `iv`.
   * Encrypts ("wraps") the temporary AES key with the User's Public RSA Key (`RSA-OAEP`) $\rightarrow$ `encrypted_aes_key`.
4. **API Request:** `POST /api/orgs` with `name`, `public_key`, `enc_org_priv_key`, `enc_aes_key`, and `iv` (all Base64-encoded).
5. **Backend Processing (PG Transaction):**
   * Provisions the organization (UUID generation).
   * Assigns the creator as the organization **Admin**.
   * Persists the encrypted cryptographic envelope inside the `org_members` table.
   * *Zero-Knowledge Guarantee:* The server only processes opaque BLOBs and cannot access plaintext keys.
6. **Real-Time Sync:** Publishes an `org_created` event to Redis $\rightarrow$ pushed via WebSockets to the user's other active sessions.

---

## 4. Member Invitation Flow

**Scenario:** The Admin invites Alice into the organization.

1. **Data Fetching:** Admin's client fetches their own encrypted organization envelope and requests Alice's Public RSA Key from the server.
2. **Client-Side Decryption:** Admin decrypts the `encrypted_aes_key` using their private RSA key, then decrypts the `encrypted_org_private_key` to temporarily recover the organization's plaintext private key in memory (RAM).
3. **Re-Encryption for the Invitee:** * Admin generates a brand-new temporary AES key and a unique `iv` specifically for Alice.
   * Encrypts the organization's private key with this new AES key.
   * Encrypts ("wraps") this new AES key with **Alice's Public RSA Key**.
4. **API Request:** `POST /api/orgs/{id}/members` containing Alice's user ID and her targeted cryptographic payload.
5. **Persistence:** Server stores this payload into the `enc_org_priv_key` column of the `org_members` table for Alice.
6. **Consumption:** Upon login/access, Alice's client fetches her specific blob, decrypts it using her private RSA key, and mounts the organization's private key into volatile memory (RAM) for authorized operations.


---

## 5. Upload de fichier

Probleme : un fichier de 2 Go ca tient pas en RAM dans un Uint8Array, le tab crash. Faut utiliser la Web Streams API + Web Crypto en streaming.

### Phase 1 - Chiffrement local (React)

1. Pour chaque fichier, le client genere une DEK (Data Encryption Key) aleatoire (AES-GCM 256) + un IV unique
2. Le client lit le fichier par chunks, chiffre chaque chunk avec la DEK en AES-GCM -> produit un Blob chiffre
3. Le nom du fichier est aussi une donnee sensible -> chiffre avec la DEK MAYBE

### Phase 2 - Negociation de l'upload (Go)

1. `POST /api/files/upload-url` -> "je veux upload un fichier de X octets dans le dossier Y"
2. Backend verifie le JWT, check le quota dispo
3. Genere une Presigned URL PUT via le SDK MinIO (valable ~15 min)
4. Renvoie l'URL au client

### Phase 3 - Transfert direct vers MinIO

- Le client fait un `PUT` directement sur l'URL MinIO avec le Blob chiffre
- Le backend Go n'est pas dans la boucle reseau -> zero overhead CPU/RAM

### Phase 4 - Finalisation + key wrapping (React -> Go)

1. Upload MinIO termine (200 OK), maintenant faut securiser la DEK
2. Key wrapping :
   - Fichier perso -> chiffre la DEK avec la PubKey RSA du user
   - Fichier d'orga -> chiffre la DEK avec l'OrgKey (deja dechiffree en RAM)
3. `POST /api/files/finalize`
   ```json
   {
     "object_id": "<UUID_Minio>",
     "filename": "<base64>",
     "encrypted_dek": "<base64>",
     "iv": "<base64>",
     "org_id": "<uuid_optional>"
   }
   ```
4. Backend stocke ces metadonnees en DB (BYTEA pour les champs crypto)
5. Publie un event WS pour refresh l'UI des autres sessions


---

## 6. Download de fichier

Le miroir de l'upload : recup le fichier chiffre, recup la cle, dechiffre tout en local.

### Phase 1 - Demande de telechargement (React -> Go)

1. `GET /api/files/{file_id}/download`
2. Backend verifie les droits
3. Genere une Presigned URL GET (MinIO)
4. Renvoie l'URL + encrypted_dek + IV + filename

### Phase 2 - Dechiffrement de la cle (React)

- Recup l'encrypted_dek
- Dechiffre avec la PrivKey RSA (fichier perso) ou l'OrgKey (fichier partage) -> DEK en clair en RAM

### Phase 3 - Download + dechiffrement (MinIO -> React)

1. Telecharge le blob chiffre direct depuis MinIO via la Presigned URL
2. Dechiffre le fichier a la volee avec la DEK + Web Streams API
4. Cree un `URL.createObjectURL()` et declenche le download cote navigateur
5. Nettoyage : ecrase la DEK (`Uint8Array.fill(0)`) et revoque l'ObjectURL


---

## 7. Suppression de fichier

### Phase 1 - Requete de suppression (React -> Go)

1. `DELETE /api/files/{file_id}`
2. Backend verifie le JWT + les droits  :
   - Fichier perso -> seul le owner peut supprimer
   - Fichier d'orga -> faut etre admin ou avoir la permission delete

### Phase 2 - Suppression (Go)

1. Backend demarre une transaction PostGrey :
   - Supprime les entrees dans la table des metadonnees (encrypted_dek, filename, iv, etc.)
   - Supprime les entrees dans `file_keys` (les DEK wrappees pour chaque user/orga)
2. Supprime l'objet sur MinIO via le SDK (`RemoveObject`)
3. Commit de la transaction
4. Publie un event `file_deleted` sur Redis -> push WS pour refresh l'UI des autres sessions

Note : si le delete MinIO fail apres le commit PG, faut un mecanisme de cleanup


---

## 8. Changement de role dans une orga

Roles possibles : admin, member (extensible plus tard si besoin).

### Phase 1 - Requete (React -> Go)

1. `PATCH /api/orgs/{org_id}/members/{user_id}`
   ```json
   { "role": "admin" }
   ```
2. Seul un admin de l'orga peut changer les roles

### Phase 2 - Backend (Go)

1. Verifie le JWT + que le demandeur est admin de l'orga
2. Verifie qu'on essaie pas de retirer le dernier admin (il faut toujours au moins 1 admin)
3. Met a jour le role dans la table `organization_members`
4. Publie un event `member_role_updated` sur Redis -> push WS

Cote crypto : rien a faire. Le changement de role c'est purement du RBAC cote serveur. La cle d'orga (OrgKey) est la meme quel que soit le role, elle a deja ete wrappee pour ce user lors de l'invitation. Le role controle juste les permissions (qui peut invite, delete, changer les roles, etc.), pas l'acces aux cles.


---

## 9. Dashboard - Chargement initial

Ce qui se passe quand le user arrive sur `/dashboard` apres le login.

### Phase 1 - Recup de l'arborescence (React -> Go)

1. `GET /api/folders?parent_id=root` (ou sans param = racine)
2. Backend recup les dossiers + fichiers du user a la racine :
   - Query sur `folders` WHERE `owner_user_id = $1 AND parent_id IS NULL AND org_id IS NULL`
   - Query sur `files` WHERE `owner_user_id = $1 AND folder_id IS NULL AND org_id IS NULL`
3. Renvoie la liste : dossiers + fichiers avec leurs metadonnees (name, size, created_at)

### Phase 2 - Navigation dans les dossiers

- User clique sur un dossier -> `GET /api/folders/{folder_id}/contents`
- Backend renvoie les sous-dossiers + fichiers de ce dossier
- Meme requete pour les fichiers d'orga : `GET /api/orgs/{org_id}/folders/{folder_id}/contents`
  - La le backend check que le user est bien membre de l'orga avant de renvoyer quoi que ce soit

### Phase 3 - Affichage

- Liste des dossiers (icone dossier + nom + date creation)
- Liste des fichiers (icone fichier + nom + taille + date creation)
- Breadcrumb pour la navigation (root > dossier1 > sous-dossier)
- Sidebar avec :
  - "Mes fichiers" (espace perso)
  - Liste des orgas du user (recup via `GET /api/orgs`)

### Orgas dans le dashboard

- `GET /api/orgs` -> liste les orgas dont le user est membre
- Quand le user clique sur une orga, on charge l'arborescence de l'orga de la meme facon
- Avant d'afficher les fichiers d'orga, le client doit avoir l'OrgKey en RAM :
  - Recup `enc_org_priv_key` depuis `org_members`
  - Dechiffre avec sa PrivKey RSA -> OrgKey en clair


---

## 10. Page Profil

### Storage usage bar

1. `GET /api/users/me` -> renvoie les infos du user dont `used_space` et `max_space`
2. Affichage d'une barre de progression :
   - `used_space / max_space * 100` = pourcentage utilise
   - Ex : "2.3 GB / 5 GB utilises"
   - Couleur verte < 70%, orange 70-90%, rouge > 90% MAYBE
3. Le `used_space` est mis a jour par le backend a chaque upload (`+file_size`) et chaque delete (`-file_size`)

### Infos affichees

- Email
- Date d'inscription
- Nombre d'orgas
- Storage utilise / total
- (plus tard : username, avatar) maybe


---

## 11. Suppression de compte

### Phase 1 - Confirmation (React)

1. User clique "Supprimer mon compte" sur la page profil
2. Le client demande le mdp pour confirmer (re-derive la KEK + AuthHash comme au login)
3. `DELETE /api/users/me` avec `{ "auth_hash": "<base64>" }`

### Phase 2 - Backend (Go)

1. Verifie le JWT + valide l'AuthHash contre le hash Argon2id stocke (double verif)
2. Check les orgas ou le user est le seul admin :
   - S'il est dernier admin quelque part -> refuser la suppression (ou forcer transfert du role avant)
3. Transaction PG :
   - Supprime tous les fichiers perso du user dans MinIO (batch `RemoveObjects`)
   - Supprime les entrees files, folders, org_members du user
   - Supprime le user dans la table users
   - Les `ON DELETE CASCADE` gerent les refs en cascade
4. Commit
5. Invalide les sessions : supprime les refresh tokens en DB/Redis, ferme la WS
6. Repond 200, le client redirige vers la page de login

Note : les fichiers d'orga restent intacts, c'est l'orga qui les possede. On supprime juste l'`enc_org_priv_key` du user dans `org_members`. Les autres membres gardent leur acces.


---

## 12. Logout

1. `POST /api/auth/logout`
2. Backend supprime le refresh token (DB ou Redis) + clear le cookie HttpOnly
3. Cote client : supprime la PubKey et la PrivKey RSA de IndexedDB, ferme la WS
4. Redirect vers `/login`


---

## 13. 2FA (TOTP)

Basee sur TOTP (Time-based One-Time Password) — compatible Google Authenticator, Authy, etc.

### Activation (page profil)

1. `POST /api/auth/2fa/enable`
2. Backend genere un secret TOTP (base32, 160 bits) + le stocke en DB (chiffre ou en clair, le user est deja authentifie)
3. Renvoie le secret sous forme d'URI `otpauth://` + QR code (ou juste l'URI, le front genere le QR)
4. User scan le QR avec son app
5. User entre le code a 6 chiffres pour confirmer -> `POST /api/auth/2fa/verify` avec `{ "code": "123456" }`
6. Backend valide le code TOTP, si OK -> marque `totp_enabled = true` en DB


### Impact sur le login

- Le login classique (phase 3) renvoie plus directement les JWT
- Si `totp_enabled = true`, le backend repond 200 avec `{ "requires_2fa": true, "tmp_token": "<token>" }`
- Le `tmp_token` est un token court (expire en 5 min), il sert juste a lier la session 2FA
- Le client affiche un champ pour entrer le code TOTP
- `POST /api/auth/2fa/validate` avec `{ "tmp_token": "...", "code": "123456" }`
- Backend valide le code TOTP + le tmp_token, si OK -> genere les vrais JWT (access + refresh cookie)
- A partir de la, le reste du login continue normalement (recup EncryptedPrivKey, dechiffrement, WS, etc.)


### Desactivation

1. `POST /api/auth/2fa/disable` avec `{ "code": "123456" }` (faut prouver qu'on a encore l'app)
2. Backend valide le code, passe `totp_enabled = false`, supprime le secret + les recovery codes

### Ajout en DB

```sql
ALTER TABLE users ADD COLUMN totp_secret VARCHAR(64);
ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE recovery_codes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash  VARCHAR(255) NOT NULL,
    used       BOOLEAN NOT NULL DEFAULT false
);
```


---

## 14. Changement de mot de passe

Changer le mdp c'est plus chiant  en zero-knowledge : faut re-wrapper toutes les cles.

1. User entre ancien mdp + nouveau mdp sur la page profil
2. Client :
   - Derive l'ancienne KEK (PBKDF2 + ancien mdp + salt actuel) -> verifie qu'elle marche en dechiffrant la PrivKey
   - Genere un nouveau salt
   - Derive la nouvelle KEK (PBKDF2 + nouveau mdp + nouveau salt)
   - Re-chiffre la PrivKey avec la nouvelle KEK (AES-GCM) -> nouveau EncryptedPrivKey + nouveau IV
   - Calcule le nouveau AuthHash = HMAC-SHA256(nouvelle KEK, "ft_box_auth")
3. `PUT /api/auth/password`
   ```json
   {
     "old_auth_hash": "<base64>",
     "new_auth_hash": "<base64>",
     "new_salt": "<base64>",
     "new_encrypted_private_key": "<base64>",
     "new_iv": "<base64>"
   }
   ```
4. Backend :
   - Valide l'ancien AuthHash contre le hash Argon2id stocke
   - Hash le nouveau AuthHash avec Argon2id
   - Met a jour salt, auth_hash, encrypted_private_key, iv en DB (transaction)
   - Invalide tous les refresh tokens existants (force re-login sur les autres sessions)
5. Repond 200

Note : la PubKey RSA change pas, les OrgKeys changent pas. Seul le wrapping de la PrivKey est refait.


---


### 15. User Deletion

```
[DELETE /api/auth/account] 
  └── 1. DB Transaction (PostgreSQL)
        ├── Determine Org Ownership & Cascade Strategy
        │     ├── Case A: Another Admin exists ──> Transfer ownership
        │     ├── Case B: Only members exist   ──> Promote oldest member & Transfer
        │     └── Case C: No one left          ──> Mark Org for deletion & Queue files
        ├── Queue personal files for cleanup
        └── Hard-delete user profile
  └── 2. Event Broadcasting (Redis Pub/Sub)
        ├── Publish `user_deleted` (Triggers MinIO object deletion asynchronously)
        ├── Publish `member_removed` (Syncs remaining active organization views)
        └── Publish `role_updated` + User notification (For newly promoted admins)
  └── 3. Session Termination (Clear Auth Cookies)

```

#### 1. Identity Validation & Context Gathering

* **Extraction:** The system extracts the `user_id` from the Fiber context locals and parses it into a valid UUID.
* **Pre-fetch:** Retrieves the user's email address prior to executing the deletion payload (required for downstream notification events).

#### 2. Atomic Database Transaction (PostgreSQL Cascade Logic)

The entire cleanup operates inside an isolated database transaction to avoid leaving stranded files or locked organizations if a query fails:

* **Organization-by-Organization Audit:** The handler loops through every organization the user belongs to:
* **Case A (Existing Admins):** If another user already holds an **Admin** role in the organization, ownership of the deleting user's files and folders inside that organization is transferred directly to them.
* **Case B (Member Promotion):** If the deleting user was the *sole admin* but other members exist, the system identifies the **oldest member** (ordered by `joined_at ASC`). This member is automatically promoted to **Admin**, and all file/folder records are transferred to them.
* **Case C (Orphaned Organization):** If the deleting user was the *last remaining person*, the entire organization is marked for deletion. All associated files are queried and queued inside a `filesToCleanup` array.


* **Personal Storage Cleanup:** The transaction queries all personal files belonging to the user (`org_id IS NULL`) and appends their `minio_object_key` to the cleanup queue.
* **Final Record Purge:** The user record is hard-deleted from the `users` table.

#### 3. Asynchronous Event Broadcasting (Redis Pub/Sub)

Once the database transaction commits successfully, the system publishes targeted real-time events to handle side effects out-of-band:

* **`PublishUserDeleted`:** Dispatches the `filesToCleanup` queue and ownership `transfers` mapping. A background worker intercepts this to physically purge the objects from the **MinIO S3** bucket.
* **`PublishMemberRemoved`:** Notifies surviving organizations that the user has left, allowing real-time UI updates across active client sessions via WebSockets.
* **`PublishRoleUpdated` & Direct Message:** If a member was promoted to Admin during *Case B*, the system resolves their email, fires a role update state event, and sends a direct interface notification to inform them of their new ownership.

#### 4. Session Termination

* The client's security context is destroyed by explicitly clearing the JWT `refresh_token` HTTP-only cookie.
* Returns a `200 OK` structure confirming account termination.
---



## Workflows manquants (a detailler plus tard)

- **Creer un dossier** : `POST /api/folders` avec name + parent_id + org_id optionnel
- **Supprimer un dossier** : `DELETE /api/folders/{id}` (recursif : vider les fichiers d'abord vu le `ON DELETE RESTRICT`)
- **Renommer fichier/dossier** : `PATCH /api/files/{id}` ou `PATCH /api/folders/{id}`
- **Quitter une orga** : `DELETE /api/orgs/{org_id}/members/me` (interdit si dernier admin)
- **Supprimer une orga** : `DELETE /api/orgs/{org_id}` (admin only, supprime tous les fichiers MinIO de l'orga)
- **Deplacer un fichier/dossier** : `PATCH` pour changer le `folder_id` ou `parent_id`
