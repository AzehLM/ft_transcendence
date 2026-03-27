# syntax=docker/dockerfile:1

FROM golang:1.26-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY ./backend/go.work ./backend/go.work.sum ./
COPY ./backend/files/go.mod ./backend/files/go.sum ./files/
COPY ./backend/shared/go.mod ./backend/shared/go.sum ./shared/

RUN go work sync

COPY ./backend/files ./files/
COPY ./backend/shared ./shared/

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o files-test ./files/cmd/

FROM alpine:3.23.3

WORKDIR /app

COPY --from=builder /app/files-test .

EXPOSE 8083

CMD ["./files-test"]
