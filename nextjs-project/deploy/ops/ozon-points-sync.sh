#!/usr/bin/env bash
set -euo pipefail

# Daily cache refresh. The token stays in the app environment; cron stores no secret.
PROJECT_DIR="${PROJECT_DIR:-/opt/innerhealth/nextjs-project}"
LOCK_FILE="${OZON_POINTS_SYNC_LOCK_FILE:-/run/lock/innerhealth-ozon-points-sync.lock}"

log() {
  if command -v logger >/dev/null 2>&1; then logger -t innerhealth-ops -- "ozon-points-sync: $*"; fi
  echo "[$(date -Is)] ozon-points-sync: $*"
}

trap 'log "refresh failed"' ERR

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  log "another scheduled synchronization is running, skipped"
  exit 0
fi

cd "${PROJECT_DIR}"
log "refresh started"
docker compose exec -T app node <<'JS'
(async () => {
  const token = process.env.OZON_POINTS_SYNC_TOKEN;
  if (!token) throw new Error('not-configured');
  const response = await fetch('http://127.0.0.1:3000/api/cron/ozon-points-sync', {
    method: 'POST', headers: { 'x-cron-token': token }, signal: AbortSignal.timeout(660_000),
  });
  if (!response.ok) {
    console.error(`ozon-points-sync: HTTP ${response.status}`);
    process.exitCode = 1;
    return;
  }
  const data = await response.json();
  if (data.ok !== true || !Array.isArray(data.results)) throw new Error('invalid-response');
  console.log(JSON.stringify({ ok: true, results: data.results.map(result => ({
    brand: ['inner', 'sprint-power'].includes(result.brand) ? result.brand : 'unknown',
    points: Number.isSafeInteger(result.points) ? result.points : 0, skipped: result.skipped === true,
  })) }));
})().catch(() => { console.error('ozon-points-sync: refresh failed (configuration, network or response)'); process.exitCode = 1; });
JS
log "refresh completed"
