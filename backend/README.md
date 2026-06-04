# Backend (Go + Fiber)

### sous-dossiers

- api/        : méthodes (ou pas d'ailleurs ?) handlers HTTP
- service/    : logique metier (def: code qui applique des règles, ex: vérification des droits d'upload, etc...)
- domain/     : modèles de structure des métiers  ([Domain-Driven Design (DDD)](https://softwarearchitecture.fr/domain_driven_design/implement_business_logic/domain_service#quest-ce-quun-domain-service-))
- repository/ : GORM/SQLC
- migrations/ : migrations DB
- config/     : config, env
- pkg/        : utils crypto, auth, middleware
