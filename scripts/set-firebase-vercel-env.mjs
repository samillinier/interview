#!/usr/bin/env node
/**
 * Adds Firebase Admin env vars to the linked Vercel project (Production + Preview + Development).
 * Requires: `vercel login` first, then: node scripts/set-firebase-vercel-env.mjs
 */
import { readFileSync } from 'fs'
import { execFileSync } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'

const SA_PATH = join(homedir(), 'Downloads/fis-fastrack-firebase-adminsdk-fbsvc-61508df147.json')
const PROJECT_ID = 'prj_Pr3cCV8314El59yMLbCNJMYHMW2s'
const TEAM_ID = 'team_5Xj551jiMXYTBEURjN1GPFpf'

const auth = JSON.parse(
  readFileSync(join(homedir(), 'Library/Application Support/com.vercel.cli/auth.json'), 'utf8')
)
if (!auth.token) {
  console.error('No Vercel token. Run: vercel login')
  process.exit(1)
}

const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'))
const saJson = JSON.stringify(sa)

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
  { key: 'FIREBASE_PROJECT_ID', value: sa.project_id },
  { key: 'FIREBASE_CLIENT_EMAIL', value: sa.client_email },
  { key: 'FIREBASE_PRIVATE_KEY', value: sa.private_key },
  { key: 'FIREBASE_SERVICE_ACCOUNT_JSON', value: saJson },
]

const existing = await api('GET', `/v9/projects/${PROJECT_ID}/env`)
const byKey = new Map((existing.envs || []).map((e) => [e.key, e]))

for (const v of vars) {
  const current = byKey.get(v.key)
  if (current?.id) {
    await api('DELETE', `/v9/projects/${PROJECT_ID}/env/${current.id}`)
    console.log('removed old', v.key)
  }
  await api('POST', `/v10/projects/${PROJECT_ID}/env`, {
    key: v.key,
    value: v.value,
    type: 'encrypted',
    target: targets,
  })
  console.log('set', v.key)
}

console.log('Done. Triggering production redeploy...')
try {
  execFileSync('npx', ['vercel', 'redeploy', '--yes', '--target=production'], {
    stdio: 'inherit',
    cwd: join(homedir(), 'Documents/Recriuting Ai'),
  })
} catch {
  console.log('Could not auto-redeploy. In Vercel: Deployments → … → Redeploy')
}
