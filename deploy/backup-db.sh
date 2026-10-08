#!/bin/bash
# Ежедневный бэкап базы — локально на диск сервера, с ротацией (хранит 14 дней).
# Это НЕ полноценный офсайт-бэкап (если умрёт сам диск — бэкапы умрут вместе с
# базой), но лучше, чем ничего, и не требует внешних сервисов. Для настоящего
# офсайт-бэкапа — см. комментарий в конце файла (нужен S3/аналог и его ключи).
#
# Поставить в cron на сервере:
#   0 3 * * * /opt/warehouse-api/deploy/backup-db.sh >> /var/log/warehouse-backup.log 2>&1

set -e

BACKUP_DIR="/root/backups"
RETENTION_DAYS=14
CONTAINER="warehouse-api-postgres-1"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

docker exec "$CONTAINER" pg_dump -U postgres -d mydb --clean --if-exists \
    | gzip > "$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"

find "$BACKUP_DIR" -name 'backup_*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "$(date -Iseconds) backup OK: $BACKUP_DIR/backup_${TIMESTAMP}.sql.gz ($(du -h "$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz" | cut -f1))"

# Офсайт-копия (опционально) — если дадите бакет и ключи, раскомментировать:
# aws s3 cp "$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz" "s3://your-bucket/warehouse-backups/" --only-show-errors
