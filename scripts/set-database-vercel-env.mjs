#!/usr/bin/env node
/**
 * Ensures DATABASE_URL and DATABASE_URL_UNPOOLED are set in the linked Vercel
 * project (Production + Preview + Development), sourced from local .env.local.
 * Requires a Vercel token at ~/Library/Application Support/com.vercel.cli/auth.json.
 */
import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const PROJECT_ID = 'prj_Pr3cCV8314El59yMLbCNJMYHMW2s'
const TEAM_ID = 'team_5Xj551jiMXYTBEURjN1GPFpf'

const auth = JSON.parse(
  readFileSync(join(homedir(), 'Library/Application Support/com.vercel.cli/auth.json'), 'utf8')
)
if (!auth.token) {
  console.error('No Vercel token. Run: vercel login')
  process.exit(1)
}

// Parse .env.local (only values we care about, no secrets printed).
const envRaw = readFileSync(join(homedir(), 'Documents/Recriuting Ai/.env.local'), 'utf8')
const env = {}
for (const line of envRaw.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=["']?(.*?)["']?\s*$/)
  if (m) env[m[1]] = m[2]
}

async function api(method, path, body) {
  const url = new URL(`https://api.vercel.com${path}`)
  url.searchParams.set('teamId', TEAM_ID)
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data?.error?.message || res.statusText)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

const targets = ['production', 'preview', 'development']
const vars = [
  { key: 'DATABASE_URL', value: env.DATABASE_URL },
  { key: 'DATABASE_URL_UNPOOLED', value: env.DATABASE_URL_UNPOOLED },
].filter((v) => v.value)

if (vars.length === 0) {
  console.error('No DATABASE_URL / DATABASE_URL_UNPOOLED found in .env.local')
  process.exit(1)
}

const existing = await api('GET', `/v9/projects/${PROJECT_ID}/env`)
const byKey = new Map((existing.envs || []).map((e) => [e.key, e]))

console.log('Existing env keys:', (existing.envs || []).map((e) => e.key).sort().join(', '))

for (const v of vars) {
  const current = byKey.get(v.key)
  if (current?.id) {
    await api('PATCH', `/v9/projects/${PROJECT_ID}/env/${current.id}`, {
      value: v.value,
      target: targets,
    })
    console.log('updated', v.key)
  } else {
    await api('POST', `/v10/projects/${PROJECT_ID}/env`, {
      key: v.key,
      value: v.value,
      type: 'encrypted',
      target: targets,
    })
    console.log('created', v.key)
  }
}

console.log('Done. Redeploy in Vercel to pick up the new variable.')
