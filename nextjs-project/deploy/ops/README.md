## Ops scripts (VPS safety rails)

This folder contains lightweight host scripts intended to be run on the VPS to prevent “killing the VPS” by disk/RAM pressure and to send infrastructure alerts to the site’s admin Telegram bot.

### 1) Configure infra alert ingestion in the app

Set the shared secret on the VPS (in the app environment):

- `INFRA_ALERT_TOKEN`: random secret string

The monitor script calls:
- `POST /api/admin/infra-alert` with header `x-infra-alert-token: $INFRA_ALERT_TOKEN`

### 2) Install scripts on VPS

Copy:
- `deploy/ops/docker-maintenance.sh`
- `deploy/ops/vps-monitor.sh`

Make them executable:

```bash
chmod +x /path/to/docker-maintenance.sh /path/to/vps-monitor.sh
```

### 3) Configure cron

Example crontab (`crontab -e`):

```cron
# Docker cleanup: daily at 03:30
30 3 * * * /path/to/docker-maintenance.sh

# Monitor: every 5 minutes
*/5 * * * * SITE_URL="https://your-domain.example" INFRA_ALERT_TOKEN="..." /path/to/vps-monitor.sh
```

### 4) Tuning thresholds

`vps-monitor.sh` supports:
- `DISK_WARN` (default 80)
- `DISK_CRIT` (default 90)
- `MEM_WARN` (default 80)
- `MEM_CRIT` (default 90)
- `DEDUPE_SECONDS` (default 1800 = 30 minutes)

Example:

```bash
SITE_URL="https://your-domain.example" \
INFRA_ALERT_TOKEN="..." \
DISK_WARN=75 DISK_CRIT=85 \
MEM_WARN=75 MEM_CRIT=85 \
/path/to/vps-monitor.sh
```

