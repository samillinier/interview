#!/usr/bin/env node
/**
 * Vercel build entry: Prisma schema requires DATABASE_URL_UNPOOLED.
 * Vercel often has DATABASE_URL but not the unpooled name, and Prisma's
 * wasm config reads a .env file — process.env alone is not enough.
 */
import { writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

function firstUrl(...keys) {
  for (const key of keys) {
    const value = String(process.env[key] || '').trim()
    if (value) return value
  }
  return ''
}

function present(name) {
  return Boolean(String(process.env[name] || '').trim())
}

const databaseUrl = firstUrl('DATABASE_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL')
const unpooledUrl = firstUrl('DATABASE_URL_UNPOOLED', 'POSTGRES_URL_NON_POOLING') || databaseUrl
const placeholder = 'postgresql://127.0.0.1:5432/neondb'

console.log(
  `[vercel-build] env present: DATABASE_URL=${present('DATABASE_URL')} DATABASE_URL_UNPOOLED=${present('DATABASE_URL_UNPOOLED')} POSTGRES_URL=${present('POSTGRES_URL')} POSTGRES_URL_NON_POOLING=${present('POSTGRES_URL_NON_POOLING')} POSTGRES_PRISMA_URL=${present('POSTGRES_PRISMA_URL')}`
)

const envFile = [
  `DATABASE_URL="${(databaseUrl || placeholder).replace(/"/g, '\\"')}"`,
  `DATABASE_URL_UNPOOLED="${(unpooledUrl || placeholder).replace(/"/g, '\\"')}"`,
  '',
].join('\n')

writeFileSync(join(process.cwd(), '.env'), envFile)
writeFileSync(join(process.cwd(), 'prisma', '.env'), envFile)
console.log('[vercel-build] wrote .env and prisma/.env for Prisma get-config')

const env = {
  ...process.env,
  DATABASE_URL: databaseUrl || placeholder,
  DATABASE_URL_UNPOOLED: unpooledUrl || placeholder,
}

function run(command, args, { optional = false } = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', env })
  if (result.status === 0) return true
  if (optional) {
    console.error(`[vercel-build] ${command} ${args.join(' ')} failed; continuing`)
    return false
  }
  process.exit(result.status ?? 1)
}

if (databaseUrl) {
  run('node', ['scripts/prisma-migrate-deploy-retry.mjs'], { optional: true })
} else {
  console.error('[vercel-build] No database URL in build env; skipping migrate deploy')
}

run('npx', ['prisma', 'generate'])
run('npx', ['next', 'build'])
