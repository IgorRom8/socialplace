# NestJS + Prisma (PostgreSQL). Сборка и прод-запуск в одном образе.
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci

COPY . .

# В образ не копируется .env; для prisma generate нужна строка подключения (к БД не ходим).
RUN chmod +x scripts/docker-entrypoint.sh \
  && DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public" npx prisma generate \
  && npm run build \
  && npm prune --omit=dev

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000

EXPOSE 4000

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
