# Сброс пароля и добавление пользователей

## Добавление пользователя (интерактивно)

Из корня `nextjs-project`:

```bash
npm run add-admin
```

Скрипт запросит: email, пароль (минимум 6 символов, ввод скрыт), имя (необязательно), роль (USER / WRITER / ADMIN). Пароль сохраняется в БД в виде bcrypt-хеша.

## Сброс пароля по email

1. На странице входа `/login` — ссылка «Забыли пароль?» ведёт на `/login/forgot-password`.
2. Пользователь вводит email → запрос к `POST /api/auth/forgot-password`.
3. На почту отправляется ссылка вида `/login/reset-password?token=...` (действует 60 минут).
4. По ссылке пользователь вводит новый пароль → `POST /api/auth/reset-password` → пароль обновляется, вход по новому паролю.

### Переменные окружения для писем

Добавьте в `.env.local` (или в прод):

```env
# Базовый URL сайта (для ссылки в письме)
NEXTAUTH_URL=https://your-domain.com
# или APP_URL=https://your-domain.com

# SMTP для отправки писем
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-user
SMTP_PASS=your-password
# От кого письмо (по умолчанию берётся SMTP_USER)
SMTP_FROM=noreply@your-domain.com
```

Без настроенного SMTP запрос «Забыли пароль» вернёт ошибку «Не удалось отправить письмо».

### Примеры для популярных почтовиков

**Gmail** (нужен «пароль приложения», не обычный пароль: Google Account → Безопасность → Двухэтапная аутентификация → Пароли приложений):

```env
NEXTAUTH_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ваш@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx
SMTP_FROM=ваш@gmail.com
```

**Яндекс** (пароль приложения: ID → Безопасность → Пароли приложений):

```env
NEXTAUTH_URL=http://localhost:3000
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=ваш@yandex.ru
SMTP_PASS=пароль-приложения
SMTP_FROM=ваш@yandex.ru
```

**Mail.ru**:

```env
NEXTAUTH_URL=http://localhost:3000
SMTP_HOST=smtp.mail.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=ваш@mail.ru
SMTP_PASS=пароль
SMTP_FROM=ваш@mail.ru
```

После изменения `.env.local` перезапустите `npm run dev`. В консоли при отправке «Забыли пароль» появится строка `[forgot-password] Reset email sent to …` или ошибка SMTP.

---

## VK WorkSpace: support@innerhealth.ru

Почта VK WorkSpace использует серверы Mail.ru. Исходящая почта: **smtp.mail.ru**, порт **465** (SSL).

### Шаблон для .env.local

Скопируйте в `.env.local` и подставьте реальные значения (см. вопросы ниже):

```env
# URL сайта (для ссылки «Сбросить пароль» в письме)
# Локально: http://localhost:3000
# Прод: https://ваш-домен.ru
NEXTAUTH_URL=https://innerhealth.ru

# SMTP VK WorkSpace (Mail.ru)
SMTP_HOST=smtp.mail.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=support@innerhealth.ru
SMTP_PASS=ЗДЕСЬ_ПАРОЛЬ_ПРИЛОЖЕНИЯ
SMTP_FROM=support@innerhealth.ru
```

**Важно:** для SMTP в VK WorkSpace нужен **пароль приложения** (для почтовых клиентов), а не основной пароль от ящика. Его создают в веб-почте: **Аккаунт → Безопасность → Пароли для внешних приложений** (или администратор настраивает в панели пользователей).

---

### Вопросы, чтобы собрать все переменные

Ответьте на них (или найдите ответ в панели VK WorkSpace / в настройках почты), затем подставьте значения в шаблон выше.

| Переменная      | Вопрос / где взять |
|-----------------|--------------------|
| **NEXTAUTH_URL** | Какой адрес у сайта, где крутится приложение? Локально — `http://localhost:3000`, в проде — `https://innerhealth.ru` (или другой домен). Ссылка из письма будет вести сюда. |
| **SMTP_USER**   | Обычно это полный email ящика. Подтвердите: используем **support@innerhealth.ru**? |
| **SMTP_PASS**   | Пароль приложения для этого ящика. Создан ли уже «Пароль для внешних приложений» в настройках почты (Аккаунт → Безопасность)? Если нет — создайте и вставьте сюда этот пароль (не основной пароль входа). |
| **SMTP_FROM**   | С какого адреса должны уходить письма? Обычно тот же **support@innerhealth.ru**. Если нужен другой «от кого» — напишите какой. |

Дополнительно (уже подставлено в шаблоне, менять не обязательно, если почта стандартная VK WorkSpace):

- **SMTP_HOST** — для VK WorkSpace это **smtp.mail.ru** (если в документации вашего тарифа не указан другой сервер).
- **SMTP_PORT** — **465** для SSL.
- **SMTP_SECURE** — **true** для порта 465.

Если после подстановки значений письма не уходят — пришлите текст ошибки из консоли сервера (строки с `[email]` или `[forgot-password]`) и, по возможности, скрин или описание настроек SMTP из панели VK WorkSpace (без самого пароля).

### Если ошибки подключения (Connection timeout, Greeting never received, 0x800CCC)

По [официальной документации VK WorkSpace — Ошибки при отправке писем](https://workspace.vk.ru/docs/saas/mail/errors/index.html):

1. **Попробуйте порт 2525 или 587** вместо 465:
   ```env
   SMTP_PORT=2525
   SMTP_SECURE=false
   ```
2. **Либо укажите IP вместо имени** (94.100.177.1 — вместо smtp.mail.ru), при этом для TLS обязательно задайте имя сервера:
   ```env
   SMTP_HOST=94.100.177.1
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_SERVERNAME=smtp.mail.ru
   ```
   Переменная `SMTP_SERVERNAME` используется для проверки сертификата при подключении по IP.
