# Redis

Coté du service storage, on est uniquement publisher, pas subscriber (ou stream mais je pars du principe que non)

diff pub/sub - stream:
- pub/sub (`PUBLISH`/`SUBSCRIBE`): Si personne est sur une page ou on a publié un event (ou que l'event a pas été catch par quelqu'un qui est sur la page pour X ou Y raison), le message est perdu mais on s'en moque parce qu'au load de la page on aura un fetch des fichiers/dossiers (donc des modifications qui ont pu passer a la trappe)
- streams (`XADD`/`XREAD`): En gros on log puis on consume (consomme) les logs, ca veut dire on traite toutes les infos qui ont été add par le/les publishers (l'avantage c'est si le ws broker crash on peut récup les logs et mettre a jour sans avoir a refresh a la main)

events: `file_upload`, `file_delete`, `folder_created`, `folder_delete`, `folder_renamed`, `folder_moved`, `file_moved`, `file_renamed`...

[quel mode de fonctionnement entre les 2](https://oneuptime.com/blog/post/2026-01-21-redis-streams-vs-pubsub/view#:~:text=For%20most%20production%20systems%20requiring,time%20delivery%20and%20message%20durability.)
  - Pour le coup pub/sub suffit IMO

Quels type de channel de publication ?
  - un channel global par event ? `file_uploaded`, `file_deleted` -> le broker subscribe a tout et filtre
  - un channel par user ? `user:{user_id}:events` -> le broker subscribe quand un user est co au ws
  - un channel par score ? (channel user + channel orga) `events:personal:{user_id}`, `events:org:{org_id}` -> le ws broker gere a la main les perms

Format payload:
  - thin: just les IDs (`file_id`, `folder_id`, `owner_id`)
  - fat: tous les champs utiles (`name`, `file_size`, `created_at` etc) ⚠️ il faudrat bien faire attention a ne pas inclure dans le payload `DEK`, `IV` etc.



## Notes - points ou redis a ete mentionné

#### work.md

- [register](https://github.com/AzehLM/ft_transcendence/blob/docs/general-documentation/docs/work.md#1-register)
- [creation orga](https://github.com/AzehLM/ft_transcendence/blob/docs/general-documentation/docs/work.md#3-creation-dune-orga)
- [file suppression](https://github.com/AzehLM/ft_transcendence/blob/docs/general-documentation/docs/work.md#7-suppression-de-fichier)
- [changement de role dans orga](https://github.com/AzehLM/ft_transcendence/blob/docs/general-documentation/docs/work.md#8-changement-de-role-dans-une-orga)
- [Suppression de compte](https://github.com/AzehLM/ft_transcendence/blob/docs/general-documentation/docs/work.md#8-changement-de-role-dans-une-orga)
- [logout](https://github.com/AzehLM/ft_transcendence/blob/docs/general-documentation/docs/work.md#12-logout)

#### api_routes.md

- [websocket](https://github.com/AzehLM/ft_transcendence/blob/docs/general-documentation/docs/api_routes.md#websocket)


#### mission_dev.md

- [dev 1 - refresh token/logout](https://github.com/AzehLM/ft_transcendence/blob/docs/general-documentation/docs/MISSION_DEV.md#dev-1--auth--s%C3%A9curit%C3%A9-backend)
- [dev 2 - finalize/delete file](https://github.com/AzehLM/ft_transcendence/blob/docs/general-documentation/docs/MISSION_DEV.md#dev-2--fichiers--stockage-backend)
- [global (c'est dans dev 3 btw)](https://github.com/AzehLM/ft_transcendence/blob/docs/general-documentation/docs/MISSION_DEV.md#dev-3--organisations-websocket--redis-backend)


# notes

- si orga delete, alors delete tout les fichiers/dossiers ? ou est-ce qu'on fait ca ? Est-ce que c'est mon backend qui subscribe a un event `orga_delete` ? Est-ce que c'est le front qui est subscribe et qui fais les requetes aux back pour delete on_cascade ?



---

On a plusieurs types d'événements, plusieurs "producteurs" et plusieurs "consommateurs" également (j'utiliserai respectivement producer et consumer a partir de maintenant), avec des besoins différents.

## Famille d'événements 1 - Events "UI realtime"

> TODO: liste EXAUSTIVE des events, tout services confondus (mettre a jour doc ci dessous en meme temps)
- `file_uploaded`, `file_deleted`, `file_moved`, `folder_created`, ...
- **Producer**: le service `storage` les produits
- **Consumer**: la websocket (via Redis directement ? je ne sais pas encore, a discuté avec Pierrick) qui broadcast ces events au front (tous les navigateurs connectés)
- On peut utilisé le systeme de publication/subscription pour ces events car c'est OK si ils sont pas "catch" par le navigateur. Les événements ne sont publish qu'apres réalisation des actions voulus donc un reload (F5) suffit pour l'actualisation en cas de perte des events redis. On parle d'event **fire-and-forget**.
- Mécanisme Redis utilisé: `PUBLISH`/`SUBSCRIBE` - pub/sub classique


## Famille d'événements 2 - Events "cleanup / cross-service side effects"

> TODO: liste EXAUSTIVE des events, tout services confondus + link entre eux (mettre a jour doc ci-dessous en meme temps)
- `user_delete` (cleanup de ses fichiers), `file_orphaned` (cleanup minio), `orga_deleted` (cleanup de ses fichiers)
- **Producer**: c'est variable, auth pour `user_deleted`, storage pour `file_orphaned`, etc (a mettre a jour en meme temps que le TODO)
- **Consumer**: Des workers, soit créer spécialement pour, soit en utilisant les routes de nos services qui sont déjà en place.
- C'est ici que c'est vraiment important, **aucun events ne doit etre perdu!**. Si on delete pas correctement les infos utilisateurs (metadata, raw data) on va saturer nos espaces de stockage a un moment donné.
- Mécanisme Redis utilisé: `Streams` mais pas de pub/sub car a nouveau, on **DOIT** consume tous les events sans exception


La différence entre les deux c'est la sémantique, pub/sub n'a pas de garantie de lecture/consommation.
Imaginons qu'on ai une orga qui soit delete alors qu'elle contenait 30Go de data, c'est potentiellement 30Go qui restent dans un bucket MinIO.


## Architecture (je sais pas comment appelé ca mieux pour l'instant)

### Besoins

- un consumer websocket pour re-broadcast en temps réels (je sais pas ou le mettre)
- un consumer "storage cleanup" (cleanup `file_orphaned` dans minio, les PENDING orphelins en DB également) (**propre au service storage**)
- un consumer `user_deleted` pour que storage supprimer les fichiers de l'utilisateur + object Minio, meme chose pour `orga_deleted` (**également propre au service storage**)

### Nouveau package worker

> path: `backend/storage/internal/workers/`

```go
// HTTP server
go app.Listen(":8083")

// Background workers
eventWorker := workers.NewEventConsumer(service, redisClient)
go eventWorker.ConsumeUserDeleted(ctx)
go eventWorker.ConsumeFileOrphaned(ctx)
go eventWorker.PeriodicSweep(ctx, 15*time.Minute) // wrapper des autres consumer, il execute tout périodiquement "au cas ou" (15min pour pas que ca prenne trop de ressources c'est FINE imo)
```

### Deux channels différents

- `events:ui:*` pub/sub
- `events:domain:*` stream


> Je sais pas encore comment faire le lien avec ce que t'as déjà mis en place Pierrick. On est Vendredi je trouverai bien une solution avant Lundi.

## WebSocket

### Connexion : `wss://api.../ws`
Auth via Access JWT (query param ou header).

---

### Events UI realtime (serveur → client via Redis pub/sub broker)

> Mécanisme: Redis `PUBLISH`/`SUBSCRIBE` sur `events:ui:*`
> Sémantique: fire-and-forget, perte acceptable (le frontend re-fetch au reload)

#### Files

```json
{ "event": "file_uploaded", "data": { "file_id": "<uuid>", "folder_id": "<uuid>", "owner_id": "<uuid>", "org_id": "<uuid>", "name": "rapport.pdf", "file_size": 1048576 } }
```

```json
{ "event": "file_deleted", "data": { "file_id": "<uuid>", "folder_id": "<uuid>", "owner_id": "<uuid>", "org_id": "<uuid>" } }
```

```json
{ "event": "file_moved", "data": { "file_id": "<uuid>", "owner_id": "<uuid>", "org_id": "<uuid>", "old_folder_id": "<uuid>", "new_folder_id": "<uuid>" } }
```

```json
{ "event": "file_renamed", "data": { "file_id": "<uuid>", "folder_id": "<uuid>", "owner_id": "<uuid>", "org_id": "<uuid>", "new_name": "rapport_v2.pdf" } }
```

#### Folders

```json
{ "event": "folder_created", "data": { "folder_id": "<uuid>", "parent_id": "<uuid>", "owner_id": "<uuid>", "org_id": "<uuid>", "name": "photos" } }
```

```json
{ "event": "folder_deleted", "data": { "folder_id": "<uuid>", "parent_id": "<uuid>", "owner_id": "<uuid>", "org_id": "<uuid>" } }
```

```json
{ "event": "folder_moved", "data": { "folder_id": "<uuid>", "owner_id": "<uuid>", "org_id": "<uuid>", "old_parent_id": "<uuid>", "new_parent_id": "<uuid>" } }
```

```json
{ "event": "folder_renamed", "data": { "folder_id": "<uuid>", "parent_id": "<uuid>", "owner_id": "<uuid>", "org_id": "<uuid>", "new_name": "archives_2025" } }
```

#### Organizations

```json
{ "event": "org_created", "data": { "org_id": "<uuid>", "name": "42_Projects" } }
```

```json
{ "event": "org_deleted", "data": { "org_id": "<uuid>" } }
```

```json
{ "event": "org_renamed", "data": { "org_id": "<uuid>", "new_name": "42_Projects_2026" } }
```

#### Organization members

```json
{ "event": "member_invited", "data": { "org_id": "<uuid>", "user_id": "<uuid>" } }
```

```json
{ "event": "member_joined", "data": { "org_id": "<uuid>", "user_id": "<uuid>", "role": "member" } }
```

```json
{ "event": "member_removed", "data": { "org_id": "<uuid>", "user_id": "<uuid>" } } // si affichage des membres d'une orga
```

```json
{ "event": "member_role_updated", "data": { "org_id": "<uuid>", "user_id": "<uuid>", "new_role": "admin" } }
```

#### Users

```json
{ "event": "user_logged_out", "data": { "user_id": "<uuid>" } } // ferme les sessions websocket des autres onglets du meme user
```

---

### Events domain (cross-service via Redis Streams)

> Mécanisme: Redis `XADD`/`XREAD` avec consumer groups sur `events:domain:*`
> Sémantique: garantie de livraison, idempotence requise côté consumer
> Ces events ne sont **pas** broadcastés au frontend, ils déclenchent du nettoyage cross-service

#### Cleanup

```json
{ "event": "user_deleted", "data": { "user_id": "<uuid>", "deleted_at": "<timestamp>" } }
```

```json
{ "event": "org_deleted", "data": { "org_id": "<uuid>", "deleted_at": "<timestamp>" } } // ⚠️ meme nom, pas le meme channel
```

```json
{ "event": "file_orphaned", "data": { "file_id": "<uuid>", "minio_object_key": "<uuid>", "owner_id": "<uuid>" } }
```
