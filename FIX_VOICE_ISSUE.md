# Fix AI Voice Not Working

## 🔴 The Problem
AI voice is not working in the interview.

## ✅ Most Common Cause: Missing OpenAI API Key

The voice feature uses OpenAI's Text-to-Speech (TTS) API. If the API key is missing or invalid, voice won't work.

## 🔧 How to Fix

### Step 1: Get Your OpenAI API Key

1. **Go to OpenAI Platform:**
   - Visit: https://platform.openai.com/api-keys
   - Sign in or create an account

2. **Create a new API key:**
   - Click "Create new secret key"
   - Give it a name (e.g., "Interview Voice")
   - Copy the key (it starts with `sk-`)

### Step 2: Update `.env.local`

1. **Open `.env.local`** in your project root

2. **Find this line:**
   ```bash
   OPENAI_API_KEY=sk-your-openai-api-key-here
   ```

3. **Replace it with your actual API key:**
   ```bash
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

4. **Save the file**

### Step 3: Restart Your Server

```bash
# Stop server (Ctrl+C)
npm run dev
```

### Step 4: Test Voice

1. **Visit:** http://localhost:3000/api/test-voice
   - Should return JSON with `audioBase64` if working
   - If error, check server logs

2. **Start an interview:**
   - Go to: http://localhost:3000/interview
   - Start an interview
   - The AI should speak the questions

## 🔍 Other Possible Issues

### Issue: API Key Invalid
- **Check:** Make sure the key starts with `sk-`
- **Check:** Key hasn't expired or been revoked
- **Check:** You have credits in your OpenAI account

### Issue: Rate Limit
- **Check:** OpenAI API usage limits
- **Fix:** Wait a few minutes and try again

### Issue: Browser Audio
- **Check:** Browser allows audio playback
- **Check:** Volume is not muted
- **Check:** Try a different browser

### Issue: Network Error
- **Check:** Internet connection
- **Check:** OpenAI API is accessible
- **Check:** No firewall blocking requests

## 🐛 Debug Steps

1. **Check server logs:**
   - Look for `🔊 ===== GENERATING SPEECH =====`
   - Look for error messages

2. **Test the API endpoint:**
   ```bash
   curl http://localhost:3000/api/test-voice
   ```

3. **Check browser console:**
   - Open DevTools (F12)
   - Look for audio playback errors

4. **Verify API key:**
   ```bash
   cat .env.local | grep OPENAI_API_KEY
   ```
   Should show your actual key (not placeholder)

## ✅ Success Indicators

When voice is working:
- ✅ Server logs show: `🔊 Speech generated successfully`
- ✅ Interview questions are spoken aloud
- ✅ AI responses are spoken after you answer
- ✅ No errors in browser console

## 💰 OpenAI Pricing

OpenAI TTS pricing:
- **tts-1 model:** $15.00 per 1M characters
- Very affordable for interviews (each question is ~100-200 characters)

## 🚀 Still Not Working?

If it still doesn't work after setting the API key:

1. **Check server logs** for specific error messages
2. **Test the API key** directly:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```
3. **Share the error message** from server logs

