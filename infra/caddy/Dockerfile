# syntax=docker/dockerfile:1

FROM caddy:builder-alpine AS builder

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    xcaddy build \
    --with github.com/caddyserver/nginx-adapter \
    --with github.com/hairyhenderson/caddy-teapot-module@v0.0.3-0 \
	--with github.com/fabriziosalmi/caddy-waf

FROM caddy:latest@sha256:9068f76202c0a03545036d32bf2d424d3b46c1174f254070f605002a2dbc9657

COPY --from=builder /usr/bin/caddy /usr/bin/caddy

ARG CADDY_CONFIG=Caddyfile

COPY ${CADDY_CONFIG} /etc/caddy/Caddyfile

RUN chmod 666 /etc/caddy/Caddyfile

# no need CMD or ENTRYPOINT as the imported caddy image has default ENTRYPOINT
