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

## Частые проблемы

- **`DATABASE_URL is not set`** — создайте `backend/.env` и пропишите подключение к PostgreSQL.
- **Ошибки миграций** — проверьте, что БД доступна и строка в `DATABASE_URL` верная; при первом развёртывании используйте `npx prisma migrate deploy`.
- **Сеть / телефон не видит API** — бэкенд слушает `0.0.0.0`, откройте порт в фаерволе; при необходимости задайте `NEXT_PUBLIC_API_BASE` на `http://<IP_вашего_ПК>:4000`.
