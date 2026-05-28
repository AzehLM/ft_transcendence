# Ostrom - API Routes

Base URL : `/api/`


---

## Auth

### `POST /auth/salt`

Retrieve the user's salt in order to derive the Key Encryption Key (KEK) on the client side.

Body :
```json
{
  "email": "student@42lyon.fr"
}
```

Response (200) :
```json
{ "salt": "<base64>" }
```

---

### `POST /auth/register`

Create a new account. The server never has access to the password or the KEK.

Body :
```json
{
  "email": "student@42lyon.fr",
  "salt": "<base64>",
  "auth_hash": "<base64>",
  "public_key": "<base64>",
  "encrypted_private_key": "<base64>",
  "iv": "<base64>"
}
```

Response (201) :
```json
{
  "message": "User successfully registered",
  "access_token": "<jwt>"
}
```
+ set the Refresh Token that is used to refresh the JWT when expired in cookie HttpOnly

---

### `POST /auth/login`

Log in the user

Body :
```json
{
  "email": "student@42lyon.fr",
  "auth_hash": "<base64>"
}
```

Response if 2FA not activated (200) :
```json
{
  "access_token": "<jwt>",
  "encrypted_private_key": "<base64>",
  "iv": "<base64>",
  "public_key": "<base64>"
}
```
+ Refresh JWT in cookie HttpOnly

Response if 2FA activated (200) :
```json
{
  "requires_2fa": true,
  "tmp_token": "<token_5min>",
  "methods": "",
  "expires_in": "300",
  "encrypted_private_key": "<base64>",
  "iv": "<base64>",
  "public_key": "<base64>"
}
```

---

### `POST /auth/refresh`

No body. Generate a new JWT with the Refresh JWT which is in cookie HttpOnly.

Response (200) :
```json
{
  "access_token": "<jwt>"
}
```

---

### `POST /auth/logout`

Delete the Refresh JWK and clear the cookie.

Response (200) :
```json
{
  "message": "logged_out_successfully"
}
```

---

### `PUT /auth/password`

Update Password. 

Body :
```json
{
  "old_auth_hash": "<base64>",
  "new_auth_hash": "<base64>",
  "new_client_salt": "<base64>",
  "new_encrypted_private_key": "<base64>",
  "new_iv": "<base64>"
}
```

Response (200) :
```json
{
  "message": "password updated"
}
```

---

### `PATCH /auth/first-name`

Change the first name of an user.

Body :
```json
{
  "first_name": "new name",
}
```

Response (200) :
```json
{
  "message": "first name updated"
}
```

---

### `PATCH /auth/family-name`

Chnage the family name of an user.

Body :
```json
{
  "family_name": "new name",
}
```

Response (200) :
```json
{
  "message": "family name updated"
}
```

---

### `GET /users/public-key?email=student@42lyon.fr`

Get the public key of an user with its email.

Response `200 OK` :
```json
{
  "public_key": "<base64>"
}
```

---
### `PATCH /user/avatar`

Updates the avatar of the authenticated user.

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `multipart/form-data` | Required for file uploads |
| `Authorization` | `Bearer <token>` | Required to authenticate the user |

#### Request Body
The body must be sent as `multipart/form-data`.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `avatar` | `file` | Yes | The image file to upload (JPEG, PNG). Max size: 5MB. |

Response `200 OK`:

```json
{
  "message": "avatar uploaded successfully"
}
```

--- 

### `GET /user/me/avatar`

User logged in can retrieve (in bytes) its avatar as well as the `Content-Type` of its avatar

Response `200 OK`
- The response body contains the binary stream of the image.
- Response Headers: Content-Type: image/png (or image/jpeg, depending on the avatar format)
- Response Body: Binary Data (The actual image file)

---

### `GET /users/{user_id}/avatar`

Any user can retrieve the avatar of a specific user as well as the `Content-Type` of its avatar

Response `200 OK`
- The response body contains the binary stream of the image.
- Response Headers: Content-Type: image/png (or image/jpeg, depending on the avatar format)
- Response Body: Binary Data (The actual image file)

---

## 2FA

### `POST /auth/2fa/totp/generate`

Generates a new TOTP (Time-based One-Time Password) secret and QR code URL to begin the Two-Factor Authentication (2FA) setup. The secret is temporarily stored on the server for 5 minutes and must be confirmed (validated) by the user before 2FA is definitively enabled.

Response (200) :
```json
{
		"qrCodeURL": "url",
		"secret":    "secret",
		"message":   "Scan QR with authenticator app",
		"expiresIn": 300,
}
```

---

### `POST /auth/2fa/totp/verify`
Verifies the 6-digit TOTP code provided by the user to complete the 2FA setup. If the code is valid, the server encrypts the TOTP secret, enables 2FA on the user's profile, and generates 10 one-time recovery codes that the user must save.

Body :
```json
{ "code": "123456" }
```

Response (200) :
```json
{
  "success": true,
  "recoveryCodes": [
    "AAAA-BBBB-CCCC",
    "DDDD-EEEE-FFFF",
    "... (10 codes total)"
  ],
  "message": "Save these 10 codes in a safe place offline!"
}
```

---

### `POST /auth/2fa/verify`

Confime the activation by validating a first code.

Body :
```json
{ "code": "123456" }
```

Response (200) :
```json
{
  "access_token": "<jwt>",
  "encrypted_private_key": "<base64>",
  "iv": "<base64>",
  "public_key": "<base64>"
}
```

---

### `GET /auth/2fa/recovery-codes`
Retrieves the 2FA status of the authenticated user and checks how many backup recovery codes they have left.

Response (200):
```json
{
  "enabled": true,
  "remaining": 10,
  "message": "You have backup codes remaining"
}
```

---

### `POST /auth/2fa/disable`

Disable the 2fa for an user.

Body :
```json
{ "password": "password" }
```

Response : `200 OK`
```json
{
  	"success": true,
		"message": "2FA has been disabled",
}
```

Delete the secret TOTP + the recovery codes.


---

## Users

### `GET /auth/me`

Retrieve information about the user logged in.

Response (200) :
```json
{
  "id": "<uuid>",
  "email": "student@42lyon.fr",
  "used_space": 2463129600,
  "max_space": 5368709120,
  "created_at": "2026-01-15T10:30:00Z",
  "first_name": "name",
  "family_name": "name"
}
```

---

### `DELETE /auth/me`

Delete the account (with personal files on Minio, BD entries - cascade, refresh token, close ws). (what happened if part of the organization ?)

Response (200) :
```json
{
  "message": "account deleted successfully"
}
```

---

## Organizations

### `GET /orgs`

Liste les orgas dont le user est membre.

Response (200) :
```json
[
  {
    "id": "<uuid>",
    "name": "42_Projects",
    "public_key": "",
    "used_space" : "",
    "max_space" : "",
    "role": "admin",
    "created_at": "",
    "description": "description"
  }
]
```

---

### `GET /orgs/{org_id}`
Récupère les informations d'une organisation.

Response `200 OK` :
```json
{
  "user_id": "",
  "id": "",
  "name": "42_Projects",
  "used_space" : "",
  "max_space" : "",
  "role": "member/admin",
  "description": "description"
}
```
Response `404` : organization not found

---

### `POST /orgs`

Cree une orga. Le createur devient admin.

Body :
```json
{
  "name": "42_Projects",
  "public_key": "<base64>",
  "enc_org_private_key": "<base64>",
  "enc_aes_key": "<base64>",
  "iv": "<base64>"
}
```

Response (201) :
```json
{
  "id": "<uuid>",
  "name": "42_Projects"
}
```

---

### `DELETE /orgs/{org_id}`

Admin only. Supprime l'orga + tous ses fichiers sur MinIO.

Response : `204 No Content`

---

### `PATCH /orgs/{org_id}`

Renommer une orga. Admin only.

Body :
```json
{
  "name": "new_name"
}
```

Response (200) :
```json
{
  "id": "<uuid>",
  "name": "new_name"
}
```
---

### `PATCH /orgs/{org_id}/maxspace`

Modifier l'espace max de l'organisation. Admin only.

Body :
```json
{
  "space": int
}
```

Response (200) :
```json
{
  "max_pace": newMaxSpace
}
```

---

### `PATCH /orgs/{org_id}/usedspace`

Modifier l'espace utilisé de l'organisation.

Body :
```json
{
  "space": int
}
```

Response (200) :
```json
{
  "used_space": newUsedSpace
}
```

---

### `GET /orgs/{org_id}/public-key`
Récupère la clé publique de l'organisation.

Response `200 OK` :
```json
{
  "public_key": ""
}
```

---

## Org Members

### `POST /orgs/{org_id}/members`
Invite un membre. L'admin chiffre la clé privée de l'orga pour le nouveau membre via chiffrement hybride RSA+AES.

Body :
```json
{
  "user_email": "alice@42lyon.fr",
  "enc_org_priv_key": "<base64>",
  "enc_aes_key": "<base64>",
  "iv": "<base64>"
}
```

Response `201 Created` :
```json
{
  "message": "member added to organization"
}
```

Response `404` : user not found

---

### `GET /orgs/{org_id}/members`

Récupérer tous les membres d'une organisation.

Response : `200 OK`
```json
{
  "user_id": "id",
  "user_email": "alice@42lyon.fr",
  "role": "admin"
}
```

---

### `PATCH /orgs/{org_id}/members/{user_id}`

Change le role d'un membre. Admin only. Refuse de retirer le dernier admin.

Body :
```json
{ "role": "admin" }
```

Response : `200 OK`
```json
{
  "message":  "role updated"
}
```

---

### `PATCH /orgs/{org_id}/members/me/description`

Ajoute une description propre au membre pour l'organisation.

Body :
```json
{ "description": "description" }
```

Response : `200 OK`
```json
{
  "message":  "organization description updated"
}
```

---


### `DELETE /orgs/{org_id}/members/me`

Quitter l'orga. Interdit si dernier admin.

Response : `204 No content`

---

### `DELETE /orgs/{org_id}/members/{user_id}`

Virer un membre. Admin only.

Response : `204 No content`

---

### `GET /orgs/{org_id}/members/keys`
Récupère les clés chiffrées du membre connecté pour cette organisation.

Response `200 OK` :
```json
{
  "enc_org_priv_key": "",
  "enc_aes_key": "",
  "iv": ""
}
```

---

## Folders

### `GET /folders?parent_id=xxx`

Liste les dossiers + fichiers. Sans parent_id = racine perso.

Response (200) :
```json
{
  "folders": [
    { "id": "<uuid>", "name": "documents", "created_at": "2026-01-20T14:00:00Z" }
  ],
  "files": [
    { "id": "<uuid>", "name": "rapport.pdf", "file_size": 1048576, "created_at": "2026-01-21T09:00:00Z" }
  ]
}
```

---

### `GET /folders/{folder_id}/contents`

Pareil mais pour un dossier specifique.

Meme format de reponse que ci-dessus.

---

### `GET /orgs/{org_id}/folders/{folder_id}/contents`

Contenu d'un dossier d'orga. Check que le user est bien membre.

Response (200) :
```json
{
  "folders": [
    { "id": "<uuid>", "name": "documents", "created_at": "2026-01-20T14:00:00Z", "owner_user_id": "<uuid>" }
  ],
  "files": [
    { "id": "<uuid>", "name": "rapport.pdf", "file_size": 1048576, "created_at": "2026-01-21T09:00:00Z", "owner_user_id": "<uuid>" }
  ]
}

---

### `POST /folders`

Body :
```json
{
  "name": "photos",
  "parent_id": "<uuid_optional>",
  "org_id": "<uuid_optional>",
}
```

Response (201) :
```json
{
  "id": "<uuid>",
  "name": "photos"
}
```

---

### `PATCH /folders/{folder_id}`

Renommer ou deplacer un dossier.

Body :
```json
{
  "name": "photos_2026",
  "parent_id": "<uuid_optional>"
}
```

Response (200):
```json
{
  "message": "folder updated"
}
```

---

### `DELETE /folders/{folder_id}`

Faut que le dossier soit vide (ON DELETE RESTRICT sur les fichiers).

Response : `204 No Content`


---

### `GET /folders/:folder_id/path`

Retourne le path d'un dossier

Response (200) :
```json
{
  [
    { "id": "<uuid>", "name": "documents" }
  ],
}
```

---
## Files

> Les routes fichiers n'operent que sur les fichiers en statut ACTIVE. Les fichiers PENDING sont un etat transitoire interne et ne sont jamais exposes via l'API.

### `POST /files/upload-url`

Demande une presigned URL pour upload direct vers MinIO. Check le quota.

Body :
```json
{
  "file_size": 2147483648,
  "folder_id": "<uuid_optional>",
  "org_id": "<uuid_optional>"
}
```

Response (200) :
```json
{
  "presigned_url": "https://minio.../bucket/object?X-Amz-...",
  "object_id": "<uuid>"
}
```

---


### `POST /files/multipart/init`

Demande **des** presigned URL pour upload par chunk vers MinIO, renvoie chaque URL associée a la partie

Body:
```json
{
  "file_size": 2147483648,
  "folder_id": "<uuid_optional>",
  "org_id": "<uuid_optional>"
  "part_count": "<number between 1 - 100>"
}
```

Response (200):
```json
{
  "object_id": "<uuid>"
  "parts": [
      {
        "part_number": 1,
        "presigned_url": "https://minio.../bucket/object?X-Amz-..."
      },
      {
        ...
      }
  ],
  "upload_id": "<string>"
}
```

---

### `POST /files/finalize`

Apres l'upload MinIO reussi, stocke les metadonnees crypto en DB et retourne l'ID du fichier créé.

Body :
```json
{
  "object_id": "<uuid>",
  "encrypted_filename": "<base64>",
  "encrypted_dek": "<base64>",
  "iv": "<base64>",
  "org_id": "<uuid_optional>"
}
```

Response (201) :
```json
{
  "file_id": "<uuid>",
}
```

---

### `POST /files/multipart/finalize`

Finalise un upload multipart : déclenche l'assemblage des parts côté MinIO, active le fichier en DB, et incrémente le quota (user ou organization selon `org_id`).

Body:
```json
{
  "object_id": "<uuid>",
  "upload_id": "<string>",
  "encrypted_filename": "<base64_string>",
  "encrypted_dek": "<base64_bytes>",
  "iv": "<base64_bytes>",
  "org_id": "<uuid_optional>",
  "parts": [
    {
      "part_number": 1,
      "etag": "<string>"
    },
    {
      ...
    }
  ]
}
```

Response (201):
```json
{
  "file_id": "<uuid>"
}
```

---

### `POST /files/multipart/abort`

Annule un upload multipart en cours : libère les parts côté MinIO et supprime la ligne PENDING en DB. Seul l'uploader peut annuler son propre upload. Aucun effet sur le quota.

Body:
```json
{
  "object_id": "<uuid>",
  "upload_id": "<string>"
}
```

Response : `204 No Content`

---

### `GET /files/{file_id}`

Recupere les metadonnees d'un fichier sans declencher de download. Check RBAC. Ne retourne que les fichiers ACTIVE. (metadonnées a update si besoin)

Response (200) :
```json
{
  "file_size": 1048576,
  "created_at": "2026-01-21T09:00:00Z",
  "encrypted_filename": "<base64>"
}
```

---

### `GET /files/{file_id}/download`

Check RBAC, genere une presigned URL GET MinIO.

Response (200) :
```json
{
  "presigned_url": "https://minio.../bucket/object?X-Amz-...",
  "encrypted_dek": "<base64>",
  "iv": "<base64>",
  "encrypted_filename": "<base64>"
}
```

---

### `PATCH /files/{file_id}`

Deplacer un fichier.

Body :
```json
{ "folder_id": "<uuid>" }
```

Response (200) :
```json
{
  "message": "file moved"
}
```

---

### `DELETE /files/{file_id}`

Supprime les metadonnees en DB + l'objet sur MinIO. Met a jour used_space.

Response : `204 No Content`


---

## Misc

### `GET /metrics`

> Cette route est spécifique au micro-service `storage`. Elle sert intérieurement Prometheus pour récupérer les métriques d'alertes.

Pas de réponse JSON ni de status code - retourne les métriques au format texte Prometheus.

---

### `GET /health`

> Exposée par le micro-service `health-aggregator` (`:8084`). Ce service poll `GET /health` sur `auth` (`:8081`), `orga` (`:8082`) et `storage` (`:8083`) et agrège les résultats. Les routes `/health` internes à chaque micro-service ne sont pas exposées publiquement.

Récupère le statut des services utilisés par les micro-services du backend.

Réponse : `200 OK`
```json
{
    "services": {
        "auth": {
            "liveness": true | false,
            "readiness": true | false,
            "degraded": true | false,
            "dependencies": {
                "postgres": true | false,
                "redis": true | false
            }
        },
        "orga": {
            "liveness": true | false,
            "readiness": true | false,
            "degraded": true | false,
            "dependencies": {
                "postgres": true | false,
                "redis": true | false
            }
        },
        "storage": {
            "liveness": true | false,
            "readiness": true | false,
            "degraded": true | false,
            "dependencies": {
                "minio": true | false,
                "postgres": true | false,
                "redis": true | false
            }
        }
    },
    "status": "ok" | "error" | "degraded"
}
```

--- 

## WebSocket

### Connexion : `wss://api.../ws`

Auth via Access JWT (query param ou header).

### Events (serveur -> client via Redis broker)

```json
{ "event": "file_uploaded", "data": { "file_id": "<uuid>", "folder_id": "<uuid>", "name": "rapport.pdf", "file_size": 1048576 } }
```

```json
{ "event": "file_deleted", "data": { "file_id": "<uuid>" } }
```

```json
{ "event": "folder_created", "data": { "folder_id": "<uuid>", "parent_id": "<uuid>", "name": "photos" } }
```

```json
{ "event": "org_created", "data": { "org_id": "<uuid>", "name": "42_Projects" } }
```

```json
{ "event": "member_invited", "data": { "org_id": "<uuid>", "user_id": "<uuid>" } }
```

```json
{ "event": "member_role_updated", "data": { "org_id": "<uuid>", "user_id": "<uuid>", "new_role": "admin" } }
```
