#!/bin/sh
set -e
if [ -z "${DATABASE_URL:-}" ]; then
  echo "error: DATABASE_URL is not set"
  exit 1
fi
echo "Running prisma migrate deploy..."
npx prisma migrate deploy
exec node dist/main.js
