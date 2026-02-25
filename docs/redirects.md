# Настройка редиректов на innerhealth.ru

Редиректы настраиваются в **админке** (рекомендуется), в **next.config.ts** (статические) и в **Nginx** (HTTP→HTTPS, www↔домен).

---

## 1. Редиректы из админки (рекомендуется, с кодом 301)

В админ-панели: **Редиректы** (`/admin/redirects`).

- Добавление правил: старый путь (например с Тильды) → новый путь на сайте.
- **Код ответа настраивается:** по умолчанию **301 Moved Permanently** — подходит для рекламных кампаний и SEO (поисковики и ссылки считают переход постоянным). Доступны также 302, 307, 308.
- Правила хранятся в БД, применяются middleware при каждом запросе (кэш карты редиректов 60 с).
- Не требуется пересборка: добавили правило — редирект сразу работает.

После добавления/изменения/удаления редиректа кэш сбрасывается автоматически.

---

## 2. Статические редиректы (next.config.ts)

Файл: **nextjs-project/next.config.ts**, секция `redirects()`.

Используйте для фиксированного набора правил на этапе сборки. В Next.js при `permanent: true` возвращается **308**, а не 301; явно задать 301 в конфиге нельзя. Для настраиваемого **301** используйте админку (раздел выше).

**Примеры:**

```ts
async redirects() {
  return [
    { source: '/page12345678', destination: '/', permanent: true },  // → 308
    { source: '/magazin', destination: '/catalog', permanent: true },
  ]
}
```

После изменений: пересборка и перезапуск приложения (`npm run build`, перезапуск контейнера `app` при деплое).

---

## 3. Редиректы на уровне Nginx

Файл: **nextjs-project/deploy/nginx/conf.d/default.conf**.

### HTTP → HTTPS

После настройки SSL (Let's Encrypt и т.п.) в блоке `server { listen 80; ... }` раскомментируйте:

```nginx
return 301 https://$host$request_uri;
```

Тогда все запросы по HTTP будут перенаправляться на HTTPS с тем же хостом и путём.

### www → основной домен (или наоборот)

Если нужен один канонический домен (например только **innerhealth.ru** без www):

1. В HTTPS-блоке укажите основной домен в `server_name`, например:
   `server_name innerhealth.ru;`
2. Добавьте отдельный блок для www с редиректом:

```nginx
# Редирект www.innerhealth.ru → innerhealth.ru
server {
  listen 443 ssl http2;
  server_name www.innerhealth.ru;
  ssl_certificate     /etc/nginx/ssl/fullchain.pem;
  ssl_certificate_key /etc/nginx/ssl/privkey.pem;
  return 301 https://innerhealth.ru$request_uri;
}
```

Если, наоборот, канонический домен — **www.innerhealth.ru**, поменяйте местами и редиректьте `innerhealth.ru` на `https://www.innerhealth.ru$request_uri`.

После правок: `docker compose up -d --force-recreate nginx` (из каталога nextjs-project).

---

## Кратко

| Задача | Где настраивать |
|--------|------------------|
| Старые пути (Tilda, смена URL), **в т.ч. код 301** | Админка → Редиректы (`/admin/redirects`) |
| Статические редиректы (308 в Next.js) | next.config.ts → `redirects()` |
| HTTP → HTTPS | Nginx: `return 301 https://$host$request_uri;` в server listen 80 |
| www ↔ без www | Nginx: отдельный server с `return 301 https://...$request_uri;` |
