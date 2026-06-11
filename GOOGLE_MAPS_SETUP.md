# Google Maps API Setup Guide

## Overview
The application uses Google Maps to display installer addresses. While basic embedding works without an API key, using an official API key is **recommended for production** as it provides:
- Better performance
- Higher usage limits
- More reliable service
- Better analytics

## Step 1: Get a Google Cloud Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Create a new project (or select an existing one)
   - Click the project dropdown at the top
   - Click "New Project"
   - Enter a project name (e.g., "Floor Interior Service")
   - Click "Create"

## Step 2: Enable Maps Embed API

1. In your Google Cloud project, go to **APIs & Services** → **Library**
2. Search for "Maps Embed API"
3. Click on "Maps Embed API"
4. Click **Enable**

## Step 3: Create an API Key

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Your API key will be generated
4. **Important**: Click **Restrict Key** to secure it:
   - Under **Application restrictions**, select **HTTP referrers (web sites)**
   - Add your domains:
     - `http://localhost:3000/*` (for development)
     - `https://your-domain.com/*` (for production)
   - Under **API restrictions**, select **Restrict key**
   - Choose **Maps Embed API** only
   - Click **Save**

## Step 4: Add API Key to Your Project

### For Local Development:

1. Open or create `.env.local` in your project root
2. Add the following line:
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-actual-api-key-here
   ```
3. Replace `your-actual-api-key-here` with your actual API key
4. Restart your development server:
   ```bash
   npm run dev
   ```

### For Production (Vercel):

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - **Value**: Your Google Maps API key
   - **Environment**: Select Production, Preview, and Development
4. Click **Save**
5. Redeploy your application

## Step 5: Verify It's Working

1. Go to your installer profile page
2. Add an address (County, Full Address, or Street/City/State/Zip)
3. The map should display below the address fields
4. If you see a map, it's working! ✅

## Troubleshooting

### Map Not Showing?
- Check browser console for errors
- Verify the API key is correct in `.env.local`
- Make sure you've restarted the server after adding the key
- Verify the Maps Embed API is enabled in Google Cloud Console

### "This page can't load Google Maps correctly" Error?
- Check that your API key restrictions allow your domain
- Verify the API key is not expired or revoked
- Make sure Maps Embed API is enabled

### Rate Limiting Issues?
- Google Maps Embed API has generous free tier limits
- If you exceed limits, consider upgrading your Google Cloud plan
- Check usage in Google Cloud Console → APIs & Services → Dashboard

## Cost Information

- **Maps Embed API**: Free for most use cases
- Google provides $200/month free credit for Maps APIs
- Embed API requests are typically free or very low cost
- Check [Google Maps Platform Pricing](https://mapsplatform.google.com/pricing/) for details

## Security Best Practices

1. **Always restrict your API key** to specific domains
2. **Never commit your API key** to version control
3. **Use different keys** for development and production
4. **Monitor usage** in Google Cloud Console
5. **Rotate keys** if they're accidentally exposed

## Alternative: Using Without API Key

The application will work without an API key using basic Google Maps embedding. However, this is less reliable and may have usage limitations. For production use, we strongly recommend setting up an API key.
