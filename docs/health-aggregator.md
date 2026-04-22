# notes

Exposition du status de chaque microservice.

- `auth`: `GET http://auth:8081/health`
- `orga`: `GET http://orga:8082/health`
- `storage`: `GET http://storage:8083/health`
- `postgres`: `SELECT 1`
- `redis`: `PING`
- `minio`: `BucketExists("ostrom")`
- `caddy`: `GET http://caddy:2019/config/`
- `cloudflared`: `GET http://cloudflared:20241/metrics`
- `auth`: `GET http://prometheus:9090/-/healthy`
- `grafana`: `GET http://grafana:3000/api/health`

> Pour l'instant je récupère le health d'absolument tout les services mais a terme je pense qu'il faudrat ce limité a ceux qu'on veut dire aux users qu'ils sont up. Les "devs" sont sensé avoir accès a un terminal et donc en faisant `docker ps` ils savent ce qui est healthy/tourne ou non.


### Version finale imaginée

- Des health checks pour tout les services mais avec une utilisation différente en fonction des besoins.
- Comme précisé plus haut je vois pas l'intéret de dire qu'on utilise prometheus, que les fichiers utilisateurs sont stocké dans MinIO etc, c'est une fausse bonne idée ca expose trop de choses.
- Les health checks ils vont donc etre utilisé de 2 facons différentes:
1. Au niveau technique interne: check dans le docker-compose
2. Au niveau de la status page (externe): on expose seulement les composantes importantes
   - authentification, organization, stockage, (plateforme ? pas sur que ce soit utile, si caddy est down comment on accede a la /status page ?)
- Plusieurs états ?
  - Simpliste:
    - booleen ON/OFF
  - Un peu plus précis:
    - **liveness**: le process tourne (TRUE/FALSE)
    - **readiness**: le service peut répondre correctement (TRUE/FALSE)
    - **degraded**: fonctionne partiellement, dépendence dégradées (je sais pas encore)

```json
{
  "service": "storage",
  "liveness": true,
  "readiness": true,
  "degraded": false,
  "dependencies": {
    "postgres": "true || false",
    "redis": "true || false",
    "minio": "true || false"
  }
}
```

```
microservice /health → JSON + 200/503
        ↓
health-aggregator poll → lit le status code + le JSON
        ↓
health-aggregator /api/health → JSON agrégé de tous les services
        ↓
front → parse le JSON → affiche les couleurs
```
