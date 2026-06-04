# syntax=docker/dockerfile:1

FROM golang:1.26-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY ./backend/shared/go.mod ./backend/shared/go.sum ./shared/
COPY ./backend/storage/go.mod ./backend/storage/go.sum ./storage/

RUN go work init ./shared ./storage && go work sync

COPY ./backend/shared ./shared/
COPY ./backend/storage ./storage/

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o ostrom-storage ./storage/cmd/api/


FROM alpine:3.23.3

WORKDIR /app

COPY --from=builder /app/ostrom-storage .

EXPOSE 8083

CMD ["./ostrom-storage"]
