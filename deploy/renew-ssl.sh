#!/bin/bash
# Продление сертификата — сам certbot обновляет, только если до истечения
# осталось меньше 30 дней, так что запускать можно хоть каждый день.
# Поставить в cron на сервере:
#   0 4 * * * cd /opt/warehouse-api && ./deploy/renew-ssl.sh >> /var/log/warehouse-renew-ssl.log 2>&1

set -e
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

# --entrypoint certbot обязателен: сервис certbot в compose-файле имеет
# entrypoint: /bin/true, иначе "run renew ..." тоже уйдёт в /bin/true
# и завершится с кодом 0, ничего не продлив.
$COMPOSE run --rm --entrypoint certbot certbot renew --webroot --webroot-path=/var/www/certbot
$COMPOSE exec nginx nginx -s reload
