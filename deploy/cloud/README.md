# Деплой бэкенда в облако (Docker)

Образ собирается из каталога **`backend/`**: при старте выполняется **`prisma migrate deploy`**, затем **`node dist/main.js`**.

Подходит для **Railway**, **Render**, **Fly.io** и любого хостинга с Docker + внешней **PostgreSQL**.

## Переменные окружения

| Переменная       | Обязательно | Описание |
|------------------|-------------|----------|
| `DATABASE_URL`   | Да          | Строка PostgreSQL для Prisma. На Render обычно подходит **Internal Database URL**; при ошибках подключения добавьте в конец `?sslmode=require` или `&sslmode=require`. |
| `JWT_SECRET`     | Да (прод)   | Длинная случайная строка для подписи JWT. |
| `PORT`           | Нет         | Платформа часто задаёт сама (Railway/Render). Иначе **4000**. |
| `HOST`           | Нет         | В образе по умолчанию контейнер слушает **0.0.0.0**. |

Локальная проверка образа:

```bash
cd backend
docker build -t socialplace-api .
docker run --rm -p 4000:4000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  socialplace-api
```

Откройте `http://127.0.0.1:4000/` — должен вернуться текст из Nest (`Hello World!` или аналог).

## Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub** → выберите репозиторий.
2. Добавьте плагин **PostgreSQL** (New → Database → PostgreSQL).
3. Создайте сервис из того же репозитория (**Empty Service** → подключите GitHub → тот же repo) или первый деплой переведите на **Dockerfile**.
4. Откройте сервис с приложением → **Settings**:
   - **Root Directory** → **`backend`**
   - **Dockerfile Path** → оставьте `Dockerfile` (относительно `backend/`)
5. Вкладка **Variables**:
   - **`DATABASE_URL`** — возьмите из переменных сервиса Postgres (Railway подставляет ссылку **Reference** на `${{Postgres.DATABASE_URL}}` или скопируйте **Connection URL** из Postgres).
   - **`JWT_SECRET`** — сгенерируйте и сохраните.
6. **Settings → Networking → Generate Domain** — получите URL вида `https://….up.railway.app`.
7. На **Vercel** во фронте задайте **`NEXT_PUBLIC_API_BASE`** = этот HTTPS URL (без слэша в конце) и пересоберите деплой.

Файлы загрузок (**`/uploads`**) в контейнере по умолчанию **не сохраняются** между перезапусками. Для постоянных аватаров позже подключите Volume на Railway или внешнее хранилище (S3 и т.д.).

## Render

### Вариант A — Docker (рекомендуется)

1. [render.com](https://render.com) → **New** → **Web Service** → подключите репозиторий.
2. Укажите:
   - **Root Directory** → `backend`
   - **Environment** → **Docker**
   - **Dockerfile Path** → `Dockerfile`
3. **Build Command** / **Start Command** для Docker оставьте **пустыми** (если Render позволяет), если нет — см. подсказки в UI.
4. Создайте **PostgreSQL**, переменная **`DATABASE_URL`** у веб-сервиса + **`JWT_SECRET`**.
5. URL вида `https://….onrender.com` → **`NEXT_PUBLIC_API_BASE`** на Vercel.

### Вариант B — Native Node (без Docker)

Если сервис создан как **Node**, обязательно **полная сборка**, иначе не появится **`dist/`**, и `npm run start:prod` сразу завершится с кодом **1**.

| Поле | Значение |
|------|----------|
| **Root Directory** | `backend` |
| **Build Command** | `npm ci && npx prisma generate && npm run build` |
| **Start Command** | `npx prisma migrate deploy && npm run start:prod` |

Не используйте одну только **`yarn`** / **`npm install`** как build — этого недостаточно.

В репозитории есть **`package-lock.json`**, на Render лучше **`npm ci`**, а не Yarn (иначе «No lockfile found» и другие версии зависимостей).

Версия Node: в **`backend/package.json`** указано **`engines.node`**, в каталоге **`backend/.nvmrc`** — **20**. При необходимости в Render задайте переменную **`NODE_VERSION`** = `20` ([документация](https://render.com/docs/node-version)).

**PostgreSQL:** в **`DATABASE_URL`** для облака часто нужно **`?sslmode=require`** (в конец строки или через `&`, если `?` уже есть).

**Health check:** путь **`/`**.

### Сообщение «don't have access to your repo»

Клонирование всё равно может пройти; для автодеплоев лучше подключить GitHub к Render с доступом к репозиторию (**Settings** репозитория / приложения GitHub).

## Связка с Vercel

После того как API доступен по **HTTPS**, в проекте фронта на Vercel:

**`NEXT_PUBLIC_API_BASE`** = `https://ваш-бэкенд-домен` (без `/` в конце).

Подробности по фронту — в корневом **[README.md](../../README.md)** (раздел про Vercel).
