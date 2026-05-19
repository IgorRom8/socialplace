#!/usr/bin/env bash
# Запускать на сервере Debian от root после того, как проект лежит в /opt/tent/app
set -euo pipefail

APP_ROOT=/opt/tent/app
test -d "$APP_ROOT" || { echo "Нет каталога $APP_ROOT — скопируйте репозиторий туда (git clone … .)"; exit 1; }

mkdir -p /opt/tent
if ! id tent &>/dev/null; then
  useradd --system --home /opt/tent --shell /usr/sbin/nologin tent
fi

chown -R tent:tent /opt/tent

apt-get update
apt-get install -y nginx postgresql postgresql-contrib curl ca-certificates git

if ! command -v node &>/dev/null || [[ $(node -v 2>/dev/null | tr -d 'v' | cut -d. -f1) -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "=== PostgreSQL: создайте БД и пользователя (пример) ==="
echo "sudo -u postgres psql -c \"CREATE USER tent WITH PASSWORD 'ваш_пароль';\""
echo "sudo -u postgres psql -c \"CREATE DATABASE tent OWNER tent;\""
echo "Затем положите backend/.env по образцу deploy/debian/backend.env.example"
read -r -p "Нажмите Enter, когда .env готов и база создана…"

sudo -u tent bash -c "
  set -e
  cd '$APP_ROOT/backend'
  npm ci
  npx prisma migrate deploy
  npm run build
  cd '$APP_ROOT/frontend'
  npm ci
  npm run build
"

cp "$APP_ROOT/deploy/debian/nginx-tent.conf" /etc/nginx/sites-available/tent
ln -sf /etc/nginx/sites-available/tent /etc/nginx/sites-enabled/tent
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

cp "$APP_ROOT/deploy/debian/tent-backend.service" /etc/systemd/system/
cp "$APP_ROOT/deploy/debian/tent-frontend.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable tent-backend tent-frontend
systemctl restart tent-backend tent-frontend

chown -R tent:tent /opt/tent

echo "Готово. Откройте: http://[ваш-IPv6]/"
systemctl status tent-backend tent-frontend --no-pager
