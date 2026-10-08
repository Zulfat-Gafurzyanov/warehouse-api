# Запуск на боевом сервере

Однократная настройка нового сервера — по шагам. Выполняется на самом
сервере (SSH), из корня склонированного репозитория.

## Перед началом

- Новый сервер, SSH-доступ (root или sudo-пользователь + ключ).
- Домен, и его A-записи **уже** указывают на IP этого сервера:
  `DOMAIN`, `www.DOMAIN`, `admin.DOMAIN`, `api.DOMAIN` → IP сервера.
  Без этого Let's Encrypt не сможет подтвердить владение доменом.
- Docker и Docker Compose установлены на сервере.

## 1. Склонировать репозиторий и настроить .env

```bash
git clone <repo> /opt/warehouse-api
cd /opt/warehouse-api

cp .env.production.example .env
# заполнить DOMAIN и CERTBOT_EMAIL

cp backend/.env.example backend/.env
# заполнить реальными значениями (новый INTERNAL_API_TOKEN, не тестовый —
# см. ниже команду для генерации; CORS_ORIGINS можно не трогать, его
# переопределяет docker-compose.prod.yml из DOMAIN)

cp bot/.env.example bot/.env
# TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID, тот же INTERNAL_API_TOKEN,
# ADMIN_PANEL_URL=https://admin.<ваш-домен>
```

Сгенерировать новый `INTERNAL_API_TOKEN` (должен совпадать в `backend/.env` и `bot/.env`):

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 2. Файрвол

```bash
chmod +x deploy/*.sh
sudo ./deploy/setup-firewall.sh
```

## 3. Собрать и поднять приложение (пока без HTTPS)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d postgres redis bot backend admin frontend
```

## 4. Выпустить SSL-сертификат и включить HTTPS

```bash
./deploy/init-ssl.sh
```

Проверить: `https://<домен>`, `https://admin.<домен>`, `https://api.<домен>/api/v1/health`.

## 5. Бэкапы и продление сертификата — в cron

```bash
crontab -e
```

Добавить:

```
0 3 * * * /opt/warehouse-api/deploy/backup-db.sh >> /var/log/warehouse-backup.log 2>&1
0 4 * * * /opt/warehouse-api/deploy/renew-ssl.sh >> /var/log/warehouse-renew-ssl.log 2>&1
```

Бэкапы лежат в `/root/backups/`, хранятся 14 дней. Это локально на диске сервера —
не защищает от смерти самого диска. Если нужен настоящий офсайт-бэкап (S3 и
подобное) — дайте доступ к бакету, допишу выгрузку в `deploy/backup-db.sh`.

## 6. Перенос данных с тестового сервера (когда будете готовы)

Делается отдельно, по готовности — пишите, сделаю:
pg_dump с тестового → restore сюда, плюс копия папки `uploads`. Ссылки на фото
уже относительные, так что при переносе ничего не отвалится.

## Дальнейшие деплои

Обычный деплой после `git pull` — как на тестовом сервере, только с двумя
compose-файлами:

```bash
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml build backend admin frontend
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate backend admin frontend
```

nginx и certbot пересобирать не нужно — их трогаем только при смене домена/конфига.
