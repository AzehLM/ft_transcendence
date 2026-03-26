# syntax=docker/dockerfile:1

FROM golang:1.26-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY ./backend/files/go.mod ./backend/files/go.sum ./
COPY ./backend/shared/go.mod ./backend/shared/go.sum ./shared/

COPY ./backend/files .
COPY ./backend/shared ../../shared
COPY ./backend/internal ../../internal

# putting this below the COPYs seems to make me compile properly but I have absolutely not understood WHY...
RUN go mod download

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o files-test ./cmd/

FROM alpine:3.23.3

WORKDIR /app

COPY --from=builder /app/files-test .

EXPOSE 3004

CMD ["./files-test"]
