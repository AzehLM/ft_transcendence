# API & DB
## API
### install
#### GO
```
go mod init my-app-backend 
go get github.com/gofiber/fiber/v2
go get "gorm.io/gorm"
go get gorm.io/driver/postgres
```

#### GIN
- framework web for Go
- tool that simplify the creation of API
- easy routing, JSON automation

### Structures
backend/ \
├── cmd/ \
│   └── api/ \
│       └── main.go         # entry point \
├── internal/ \
│   ├── models/             # all the GORM structures (Info, User, etc.) \
│   ├── handlers/           # functions for all endpoints Gin \
│   └── repository/         # access to DB (GORM + PostgreSQL) \
├── migrations/             # scripts SQL for PostgreSQL \
├── go.mod \
└── go.sum \

### Workflow
main.go -> init db -> create routes -> send to handlers (gin context - request information, and db) -> handle the request (using the model and the repository function linked)
- Main.go
    - where the API is launched
    - need to set up CORS to allow communication with frontend
    - connect to DB (call the function that will be in repository)
    - set up roots 
        - .Get(url, Ctx) error { return handlers.HandleFunction(c, db)}
        - in Ctx,we can access to
            - parameters (.Param(...))
            - query parametes (.Query(...))
            - body JSON (.BodyParser(...))
            - send a response (.JSON(...))
            - HTTP code (.Status(...))
        - the function must return error

- Handlers
    - handle request HTTP
    - will get info from the DB or modify it
    - return a JSON
    - When a route is set in the main.gp, a handler should be done corresponding
- Models
    - represent datas in the app
    - define a table structure stored in DB to use it in our API to fill information from th DB
    - allow us to manipulate the datas in Go, convert them in JSON for the API and use them with GORM
    - When a table/column is added to the DB / any modification in the structure of the datas is made -> create or modify a model
    - Every table from the DB sould have a model
- Repository (not sure)
    - called in handlers
    - where we communicate with the DB
- what to do when creating a route
    - set routes in main.go
    - check if model is set in models
    - create handler in handlers
    - create communication function with DB in repository


### Launch
```
go mod tidy
go run cmd/api/main.go
```


## DB
### Install
```
docker run --name myapp-postgres \
  -e POSTGRES_USER=myuser \
  -e POSTGRES_PASSWORD=mypassword \
  -e POSTGRES_DB=myappdatabase \
  -p 5432:5432 \
  -d postgres:15-alpine
docker exec -it myapp-postgres psql -U myuser -d myappdatabase
```

### Init
```
CREATE TABLE infos (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO infos (description) VALUES ('My first info');
SELECT * FROM infos;
```

## Link to frontend
### Set up CORS
```
go get github.com/gofiber/fiber/v2/middleware/cors
```

### Websockets
- React -> open websocket connexion 
- Server -> send update when needed
- ```go get github.com/gofiber/websocket/v2```