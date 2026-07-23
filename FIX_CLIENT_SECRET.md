# 🔐 Fix Azure AD Client Secret - Step by Step

## ⚠️ The Problem

Your current `.env.local` has:
```
AZURE_AD_CLIENT_SECRET=51905564-c059-411b-bdc8-17a6f4668fb9
```

This looks like a **Secret ID** (UUID format), not the actual **Secret Value**.

Azure AD client secrets should be **long random strings** (40+ characters) like:
```
rXh8Q~MMTJMuyWsGuUEMeGxciDIjWs... (much longer)
```

## ✅ Solution: Get the Correct Secret Value

### Step 1: Go to Azure Portal
1. Visit: **https://portal.azure.com**
2. Sign in with your Microsoft account

### Step 2: Find Your App
1. Click **"Azure Active Directory"** (left sidebar)
2. Click **"App registrations"**
3. Search for: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
4. Click on your app

### Step 3: Go to Certificates & Secrets
1. Click **"Certificates & secrets"** (left menu)
2. You'll see a table with your secrets

### Step 4: Get the Secret VALUE (Not Secret ID)

**Option A: If you can see the Value column:**
1. Look at the **"Value"** column (NOT the "Secret ID" column)
2. You'll see something like: `rXh8Q~MMTJMuyWsGuUEMeGxciDIjWs...`
3. Click the **copy icon** (📋) next to the Value
4. This copies the COMPLETE secret value (40+ characters)

**Option B: If the Value shows "Hidden" or "***":**
1. The value is only shown **once** when created
2. You need to create a **new client secret**:
   - Click **"+ New client secret"**
   - Description: "Local Development" (or any name)
   - Expires: Choose expiration (24 months recommended)
   - Click **"Add"**
   - **⚠️ COPY THE VALUE IMMEDIATELY** (shown only once!)
   - It will look like: `rXh8Q~MMTJMuyWsGuUEMeGxciDIjWs...` (long string)

### Step 5: Update `.env.local`

1. **Open `.env.local` file**
2. **Find this line:**
   ```bash
   AZURE_AD_CLIENT_SECRET=51905564-c059-411b-bdc8-17a6f4668fb9
   ```
3. **Replace it with:**
   ```bash
   AZURE_AD_CLIENT_SECRET=rXh8Q~MMTJMuyWsGuUEMeGxciDIjWs... (paste your complete value)
   ```
   (Replace with the actual long secret value you copied)

4. **Save the file**

### Step 6: Restart Dev Server

```bash
# Stop the server (Ctrl+C if running)
npm run dev
```

### Step 7: Test Login

1. Go to: http://localhost:3000/login
2. Click "Continue with Microsoft"
3. Sign in with your allowed email
4. Should work now! ✅

## 🎯 What the Secret Value Looks Like

**✅ CORRECT (Secret Value):**
```
rXh8Q~MMTJMuyWsGuUEMeGxciDIjWs... (40+ characters, random mix of letters, numbers, symbols)
```

**❌ WRONG (Secret ID - what you currently have):**
```
51905564-c059-411b-bdc8-17a6f4668fb9 (UUID format, 36 characters with dashes)
```

## 📋 Quick Checklist

- [ ] Went to Azure Portal → Your App → Certificates & secrets
- [ ] Found the "Value" column (not Secret ID)
- [ ] Copied the complete secret value (40+ characters)
- [ ] Updated `AZURE_AD_CLIENT_SECRET` in `.env.local`
- [ ] Restarted dev server
- [ ] Tested login at http://localhost:3000/login

## ⚠️ Important Notes

1. **Secret Value is shown only once** when created
2. If you can't see it, create a new secret
3. The Value is **much longer** than the Secret ID
4. The Value contains random characters: letters, numbers, symbols like `~`, `-`, `_`
5. Make sure you copy the **complete value** (it may be truncated in the UI)
