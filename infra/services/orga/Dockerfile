# syntax=docker/dockerfile:1

FROM golang:1.26-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY ./backend/shared/go.mod ./backend/shared/go.sum ./shared/
COPY ./backend/orga/go.mod ./backend/orga/go.sum ./orga/

RUN go work init ./shared ./orga && go work sync

COPY ./backend/shared ./shared/
COPY ./backend/orga ./orga/

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o ostrom-orga ./orga/cmd/api/


FROM alpine:3.23.3

WORKDIR /app

COPY --from=builder /app/ostrom-orga .

EXPOSE 8082

CMD ["./ostrom-orga"]
