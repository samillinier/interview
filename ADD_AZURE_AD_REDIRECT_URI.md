# Add Azure AD Redirect URI for job.floorinteriorservices.com

You're getting an error because the redirect URI `https://job.floorinteriorservices.com/api/auth/callback/azure-ad` is not configured in your Azure AD app registration.

## 🔍 The Error

```
AADSTS50011: The redirect URI 'https://job.floorinteriorservices.com/api/auth/callback/azure-ad' 
specified in the request does not match the redirect URIs configured for the application.
```

**What this means:**
- Your app is trying to redirect to: `https://job.floorinteriorservices.com/api/auth/callback/azure-ad`
- But Azure AD doesn't have this URI in the allowed list
- You need to add it to your Azure AD app registration

---

## ✅ Step-by-Step: Add Redirect URI to Azure AD

### Step 1: Go to Azure Portal

1. **Visit:** https://portal.azure.com
2. **Sign in** with your Azure account

### Step 2: Find Your App Registration

1. **Search for "App registrations":**
   - Click the search bar at the top
   - Type: `App registrations`
   - Click on **"App registrations"** from the results

2. **Find your application:**
   - Look for your app (might be named "FIS" or similar)
   - **OR** search for the Application ID: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
   - Click on the app name to open it

### Step 3: Navigate to Authentication Settings

1. **In the left sidebar**, click **"Authentication"**
   - It's under the "Manage" section

### Step 4: Add the Redirect URI

1. **Scroll down** to the **"Redirect URIs"** section

2. **Click "Add URI"** or **"Add a platform"** → **"Web"**

3. **Enter the redirect URI:**
   ```
   https://job.floorinteriorservices.com/api/auth/callback/azure-ad
   ```
   
   ⚠️ **Important:**
   - Must be **exact match** (case-sensitive)
   - Must start with `https://` (not `http://`)
   - Must **NOT** have a trailing slash `/`
   - Copy and paste exactly as shown above

4. **Click "Save"** at the top of the page

### Step 5: Verify the Redirect URI Was Added

1. **Check the Redirect URIs list:**
   - You should now see: `https://job.floorinteriorservices.com/api/auth/callback/azure-ad`
   - It should be in the list with a checkmark

2. **Keep other redirect URIs:**
   - Keep: `http://localhost:3000/api/auth/callback/azure-ad` (for local development)
   - Keep any other production URIs you might have

---

## 📋 Complete Redirect URI List

After adding, your redirect URIs should include:

✅ **Production:**
- `https://job.floorinteriorservices.com/api/auth/callback/azure-ad` (new - your custom domain)

✅ **Local Development:**
- `http://localhost:3000/api/auth/callback/azure-ad`

✅ **Old Vercel Domain (Optional - can keep or remove):**
- `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad` (if you want to keep it as backup)

---

## ⏳ Step 6: Wait for Changes to Propagate

1. **Wait 2-3 minutes** for Azure AD changes to propagate
2. **Try signing in again** to your application
3. **The error should be gone!**

---

## 🐛 Troubleshooting

### Still Getting the Error After Adding URI

1. **Double-check the URI:**
   - Must be **exact match**: `https://job.floorinteriorservices.com/api/auth/callback/azure-ad`
   - No trailing slash
   - Case-sensitive
   - Must start with `https://`

2. **Verify it's saved:**
   - Go back to Authentication → Redirect URIs
   - Make sure it's in the list
   - Check for typos

3. **Wait longer:**
   - Azure AD changes can take 5-10 minutes to propagate
   - Try again after waiting

4. **Clear browser cache:**
   - Clear cookies and cache
   - Try in incognito/private window

### Can't Find the App Registration

1. **Search by Application ID:**
   - Use: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
   - Paste it in the search bar
   - Should find your app

2. **Check different Azure AD tenant:**
   - Make sure you're in the correct Azure AD tenant
   - Check the directory/tenant dropdown at the top

3. **Check permissions:**
   - Make sure you have permissions to edit app registrations
   - Contact your Azure AD admin if needed

### Multiple Apps with Similar Names

1. **Use the Application ID:**
   - Application ID: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
   - This is unique and will help you find the right app

2. **Check the redirect URIs:**
   - Look at existing redirect URIs
   - If you see `floor-interior-service.vercel.app`, that's likely the right app

---

## ✅ Quick Checklist

- [ ] Logged into Azure Portal (https://portal.azure.com)
- [ ] Found App registrations
- [ ] Found your app (Application ID: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`)
- [ ] Clicked "Authentication" in left sidebar
- [ ] Added redirect URI: `https://job.floorinteriorservices.com/api/auth/callback/azure-ad`
- [ ] Verified exact match (no trailing slash, case-sensitive)
- [ ] Clicked "Save"
- [ ] Verified URI appears in the list
- [ ] Waited 2-3 minutes for propagation
- [ ] Tested signing in again

---

## 🎯 After Adding the Redirect URI

Once you've added the redirect URI and waited 2-3 minutes:

1. **Try signing in again** to your application
2. **The error should be resolved**
3. **Authentication should work** with your custom domain

---

## 📝 Important Notes

### Redirect URI Format Rules:

✅ **Correct:**
- `https://job.floorinteriorservices.com/api/auth/callback/azure-ad`
- `http://localhost:3000/api/auth/callback/azure-ad`

❌ **Wrong:**
- `https://job.floorinteriorservices.com/api/auth/callback/azure-ad/` (trailing slash)
- `http://job.floorinteriorservices.com/api/auth/callback/azure-ad` (http instead of https)
- `job.floorinteriorservices.com/api/auth/callback/azure-ad` (missing protocol)

### Multiple Environments:

You can have multiple redirect URIs:
- Production: `https://job.floorinteriorservices.com/api/auth/callback/azure-ad`
- Local: `http://localhost:3000/api/auth/callback/azure-ad`
- Old domain: `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad` (optional)

All of these can coexist in the same app registration.

---

## 🚀 Summary

**The fix is simple:**
1. Go to Azure Portal → App registrations
2. Find your app (ID: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`)
3. Go to Authentication → Redirect URIs
4. Add: `https://job.floorinteriorservices.com/api/auth/callback/azure-ad`
5. Save and wait 2-3 minutes
6. Try signing in again

The error will be resolved once the redirect URI is added! 🎉
