#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const attempts = 6
const delayMs = 5000

for (let i = 1; i <= attempts; i++) {
  const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: process.env,
  })
  if (result.status === 0) process.exit(0)
  if (i === attempts) {
    console.error(`prisma migrate deploy failed after ${attempts} attempts`)
    process.exit(result.status || 1)
  }
  const wait = delayMs * i
  console.error(`prisma migrate deploy failed (attempt ${i}/${attempts}). Retrying in ${wait / 1000}s…`)
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, wait)
}
