FROM alpine:3.23

RUN apk add --no-cache curl

RUN curl -fsSL https://dl.min.io/client/mc/release/linux-amd64/mc \
    -o /usr/local/bin/mc \
    && chmod +x /usr/local/bin/mc

COPY init.sh /init.sh

RUN chmod +x /init.sh

ENTRYPOINT ["/init.sh"]
