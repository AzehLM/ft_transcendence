#  Database Schema

> Schéma PostgreSQL avec extension `pgcrypto` pour la génération native des UUID.

---

## 1. `users`

| Colonne                 | Type           | Contraintes                          | Défaut                  |
|-------------------------|----------------|--------------------------------------|-------------------------|
| `id`                    | `UUID`         | `PRIMARY KEY`                        | `gen_random_uuid()`     |
| `email`                 | `VARCHAR(255)` | `UNIQUE NOT NULL`                    |                         |
| `salt_1`                | `BYTEA`        | `NOT NULL`                           |                         |
| `public_key`            | `BYTEA`        | `NOT NULL`                           |                         |
| `encrypted_private_key` | `BYTEA`        | `NOT NULL`                           |                         |
| `auth_hash`             | `VARCHAR(255)` | `NOT NULL`                           |                         |
| `used_space`            | `BIGINT`       | `NOT NULL`                           | `0`                     |
| `max_space`             | `BIGINT`       | `NOT NULL`                           | `5368709120` (5 GB)     |
| `created_at`            | `TIMESTAMPTZ`  | `NOT NULL`                           | `CURRENT_TIMESTAMP`     |
| `updated_at`            | `TIMESTAMPTZ`  | `NOT NULL`                           | `CURRENT_TIMESTAMP`     |

---

## 2. `organizations`

| Colonne      | Type           | Contraintes     | Défaut                  |
|--------------|----------------|-----------------|-------------------------|
| `id`         | `UUID`         | `PRIMARY KEY`   | `gen_random_uuid()`     |
| `name`       | `VARCHAR(100)` | `NOT NULL`      |                         |
| `public_key` | `BYTEA`        | `NOT NULL`      |                         |
| `used_space` | `BIGINT`       | `NOT NULL`      | `0`                     |
| `max_space`  | `BIGINT`       | `NOT NULL`      | `5368709120` (5 GB)     |
| `created_at` | `TIMESTAMPTZ`  | `NOT NULL`      | `CURRENT_TIMESTAMP`     |

---

## 3. `org_members`

| Colonne            | Type          | Contraintes                                              | Défaut              |
|--------------------|---------------|----------------------------------------------------------|---------------------|
| `org_id`           | `UUID`        | `NOT NULL` · `FK → organizations(id) ON DELETE CASCADE`  |                     |
| `user_id`          | `UUID`        | `NOT NULL` · `FK → users(id) ON DELETE CASCADE`          |                     |
| `role`             | `VARCHAR(20)` | `NOT NULL`                                               |                     |
| `enc_org_priv_key` | `BYTEA`       | `NOT NULL`                                               |                     |
| `joined_at`        | `TIMESTAMPTZ` | `NOT NULL`                                               | `CURRENT_TIMESTAMP` |

> **PRIMARY KEY** : `(org_id, user_id)`

---

## 4. `folders`

| Colonne         | Type           | Contraintes                                      | Défaut              |
|-----------------|----------------|--------------------------------------------------|---------------------|
| `id`            | `UUID`         | `PRIMARY KEY`                                    | `gen_random_uuid()` |
| `owner_user_id` | `UUID`         | `NOT NULL` · `FK → users(id) ON DELETE CASCADE`  |                     |
| `org_id`        | `UUID`         | `FK → organizations(id) ON DELETE CASCADE`        |                     |
| `parent_id`     | `UUID`         | `FK → folders(id) ON DELETE CASCADE`              |                     |
| `name`          | `VARCHAR(100)` | `NOT NULL`                                       |                     |
| `created_at`    | `TIMESTAMPTZ`  | `NOT NULL`                                       | `CURRENT_TIMESTAMP` |

> **Index** : `idx_folders_parent_id` sur `parent_id`

---

## 5. `files`

| Colonne            | Type           | Contraintes                                        | Défaut              |
|--------------------|----------------|----------------------------------------------------|---------------------|
| `id`               | `UUID`         | `PRIMARY KEY`                                      | `gen_random_uuid()` |
| `owner_user_id`    | `UUID`         | `NOT NULL` · `FK → users(id) ON DELETE CASCADE`    |                     |
| `org_id`           | `UUID`         | `FK → organizations(id) ON DELETE CASCADE`          |                     |
| `folder_id`        | `UUID`         | `FK → folders(id) ON DELETE RESTRICT`               |                     |
| `name`             | `VARCHAR(100)` | `NOT NULL`                                         |                     |
| `file_size`        | `BIGINT`       | `NOT NULL`                                         |                     |
| `minio_object_key` | `UUID`         | `UNIQUE NOT NULL`                                  |                     |
| `encrypted_dek`    | `BYTEA`        | `NOT NULL`                                         |                     |
| `iv`               | `BYTEA`        | `NOT NULL`                                         |                     |
| `created_at`       | `TIMESTAMPTZ`  | `NOT NULL`                                         | `CURRENT_TIMESTAMP` |
| `status`           | `VARCHAR(20)`  | `NOT NULL`                                         | `PENDING`           |

> **Index** : `idx_files_folder_id` sur `folder_id`

---

##  db

```
users ──< org_members >── organizations
  │                            │
  ├──< folders (owner_user_id) │
  │       │                    │
  │       └──< folders (parent_id)  [auto-référence]
  │       │
  │       └──< files (folder_id)
  │
  ├──< files (owner_user_id)
  │
  │   organizations ──< folders (org_id)
  │   organizations ──< files (org_id)
```


**`org_members`** — Table pivot , pas besoin d'`id` propre : la clé primaire `(org_id, user_id)` suffit à identifier chaque membre unique d'une organisation.

---

### `ON DELETE CASCADE` vs `ON DELETE RESTRICT`

| Table | FK | Règle | Explication |
|---|---|---|---|
| `org_members` | `org_id → organizations(id)` | `CASCADE` | Si une organisation est supprimée, tous ses membres sont automatiquement retirés. |
| `org_members` | `user_id → users(id)` | `CASCADE` | Si un utilisateur est supprimé, toutes ses adhésions à des organisations sont automatiquement retirées. |
| `folders` | `owner_user_id → users(id)` | `CASCADE` | Si un utilisateur est supprimé, tous ses dossiers sont supprimés avec lui. |
| `folders` | `org_id → organizations(id)` | `CASCADE` | Si une organisation est supprimée, tous ses dossiers sont supprimés avec elle. |
| `folders` | `parent_id → folders(id)` | `CASCADE` | Si un dossier parent est supprimé, tous ses sous-dossiers sont supprimés récursivement. |
| `files` | `owner_user_id → users(id)` | `CASCADE` | Si un utilisateur est supprimé, tous ses fichiers sont supprimés avec lui. |
| `files` | `org_id → organizations(id)` | `CASCADE` | Si une organisation est supprimée, tous ses fichiers sont supprimés avec elle. |
| `files` | `folder_id → folders(id)` | **`RESTRICT`** | **On ne peut PAS supprimer un dossier s'il contient encore des fichiers.** La DB renvoie une erreur, ce qui force à vider le dossier avant de le supprimer.|

