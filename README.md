# warehouse-api

B2B-сайт оптовой продажи сувениров: закрытый каталог с индивидуальными ценами клиентов + CRM.

## Структура

- [`backend/`](backend/) — FastAPI (auth, каталог, цены, заказы, admin/CRM API)
- [`bot/`](bot/) — Telegram-уведомления администратору о новых заказах, отдельный HTTP-сервис
- [`frontend/`](frontend/) — клиентский сайт (React), каталог/корзина/заказы/избранное
- [`admin/`](admin/) — CRM-панель администратора (React)

## Запуск всего стека (Docker)

```bash
cp backend/.env.example backend/.env
cp bot/.env.example bot/.env
# при желании — вписать в bot/.env TELEGRAM_BOT_TOKEN и TELEGRAM_ADMIN_CHAT_ID,
# INTERNAL_API_TOKEN в backend/.env и bot/.env должны совпадать

docker compose up -d
```

Одна команда поднимает всё: Postgres, Redis, backend, bot, клиентский сайт и CRM. Postgres-миграции и RS256-ключи для JWT создаются автоматически при первом запуске backend-контейнера.

- Клиентский сайт: http://localhost:3000
- CRM (админка): http://localhost:3001
- Backend API: http://localhost:8000/docs
- Bot: http://localhost:8100/health

Первый администратор создаётся напрямую в БД (самостоятельной регистрации в системе нет — см. ТЗ):

```sql
UPDATE "user" SET role = 'admin' WHERE email = '<ваш email>';
```
(пользователь должен быть предварительно создан через `POST /api/v1/admin/users` — курица и яйцо решается одной ручной SQL-командой один раз)

`frontend`/`admin` — статические сборки на nginx: адрес backend (`VITE_API_BASE_URL`) «запекается» в бандл на этапе `docker compose build`, а не читается в рантайме. Если меняете URL backend — пересоберите: `docker compose build frontend admin`.

## Локальная разработка backend (venv + hot reload)

```bash
docker compose up -d postgres redis
cd backend
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
python -m alembic upgrade head
python -m uvicorn main:app --reload
```

## Локальная разработка frontend/admin (Vite + hot reload)

```bash
docker compose up -d postgres redis bot
cd backend && python -m uvicorn main:app --reload &   # или через venv, см. выше

cd frontend && cp .env.example .env && npm install && npm run dev   # http://localhost:5173
cd admin && cp .env.example .env && npm install && npm run dev      # http://localhost:5174
```
