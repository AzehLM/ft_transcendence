# ft_box - Architecture Zero-Knowledge

Stack : React (front) / Go + GORM (back) / PostgreSQL / Redis / MinIO

authash == "Argon2id Stocker en db"

Les JWT sont generes uniquement au register et au login. Toutes les autres requetes envoient le Access JWT dans le header `Authorization: Bearer ...`. Quand il expire, le client fait `POST /api/v1/auth/refresh` avec le Refresh JWT (cookie HttpOnly) pour en obtenir un nouveau. C'est tout.

---

## 1. Register

1. User clique "Register"
2. Coté client (Web Crypto) :
   - Derive la KEK depuis le mdp (PBKDF2 + salt random)
   - Genere une paire RSA (pub/priv)
   - Chiffre la privkey avec la KEK (AES-GCM) -> EncryptedPrivKey + IV
   - Calcule AuthHash = HMAC-SHA256(KEK, "ft_box_auth")
3. `POST /api/v1/auth/register` -> envoie email, salt, AuthHash, pubkey, EncryptedPrivKey, IV
   - Le serveur voit jamais le mdp ni la KEK (zero-knowledge)
4. Backend Go :
   - Hash le AuthHash avec Argon2id
   - Stocke tout en DB (transaction)
   - Genere Access JWT (body JSON) + Refresh JWT (cookie HttpOnly)
   - Repond 201 Created
5. React redirige `/dashboard`
6. Ouvre la websocket `wss://api.../ws` avec l'Access JWT
7. Backend ajoute la connexion au pool + ecoute le broker Redis pour ce user


---

## 2. Login

### Phase 1 - Recup du salt

- User tape email + mdp
- `GET /api/v1/auth/salt?email=student@42lyon.fr`
- Le back renvoie le salt (base64) si le user existe

### Phase 2 - Calculs coté client

- Derive la KEK via PBKDF2(mdp + salt)
- Calcule AuthHash = HMAC-SHA256(KEK, "ft_box_auth")

### Phase 3 - Requete de login

- `POST /api/v1/auth/login`
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
- Maintenant le client a sa PrivKey RSA en clair en RAM
- On ecrase la KEK direct de la memoire
- Ouverture websocket + redirect `/dashboard`


---

## 3. Creation d'une orga

1. User clique "Creer l'org" (ex: 42_Projects)
2. Client genere une OrgKey aleatoire (AES-GCM 256) via Web Crypto
3. Chiffre cette OrgKey avec sa propre pubkey RSA (RSA-OAEP) -> EncryptedOrgKey
4. `POST /api/v1/orgs` avec le nom + EncryptedOrgKey
5. Backend (transaction PG) :
   - Cree l'orga (UUID)
   - Ajoute le createur en tant qu'admin
   - Stocke l'encrypted_org_key (BYTEA) dans `enc_org_priv_key` dans la table org_members
   - Le serveur voit qu'un blob opaque, il peut rien en faire
6. Publie un event `org_created` sur Redis -> push via WS aux autres sessions du user


---

## 4. Invitation d'un membre

Cas : l'admin invite Alice dans l'orga.

1. Le client de l'admin demande la PubKey RSA d'Alice au serveur
2. L'admin dechiffre l'OrgKey (avec sa propre privkey RSA)
3. L'admin re-chiffre l'OrgKey avec la PubKey d'Alice
4. `POST /api/v1/orgs/{id}/members` avec ce nouveau blob
5. Le serveur stocke ce blob dans `enc_org_priv_key` dans la table org_members pour Alice
6. Quand Alice se connecte, elle recup le blob et le dechiffre avec sa privkey RSA -> OrgKey en clair en RAM


---

## 5. Upload de fichier

Probleme : un fichier de 2 Go ca tient pas en RAM dans un Uint8Array, le tab crash. Faut utiliser la Web Streams API + Web Crypto en streaming.

### Phase 1 - Chiffrement local (React)

1. Pour chaque fichier, le client genere une DEK (Data Encryption Key) aleatoire (AES-GCM 256) + un IV unique
2. Le client lit le fichier par chunks, chiffre chaque chunk avec la DEK en AES-GCM -> produit un Blob chiffre
3. Le nom du fichier est aussi une donnee sensible -> chiffre avec la DEK MAYBE

### Phase 2 - Negociation de l'upload (Go)

1. `POST /api/v1/files/upload-url` -> "je veux upload un fichier de X octets dans le dossier Y"
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
3. `POST /api/v1/files/finalize`
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

1. `GET /api/v1/files/{file_id}/download`
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

1. `DELETE /api/v1/files/{file_id}`
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

1. `PATCH /api/v1/orgs/{org_id}/members/{user_id}`
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

1. `GET /api/v1/folders?parent_id=root` (ou sans param = racine)
2. Backend recup les dossiers + fichiers du user a la racine :
   - Query sur `folders` WHERE `owner_user_id = $1 AND parent_id IS NULL AND org_id IS NULL`
   - Query sur `files` WHERE `owner_user_id = $1 AND folder_id IS NULL AND org_id IS NULL`
3. Renvoie la liste : dossiers + fichiers avec leurs metadonnees (name, size, created_at)

### Phase 2 - Navigation dans les dossiers

- User clique sur un dossier -> `GET /api/v1/folders/{folder_id}/contents`
- Backend renvoie les sous-dossiers + fichiers de ce dossier
- Meme requete pour les fichiers d'orga : `GET /api/v1/orgs/{org_id}/folders/{folder_id}/contents`
  - La le backend check que le user est bien membre de l'orga avant de renvoyer quoi que ce soit

### Phase 3 - Affichage

- Liste des dossiers (icone dossier + nom + date creation)
- Liste des fichiers (icone fichier + nom + taille + date creation)
- Breadcrumb pour la navigation (root > dossier1 > sous-dossier)
- Sidebar avec :
  - "Mes fichiers" (espace perso)
  - Liste des orgas du user (recup via `GET /api/v1/orgs`)

### Orgas dans le dashboard

- `GET /api/v1/orgs` -> liste les orgas dont le user est membre
- Quand le user clique sur une orga, on charge l'arborescence de l'orga de la meme facon
- Avant d'afficher les fichiers d'orga, le client doit avoir l'OrgKey en RAM :
  - Recup `enc_org_priv_key` depuis `org_members`
  - Dechiffre avec sa PrivKey RSA -> OrgKey en clair


---

## 10. Page Profil

### Storage usage bar

1. `GET /api/v1/users/me` -> renvoie les infos du user dont `used_space` et `max_space`
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
3. `DELETE /api/v1/users/me` avec `{ "auth_hash": "<base64>" }`

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

1. `POST /api/v1/auth/logout`
2. Backend supprime le refresh token (DB ou Redis) + clear le cookie HttpOnly
3. Cote client : ecrase la PrivKey RSA de la RAM, vide les OrgKeys, ferme la WS
4. Redirect vers `/login`


---

## 13. 2FA (TOTP)

Basee sur TOTP (Time-based One-Time Password) — compatible Google Authenticator, Authy, etc.

### Activation (page profil)

1. `POST /api/v1/auth/2fa/enable`
2. Backend genere un secret TOTP (base32, 160 bits) + le stocke en DB (chiffre ou en clair, le user est deja authentifie)
3. Renvoie le secret sous forme d'URI `otpauth://` + QR code (ou juste l'URI, le front genere le QR)
4. User scan le QR avec son app
5. User entre le code a 6 chiffres pour confirmer -> `POST /api/v1/auth/2fa/verify` avec `{ "code": "123456" }`
6. Backend valide le code TOTP, si OK -> marque `totp_enabled = true` en DB


### Impact sur le login

- Le login classique (phase 3) renvoie plus directement les JWT
- Si `totp_enabled = true`, le backend repond 200 avec `{ "requires_2fa": true, "tmp_token": "<token>" }`
- Le `tmp_token` est un token court (expire en 5 min), il sert juste a lier la session 2FA
- Le client affiche un champ pour entrer le code TOTP
- `POST /api/v1/auth/2fa/validate` avec `{ "tmp_token": "...", "code": "123456" }`
- Backend valide le code TOTP + le tmp_token, si OK -> genere les vrais JWT (access + refresh cookie)
- A partir de la, le reste du login continue normalement (recup EncryptedPrivKey, dechiffrement, WS, etc.)


### Desactivation

1. `POST /api/v1/auth/2fa/disable` avec `{ "code": "123456" }` (faut prouver qu'on a encore l'app)
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
3. `PUT /api/v1/auth/password`
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

## Workflows manquants (a detailler plus tard)

- **Creer un dossier** : `POST /api/v1/folders` avec name + parent_id + org_id optionnel
- **Supprimer un dossier** : `DELETE /api/v1/folders/{id}` (recursif : vider les fichiers d'abord vu le `ON DELETE RESTRICT`)
- **Renommer fichier/dossier** : `PATCH /api/v1/files/{id}` ou `PATCH /api/v1/folders/{id}`
- **Quitter une orga** : `DELETE /api/v1/orgs/{org_id}/members/me` (interdit si dernier admin)
- **Supprimer une orga** : `DELETE /api/v1/orgs/{org_id}` (admin only, supprime tous les fichiers MinIO de l'orga)
- **Deplacer un fichier/dossier** : `PATCH` pour changer le `folder_id` ou `parent_id`
- **Partage par lien** : generer un lien public/protege par mdp pour un fichier (faut wrapper la DEK differemment) MAYBE
