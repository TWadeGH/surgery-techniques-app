# Pre-Deployment Checklist

## ✅ Pre-Deployment Steps

### 1. Code Quality Checks

- [ ] **Run linter**: `npm run lint` - Should pass with no errors
- [ ] **Build locally**: `npm run build` - Should complete successfully
- [ ] **Test build**: `npm run preview` - Verify app works in production build
- [ ] **Check for console errors**: Open browser console, verify no errors
- [ ] **Verify all imports**: Ensure no broken imports or missing files

### 2. Environment Variables

- [ ] **Check Supabase connection**: Verify `src/lib/supabase.js` is configured
- [ ] **Environment variables**: If using `.env`, ensure Cloudflare Pages has them set:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### 3. Build Configuration

- [ ] **Build command**: `npm run build` (already configured)
- [ ] **Output directory**: `dist` (already configured)
- [ ] **Node version**: Set to `20.x` or `18.x` in Cloudflare Pages
- [ ] **Routing**: `public/_redirects` file exists (already configured)

### 4. Git Repository

- [ ] **All changes committed**: `git status` should be clean
- [ ] **Pushed to GitHub**: `git push origin main`
- [ ] **No sensitive data**: Verify no API keys or secrets in code
- [ ] **.gitignore**: Ensure `.env`, `node_modules`, `dist` are ignored

### 5. Database & Backend

- [ ] **Supabase migrations**: All SQL migrations have been run
- [ ] **RLS policies**: Row-level security policies are in place
- [ ] **Storage buckets**: Image storage buckets configured
- [ ] **CORS settings**: Supabase CORS allows your Cloudflare Pages domain

### 6. Testing (Optional but Recommended)

- [ ] **Run tests**: `npm test` (if test dependencies installed)
- [ ] **Manual testing**: Test key user flows:
  - [ ] User authentication (email/password and Google OAuth)
  - [ ] Resource browsing and filtering
  - [ ] Favorites functionality
  - [ ] Notes functionality
  - [ ] Admin dashboard (if applicable)
  - [ ] Resource suggestions

### 7. Performance

- [ ] **Bundle size**: Check `dist` folder size (should be reasonable)
- [ ] **Lazy loading**: Admin components are lazy loaded
- [ ] **Images**: Optimize any large images in `public/` folder

### 8. Documentation

- [ ] **README.md**: Updated with current information
- [ ] **NEW_SESSION_PLAN.md**: Ready for GitHub
- [ ] **All docs committed**: Documentation files are in repository

---

## 🚀 Deployment Steps

### Cloudflare Pages Deployment

1. **Go to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com
   - Navigate to: **Workers & Pages** → **Pages**

2. **Connect Repository** (if not already connected)
   - Click **"Create application"** → **"Pages"** → **"Connect to Git"**
   - Authorize Cloudflare to access GitHub
   - Select your repository

3. **Configure Build Settings**
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (leave default)
   - **Node version**: `20.x` (recommended)

4. **Set Environment Variables** (if using)
   - Go to **Settings** → **Environment variables**
   - Add:
     - `VITE_SUPABASE_URL` = `https://bufnygjdkdemacqbxcrh.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = (your anon key)

5. **Deploy**
   - Click **"Save and Deploy"**
   - Wait for build to complete (usually 2-5 minutes)
   - Check build logs for any errors

6. **Verify Deployment**
   - Visit your Cloudflare Pages URL
   - Test the application thoroughly
   - Check browser console for errors
   - Test all major features

---

## 🔍 Post-Deployment Verification

### Immediate Checks

- [ ] **Site loads**: App loads without errors
- [ ] **Authentication works**: Can sign in/out
- [ ] **Database connection**: Resources load correctly
- [ ] **Images load**: Resource images display properly
- [ ] **Routing works**: Navigation and page refreshes work
- [ ] **Toast notifications**: Toast system works (no alerts)
- [ ] **Dark mode**: Dark mode toggle works
- [ ] **Responsive design**: Works on mobile and desktop

### Functional Checks

- [ ] **User features**:
  - [ ] Browse resources
  - [ ] Search and filter
  - [ ] Add favorites
  - [ ] Add notes
  - [ ] Add to upcoming cases
  - [ ] Suggest resources

- [ ] **Admin features** (if applicable):
  - [ ] Access admin dashboard
  - [ ] Manage resources
  - [ ] Review suggestions
  - [ ] Manage categories

### Performance Checks

- [ ] **Page load time**: Should be < 3 seconds
- [ ] **No console errors**: Browser console is clean
- [ ] **Network requests**: API calls succeed
- [ ] **Images optimize**: Images load efficiently

---

## 🐛 Common Deployment Issues

### Build Fails

**Solution**: Check build logs in Cloudflare Pages
- Verify Node version is set correctly
- Ensure all dependencies are in `package.json`
- Check for syntax errors in code

### 404 Errors on Refresh

**Solution**: Verify `public/_redirects` file exists with:
```
/*    /index.html   200
```

### Supabase Connection Errors

**Solution**: 
- Verify environment variables are set in Cloudflare Pages
- Check Supabase CORS settings allow your domain
- Verify RLS policies are correct

### CSP (Content Security Policy) Errors

**Solution**: 
- Remove or modify CSP meta tag in `index.html` for production
- Or configure CSP via Cloudflare Transform Rules

---

## 📝 Deployment Notes

### Current Configuration

- **Hosting**: Cloudflare Pages
- **Build Tool**: Vite
- **Framework**: React 19.2.0
- **Database**: Supabase
- **Routing**: SPA with `_redirects` file

### Build Output

- **Output directory**: `dist/`
- **Assets directory**: `dist/assets/`
- **Index file**: `dist/index.html`

### Automatic Deployments

- **Trigger**: Push to `main` branch
- **Build time**: ~2-5 minutes
- **Deployment**: Automatic after successful build

---

## ✅ Ready to Deploy?

Once all checklist items are complete:

1. **Commit all changes**:
   ```bash
   git add .
   git commit -m "Ready for deployment - All refactoring phases complete"
   git push origin main
   ```

2. **Deploy via Cloudflare Pages** (see steps above)

3. **Monitor deployment** in Cloudflare Pages dashboard

4. **Test thoroughly** after deployment

5. **Update documentation** with production URL if needed

---

**Last Updated**: January 24, 2026  
**Status**: Ready for deployment after checklist completion
