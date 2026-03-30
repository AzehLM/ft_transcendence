FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app/backend/orga

COPY ./backend/shared/go.mod ./backend/shared/go.sum /app/backend/shared/
COPY ./backend/orga/go.mod ./backend/orga/go.sum ./

RUN go mod download

COPY ./backend/shared /app/backend/shared
COPY ./backend/orga ./

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o ft_box_orga ./cmd/api


FROM alpine:3.19

WORKDIR /app

COPY --from=builder /app/backend/orga/ft_box_orga .

EXPOSE 8082

CMD ["./ft_box_orga"]