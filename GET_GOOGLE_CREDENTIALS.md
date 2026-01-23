# How to Get Google OAuth Credentials

## Step 1: Go to Google Cloud Console

1. Go to: https://console.cloud.google.com
2. Sign in with your Google account

## Step 2: Create or Select a Project

1. At the top, click the project dropdown (next to "Google Cloud")
2. Either:
   - **Select an existing project**, OR
   - **Click "New Project"** → Name it "Surgical Techniques App" → Click "Create"

## Step 3: Enable Google+ API (if needed)

1. Go to **APIs & Services** → **Library**
2. Search for "Google+ API" or "People API"
3. Click on it and click **Enable** (if not already enabled)

## Step 4: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you have Google Workspace)
3. Click **Create**
4. Fill in:
   - **App name:** Surgical Techniques App
   - **User support email:** Your email
   - **Developer contact information:** Your email
5. Click **Save and Continue**
6. On **Scopes** page, click **Save and Continue** (no need to add scopes)
7. On **Test users** page, click **Save and Continue** (you can add your email later if needed)
8. Click **Back to Dashboard**

## Step 5: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** at the top
3. Select **OAuth client ID**
4. If prompted about OAuth consent screen, click **Configure consent screen** and complete Step 4 above first

5. In the **Create OAuth client ID** dialog:
   - **Application type:** Select **Web application**
   - **Name:** Surgical Techniques App
   
   - **Authorized JavaScript origins:** Click **+ ADD URI** and add:
     ```
     https://bufnygjdkdemacqbxcrh.supabase.co
     ```
     Then click **+ ADD URI** again and add:
     ```
     http://localhost:5176
     ```
   
   - **Authorized redirect URIs:** Click **+ ADD URI** and add:
     ```
     https://bufnygjdkdemacqbxcrh.supabase.co/auth/v1/callback
     ```
     Then click **+ ADD URI** again and add:
     ```
     http://localhost:5176/auth/v1/callback
     ```

6. Click **CREATE**

## Step 6: Copy Your Credentials

After creating, a popup will show:
- **Your Client ID** (looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
- **Your Client Secret** (looks like: `GOCSPX-abcdefghijklmnopqrstuvwxyz`)

**IMPORTANT:** Copy both of these immediately - you won't be able to see the secret again!

## Step 7: Add to Supabase

1. Go back to Supabase → Authentication → Providers → Google
2. Paste the **Client ID** into the "Client IDs" field
3. Paste the **Client Secret** into the "Client Secret (for OAuth)" field
4. Click **Save**

The error should disappear and Google sign-in will be enabled!

## Quick Reference

**Callback URL to use in Google Cloud Console:**
```
https://bufnygjdkdemacqbxcrh.supabase.co/auth/v1/callback
```

**For local development, also add:**
```
http://localhost:5176/auth/v1/callback
```
