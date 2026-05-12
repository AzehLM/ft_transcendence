FROM alpine:3.23

RUN apk add --no-cache envsubst

COPY --from=prom/alertmanager:v0.32.1 /bin/alertmanager /bin/alertmanager
COPY --from=prom/alertmanager:v0.32.1 /etc/alertmanager /etc/alertmanager
COPY ./infra/services/monitoring/alertmanager/alertmanager.yml /etc/alertmanager/alertmanager.yml.template
COPY ./infra/services/monitoring/alertmanager/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 9093

ENTRYPOINT ["./entrypoint.sh"]

CMD ["/bin/alertmanager", "--config.file=/etc/alertmanager/alertmanager.yml", "--storage.path=/alertmanager"]
