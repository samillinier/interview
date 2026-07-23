# Verify Azure AD Client Secret

## ⚠️ Important: Secret ID vs Secret Value

Azure AD shows **two different things** for client secrets:

### 1. Secret ID (UUID format)
- Format: `a775b2f4-a2f8-41c7-ab1c-3f19bf85bf1c`
- This is just an identifier
- ❌ **NOT the actual secret value**

### 2. Secret Value (Long random string)
- Format: `~8K~abc123xyz...` (much longer, random characters)
- This is the actual password
- ✅ **This is what you need**

## 🔍 How to Get the Correct Secret Value

### If the Secret is Still Active:

1. **Go to Azure Portal:**
   - https://portal.azure.com
   - Your App → **Certificates & secrets**

2. **Find your secret:**
   - Look for Secret ID: `a775b2f4-a2f8-41c7-ab1c-3f19bf85bf1c`
   - Check the **Value** column

3. **If Value shows "Hidden" or "***":**
   - The value is only shown **once** when created
   - You need to create a new secret

### Create a New Client Secret:

1. **In Azure Portal:**
   - Your App → **Certificates & secrets**
   - Click **"New client secret"**

2. **Fill in:**
   - Description: `NextAuth Login` (or any name)
   - Expires: Choose expiration (6 months, 12 months, etc.)
   - Click **"Add"**

3. **Copy the Value IMMEDIATELY:**
   - ⚠️ **This is shown only once!**
   - Copy the entire value (it's long, like: `~8K~abc123xyz...`)
   - This is what goes in `.env.local`

4. **Update `.env.local`:**
   ```bash
   AZURE_AD_CLIENT_SECRET=~8K~abc123xyz... (the long value you copied)
   ```

5. **Restart server:**
   ```bash
   npm run dev
   ```

## ✅ Verify It's Correct

The secret value should:
- Be **much longer** than a UUID (usually 40+ characters)
- Contain **random characters** (letters, numbers, symbols)
- Look like: `~8K~abc123xyz789...` or similar

## 🎯 Quick Check

Your current value: `a775b2f4-a2f8-41c7-ab1c-3f19bf85bf1c`

This looks like a **Secret ID** (UUID format), not the actual secret value.

**If this is actually working**, then it might be correct. But typically, Azure AD client secrets are much longer strings.

## 🔧 Test It

After updating the secret:

1. Restart server
2. Try signing in
3. Check server logs for errors
4. If you see "Invalid client secret" error, you need the actual secret value

