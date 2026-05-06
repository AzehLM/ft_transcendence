# syntax=docker/dockerfile:1

FROM golang:1.26-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY ./backend/health-aggregator/go.mod ./backend/health-aggregator/go.sum ./health-aggregator/

RUN go work init ./health-aggregator && go work sync

COPY ./backend/health-aggregator ./health-aggregator/

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o ostrom-health-aggregator ./health-aggregator/cmd/api/


FROM alpine:3.23.3

WORKDIR /app

COPY --from=builder /app/ostrom-health-aggregator .

EXPOSE 8084

CMD ["./ostrom-health-aggregator"]
