# Socialplace

Монорепозиторий: **NestJS** (API + Socket.IO) в `backend/`, **Next.js** — `frontend/`.

## Требования

- **Node.js** 20+ (рекомендуется LTS)
- **PostgreSQL** 14+ (локально, Docker или облако)
- npm (или совместимый менеджер пакетов)

## Переменные окружения

### Backend — файл `backend/.env`

Создайте файл `backend/.env` в папке бэкенда (рядом с `package.json`). Prisma и Nest подхватывают его при запуске из каталога `backend`.

| Переменная       | Обязательно | Описание |
|------------------|-------------|----------|
| `DATABASE_URL`   | **Да**      | Строка подключения PostgreSQL для Prisma. Пример ниже. |
| `JWT_SECRET`     | Для продакшена | Секрет подписи JWT. В разработке, если не задать, используется `dev_secret` (не используйте в проде). |
| `PORT`           | Нет         | Порт HTTP/WebSocket API. По умолчанию **4000**. |
| `HOST`           | Нет         | Адрес прослушивания. По умолчанию **0.0.0.0** (удобно для доступа по LAN). |

Пример `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/socialplace?schema=public"
JWT_SECRET="замените_на_длинную_случайную_строку"
PORT=4000
HOST=0.0.0.0
```

Подставьте своего пользователя, пароль, хост и имя базы в `DATABASE_URL`. Базу нужно создать заранее, например:

```sql
CREATE DATABASE socialplace;
```

### Frontend — файл `frontend/.env.local` (по желанию)

Next.js читает переменные с префиксом `NEXT_PUBLIC_` на этапе сборки и в браузере.

| Переменная                 | Обязательно | Описание |
|----------------------------|-------------|----------|
| `NEXT_PUBLIC_API_BASE`     | Нет         | Базовый URL API (REST и Socket.IO на том же порту). Пример: `http://127.0.0.1:4000`. Если **не** задавать: на `localhost` / `127.0.0.1` клиент ходит на `http://127.0.0.1:4000`; при открытии сайта по IP в сети (например `http://192.168.1.5:3000`) запросы пойдут на `http://192.168.1.5:4000`. Явно задайте переменную, если API на другом хосте или порту. |

Пример `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://127.0.0.1:4000
```

## Запуск в разработке

### 1. База данных

Убедитесь, что PostgreSQL запущен и база из `DATABASE_URL` существует.

### 2. Backend

```bash
cd backend
npm ci
npx prisma migrate deploy
npm run start:dev
```

API по умолчанию: **http://127.0.0.1:4000** (статика загрузок: `/uploads/...`).

### 3. Frontend

В новом терминале:

```bash
cd frontend
npm ci
npm run dev
```

Откройте в браузере адрес, который выведет Next.js (обычно **http://localhost:3000**).

## Сборка для продакшена (кратко)

**Backend:** задайте надёжный `JWT_SECRET`, при необходимости `PORT`/`HOST`, выполните `npm run build` и `npm run start:prod` (или запускайте `dist/main.js` через процесс-менеджер).

**Frontend:** при необходимости укажите `NEXT_PUBLIC_API_BASE` на публичный URL API, затем `npm run build` и `npm run start`.

## Деплой фронта на Vercel (монорепозиторий)

Репозиторий содержит и `backend/`, и `frontend/`. Если в Vercel **корень проекта** оставить как `.` (корень репозитория), Next.js не соберётся и на сайте будет **404 NOT_FOUND**.

Сделайте так:

1. Vercel → ваш проект → **Settings** → **General** → **Root Directory** → **Edit** → укажите **`frontend`** → Save.
2. В том же разделе **Framework Preset** выберите **Next.js** (не «Other» / пусто). Если там **нет фреймворка**, маршруты приложения после билда могут не подключиться и вы увидите **404**. В репозитории добавлен файл `frontend/vercel.json` с `"framework": "nextjs"` — после деплоя Vercel подхватит Next.
3. **Output directory** для Next.js оставьте **пустым** (по умолчанию), не задавайте `out` или `.next` вручную, если не делаете static export.
4. **Environment Variables** (Settings → Environment Variables): если API уже выложен отдельно, добавьте **`NEXT_PUBLIC_API_BASE`** = публичный URL бэкенда (например `https://api.ваш-домен.ru`), без слэша на конце. Иначе в проде запросы пойдут не туда.
5. **Deployments** → последний деплой → **⋯** → **Redeploy** (или новый push в репозиторий).

Если 404 остаётся, откройте вкладку деплоя → **Building** и проверьте, что билд **успешен** (не Failed).

## Частые проблемы

- **`DATABASE_URL is not set`** — создайте `backend/.env` и пропишите подключение к PostgreSQL.
- **Ошибки миграций** — проверьте, что БД доступна и строка в `DATABASE_URL` верная; при первом развёртывании используйте `npx prisma migrate deploy`.
- **`404` на Vercel** — в настройках проекта укажите **Root Directory: `frontend`** (см. раздел «Деплой фронта на Vercel»).
