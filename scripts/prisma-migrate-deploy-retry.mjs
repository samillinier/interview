#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

if (!process.env.DATABASE_URL && process.env.POSTGRES_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_URL
}
if (!process.env.DATABASE_URL_UNPOOLED) {
  const fallback = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL
  if (fallback) {
    process.env.DATABASE_URL_UNPOOLED = fallback
    console.log(
      '[prisma] DATABASE_URL_UNPOOLED was not set; using DATABASE_URL / POSTGRES_URL_NON_POOLING so migrate can run.'
    )
  }
}

const attempts = 4
const delayMs = 4000
const unreachableRe =
  /P1001|P1017|Can't reach database|Couldn't connect to compute|server login has been failing/i

let lastUnreachable = false

for (let i = 1; i <= attempts; i++) {
  const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    encoding: 'utf8',
    env: process.env,
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status === 0) process.exit(0)

  const output = `${result.stdout || ''}${result.stderr || ''}`
  lastUnreachable = unreachableRe.test(output)
  if (!lastUnreachable || i === attempts) break

  const wait = delayMs * i
  console.error(`prisma migrate deploy failed (attempt ${i}/${attempts}). Retrying in ${wait / 1000}s…`)
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, wait)
}

if (lastUnreachable) {
  console.error(
    'prisma migrate deploy could not reach the database. Continuing the Vercel build; apply migrations later if needed.'
  )
  process.exit(0)
}

process.exit(1)
