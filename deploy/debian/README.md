# Деплой на Debian (VPS, без домена, IPv6)

Пароль root и любые секреты **нельзя** хранить в репозитории и отправлять в чат. Если пароль уже светился — **смените его** в панели хостинга.

## Что будет

- **Nginx** на порту **80** (`http://[ваш-IPv6]/`) отдаёт фронт и проксирует `/auth`, `/social`, `/uploads`, `/socket.io/` на Nest (**127.0.0.1:4000**).
- **Next** слушает только **127.0.0.1:3000**.
- **PostgreSQL** — локально, строка в `backend/.env`.

Клиент сам подставит базу API с того же origin на порту 80 (см. `getApiBase` во фронте).

## 1. Подключение через Remote SSH (Cursor / VS Code)

1. Расширение **Remote - SSH**.
2. `F1` → **Remote-SSH: Connect to Host…** → **Add New SSH Host**:
   ```text
   ssh root@2a03:6f00:a::2:ad4
   ```
3. Выберите конфиг (`~/.ssh/config`), снова **Connect to Host** → этот хост.
4. Откройте папку на сервере (например `/opt/tent/app` после клонирования).

Локально IPv6 может не работать — тогда используйте IPv4 из панели или тот же SSH через **Bastion**/VPN, если хостер даёт.

## 2. Каталог и код

На сервере:

```bash
mkdir -p /opt/tent
cd /opt/tent
git clone <url-вашего-репо> app
cd app
```

Если репозитория нет — скопируйте проект с ПК (`scp -r` или архив).

## 3. PostgreSQL

```bash
sudo -u postgres psql -c "CREATE USER tent WITH PASSWORD 'сгенерируйте_сильный';"
sudo -u postgres psql -c "CREATE DATABASE tent OWNER tent;"
```

## 4. Переменные бэкенда

```bash
cp deploy/debian/backend.env.example backend/.env
nano backend/.env   # DATABASE_URL, JWT_SECRET
chmod 600 backend/.env
chown tent:tent backend/.env  # после создания пользователя tent см. скрипт
```

`DATABASE_URL` вида:

`postgresql://tent:ПАРОЛЬ@127.0.0.1:5432/tent?schema=public`

## 5. Автоустановка (Node, nginx, сервисы, сборка)

```bash
chmod +x deploy/debian/setup.sh
sudo ./deploy/debian/setup.sh
```

Скрипт создаёт пользователя `tent`, ставит **Node 20**, **nginx**, правила прокси, **systemd**-юниты `tent-backend` и `tent-frontend`, собирает backend и frontend.

Если скрипт споткнётся о права — после первого запуска:

```bash
sudo chown -R tent:tent /opt/tent
```

Повторите нужные шаги из скрипта вручную или перезапустите его.

## 6. Проверка

```bash
sudo systemctl status tent-backend tent-frontend nginx
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1/
```

С другой машины в браузере (IPv6 в **квадратных скобках**):

`http://[2a03:6f00:a::2:ad4]/`

## 7. Логи и перезапуск

```bash
sudo journalctl -u tent-backend -f
sudo journalctl -u tent-frontend -f
sudo systemctl restart tent-backend tent-frontend
```

## HTTPS и домен

Без домена **Let's Encrypt не выдать**. Позже: домен → DNS A/AAAA на этот IP → `certbot --nginx`. Пока только **HTTP**.

## Фаервол

Если включён `ufw`:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw enable
```
