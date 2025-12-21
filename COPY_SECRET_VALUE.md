# ⚠️ Important: Copy the VALUE, Not the Secret ID

## What You Provided
`de667428-0ccd-4d46-a6e8-4d438bc5106e`

This is the **Secret ID** (UUID identifier) - ❌ **NOT what we need**

## What We Need
The **Value** column in Azure Portal - the long random string starting with `rXh8Q~...`

## 📸 From Your Screenshot

In the Azure Portal table, you see two columns:

1. **Value** column: `rXh8Q~MMTJMuyWsGuUEMeGxciDIjWs...` 
   - ✅ **THIS is what you need to copy**
   - It's a long string (40+ characters)
   - Has a **copy icon** next to it

2. **Secret ID** column: `de667428-0ccd-4d46-a6e8-4d438bc5106e`
   - ❌ This is just an identifier
   - NOT the actual secret

## 🎯 How to Copy the Correct Value

1. **In Azure Portal:**
   - Go to: Your App → Certificates & secrets
   - Find the row with Description "new"

2. **Look at the "Value" column:**
   - You'll see: `rXh8Q~MMTJMuyWsGuUEMeGxciDIjWs...`
   - Click the **copy icon** (📋) next to this value
   - This copies the COMPLETE secret value

3. **The value will be something like:**
   ```
   rXh8Q~MMTJMuyWsGuUEMeGxciDIjWs... (much longer, 40+ characters)
   ```

4. **Paste it here** or update `.env.local`:
   ```bash
   AZURE_AD_CLIENT_SECRET=rXh8Q~MMTJMuyWsGuUEMeGxciDIjWs... (paste complete value)
   ```

## ✅ Quick Update Command

Once you have the complete value, run:

```bash
./update-secret.sh
```

Then paste the complete value when prompted.

Or manually edit `.env.local` and replace:
```bash
AZURE_AD_CLIENT_SECRET=PASTE_COMPLETE_SECRET_VALUE_HERE
```

## 🔍 Visual Guide

In your Azure Portal screenshot:
- **Left column (Value)**: Long string with copy icon → ✅ Copy this
- **Right column (Secret ID)**: UUID like `de667428-...` → ❌ Don't copy this

