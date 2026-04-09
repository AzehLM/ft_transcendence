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
- C'est le service `storage` qui les produits (producer)
- Le consumer c'est la websocket (via Redis directement ? je ne sais pas) qui broadcast ces events au front (tous les navigateurs connectés)
- On peut utilisé le systeme de publication/subscription pour ces events car c'est OK si ils sont pas "catch" par le navigateur. Les événements ne sont publish qu'apres réalisation des actions voulus donc un reload (F5) suffit pour l'actualisation en cas de perte des events redis. On parle d'event **fire-and-forget**.
- Mécanisme Redis utilisé: `PUBLISH`/`SUBSCRIBE` - pub/sub classique


## Famille d'événements 2 - Events "cleanup / cross-service side effects"

> TODO: liste EXAUSTIVE des events, tout services confondus + link entre eux (mettre a jour doc ci-dessous en meme temps)
