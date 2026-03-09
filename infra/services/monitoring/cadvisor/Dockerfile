# syntax=docker/dockerfile:1

FROM alpine:3.21

RUN apk add --no-cache \
	libc6-compat \
	wget

RUN wget -O /usr/local/bin/cadvisor https://github.com/google/cadvisor/releases/download/v0.56.2/cadvisor-v0.56.2-linux-amd64 \
    && chmod +x /usr/local/bin/cadvisor

EXPOSE 8080

CMD ["cadvisor"]
