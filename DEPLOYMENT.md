# Deployment Guide - Cloudflare Pages

## Cloudflare Pages Deployment (Recommended)

Cloudflare Pages offers:
- ✅ **Unlimited bandwidth** (no storage issues!)
- ✅ **Fast global CDN**
- ✅ **Free SSL/HTTPS**
- ✅ **Generous free tier**
- ✅ **Automatic deployments from GitHub**

### Deployment Steps:

#### Option A: Deploy via Cloudflare Dashboard (Easiest)

1. **Push your code to GitHub** (if not already)
   - Create a repository on GitHub
   - Push your code:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git remote add origin YOUR_GITHUB_REPO_URL
     git push -u origin main
     ```

2. **Connect to Cloudflare Pages**
   - Go to https://dash.cloudflare.com
   - Sign up/login (free account)
   - Click **"Workers & Pages"** in the sidebar
   - Click **"Create application"** → **"Pages"** → **"Connect to Git"**
   - Authorize Cloudflare to access your GitHub
   - Select your repository

3. **Configure Build Settings**
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (leave default)
   - **Node version:** Select "18.x" or "20.x" (recommended)

4. **Deploy!**
   - Click **"Save and Deploy"**
   - Your app will build and deploy automatically
   - You'll get a URL like: `https://your-app-name.pages.dev`

5. **Custom Domain (Optional)**
   - After deployment, go to your project settings
   - Click **"Custom domains"**
   - Add your domain (Cloudflare will handle DNS automatically)

#### Option B: Deploy via Cloudflare Wrangler CLI

1. **Install Wrangler CLI:**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

3. **Deploy:**
   ```bash
   npm run build
   wrangler pages deploy dist --project-name=your-app-name
   ```

## Environment Variables (Optional)

Your Supabase credentials are currently hardcoded in `src/lib/supabase.js`. 

**If you want to use environment variables instead** (recommended for security):

1. Create a `.env` file:
   ```
   VITE_SUPABASE_URL=https://bufnygjdkdemacqbxcrh.supabase.co
   VITE_SUPABASE_ANON_KEY=your_key_here
   ```

2. Update `src/lib/supabase.js` to use:
   ```javascript
   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
   ```

3. **In Cloudflare Pages:**
   - Go to your project → **Settings** → **Environment variables**
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Redeploy

## Build Settings Summary

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Node version:** 18.x or 20.x

## After Deployment

Your app will be accessible from anywhere at your Cloudflare Pages URL:
- Example: `https://surgical-techniques-app.pages.dev`
- You can add a custom domain anytime
- New commits to your main branch will automatically trigger deployments

## Other Hosting Options

### Vercel
- Fast and easy, but has bandwidth limits on free tier
- `npm i -g vercel && vercel`

### Railway
- Good for full-stack apps
- Auto-detects Vite builds
- Connect via GitHub
