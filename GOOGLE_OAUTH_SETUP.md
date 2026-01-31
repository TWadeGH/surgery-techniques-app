# Google OAuth Setup for Supabase

## Error Message
```
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}
```

This means Google OAuth is not enabled in your Supabase project.

## Step-by-Step Setup

### 1. Enable Google Provider in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `bufnygjdkdemacqbxcrh`
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the list
5. Toggle it **ON**

### 2. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure OAuth consent screen first:
   - User Type: External (unless you have Google Workspace)
   - App name: "Surgical Techniques App"
   - Support email: Your email
   - Developer contact: Your email
   - Save and continue through scopes and test users
6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: "Surgical Techniques App"
   - **Authorized JavaScript origins:**
     ```
     https://bufnygjdkdemacqbxcrh.supabase.co
     http://localhost:5176
     ```
   - **Authorized redirect URIs:**
     ```
     https://bufnygjdkdemacqbxcrh.supabase.co/auth/v1/callback
     http://localhost:5176/auth/v1/callback
     ```
7. Click **Create**
8. **Copy the Client ID and Client Secret** (you'll need these next)

### 3. Configure Google in Supabase

1. Back in Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Paste your **Client ID** (from Google Cloud Console)
3. Paste your **Client Secret** (from Google Cloud Console)
4. Click **Save**

### 4. Configure Redirect URLs (if needed)

1. In Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL:** `http://localhost:5176` (or your production URL)
3. **Redirect URLs:** Add:
   ```
   http://localhost:5176/**
   https://your-production-domain.com/**
   ```

### 5. Test

1. Try signing in with Google again
2. You should be redirected to Google's login page
3. After authentication, you'll be redirected back to your app

## Troubleshooting

### Still getting the error?
- Make sure Google provider is **toggled ON** (green) in Supabase
- Verify Client ID and Secret are correct (no extra spaces)
- Check that redirect URIs match exactly (including http vs https)

### Redirect URI mismatch?
- Make sure the redirect URI in Google Cloud Console matches: `https://bufnygjdkdemacqbxcrh.supabase.co/auth/v1/callback`
- For local development, also add: `http://localhost:5176/auth/v1/callback`

### OAuth consent screen issues?
- If you see "This app isn't verified", you can still test with your own Google account
- For production, you'll need to verify the app with Google

## Current Configuration

- **Supabase Project:** `bufnygjdkdemacqbxcrh`
- **Local Dev URL:** `http://localhost:5176`
- **Code Location:** `src/App.jsx` - `handleGoogleLogin()` function
