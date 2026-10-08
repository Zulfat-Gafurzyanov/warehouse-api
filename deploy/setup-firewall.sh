#!/bin/bash
# Разовая настройка файрвола на боевом сервере — закрывает всё, кроме SSH и
# веб-портов. БД/Redis уже и так торчат только на 127.0.0.1 (см. docker-compose.yml),
# поэтому их отдельно закрывать не нужно — просто недоступны снаружи.
#
# Запускать один раз на сервере: sudo ./deploy/setup-firewall.sh

set -e

ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP (редирект на HTTPS + ACME)'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
ufw status verbose
