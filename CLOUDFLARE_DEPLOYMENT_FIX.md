# Cloudflare Pages Deployment Troubleshooting

## Common Cloudflare Deployment Errors & Fixes

### 1. Build Command Errors

**Error:** "Build failed" or "Command not found"

**Fix:** Verify your Cloudflare Pages build settings:
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/` (or leave empty)
- **Node version:** `20.x` (recommended) or `18.x`

### 2. CSP (Content Security Policy) Errors in Production

**Error:** "Content Security Policy blocks eval()" or CSP violations

**Fix:** The permissive CSP in `index.html` is for development only. For production on Cloudflare Pages:

1. **Remove or modify the CSP meta tag for production:**
   - Option A: Remove the CSP meta tag entirely (let Cloudflare handle it)
   - Option B: Use Cloudflare's Transform Rules to set CSP headers

2. **Or create a production-specific index.html:**
   - Use a build script to replace the CSP meta tag for production builds

### 3. Environment Variables Missing

**Error:** "Supabase connection failed" or API errors

**Fix:** Add environment variables in Cloudflare Pages:
1. Go to your Cloudflare Pages project
2. Settings → Environment variables
3. Add:
   - `VITE_SUPABASE_URL` = `https://bufnygjdkdemacqbxcrh.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (your anon key from Supabase)

**Note:** Update `src/lib/supabase.js` to use environment variables:
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bufnygjdkdemacqbxcrh.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your_fallback_key'
```

### 4. File Size Limits

**Error:** "File too large" or "Asset size exceeded"

**Fix:** 
- The build output shows `dist/assets/index-DG1Z4ak5.js` is 498KB (133KB gzipped) - this is fine
- If you get size errors, check for:
  - Large images in `public/` folder
  - Unused dependencies
  - Consider code splitting

### 5. Node Version Mismatch

**Error:** "Module not found" or version conflicts

**Fix:**
- Set Node version in Cloudflare Pages to `20.x` or `18.x`
- Ensure `package.json` doesn't have conflicting engine requirements

### 6. Missing Dependencies

**Error:** "Cannot find module" or dependency errors

**Fix:**
- Ensure `package-lock.json` is committed to Git
- Cloudflare will run `npm ci` (clean install) automatically
- If issues persist, check that all dependencies are in `package.json` (not just devDependencies)

### 7. Build Timeout

**Error:** "Build timeout" or "Build exceeded time limit"

**Fix:**
- Cloudflare Pages free tier has a 15-minute build limit
- Optimize build:
  - Remove unused dependencies
  - Check for large files being processed
  - Consider using `npm ci` instead of `npm install` (faster)

### 8. Routing/404 Errors

**Error:** "404 Not Found" on page refresh

**Fix:** Add a `_redirects` file in `public/` folder:
```
/*    /index.html   200
```

Or configure in Cloudflare Pages:
- Settings → Functions → Redirects
- Add: `/* -> /index.html 200`

### 9. CSP Meta Tag Causing Issues

**Current Issue:** The permissive CSP in `index.html` might cause issues in production.

**Solution:** Create a build-time replacement or remove it for production:

**Option 1:** Remove CSP meta tag and use Cloudflare headers
- Remove the `<meta http-equiv="Content-Security-Policy">` from `index.html`
- Configure CSP via Cloudflare Transform Rules (if needed)

**Option 2:** Use environment variable to conditionally include CSP
- Only include CSP meta tag in development

## Quick Fix Checklist

1. ✅ **Build Settings:**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Node version: `20.x`

2. ✅ **Environment Variables:**
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Cloudflare Pages settings

3. ✅ **CSP for Production:**
   - Consider removing the permissive CSP meta tag for production
   - Or configure via Cloudflare headers

4. ✅ **Routing:**
   - Add `_redirects` file or configure redirects in Cloudflare

5. ✅ **Check Build Logs:**
   - Go to Cloudflare Pages → Deployments → Click on failed deployment
   - Check the build logs for specific error messages

## Recommended Production CSP (via Cloudflare Headers)

If you need CSP in production, configure it via Cloudflare Transform Rules:

```
script-src 'self' 'unsafe-inline' https://bufnygjdkdemacqbxcrh.supabase.co https://*.supabase.co;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: https: blob:;
connect-src 'self' https://bufnygjdkdemacqbxcrh.supabase.co https://*.supabase.co wss://*.supabase.co;
frame-src 'self' https://*.supabase.co;
```

## Still Having Issues?

1. **Check the specific error message** in Cloudflare Pages deployment logs
2. **Try building locally** with `npm run build` to catch errors early
3. **Check Cloudflare Pages documentation:** https://developers.cloudflare.com/pages/
4. **Verify your GitHub repository** is properly connected
