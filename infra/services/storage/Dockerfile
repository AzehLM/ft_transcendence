# syntax=docker/dockerfile:1

FROM golang:1.26-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY ./backend/go.work ./backend/go.work.sum ./
COPY ./backend/storage/go.mod ./backend/storage/go.sum ./storage/
COPY ./backend/shared/go.mod ./backend/shared/go.sum ./shared/

RUN go work sync

COPY ./backend/storage ./storage/
COPY ./backend/shared ./shared/

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o storage-test ./storage/cmd/api/

FROM alpine:3.23.3

WORKDIR /app

COPY --from=builder /app/storage-test .

EXPOSE 8083

CMD ["./storage-test"]
