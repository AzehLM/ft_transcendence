# future doc for dysaster recovery procedure (to be translated in english too)

> nouveau microservice pour faire tourner le**s** `cron` (postgres + minio)

Objectif:
- Faire une save journalière de la DB + un `mc mirror` des buckets minio.
- Avoir un script a exécuter manuellement pour faire le backup manuellement
- Documenter comment faire le backup (ici meme)

Politique de rétention :
- 7 dumps journaliers : daily/backup_YYYY-MM-DD.sql.gz
- 4 dumps hebdomadaires (dimanche) : weekly/backup_YYYY-WXX.sql.gz
- La rotation supprime le plus vieux quand on dépasse la limite

backup.sh :

`pg_dump` avec `--format=custom` (plus efficace que plain SQL pour pg_restore)
Compressé avec -Z 9
Si jour = dimanche → copie aussi dans weekly/
Rotation : ls -t | tail -n +8 | xargs rm pour daily, +5 pour weekly

restore.sh :

Prend un argument : nom du fichier (ou latest comme raccourci)
Affiche une confirmation explicite avant d'écraser
pg_restore --clean --if-exists pour un restore propre
Lit les secrets Docker (/run/secrets/) exactement comme les autres services


mc mirror (MinIO) :

Même service, second job cron : mc mirror minio/ostrom /backups/minio/
Tourne moins souvent : hebdomadaire suffit
Pas de rotation nécessaire (mirror = sync, pas accumulation)
