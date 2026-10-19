#!/usr/bin/env node
/**
 * Vercel build entry. Prisma migrate needs DATABASE_URL_UNPOOLED; this build
 * environment often has none of the database URLs, so skip migrate and still
 * compile the app. Runtime uses Vercel env vars.
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

console.log(
  `[vercel-build] env present: DATABASE_URL=${present('DATABASE_URL')} DATABASE_URL_UNPOOLED=${present('DATABASE_URL_UNPOOLED')} POSTGRES_URL=${present('POSTGRES_URL')} POSTGRES_URL_NON_POOLING=${present('POSTGRES_URL_NON_POOLING')} POSTGRES_PRISMA_URL=${present('POSTGRES_PRISMA_URL')}`
)

const env = { ...process.env }

if (databaseUrl) {
  env.DATABASE_URL = databaseUrl
  env.DATABASE_URL_UNPOOLED = unpooledUrl
  writeFileSync(
    join(process.cwd(), '.env'),
    `DATABASE_URL="${databaseUrl.replace(/"/g, '\\"')}"\nDATABASE_URL_UNPOOLED="${unpooledUrl.replace(/"/g, '\\"')}"\n`
  )
  console.log('[vercel-build] wrote .env for Prisma migrate')
} else {
  console.error('[vercel-build] No database URL in build env; skipping migrate deploy')
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
}

run('npx', ['prisma', 'generate'])
run('npx', ['next', 'build'])
