# syntax=docker/dockerfile:1

FROM golang:1.26-alpine AS builder

RUN apk add --no-cache \
	git
	# ca-certificates \

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

# COPY ./backend/cmd/files ./backend/files
# COPY ./backend/internal/files ./backend/files

COPY . .

RUN CGO_ENABLED=0 GOOS=linux \
    go build -ldflags="-w -s" \
    -o /bin/files-service \
    ./cmd/files

FROM scratch

# WORKDIR /app

# RUN addgroup -S ftgroup && adduser -S ftuser -G ftgroup
# USER ftuser

# COPY --from=builder /app/ft_box_orga .

# COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

COPY --from=builder /bin/files-service /files-service

EXPOSE 8089

CMD ["./files-service"]
