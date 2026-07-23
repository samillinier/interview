# Quick Update: Azure AD Client Secret

## 🎯 Easiest Way - Use the Script

Run this command in your terminal:

```bash
./update-secret.sh
```

Then paste the complete secret value when prompted.

## 📋 Manual Update

Or manually edit `.env.local`:

1. **Copy the complete secret value from Azure Portal:**
   - Go to: Azure Portal → Your App → Certificates & secrets
   - Find secret with Description "new"
   - Click the **copy icon** next to the Value (the long string starting with `rXh8Q~...`)
   - Copy the ENTIRE value (it's longer than what's shown)

2. **Open `.env.local`** and find this line:
   ```bash
   AZURE_AD_CLIENT_SECRET=PASTE_COMPLETE_SECRET_VALUE_HERE
   ```

3. **Replace `PASTE_COMPLETE_SECRET_VALUE_HERE`** with the complete value you copied

4. **Save the file**

5. **Restart your server:**
   ```bash
   npm run dev
   ```

## ✅ After Updating

1. Restart dev server
2. Clear browser cookies
3. Try signing in: http://localhost:3000/login

The callback error should be fixed! 🎉

