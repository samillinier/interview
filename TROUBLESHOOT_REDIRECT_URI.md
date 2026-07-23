# 🔴 Troubleshooting: Redirect URI Still Not Working

## The Error (Still Happening)

```
AADSTS50011: The redirect URI 'https://floor-interior-service-ntrl6mdel.vercel.app/api/auth/callback/azure-ad' 
does not match the redirect URIs configured for the application 'dd3245ef-30b6-4929-8373-dc5bbcd06268'
```

This means Azure AD **cannot find** this redirect URI in your app registration.

## ✅ Step-by-Step: Add Redirect URI (With Screenshots Guide)

### Step 1: Go to Azure Portal
1. Visit: **https://portal.azure.com**
2. Sign in with your **admin account** (must have permissions to edit app registrations)

### Step 2: Find the EXACT App
1. Click **Azure Active Directory** (left sidebar - blue icon)
2. Click **App registrations** (under "Manage" section)
3. In the search box at the top, type: **`dd3245ef-30b6-4929-8373-dc5bbcd06268`**
4. Click on the app that appears (should show this exact Application ID)

### Step 3: Go to Authentication
1. In the left menu of your app, click **"Authentication"** (under "Manage" section)
2. You should see a page with "Redirect URIs" section

### Step 4: Check What's Currently There
Look at the **Redirect URIs** section. You should see a list of URLs.

**Common issues:**
- ❌ The URL is NOT in the list → You need to add it
- ❌ The URL is there but has a typo → Delete it and add the correct one
- ❌ The URL has a trailing slash → Remove the slash
- ❌ The URL uses `http://` instead of `https://` → Change to `https://`

### Step 5: Add the Redirect URI
1. Click **"Add URI"** button (or **"Add a platform"** → **"Web"**)
2. A text field will appear
3. **Type or paste EXACTLY this:**
   ```
   https://floor-interior-service-ntrl6mdel.vercel.app/api/auth/callback/azure-ad
   ```
4. **Double-check:**
   - ✅ Starts with `https://` (NOT `http://`)
   - ✅ No trailing slash at the end
   - ✅ Exact spelling: `floor-interior-service-ntrl6mdel.vercel.app`
   - ✅ Exact path: `/api/auth/callback/azure-ad`
   - ✅ All lowercase

### Step 6: Save (CRITICAL!)
1. Click **"Save"** button at the **TOP** of the page (blue button)
2. Wait for the green success message: "Successfully updated"
3. **DO NOT** close the page until you see the success message

### Step 7: Verify It's Added
1. Scroll down to **Redirect URIs** section again
2. You should now see:
   ```
   https://floor-interior-service-ntrl6mdel.vercel.app/api/auth/callback/azure-ad
   ```
3. Make sure it matches **EXACTLY** (no extra spaces, no trailing slash)

### Step 8: Wait for Propagation
1. **Wait 2-3 minutes** for Azure AD to propagate the changes
2. This is important - changes don't take effect immediately

### Step 9: Test Again
1. Go back to your production app
2. Try signing in again
3. Should work now! ✅

## 🔍 Common Mistakes to Avoid

### ❌ WRONG (Don't do this):
```
http://floor-interior-service-ntrl6mdel.vercel.app/api/auth/callback/azure-ad
```
- Using `http://` instead of `https://`

### ❌ WRONG:
```
https://floor-interior-service-ntrl6mdel.vercel.app/api/auth/callback/azure-ad/
```
- Has trailing slash at the end

### ❌ WRONG:
```
https://floor-interior-service-ntrl6mdel.vercel.app/api/auth/callback/azure-ad 
```
- Has a space at the end

### ❌ WRONG:
```
https://Floor-Interior-Service-ntrl6mdel.vercel.app/api/auth/callback/azure-ad
```
- Wrong capitalization

### ✅ CORRECT:
```
https://floor-interior-service-ntrl6mdel.vercel.app/api/auth/callback/azure-ad
```
- Exact match, no trailing slash, `https://`, all lowercase

## 🎯 Quick Checklist

Before testing again, verify:
- [ ] Found app with ID: `dd3245ef-30b6-4929-8373-dc5bbcd06268`
- [ ] Went to **Authentication** page (not Overview, not Certificates)
- [ ] Added redirect URI: `https://floor-interior-service-ntrl6mdel.vercel.app/api/auth/callback/azure-ad`
- [ ] Checked for typos (no trailing slash, `https://`, exact spelling)
- [ ] Clicked **Save** button at the top
- [ ] Saw success message: "Successfully updated"
- [ ] Verified the URI appears in the list
- [ ] Waited 2-3 minutes for propagation
- [ ] Tried signing in again

## 🚨 If Still Not Working

### Check 1: Are you editing the RIGHT app?
- Make sure the Application ID is: `dd3245ef-30b6-4929-8373-dc5bbcd06268`
- If you see a different ID, you're in the wrong app!

### Check 2: Did you click Save?
- The Save button is at the TOP of the page
- You must see a success message
- If you didn't save, the changes weren't applied

### Check 3: Check for Typos
- Copy the exact URL from the error message
- Paste it exactly as shown
- No extra spaces, no trailing slash

### Check 4: Wait Longer
- Sometimes Azure AD takes 5-10 minutes to propagate
- Try again after waiting longer

### Check 5: Clear Browser Cache
- Clear your browser cache and cookies
- Try signing in in an incognito/private window

## 📞 Still Having Issues?

If you've followed all steps and it's still not working:
1. Take a screenshot of the Redirect URIs section in Azure AD
2. Verify you're in the correct app (Application ID: `dd3245ef-30b6-4929-8373-dc5bbcd06268`)
3. Check that the URL matches exactly (character by character)

