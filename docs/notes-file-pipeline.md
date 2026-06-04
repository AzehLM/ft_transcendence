## graph of an upload

```
Browser                    Fiber                  MinIO         Postgres
  │                          │                      │               │
  │── POST /upload-url ─────▶│                      │               │
  │                          │── PresignedPutURL ──▶│               │
  │                          │◀─ presigned_url ─────│               │
  │                          │── InsertPending ────────────────────▶│
  │◀─ {presigned_url, obj_id}│                      │               │
  │                          │                      │               │
  │── PUT (bytes chiffrés) ────────────────────────▶│               │
  │◀─ 200 ──────────────────────────────────────────│               │
  │                          │                      │               │
  │── POST /finalize ───────▶│                      │               │
  │                          │── ActivateFile ─────────────────────▶│
  │◀─ 201 ───────────────────│                      │               │
  ```


## DB Layer (Postgres via GORM)

Metadata stockage. It handles:
- `InsertPendingFile`: reserves an `object_id` UUID before a file upload. `status = 'PENDING'` is a logical lock (if the frontend crashes - or if a client leave the application or w/e other reason - after we `PUT` a file to MinIO but before the `/finalize` route, the entry stays `PENDING`)
- `FindByObjectID`: checks that the `PENDING` status is ON and is owned by the user that calls `/finalize` on an object. It makes sure someone cannot finalize an `object_id` that doesn't belong to them.
- `ActivateFile`: transition between `PENDING` and `ACTIVE` status. Fills the `name`, `encrypted_dek`, `iv` etc. Those fields are empty at the begiggning of the inital insertion since the frontend only sends them after the encryption and upload.
- `FindByID`: to `/download` and `/delete`, searching by `id` and not by `minio_object_key`
- `DeleteFile`: suppress a line in the DB. **Always before `RemoveObject`** in MinIO (if MinIO fails we can retry but if the DB fails after MinIO we'll have an orphan object, thats why we want to do that before)
- `UpdateFileFolder`: for the `PATCH` routes, maybe I want to separate in 2 functions ? Need to think of inheritance of informations for folders as well as circular folders (folder A in itself)


## MinIO Layer (SDK Go client)

MinIO communicates throught the S3 protocole. What it means is I'm never going to read/write bytes from the backend. MinIO will generate signed URLs that the browser will directly use.

- `PresignedPutObject` (the upload): with a TTL (Time To Live) of 15min (why did we choose 15min ?)
  - It is being generated in `/upload-url`, then it is being returned to the frontend. The browser `PUT` directly to MinIO from this URL
- `PresignedGetObject` (the download): with a TTL of 5min (same here why 5)
  - Being generated in `/download` (**After I checked the RBAC rights**) The frontend receives the URL + the `encrypted_dek` + the `IV`, then decrypts in the browser
- `RemoveObject`: `/delete` route called from the backend, it directly executes on MinIO, no need to go back the the frontend.

## HTTP Layer (Fiber routes)

The orchestrator. Each handler always follow the same pattern:
- Extract and valide inputs (JWT, body, params if any)
- Applies the business logic (quota, RBAC rights)
- Calls my `repository.go` (works on the DB)
- Calls the SDK Go Minio client (if necessary)
- Return response to client


Current file roles:
- `repository.go` -> only DB requests
- `service.go` -> business logic (quota, ownership (should be calling the RBAC shared functions of lbuisson))
- `handler.go` -> parse request, calls services, return JSON, etc...
> `handler.go` never directly talks to GORM. `service.go` doens't know Fiber, each layer as its own responsibilities


**Extra note**
Where do I introduce/use Redis in all this ?

---

# Not in documentation but could be useful (or mandatory):

> not ordered by priority

- Quota checker + updater (used_space):
  - Requete user service (ou directement en db) pour lire used_space et max_space si il y a puis
    - `UPDATE users SET used_space += file_size` apres un FinalizeUpload
    - `UPDATE users SET used_space -= file_size` apres un DeleteFile
- Redis event:
  - event pour: `file_upload`, `file_delete`, `folder_created`, `folder_delete` (et d'autres que j'ai pas en tete encore)
  - `redis.Publish(ctx, "event", payload)` aux endroits ou il y a creation/suppression
- Nettoyage des fichiers `PENDING` orphelins avec un cron ou une goroutine si on veut check toutes les X minutes ou un subcriber Redis sur `user_deleted` qui delete les fichiers des utilisateurs supprimés (mais avec un cron/goroutine au moins on purge aussi les orphelins sans event (dans le cas ou ca arrive))
- ⚠️ une route `GET /files/{file_id}` qui retourne les metadata, pour le frontend ca va etre obligatoire pour avoir les détails des fichiers (`FindByID` + ownership check avec un retour JSON des metadata dont le front a besoin)
- une route `GET /files?folder_id=xxx` ? au cas ou j'arrive pas a faire la route `GET /folders?parent_id=xxx` qui renvoie les fichiers dans dossier(s) + fichier sans dossier (donc a la racine)
- Un truc qui valide l'existence d'un dossier cible pour `MoveFile` et `RequestUploadURL`, pour l'instant il y a pas de check sur `folder_id` aillant un random UUID, actuellement ca renvoie une 500
