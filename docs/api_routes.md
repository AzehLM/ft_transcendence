# ft_box - API Routes

Base URL : `/api/v1`


---

## Auth

### `GET /auth/salt?email=xxx`

Recup le salt d'un user pour pouvoir deriver la KEK cote client.

Reponse :
```json
{ "salt": "<base64>" }
```

---

### `POST /auth/register`

Cree un nouveau compte. Le serveur voit jamais le mdp ni la KEK.

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

Reponse (201) :
```json
{
  "access_token": "<jwt>"
}
```
+ Refresh JWT en cookie HttpOnly

---

### `POST /auth/login`

Body :
```json
{
  "email": "student@42lyon.fr",
  "auth_hash": "<base64>"
}
```

Reponse si 2FA desactivee (200) :
```json
{
  "access_token": "<jwt>",
  "encrypted_private_key": "<base64>",
  "iv": "<base64>"
}
```
+ Refresh JWT en cookie HttpOnly

Reponse si 2FA activee (200) :
```json
{
  "requires_2fa": true,
  "tmp_token": "<token_5min>"
}
```

---

### `POST /auth/refresh`

Pas de body. Le Refresh JWT est dans le cookie HttpOnly.

Reponse (200) :
```json
{
  "access_token": "<jwt>"
}
```

---

### `POST /auth/logout`

Supprime le refresh token + clear le cookie.

Reponse : `200 OK`

---

### `PUT /auth/password`

Change le mdp. Faut re-wrapper la PrivKey avec la nouvelle KEK.

Body :
```json
{
  "old_auth_hash": "<base64>",
  "new_auth_hash": "<base64>",
  "new_salt": "<base64>",
  "new_encrypted_private_key": "<base64>",
  "new_iv": "<base64>"
}
```

Reponse : `200 OK`

Invalide les refresh tokens des autres sessions.


---

## 2FA

### `POST /auth/2fa/enable`

Genere le secret TOTP.

Reponse (200) :
```json
{
  "otpauth_uri": "otpauth://totp/ft_box:student@42lyon.fr?secret=XXXX&issuer=ft_box"
}
```

---

### `POST /auth/2fa/verify`

Confirme l'activation en validant un premier code. Renvoie les recovery codes une seule fois.

Body :
```json
{ "code": "123456" }
```

Reponse (200) :
```json
{
  "recovery_codes": ["abc12345", "def67890", "..."]
}
```

---

### `POST /auth/2fa/validate`

Pendant le login, valide le code TOTP pour obtenir les vrais JWT.

Body :
```json
{
  "tmp_token": "<token>",
  "code": "123456"
}
```

Reponse (200) :
```json
{
  "access_token": "<jwt>",
  "encrypted_private_key": "<base64>",
  "iv": "<base64>"
}
```
+ Refresh JWT en cookie HttpOnly

Le champ `code` peut aussi etre un recovery code a usage unique.

---

### `POST /auth/2fa/disable`

Body :
```json
{ "code": "123456" }
```

Reponse : `200 OK`

Supprime le secret TOTP + les recovery codes.


---

## Users

### `GET /users/me`

Reponse (200) :
```json
{
  "id": "<uuid>",
  "email": "student@42lyon.fr",
  "used_space": 2463129600,
  "max_space": 5368709120,
  "created_at": "2026-01-15T10:30:00Z"
}
```

---

### `DELETE /users/me`

Supprime le compte. Refuse si le user est dernier admin d'une orga.

Body :
```json
{ "auth_hash": "<base64>" }
```

Reponse : `200 OK`

Supprime : fichiers perso sur MinIO, entries DB (cascade), refresh tokens, ferme la WS.


---

## Organizations

### `GET /orgs`

Liste les orgas dont le user est membre.

Reponse (200) :
```json
[
  {
    "id": "<uuid>",
    "name": "42_Projects",
    "role": "admin",
    "enc_org_priv_key": "<base64>"
  }
]
```

---

### `POST /orgs`

Cree une orga. Le createur devient admin.

Body :
```json
{
  "name": "42_Projects",
  "org_public_key": "<base64>",
  "encrypted_org_private_key": "<base64>"
}
```

Reponse (201) :
```json
{
  "id": "<uuid>",
  "name": "42_Projects"
}
```

---

### `DELETE /orgs/{org_id}`

Admin only. Supprime l'orga + tous ses fichiers sur MinIO.

Reponse : `204 No Content`


---

## Org Members

### `POST /orgs/{org_id}/members`

Invite un membre. L'admin wrape l'OrgKey avec la PubKey du nouveau membre.

Body :
```json
{
  "user_email": "alice@42lyon.fr",
  "encrypted_org_key": "<base64>"
}
```

Reponse : `201 Created`

---

### `PATCH /orgs/{org_id}/members/{user_id}`

Change le role d'un membre. Admin only. Refuse de retirer le dernier admin.

Body :
```json
{ "role": "admin" }
```

Reponse : `200 OK`

---

### `DELETE /orgs/{org_id}/members/me`

Quitter l'orga. Interdit si dernier admin.

Reponse : `200 OK`

---

### `DELETE /orgs/{org_id}/members/{user_id}`

Virer un membre. Admin only.

Reponse : `200 OK`


---

## Folders

### `GET /folders?parent_id=xxx`

Liste les dossiers + fichiers. Sans parent_id = racine perso.

Reponse (200) :
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

Meme format de reponse.

---

### `POST /folders`

Body :
```json
{
  "name": "photos",
  "parent_id": "<uuid_optional>",
  "org_id": "<uuid_optional>"
}
```

Reponse (201) :
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

Reponse : `200 OK`

---

### `DELETE /folders/{folder_id}`

Faut que le dossier soit vide (ON DELETE RESTRICT sur les fichiers).

Reponse : `200 OK`


---

## Files

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

Reponse (200) :
```json
{
  "presigned_url": "https://minio.../bucket/object?X-Amz-...",
  "object_id": "<uuid>"
}
```

---

### `POST /files/finalize`

Apres l'upload MinIO reussi, stocke les metadonnees crypto en DB.

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

Reponse : `201 Created`

---

### `GET /files/{file_id}/download`

Check RBAC, genere une presigned URL GET MinIO.

Reponse (200) :
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

Reponse : `200 OK`

---

### `DELETE /files/{file_id}`

Supprime les metadonnees en DB + l'objet sur MinIO. Met a jour used_space.

Reponse : `200 OK`


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
