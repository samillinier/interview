#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

function present(name) {
  return Boolean(String(process.env[name] || '').trim())
}

const databaseUrl =
  String(process.env.DATABASE_URL || '').trim() ||
  String(process.env.POSTGRES_PRISMA_URL || '').trim() ||
  String(process.env.POSTGRES_URL || '').trim()
const unpooledUrl =
  String(process.env.DATABASE_URL_UNPOOLED || '').trim() ||
  String(process.env.POSTGRES_URL_NON_POOLING || '').trim() ||
  databaseUrl

console.log(
  `[prisma] env present: DATABASE_URL=${present('DATABASE_URL')} DATABASE_URL_UNPOOLED=${present('DATABASE_URL_UNPOOLED')} POSTGRES_URL=${present('POSTGRES_URL')} POSTGRES_URL_NON_POOLING=${present('POSTGRES_URL_NON_POOLING')} POSTGRES_PRISMA_URL=${present('POSTGRES_PRISMA_URL')}`
)

if (!databaseUrl || !unpooledUrl) {
  console.error(
    '[prisma] No database URL in this Vercel build. Skipping migrate deploy so the app can still build.'
  )
  process.exit(0)
}

const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DATABASE_URL_UNPOOLED: unpooledUrl,
}

const attempts = 4
const delayMs = 4000
const skipBuildFailureRe =
  /P1001|P1012|P1017|Can't reach database|Couldn't connect to compute|server login has been failing|Environment variable not found/i

let lastSkippable = false

for (let i = 1; i <= attempts; i++) {
  const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    encoding: 'utf8',
    env,
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status === 0) process.exit(0)

  const output = `${result.stdout || ''}${result.stderr || ''}`
  lastSkippable = skipBuildFailureRe.test(output)
  if (!lastSkippable || i === attempts) break

  const wait = delayMs * i
  console.error(`prisma migrate deploy failed (attempt ${i}/${attempts}). Retrying in ${wait / 1000}s…`)
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, wait)
}

if (lastSkippable) {
  console.error(
    'prisma migrate deploy could not run in this build. Continuing the Vercel build; apply migrations later if needed.'
  )
  process.exit(0)
}

process.exit(1)
