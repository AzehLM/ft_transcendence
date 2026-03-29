FROM golang:1.26-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app/backend/auth

COPY ./backend/shared/go.mod ./backend/shared/go.sum /app/backend/shared/
COPY ./backend/auth/go.mod ./backend/auth/go.sum ./

RUN go mod download

COPY ./backend/shared /app/backend/shared
COPY ./backend/auth ./

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o ft_box_auth ./cmd/api


FROM alpine:3.23.3

WORKDIR /app


COPY --from=builder /app/backend/auth/ft_box_auth .

EXPOSE 8081

CMD ["./ft_box_auth"]