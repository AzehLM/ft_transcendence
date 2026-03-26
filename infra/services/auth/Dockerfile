# ==========================================
# Stage 1: Builder
# ==========================================
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

# Puisque le contexte est à la racine, go.mod est directement accessible
COPY go.mod go.sum ./
RUN go mod download

# On copie uniquement le dossier de ton service d'authentification
COPY ./backend ./backend

# On compile en pointant vers le bon chemin relatif
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o ft_box_auth ./backend/cmd/auth
# ==========================================
# Stage 2: Runner (Production/Dev ready)
# ==========================================
FROM alpine:3.19

WORKDIR /app

RUN addgroup -S ftgroup && adduser -S ftuser -G ftgroup
USER ftuser

COPY --from=builder /app/ft_box_auth .

EXPOSE 3003

CMD ["./ft_box_auth"]
