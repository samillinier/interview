# ⚠️ Important: Add the SECRET VALUE to Vercel (Not the Secret ID)

## What Goes Where

### ❌ Secret ID (DO NOT USE THIS)
```
de667428-0ccd-4d46-a6e8-4d438bc5106e
```
- This is just an identifier
- **DO NOT** put this in Vercel
- This is only used to find the secret in Azure Portal

### ✅ Secret VALUE (USE THIS)
```
rXh8Q~...your-secret-value-here...
```
- This is the actual password/secret (40+ characters)
- **YES, this goes in Vercel!**
- This is what you put in `AZURE_AD_CLIENT_SECRET`

## Step-by-Step: Add Secret VALUE to Vercel

### Step 1: Get the Secret VALUE from Azure Portal

1. **Go to Azure Portal:**
   - Visit: https://portal.azure.com
   - Navigate to: Azure Active Directory → App registrations
   - Search for: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`

2. **Go to Certificates & Secrets:**
   - Click **Certificates & secrets** (left menu)
   - Find the row with Secret ID: `de667428-0ccd-4d46-a6e8-4d438bc5106e`
   - Look at the **"Value" column** (not the Secret ID column)
   - **Click the copy icon** next to the Value
   - This copies the full secret value (40+ characters long)

3. **If you can't see the value:**
   - The value is only shown once when created
   - If it shows "Hidden", you need to create a new secret
   - Click **New client secret**
   - Copy the value immediately (shown only once!)

### Step 2: Add to Vercel

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project: `floor-interior-service`

2. **Go to Environment Variables:**
   - Click: **Settings** → **Environment Variables**

3. **Find or Add `AZURE_AD_CLIENT_SECRET`:**
   - If it exists, click on it to edit
   - If it doesn't exist, click **Add New**

4. **Enter the Secret VALUE:**
   - **Name:** `AZURE_AD_CLIENT_SECRET`
   - **Value:** Paste the secret VALUE you copied from Azure Portal
   - **NOT** the Secret ID (`de667428-0ccd-4d46-a6e8-4d438bc5106e`)
   - **Environment:** Select **Production** (and Preview/Development if needed)
   - Click **Save**

### Step 3: Verify

After saving, verify:
- ✅ The value is the long string (40+ characters)
- ✅ It matches what's in your `.env.local` file
- ✅ It's set for Production environment

## Visual Guide

```
Azure Portal Table:
┌─────────────┬──────────────┬─────────────────────────────────────┬──────────────────────────────┐
│ Description │ Expires      │ Value                               │ Secret ID                    │
├─────────────┼──────────────┼─────────────────────────────────────┼──────────────────────────────┤
│ new         │ 12/20/2026   │ rXh8Q~...your-secret-value...     │ de667428-0ccd-4d46-a6e8-... │
└─────────────┴──────────────┴─────────────────────────────────────┴──────────────────────────────┘
              ↑                                                      ↑
              ✅ COPY THIS (Secret VALUE)                           ❌ DON'T COPY THIS (Secret ID)
```

## Summary

- ✅ **YES, add the Secret VALUE to Vercel**
- ❌ **NO, do NOT add the Secret ID to Vercel**
- The Secret VALUE is what goes in `AZURE_AD_CLIENT_SECRET`
- It should match what's in your `.env.local` file

## Current Configuration

**Local (.env.local):**
```
AZURE_AD_CLIENT_SECRET=your-secret-value-from-azure-portal
```

**Vercel (Production):**
```
AZURE_AD_CLIENT_SECRET=your-secret-value-from-azure-portal
```
(Same value - the Secret VALUE, not the Secret ID)

