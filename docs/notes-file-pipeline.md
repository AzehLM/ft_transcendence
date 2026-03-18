# order

- definir la struct File qui mappe ma table. (`internal/files/model.go`)
- requetes DB basiques (vérif documentation de lou-anne/pierrick) - insérer un fichier `PENDING`, le lire, l'update (`internal/files/repository.go`)
- démarrer un server Fibber qui se log a Postgres (`cmd/files/main.go`)
- Une fois que ca tourne je peut mettre le client **SDK MinIO**
  - Initialisation au démarrage dans `main.go`
- Tout connecter et implementer les routes: upload-url -> finalize -> downlowd -> delete -> move (déplacement/migration?) (`internal/files/service.go`, `internal/files/handler.go`)


# links

[minio-go-client](https://pkg.go.dev/github.com/minio/minio-go/v7#section-readme)
