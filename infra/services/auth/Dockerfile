FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY ./backend/shared/go.mod ./backend/shared/go.sum ./shared/
COPY ./backend/auth/go.mod ./backend/auth/go.sum ./

RUN go mod download

COPY ./backend/auth .
COPY ./backend/shared ../shared

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o ft_box_auth ./cmd/api


FROM alpine:3.19

WORKDIR /app

RUN addgroup -S ftgroup && adduser -S ftuser -G ftgroup
USER ftuser

COPY --from=builder /app/ft_box_auth .

EXPOSE 3000

CMD ["./ft_box_auth"]