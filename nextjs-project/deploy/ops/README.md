## Ops scripts (VPS safety rails)

Эти скрипты живут на VPS и решают две задачи:

- защита от «убийства VPS» по диску/памяти + алерты в Telegram админам;
- фолбэк-синхронизация заказов ЮKassa, если webhook потерялся.

### Автоматический подъём из деплоя

`deploy/deploy.sh` и `deploy/deploy-quick.sh` сами поднимают всё что нужно:

1. вызывают `deploy/ops/setup-secrets.sh` — идемпотентно дописывают в `.env` отсутствующие
   секреты (`YOOKASSA_POLL_TOKEN`, `INFRA_ALERT_TOKEN`), генерируя их через `openssl rand`;
2. после деплоя вызывают `deploy/ops/install-vps-safeguards.sh --non-interactive` —
   копирует ops-скрипты в `/opt/innerhealth/ops` и переустанавливает три cron-строки.

Условия для шага 2 (best-effort):

- доступен `crontab`;
- скрипт запущен как root, либо `sudo -n` уже разрешён (без пароля).

Если что-то из этого не выполнено, деплой пишет WARN и идёт дальше — статусы заказов
и без cron'а будут переключаться по webhook'у. Проставить cron вручную:

```bash
sudo -E ./deploy/ops/install-vps-safeguards.sh --non-interactive
```

Чтобы полностью пропустить шаг VPS-safeguards в деплое:

```bash
SKIP_VPS_SAFEGUARDS=1 ./deploy/deploy-quick.sh
```

### Что ставится в crontab

Все три строки помечаются маркером `# innerhealth-ops` и при повторных запусках
переустанавливаются (старые удаляются, не дублируются).

```cron
# Inner Health VPS safeguards (managed by install-vps-safeguards.sh) # innerhealth-ops
30 3 * * * /opt/innerhealth/ops/docker-maintenance.sh # innerhealth-ops
*/5 * * * * SITE_URL="…" INFRA_ALERT_TOKEN="…" /opt/innerhealth/ops/vps-monitor.sh # innerhealth-ops
* * * * * SITE_URL="…" YOOKASSA_POLL_TOKEN="…" /opt/innerhealth/ops/yookassa-poll.sh # innerhealth-ops
```

Поллер ЮKassa дёргается каждую минуту, а throttle по возрасту заказа делается
в приложении (`src/lib/yookassa-sync-service.ts`):

| Возраст заказа | Минимальный интервал между опросами |
| -------------- | ----------------------------------- |
| 0 – 30 мин     | каждый прогон (≈ 1 мин)             |
| 30 мин – 6 ч   | 5 мин                               |
| 6 ч – 24 ч     | 15 мин                              |
| 24 ч – 7 дней  | 1 ч                                 |
| > 7 дней       | не опрашиваем                       |

### Откуда берутся параметры

`install-vps-safeguards.sh` ищет значения в таком порядке:

1. переменные окружения вызова (`SITE_URL`, `INFRA_ALERT_TOKEN`, `YOOKASSA_POLL_TOKEN`);
2. `<nextjs-project>/.env` (читается напрямую; `SITE_URL` подхватывается из `NEXTAUTH_URL`);
3. интерактивный `read` (только если есть TTY и нет `--non-interactive`).

`SKIP_VPS_SAFEGUARDS=1` в окружении деплоя полностью отключает шаг.

### Тонкая настройка

`vps-monitor.sh`:

- `DISK_WARN` (default 80) / `DISK_CRIT` (default 90)
- `MEM_WARN` (default 80) / `MEM_CRIT` (default 90)
- `DEDUPE_SECONDS` (default 1800 = 30 минут)

`yookassa-poll.sh`:

- `DAYS` (default 7) — глубина просмотра pending-заказов
- `TAKE` (default 100) — лимит на размер пачки за прогон

Опционально на стороне приложения:

- `YOOKASSA_IP_FILTER=off` — отключить IP-allowlist на webhook ЮKassa (по умолчанию включён,
  с актуальными CIDR-диапазонами включая IPv6 `2a02:5180::/32`). Полезно, если ЮKassa добавит
  новые IP, а нам нужно срочно принимать уведомления.

### Если запускаешь руками (без deploy.sh)

```bash
# Один раз сгенерировать секреты в .env (если ещё нет):
./deploy/ops/setup-secrets.sh

# Поставить cron (sudo обязателен — пишет в /opt и crontab root'а):
sudo -E ./deploy/ops/install-vps-safeguards.sh --non-interactive
```

В интерактивном режиме (без `--non-interactive`) скрипт спросит недостающие значения
через `read`, что удобно при первой настройке.
