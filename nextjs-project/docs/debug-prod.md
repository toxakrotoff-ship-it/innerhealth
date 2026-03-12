# Команды для дебага на проде (82.202.159.85)

Подключение: `ssh user1@82.202.159.85` (или ваш пользователь). Перейти в каталог проекта: `cd /opt/innerhealth/nextjs-project` (или ваш путь).

---

## 1. Как запущено приложение

```bash
# Docker
docker compose ps

# Или процессы Node
ps aux | grep -E 'node|next'
```

---

## 2. Логи приложения (искать стек ошибки и Digest)

**Если Docker:**

```bash
# Последние 200 строк логов app
docker compose logs app --tail=200

# Следить в реальном времени, затем обновить страницу в браузере
docker compose logs app -f
```

**Если systemd (например innerhealth.service):**

```bash
journalctl -u innerhealth -n 200 --no-pager
journalctl -u innerhealth -f
```

**Если PM2:**

```bash
pm2 logs
pm2 logs --lines 200
```

В логах ищите: `DATABASE_URL`, `Error`, stack trace, Digest (например `2308415280`).

---

## 3. Проверка переменных окружения

**Docker:**

```bash
# Есть ли DATABASE_URL у контейнера app
docker compose exec app printenv DATABASE_URL

# Все env (без значений секретов — только имена)
docker compose exec app printenv | sort

# Проверка ключевых переменных
docker compose exec app printenv | grep -E 'DATABASE_URL|NEXTAUTH_URL|NODE_ENV'
```

**Без Docker (если приложение запущено из shell):**

```bash
# Из каталога nextjs-project, откуда запускается приложение
node -e "
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET (' + process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') + ')' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);
"
```

---

## 4. Доступность БД

**Docker (из контейнера app):**

```bash
# Проверка, что контейнер app видит db
docker compose exec app sh -c 'nc -zv db 5432 2>&1 || node -e "
const { Pool } = require(\"pg\");
const c = process.env.DATABASE_URL;
if (!c) { console.error(\"DATABASE_URL not set\"); process.exit(1); }
const p = new Pool({ connectionString: c });
p.query(\"SELECT 1\").then(() => { console.log(\"DB OK\"); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); });
"'
```

**Или проще — только тест подключения через Node в контейнере:**

```bash
docker compose exec app node -e "
const { Pool } = require('pg');
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set'); process.exit(1); }
const pool = new Pool({ connectionString: url });
pool.query('SELECT 1 as ok').then(r => { console.log('DB OK:', r.rows); process.exit(0); }).catch(e => { console.error('DB Error:', e.message); process.exit(1); });
"
```

**Если PostgreSQL на том же сервере (не в Docker):**

```bash
# Подставьте хост/порт из DATABASE_URL
psql "$DATABASE_URL" -c "SELECT 1"
# или
pg_isready -h localhost -p 5432 -U innerhealth
```

---

## 5. Файлы .env на сервере

```bash
# В каталоге проекта
ls -la .env .env.local 2>/dev/null
# Проверить, что DATABASE_URL задан (без вывода значения)
grep -q DATABASE_URL .env 2>/dev/null && echo "DATABASE_URL in .env" || echo "DATABASE_URL not in .env"
```

---

## 6. Быстрый чеклист (скопировать и выполнить по очереди)

```bash
cd /opt/innerhealth/nextjs-project   # или ваш путь

echo "=== 1. Containers ==="
docker compose ps

echo "=== 2. App env (DATABASE_URL set?) ==="
docker compose exec app printenv DATABASE_URL | head -c 80

echo "=== 3. Last app logs ==="
docker compose logs app --tail=80

echo "=== 4. DB connectivity from app ==="
docker compose exec app node -e "const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query('SELECT 1').then(()=>console.log('DB OK')).catch(e=>console.error('DB FAIL',e.message));"
```

После выполнения станет ясно: нет ли DATABASE_URL, падает ли подключение к БД, и по логам — точный стек ошибки.
