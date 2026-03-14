##  Dev 1 — Auth & Sécurité (Backend)

### Missions

**1. Middleware JWT**
Écrire le middleware Fiber qui valide le `Authorization: Bearer <token>` sur toutes les routes protégées. Extraire le `user_id` du claim et l'injecter dans le contexte Fiber (`c.Locals`).

**2. Register**
Recevoir `email`, `salt`, `auth_hash`, `public_key`, `encrypted_private_key`, `iv`. Hasher l'`auth_hash` avec Argon2id . Générer Access JWT (15 min) + Refresh JWT (7 jours, cookie HttpOnly).

**3. Login**
Récupérer le hash Argon2id depuis la DB. Comparer avec l'`auth_hash` reçu. Si `totp_enabled = true` → générer un `tmp_token`  et retourner `requires_2fa: true`. Sinon → émettre les JWT + renvoyer `encrypted_private_key` + `iv`.

**4. Refresh token**
Lire le cookie `refresh_token`. Vérifier sa validité en DB/Redis (rotation : invalider l'ancien, émettre un nouveau). Retourner le nouvel access token.

**5. Logout**
Supprimer le refresh token en DB/Redis.

**6. 2FA (TOTP)**
Utiliser `pquerna/otp`. `enable` → générer le secret TOTP 160 bits, le stocker en DB, retourner l'`otpauth://` URI. `verify` → valider le premier code, passer `totp_enabled = true`, générer `validate` → vérifier `tmp_token` Redis + code TOTP (ou recovery code), puis émettre les vrais JWT. `disable` → valider le code, nettoyer `totp_secret`, `totp_enabled`, et la table `recovery_codes`.

**7. Changement de mot de passe**
Valider l'`old_auth_hash`. Hasher le `new_auth_hash`. Mettre à jour `salt`, `auth_hash`, `encrypted_private_key`, `iv` en transaction. Invalider **tous** les refresh tokens des autres sessions.

**8. DELETE /users/me**
Valider l'`auth_hash`. Vérifier que le user n'est pas le **dernier admin** d'une orga. Si oui → 403 avec message explicite. Sinon → supprimer les fichiers perso MinIO , laisser la cascade PG faire le reste, invalider les sessions, fermer la WS.

---

## Dev 2 — Fichiers & Stockage (Backend)

Tout le pipeline upload/download, la gestion des fichiers et dossiers, et l'intégration MinIO.


### Missions

**1. Client MinIO**
Initialiser le client MinIO SDK Go au démarrage . TTL des presigned URLs : **15 min pour l'upload**, **5 min pour le download**.

**2. POST /files/upload-url**
Vérifier le JWT (middleware). Calculer le quota. Si `used_space + file_size > max_space` → 413 avec message clair. Générer un `object_id` (UUID v4). Générer la presigned PUT URL. Insérer une entrée dans `files` avec `status = 'PENDING'` pour éviter les doublons. Retourner `{ presigned_url, object_id }`.

**3. POST /files/finalize**
Le client appelle cette route après avoir uploadé vers MinIO. Vérifier que l'`object_id` existe en DB avec `status = 'PENDING'` et appartient bien au user. Mettre à jour : `name`, `encrypted_dek`, `iv`, `status = 'ACTIVE'`, `org_id`. Incrémenter `used_space` sur le user (ou l'orga). Publier l'event `file_uploaded` sur Redis. Retourner 201.

**4. GET /files/{file_id}/download**
Vérifier les droits RBAC (owner OU membre de l'orga du fichier). Générer une presigned GET URL (5 min). Retourner `presigned_url` + `encrypted_dek` + `iv` + `name` (chiffré). Ne jamais retourner la presigned URL si les droits ne sont pas validés.

**5. DELETE /files/{file_id}**
Vérifier les droits. Supprimer l'entrée en DB **d'abord** (transaction). Supprimer l'objet sur MinIO via `RemoveObject`. Décrémenter `used_space`. Publier l'event `file_deleted` sur Redis.


**6. PATCH /files et PATCH /folders (déplacement)**
Valider que la destination (`folder_id` / `parent_id`) appartient au même propriétaire. Refuser un déplacement circulaire de dossier (dossier A dans lui-même).



## Dev 3 — Organisations, WebSocket & Redis (Backend)

### Missions

**1. CRUD Organisations**
`POST /orgs` : créer l'orga en transaction PG → insérer dans `organizations` → insérer le créateur dans `org_members` avec `role = 'admin'` et son `encrypted_org_key`. Le serveur stocke un blob opaque, jamais la vraie clé. `DELETE /orgs/{org_id}` : admin only, supprimer les fichiers MinIO de l'orga , laisser la cascade PG gérer le reste.

**2. Gestion des membres**
`POST /orgs/{org_id}/members` : vérifier que le demandeur est admin. Résoudre l'`user_email` en `user_id` + récupérer la `public_key` du user (cette `public_key` est ce que le client a besoin pour chiffrer l'OrgKey côté front → l'endpoint doit d'abord exposer la pubkey, puis recevoir le blob chiffré). `PATCH` role : admin only, vérifier le "dernier admin". `DELETE .../me` : interdit si dernier admin. `DELETE .../user_id` : admin only.

**3. Endpoint de résolution de pubkey**
Ajouter `GET /users/by-email?email=xxx` (auth required) → retourner `{ user_id, public_key }`. C'est ce que le front de l'admin utilise avant d'inviter quelqu'un.

- **Redis Pub/Sub :** chaque service publie ses events (`file_uploaded`, `file_deleted`, `folder_created`, `org_created`, `member_invited`, `member_role_updated`) sur un canal Redis. Le broker s'abonne au canal et broadcast aux bonnes connexions.
- Format des messages WS en JSON.


**6. Helper RBAC partagé**
Écrire un package `rbac`:
```go
func IsOrgMember(db, orgID, userID) (bool, error)
func IsOrgAdmin(db, orgID, userID) (bool, error)
func GetOrgRole(db, orgID, userID) (string, error)
```
Ces fonctions évitent les queries RBAC dupliquées partout.

##  Dev 4 — Frontend React + TypeScript


### Pages à implémenter
- `/register` · `/login` · `/dashboard` · `/profile`

### Missions

**1. Couche cryptographique (`/src/lib/crypto.ts`)**
Tout en Web Crypto API
```typescript
deriveKEK(password, salt)        // PBKDF2 SHA-256, 100k iter, 256 bits
computeAuthHash(kek)             // HMAC-SHA256(kek, "ft_box_auth")
generateRSAKeyPair()             // RSA-OAEP 2048 bits
encryptWithAES(data, key, iv)    // AES-GCM 256
decryptWithAES(data, key, iv)
wrapKeyWithRSA(aesKey, pubKey)   // RSA-OAEP
unwrapKeyWithRSA(wrappedKey, privKey)
generateRandomKey()              // AES-GCM 256 random DEK
generateIV()                     // 12 bytes random
```
La KEK et la PrivKey RSA ne doivent **jamais** quitter cette couche vers le state global. Les effacer de la mémoire dès que possible


**2. Page Register**
Formulaire email + mot de passe. Sur submit : `deriveKEK` → `generateRSAKeyPair` → `encryptWithAES(privKey, kek)` → `computeAuthHash(kek)` → `POST /auth/register`. Stocker l'access token. Effacer la KEK. Ouvrir la WS. Redirect `/dashboard`.

**4. Page Login**
`GET /auth/salt` → `deriveKEK` → `computeAuthHash` → `POST /auth/login`. Si `requires_2fa` → afficher le champ TOTP → `POST /auth/2fa/validate`. Dès que les tokens arrivent : déchiffrer la PrivKey avec la KEK → stocker dans le  store. Effacer la KEK. Ouvrir la WS.

**5. Dashboard — arborescence**
Composant `FileTree` : appel `GET /folders` au montage. Navigation par clic sur dossier (`GET /folders/{id}/contents`). Breadcrumb cliquable. Sidebar : "Mes fichiers" + liste des orgas (`GET /orgs`). Quand l'user clique sur une orga : décoder l'`enc_org_priv_key` avec la PrivKey RSA → stocker l'OrgKey dans le crypto store.

**6. Upload de fichier  (streaming)**
Web Crypto pour chiffrer sans charger tout le fichier en mémoire :
1. Générer DEK + IV aléatoires
2. `POST /files/upload-url` pour obtenir la presigned URL
3. Wrapper la DEK : `wrapKeyWithRSA(dek, userPubKey)` ou avec l'OrgKey
5. `POST /files/finalize`
6. Afficher la progress bar

**7. Download de fichier**
`GET /files/{id}/download` → récupérer la presigned URL + `encrypted_dek`. Déchiffrer la DEK (RSA ou OrgKey). Fetch la presigned URL → déchiffrer en streaming → `URL.createObjectURL(blob)` → trigger download → révoquer l'URL + effacer la DEK.

**8. WebSocket client**
 connexion à `wss://api/ws?token=<accessToken>`. Reconnexion automatique .Gérer le refresh du token si la WS tombe pendant un refresh JWT.

**9. Page Profil**
Barre de stockage (`used_space / max_space`). Gestion 2FA (afficher QR code depuis `otpauth://` URI via une lib comme `qrcode`). Changement de mot de passe : re-dériver l'ancienne KEK, vérifier en déchiffrant la PrivKey, dériver la nouvelle KEK, re-chiffrer la PrivKey → `PUT /auth/password`. Suppression de compte avec confirmation.


---

```
  Dev 1 → middleware JWT + register + login (sans 2FA)
  Dev 2 → client MinIO + upload-url
  Dev 3 → Redis client + WebSocket hub de base + package rbac
  Dev 4 → couche crypto.ts + page login/register

  Dev 1 → 2FA + refresh + password change
  Dev 2 → download + delete + dossiers
  Dev 3 → orgs + members +
  Dev 4 → dashboard + upload streaming + download streaming

```
