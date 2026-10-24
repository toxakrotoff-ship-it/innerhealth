import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, readdir, readFile, rm, symlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = fileURLToPath(new URL('../../nextjs-project/', import.meta.url))
const require = createRequire(path.join(appDir, 'package.json'))
const { Client } = require('pg')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const bcrypt = require('bcrypt')
const workDir = await mkdtemp(path.join(tmpdir(), 'innerhealth-smoke-'))
const dataDir = path.join(workDir, 'postgres')
const origin = 'http://127.0.0.1:3317'
const pgCommand = (name) => process.env.PG_BIN ? path.join(process.env.PG_BIN, name) : name

// Do not inherit integration credentials or let Next/dotenv load them from local files.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  /^(PATH|HOME|TMPDIR|SystemRoot|LANG|LC_.*|USER|LOGNAME|SHELL|CI)$/.test(key)))
for (const file of await readdir(appDir, { withFileTypes: true })) {
  if (!file.isFile() || !file.name.startsWith('.env')) continue
  const content = await readFile(path.join(appDir, file.name), 'utf8')
  for (const match of content.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) {
    env[match[1]] = ''
  }
}
Object.assign(env, {
  NODE_ENV: 'production',
  NEXT_TELEMETRY_DISABLED: '1',
  NEXTAUTH_URL: origin,
  NEXTAUTH_SECRET: 'local-smoke-only-secret-at-least-32-characters',
  SETTINGS_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
  NEXT_PUBLIC_SITE_URL: origin,
  NEXT_PUBLIC_INNER_SITE_URL: origin,
  NEXT_PUBLIC_SPRINT_POWER_SITE_URL: origin,
  NEXT_PUBLIC_CDN_URL: '',
  ADMIN_SECRET_PATH: 'admin',
  PORT: '3317',
  HOSTNAME: '127.0.0.1',
})

let child
let postgresStarted = false
let closing = false

async function run(command, args, options = {}) {
  const running = spawn(command, args, { cwd: appDir, env, stdio: 'inherit', ...options })
  child = running
  try {
    const [code, signal] = await once(running, 'exit')
    if (code !== 0) throw new Error(`${command} failed (${signal ?? code})`)
  } finally {
    if (child === running) child = undefined
  }
}

async function cleanup(code) {
  if (closing) return
  closing = true
  if (child) {
    const running = child
    const exited = once(running, 'exit')
    const timer = setTimeout(() => running.kill('SIGKILL'), 5000)
    running.kill('SIGTERM')
    await exited.finally(() => clearTimeout(timer))
  }
  if (postgresStarted) {
    await run(pgCommand('pg_ctl'), ['-D', dataDir, '-m', 'immediate', '-w', 'stop']).catch(console.error)
  }
  await rm(workDir, { recursive: true, force: true })
  process.exit(code)
}

process.on('SIGTERM', () => void cleanup(0))
process.on('SIGINT', () => void cleanup(0))

try {
  const portProbe = createServer()
  portProbe.listen(0, '127.0.0.1')
  await once(portProbe, 'listening')
  const port = portProbe.address().port
  await new Promise((resolve) => portProbe.close(resolve))
  env.DATABASE_URL = `postgresql://smoke@127.0.0.1:${port}/innerhealth_smoke`

  await run(pgCommand('initdb'), ['-D', dataDir, '-U', 'smoke', '--auth=trust', '--encoding=UTF8', '--no-locale'])
  await run(pgCommand('pg_ctl'), ['-D', dataDir, '-l', path.join(workDir, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port} -k ${workDir}`, '-w', 'start'])
  postgresStarted = true
  const client = new Client({ connectionString: `postgresql://smoke@127.0.0.1:${port}/postgres` })
  await client.connect()
  await client.query('CREATE DATABASE innerhealth_smoke')
  await client.end()
  await run(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'])

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) })
  try {
    for (const [brand, title, slug] of [
      ['inner', 'Smoke Inner Product', 'smoke-inner-product'],
      ['sprint-power', 'Smoke Sprint Product', 'smoke-sprint-product'],
    ]) {
      await prisma.product.create({ data: {
        id: slug, tildaUid: slug, title, slug, brand,
        price: 1290, quantity: 10, isFeaturedInNewArrivals: true,
        categories: { create: { category: { create: {
          title: `Smoke ${brand}`, slug: `smoke-${brand}`, brand,
        } } } },
      } })
    }
    await prisma.user.create({ data: {
      email: 'customer@example.test', password: await bcrypt.hash('SmokePassword123!', 10),
      emailVerifiedAt: new Date(), role: 'USER',
    } })
  } finally {
    await prisma.$disconnect()
  }
  await run(process.execPath, ['node_modules/next/dist/bin/next', 'build'])
  const standaloneDir = path.join(appDir, '.next/standalone')
  await mkdir(path.join(standaloneDir, '.next'), { recursive: true })
  for (const [target, link] of [
    ['../../public', path.join(standaloneDir, 'public')],
    ['../../static', path.join(standaloneDir, '.next/static')],
  ]) {
    await symlink(target, link, 'dir').catch((error) => {
      if (error.code !== 'EEXIST') throw error
    })
  }
  await run(process.execPath, ['.next/standalone/server.js'])
  await cleanup(0)
} catch (error) {
  if (!closing) {
    console.error(error)
    await cleanup(1)
  }
}
