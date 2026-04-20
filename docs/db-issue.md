# Problem : suppressing a user and FK constraints

> FK stand for Foreign Key, it's a column or a combinaison of columns in a table whose value must match values of a column in another table
> It enforces referencial integrity, so if A refers to B, B value **must** exists!

## Context

When a user suppresses his account, the `auth` service does a `DELETE FROM users WHERE ID = ?` directly in DB. Postgres tries to propagate the suppression via the FK constaints defined in the `folders` table.

## Actual constraints chain

```
users
  └── folders.owner_user_id  ON DELETE CASCADE
        └── files.folder_id  ON DELETE RESTRICT   ← blocks everything
```

When `auth` suppress the user:
1. Postgres tries ON CASCADE on `folders` (to delete all its folders)
2. Postgres identify `files` are referencing those folders via `files.folder_id` with `RESTRICT`
3. Postgres block -> error `23001` -> the user is not suppressed

```
ERROR: update or delete on table "folders" violates RESTRICT setting
of foreign key constraint "files_folder_id_fkey" on table "files"
```

## Why RESTRICT on files.folder_id ?

Choice made on the API : a non-empty folder cannot be deleted. I replicated this check with the `IsFolderEmpty` in the `storage` service, but the `RESTRICT` in DB is a double protection

---

## Solutions

### Option 1 - Change the RESTRICT to SET NULL on `files.folder.id`

```sql
ALTER TABLE files DROP CONSTRAINT files_folder_id_fkey;
ALTER TABLE files ADD CONSTRAINT files_folder_id_fkey
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL;
```

When a folder is suppressed (via CASCADE from users), the files inside of it looses their `folder_id` (changed to NULL) but stays in DB. The worker launched from `user_deleted` events can suppress them from their `owner_user_id`

**Pros**
- Easy to implement, only one migration
- The CASCADE `users -> folders` still works without errors
- The worker can suppress files by `owner_user_id` without checking order (will be explained later)

**Cons**
- Looses the strong DB security on `files.folder_id` - if `IsFolderEmpty` fails, the DB cannot make up for it
- A file could unexpectedly have `folder_id = NULL`

---

### Option 2 - Complete traversal of the folders/files tree but keep the RESTRICT

Suppressing in the right order from the `user_deleted` event worker, without modifying the FK contraints :

```
1. Retrieve every files of the user -> removeobject minio -> delte files in db
2. Retrieve every folders of the user, sorted by deepness
3. Suppressing folders from the lower to the higher
4. Suppressing the user
```

Sorting by deepness is done via recursive SQL queries (CTE, the same as `IsDescendant`) :

It implies to remove the **CASCADE** from `folders.owner_user_id -> users` so Postgres doesn't try to suppress folders on its own before the worker is done with the cleanup.

**Pros**
- Keeps the RESTRICT and the DB constraints
- Double protection is kept as it is
- Proper architecture, the cleanup is entierly handled by the worker

**Cons**
- Less performant for user with a lot of data as it implies N DELETE (N = number of files/folders) instead of a single batch (still acceptable for a background worker)
- Needs to remove the CASCADE on `folders.owner_user_id` and leave it to the work

---

### Option 3 - Soft delete + sync worker

Instead of DELETE in the auth service :
1. auth marks the user as `deleted` (new column `deleted_at`)
2. Publish the `user_deleted` on the stream
3. The work does the real cleanup in the right order then suppress the user row at the end

**Pros**
- Garantied order, no FK problems
- Possibility to cancel the suppression

**Cons**
- Changing the DB schema (adding `deleted_at`)
- Higher complexity in the auth and storage services (reading users)

---

## Open points to talk with everyone

1. **Files in the orgas**: do we delete files in organizations in which they are members when they get deleted ? My current requests doesn't check if `owner_user_id` is part of an organization, folders of these users can contain other people's files
2. **Preference choice**: Option 1 is simplier, Option 2 a bit complicated, Option 3 might cause more problems that anything as both auth and storage service needs to be in sync, probably orga as well later on.
3. **Who deletes the user in DB**: auth does it synchronously, which is normal as it is the service that handles `DELETE /api/auth/me`. But does it have to wait the worker to confirm ? We know for sure the event will be treated as we use stream for this kind of events, so both services could do it, up to preferences as well


> fix trouvé qui fait demande le moins de modifications: `folder_id UUID REFERENCES folders(id) ON DELETE SET NULL`

> puis publish l'event avant le delete user en DB dans `DeleteUser()`

> probleme potentiel: ça fonctionne parce que le worker est assez rapide pour lire l'event et récupérer les fichiers avant que le CASCADE ait propagé, mais c'est une race condition
