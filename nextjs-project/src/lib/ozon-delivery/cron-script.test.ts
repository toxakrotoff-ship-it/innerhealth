import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, chmodSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Ozon daily refresh operations', () => {
  it('generates the missing cron token once, preserves existing secrets and does not print values', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ozon-secrets-'))
    try {
      const file = join(dir, '.env')
      writeFileSync(file, 'YOOKASSA_POLL_TOKEN=existing-yoo\nINFRA_ALERT_TOKEN=existing-infra\nCHECKOUT_ABANDON_SCAN_TOKEN=existing-checkout\nCDEK_CACHE_SYNC_TOKEN=existing-cdek\n')
      const run = () => execFileSync('bash', [resolve('deploy/ops/setup-secrets.sh')], { env: { ...process.env, ENV_FILE: file }, encoding: 'utf8' })
      const output = run()
      const first = readFileSync(file, 'utf8')
      expect(first).toContain('YOOKASSA_POLL_TOKEN=existing-yoo')
      expect(first).toMatch(/OZON_POINTS_SYNC_TOKEN=[a-f0-9]{64}\n/)
      const token = first.match(/OZON_POINTS_SYNC_TOKEN=(.*)/)![1]
      expect(output).not.toContain(token)
      run()
      expect(readFileSync(file, 'utf8')).toBe(first)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it.each([0, 1, 2])('uses the container environment and propagates failure/overlap correctly (mode=%s)', mode => {
    const dir = mkdtempSync(join(tmpdir(), 'ozon-cron-'))
    try {
      const marker = join(dir, 'docker-called')
      for (const [name, source] of Object.entries({
        flock: `#!/bin/bash\nexit ${mode === 2 ? 1 : 0}\n`,
        logger: '#!/bin/bash\nexit 0\n',
        docker: `#!/bin/bash\nprintf '%s ' "$@" > '${marker}'\ncat > '${join(dir, 'stdin')}'\nexit ${mode === 1 ? 1 : 0}\n`,
      })) { writeFileSync(join(dir, name), source); chmodSync(join(dir, name), 0o755) }
      const result = spawnSync('bash', [resolve('deploy/ops/ozon-points-sync.sh')], {
        env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, PROJECT_DIR: dir, OZON_POINTS_SYNC_LOCK_FILE: join(dir, 'lock') }, encoding: 'utf8',
      })
      expect(result.status).toBe(mode === 1 ? 1 : 0)
      if (mode !== 2) {
        expect(readFileSync(marker, 'utf8')).toBe('compose exec -T app node ')
        expect(readFileSync(join(dir, 'stdin'), 'utf8')).toContain('process.env.OZON_POINTS_SYNC_TOKEN')
      } else expect(result.stdout).toContain('skipped')
      if (mode === 1) expect(result.stdout).toContain('refresh failed')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})
