# order

- [x] definir la struct File qui mappe ma table. (`model.go`)
- [ ] requetes DB basiques (vérif documentation de lou-anne/pierrick) - insérer un fichier `PENDING`, le lire, l'update (`repository.go`)
- [ ] démarrer un server Fiber qui se log a Postgres (`cmd/files/main.go`)
- [ ] Une fois que ca tourne je peux mettre le client **SDK MinIO**
  - Initialisation au démarrage dans `main.go`
- [ ] Tout connecter et implementer les routes: upload-url -> finalize -> downlowd -> delete -> move (déplacement/migration?) (`service.go`, `handler.go`)


# links

- [minio-go-client](https://pkg.go.dev/github.com/minio/minio-go/v7#section-readme)
- [dev 2 mission](https://github.com/AzehLM/ft_transcendence/blob/docs/general-documentation/docs/MISSION_DEV.md#dev-2--fichiers--stockage-backend)
- [api routes files](https://github.com/AzehLM/ft_transcendence/blob/docs/general-documentation/docs/api_routes.md#files)

# notes to make sure I understood the tasks I need to do

3 differents layers to do:
- DB (Postgres via GORM)
  - Creation and stockage of files metadata
    - file ownership, name (encrypted ?), DEK encrypted key, IV, size...
  - The file is never in the DB
- MinIO
  - Stockage of encrypted bytes.
    - the SDK Go client generated persigned URLs (returned to the frontend), can also remove objects
    - The backend doesn't touch the content, only generates a signed URL that the browser uses to PUT/GET to MinIO.
- HTTP routes (Fiber) - entrypoint
  - This is what the front calls. Each routes orchestrate the 2 above layers. Ex:
    - `POST /files/upload-url` generates an UUID, creates the presigned URL via Minio SDK client, insert the `PENDING` in DB and returns both informations to the client


### graph of an upload

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


## Details

### DB Layer (Postgres via GORN)

Metadata stockage. It handles:
- `InsertPendingFile`: reserves an `object_id` UUID before a file upload. `status = 'PENDING'` is a logical lock (if the frontend crashes - or if a client leave the application or w/e other reason - after we `PUT` a file to MinIO but before the `/finalize` route, the entry stays `PENDING`)
- `FindByObjectID`: checks that the `PENDING` status is ON and is owned by the user that calls `/finalize` on an object. It makes sure someone cannot finalize an `object_id` that doesn't belong to them.
- `ActivateFile`: transition between `PENDING` and `ACTIVE` status. Fills the `name`, `encrypted_dek`, `iv` etc. Those fields are empty at the begiggning of the inital insertion since the frontend only sends them after the encryption and upload.
- `FindByID`: to `/download` and `/delete`, searching by `id` and not by `minio_object_key`
- `DeleteFile`: suppress a line in the DB. **Always before `RemoveObject`** in MinIO (if MinIO fails we can retry but if the DB fails after MinIO we'll have an orphan object, thats why we want to do that before)
- `UpdateFileFolder`: for the `PATCH` routes, maybe I want to separate in 2 functions ? Need to think of inheritance of informations for folders as well as circular folders (folder A in itself)


### MinIO Layer (SDK Go client)

MinIO communicates throught the S3 protocole. What it means is I'm never going to read/write bytes from the backend. MinIO will generate signed URLs that the browser will directly use.

- `PresignedPutObject` (the upload): with a TTL (Time To Live) of 15min (why did we choose 15min ?)
  - It is being generated in `/upload-url`, then it is being returned to the frontend. The browser `PUT` directly to MinIO from this URL
- `PresignedGetObject` (the download): with a TTL of 5min (same here why 5)
  - Being generated in `/download` (**After I checked the RBAC rights**) The frontend receives the URL + the `encrypted_dek` + the `IV`, then decrypts in the browser
- `RemoveObject`: `/delete` route called from the backend, it directly executes on MinIO, no need to go back the the frontend.

### HTTP Layer (Fiber routes)

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
