# Update Client Secret

## Important: Secret ID vs Secret Value

The **Secret ID** (`460c55fe-7676-4e9a-871d-ae85fa417ba3`) is just an identifier.
You need the actual **Secret Value** (the masked string like "PIH******************").

## How to Get the Secret Value

1. **In Azure Portal:**
   - Go to your app "FIS" → **Certificates & secrets**
   - Find the secret with Secret ID: `460c55fe-7676-4e9a-871d-ae85fa417ba3`
   - **⚠️ Important:** You can only see the full secret value when you FIRST create it
   - If you can't see it, you'll need to create a NEW secret

2. **If you can't see the value:**
   - Click **"+ New client secret"**
   - Add description: "Vercel Production"
   - Choose expiration (6, 12, or 24 months)
   - Click **Add**
   - **Copy the VALUE immediately** (shown only once!)
   - This is what you need for `AZURE_AD_CLIENT_SECRET`

## Update Vercel Environment Variable

1. **Go to Vercel Dashboard:**
   - Settings → Environment Variables
   - Find `AZURE_AD_CLIENT_SECRET` (Production)
   - Click Edit
   - Paste the **actual secret value** (not the Secret ID)
   - Save

## Current Secret You're Using

- **Secret ID:** `a115ae4f-a109-4f29-9858-151650334f30`
- **Description:** "fis"
- **Status:** Valid until 6/4/2026

## New Secret to Try

- **Secret ID:** `460c55fe-7676-4e9a-871d-ae85fa417ba3`
- **Description:** "f"
- **Status:** Valid until 6/4/2026

**Note:** You need the actual secret VALUE, not the Secret ID. If you don't have it, create a new secret.

