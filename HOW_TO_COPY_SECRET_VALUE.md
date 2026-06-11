# Step-by-Step: Copy the Secret VALUE (Not Secret ID)

## ✅ You Have: Secret ID
`de667428-0ccd-4d46-a6e8-4d438bc5106e` - This is correct, but it's the **identifier**, not the **value**.

## 🎯 What You Need: Secret VALUE

The **Value** is a long random string (40+ characters) that looks like:
```
rXh8Q~MMTJMuyWsGuUEMeGxciDIjWs... (much longer)
```

## 📋 Exact Steps to Copy the Value

### Step 1: In Azure Portal
1. You're already at: **Certificates & secrets** page ✅
2. You can see the table with your secret ✅

### Step 2: Find the "Value" Column
In the table, look for the column header **"Value"** (not "Secret ID")

You should see:
- **Description**: "new"
- **Expires**: "12/20/2026"
- **Value**: `rXh8Q~MMTJMuyWsGuUEMeGxciDIjWs...` ← **THIS ONE!**
- **Secret ID**: `de667428-0ccd-4d46-a6e8-4d438bc5106e` ← Not this

### Step 3: Copy the Value
1. Look at the **"Value"** column (the one with the long string)
2. You'll see a **copy icon** (📋) next to the value
3. **Click the copy icon** - this copies the COMPLETE value
4. The value is longer than what's shown (it's truncated with `...`)

### Step 4: Paste It Here
Once you've copied it, you can:
- Run: `./update-secret.sh` and paste when prompted
- Or share it here and I'll update it for you

## 🔍 What the Value Looks Like

The Value will be something like:
```
rXh8Q~MMTJMuyWsGuUEMeGxciDIjWs... (continues for 40+ characters)
```

It's a mix of:
- Letters (upper and lowercase)
- Numbers
- Special characters like `~`, `-`, `_`, etc.

## ⚠️ Important Notes

- The Value is **only shown once** when created
- If you can't see it (shows "Hidden"), you need to create a new secret
- The Value is **much longer** than the Secret ID
- The Value is what goes in `AZURE_AD_CLIENT_SECRET` in `.env.local`

## 🎯 Quick Visual Guide

```
┌─────────────────────────────────────────────────────────┐
│ Description │ Expires │ Value                    │ Secret ID│
├─────────────────────────────────────────────────────────┤
│ new         │ 12/20/26│ rXh8Q~MMTJMuyWs... [📋] │ de6674... │
│             │         │ ↑ CLICK COPY ICON HERE  │           │
└─────────────────────────────────────────────────────────┘
```

Click the copy icon (📋) next to the **Value** column!

