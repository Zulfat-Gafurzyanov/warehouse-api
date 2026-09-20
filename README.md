# warehouse-api

B2B-сайт оптовой продажи сувениров: закрытый каталог с индивидуальными ценами клиентов + CRM.

## Структура

- [`backend/`](backend/) — FastAPI (auth, каталог, цены, заказы, admin/CRM API)
- [`bot/`](bot/) — Telegram-уведомления администратору о новых заказах, отдельный HTTP-сервис

## Запуск всего стека (Docker)

```bash
cp backend/.env.example backend/.env
cp bot/.env.example bot/.env
# при желании — вписать в bot/.env TELEGRAM_BOT_TOKEN и TELEGRAM_ADMIN_CHAT_ID,
# INTERNAL_API_TOKEN в backend/.env и bot/.env должны совпадать

docker compose up -d
```

Postgres-миграции и RS256-ключи для JWT создаются автоматически при первом запуске backend-контейнера.

- Backend: http://localhost:8000/docs
- Bot: http://localhost:8100/health

Первый администратор создаётся напрямую в БД (самостоятельной регистрации в системе нет — см. ТЗ):

```sql
UPDATE "user" SET role = 'admin' WHERE email = '<ваш email>';
```
(пользователь должен быть предварительно создан через `POST /api/v1/admin/users` — курица и яйцо решается одной ручной SQL-командой один раз)

## Локальная разработка backend (venv + hot reload)

```bash
docker compose up -d postgres redis
cd backend
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
python -m alembic upgrade head
python -m uvicorn main:app --reload
```
