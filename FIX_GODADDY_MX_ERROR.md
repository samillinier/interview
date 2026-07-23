# Fix "Record data is invalid" Error on GoDaddy

## The Problem

You're seeing **"Record data is invalid"** when trying to add the MX record because:

1. The **Value** field still has placeholder text: `[Full MX value from Resend]`
2. You need to replace it with the actual MX hostname from Resend

## The Solution

### Step 1: Get the Correct Value from Resend

1. Go back to **Resend Dashboard** → **Domains**
2. Find your domain → Click on it
3. Look at the **MX record** in the "Enable Sending" section
4. Copy the **Value** - it should look like:
   ```
   feedback-smtp.us-east-1.amazonses.com
   ```
   (The exact region may differ - could be `us-west-2`, `eu-west-1`, etc.)

### Step 2: Enter It Correctly in GoDaddy

In the GoDaddy form:

1. **Type:** `MX` ✅ (already correct)
2. **Name:** `send` ✅ (already correct)
3. **Value:** 
   - **Delete** the placeholder text: `[Full MX value from Resend]`
   - **Paste** the actual hostname from Resend
   - Should be just: `feedback-smtp.us-east-1.amazonses.com`
   - ⚠️ **Do NOT include** the priority number (10) in this field
   - ⚠️ **Do NOT include** any spaces or extra characters
4. **Priority:** `10` ✅ (already correct - this is a separate field)
5. **TTL:** `1/2 Hour` ✅ (already correct)

### Step 3: Save

Click **"Save"** - the error should disappear!

## MX Record Format Explained

MX records have two parts:
- **Priority** (entered in the Priority field): `10`
- **Hostname** (entered in the Value field): `feedback-smtp.us-east-1.amazonses.com`

GoDaddy separates these into two fields, which is why you enter them separately.

## Example of Correct Entry

**In GoDaddy:**
```
Type: MX
Name: send
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10
TTL: 1/2 Hour
```

**NOT:**
```
Value: 10 feedback-smtp.us-east-1.amazonses.com  ❌ (includes priority)
Value: [Full MX value from Resend]  ❌ (placeholder text)
```

## Still Getting Errors?

### Error: "Record data is invalid"

1. **Check the Value field:**
   - Make sure you removed ALL placeholder text
   - Should only contain the hostname (e.g., `feedback-smtp.us-east-1.amazonses.com`)
   - No spaces before or after
   - No quotes

2. **Check the Priority field:**
   - Should be just the number: `10`
   - No text, no spaces

3. **Verify the hostname:**
   - Go back to Resend and copy the exact value again
   - Make sure you copied the complete hostname

### Error: "Invalid domain name"

- Make sure **Name** field is just `send` (not `send.yourdomain.com`)
- The `@` symbol is NOT needed for subdomain records

### Still Not Working?

1. **Try refreshing the page** and adding the record again
2. **Copy the exact value from Resend** one more time
3. **Check for hidden characters** - try typing it manually instead of pasting
4. **Contact GoDaddy support** if the error persists

## Quick Fix Checklist

- [ ] Removed placeholder text `[Full MX value from Resend]`
- [ ] Pasted actual hostname from Resend (e.g., `feedback-smtp.us-east-1.amazonses.com`)
- [ ] Value field contains ONLY the hostname (no priority number)
- [ ] Priority field contains `10` (separate field)
- [ ] No extra spaces or characters
- [ ] Clicked "Save"
- [ ] Error message disappeared ✅

Once saved successfully, wait 15-30 minutes for DNS propagation, then verify in Resend!
