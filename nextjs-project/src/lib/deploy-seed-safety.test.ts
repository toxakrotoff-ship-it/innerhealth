import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const deployEntrypoints = [
  'deploy/deploy.sh',
  'deploy/deploy-quick.sh',
  'docker-entrypoint.sh',
  'Dockerfile',
  'docker-compose.yml',
]

describe('deploy seed safety', () => {
  it.each(deployEntrypoints)('%s does not invoke a seed command', (relativePath) => {
    const content = readFileSync(resolve(process.cwd(), relativePath), 'utf8')

    expect(content).not.toMatch(/(?:npm|pnpm|yarn)\s+(?:run\s+)?seed(?::|\b)/i)
    expect(content).not.toMatch(/prisma\s+db\s+seed/i)
  })
})
