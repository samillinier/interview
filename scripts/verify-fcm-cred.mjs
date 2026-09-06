import { cert, getApps, initializeApp } from 'firebase-admin/app'

const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
let app
if (saJson) {
  app = initializeApp({ credential: cert(JSON.parse(saJson)) })
} else {
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  })
}
const credential = app.options.credential
try {
  const token = await credential.getAccessToken()
  console.log('ACCESS TOKEN OK — service account key is valid.')
  console.log('project:', app.options.projectId)
  console.log('token prefix:', token.access_token.slice(0, 12) + '...')
} catch (e) {
  console.error('CREDENTIAL FAILED:', e.message)
  process.exitCode = 1
}
