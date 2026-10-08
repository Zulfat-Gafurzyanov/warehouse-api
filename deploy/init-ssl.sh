#!/bin/bash
# Разовый скрипт: выпускает Let's Encrypt сертификат на DOMAIN (+www/admin/api)
# и переключает nginx с временного HTTP-конфига на полный с HTTPS.
#
# Запускать один раз на самом сервере, из корня репозитория, после того как:
#   - DNS (A-записи DOMAIN, www.DOMAIN, admin.DOMAIN, api.DOMAIN) уже указывает
#     на этот сервер — иначе Let's Encrypt не сможет проверить домен;
#   - в корневом .env задан DOMAIN=ваш-домен.ru и CERTBOT_EMAIL=почта@...
#
# Использование:
#   chmod +x deploy/init-ssl.sh && ./deploy/init-ssl.sh

set -e
cd "$(dirname "$0")/.."

if [ -f .env ]; then
    set -a
    . ./.env
    set +a
fi

if [ -z "$DOMAIN" ]; then
    echo "Не задан DOMAIN — пропишите DOMAIN=ваш-домен.ru в корневом .env" >&2
    exit 1
fi

if [ -z "$CERTBOT_EMAIL" ]; then
    echo "Не задан CERTBOT_EMAIL — пропишите CERTBOT_EMAIL=почта@... в корневом .env" >&2
    exit 1
fi

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
TEMPLATE=deploy/nginx/templates/default.conf.template
FULL_BACKUP=/tmp/warehouse-default.conf.template.full

# Если скрипт упадёт на полпути — обязательно вернуть боевой конфиг на место,
# а не оставить сервер с временной заглушкой вместо сайта.
restore_full_config() {
    if [ -f "$FULL_BACKUP" ]; then
        cp "$FULL_BACKUP" "$TEMPLATE"
    fi
}
trap restore_full_config EXIT

echo "==> Временный HTTP-конфиг (чтобы nginx вообще смог стартовать без сертификата)"
cp "$TEMPLATE" "$FULL_BACKUP"
cp deploy/nginx/bootstrap/default.conf.template "$TEMPLATE"

echo "==> Поднимаю nginx во временном режиме"
$COMPOSE up -d nginx
sleep 3

echo "==> Запрашиваю сертификат у Let's Encrypt для $DOMAIN, www.$DOMAIN, admin.$DOMAIN, api.$DOMAIN"
# --entrypoint certbot обязателен: в сервисе certbot в compose-файле
# entrypoint переопределён на /bin/true (чтобы при обычном "up" он не
# запускался сам), поэтому без этой опции "run certonly ..." тоже уйдёт
# в /bin/true и завершится с кодом 0, ничего не сделав.
$COMPOSE run --rm --entrypoint certbot certbot certonly \
    --webroot --webroot-path=/var/www/certbot \
    --email "$CERTBOT_EMAIL" --agree-tos --no-eff-email \
    -d "$DOMAIN" -d "www.$DOMAIN" -d "admin.$DOMAIN" -d "api.$DOMAIN"

echo "==> Сертификат получен — возвращаю боевой конфиг и перезапускаю nginx"
restore_full_config
$COMPOSE restart nginx

echo "==> Готово. Проверьте: https://$DOMAIN, https://admin.$DOMAIN, https://api.$DOMAIN/api/v1/health"
echo "==> Продление сертификата — deploy/renew-ssl.sh, поставьте в cron (см. deploy/README.md)."
