FROM golang:1.26-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY ./backend/auth/go.mod ./backend/auth/go.sum ./auth/
COPY ./backend/shared/go.mod ./backend/shared/go.sum ./shared/

RUN go work init ./shared ./auth && go work sync

COPY ./backend/shared ./shared/
COPY ./backend/auth ./auth/

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o ft_box_auth ./auth/cmd/api/


FROM alpine:3.23.3

WORKDIR /app


COPY --from=builder /app/ft_box_auth .

EXPOSE 8081

CMD ["./ft_box_auth"]
