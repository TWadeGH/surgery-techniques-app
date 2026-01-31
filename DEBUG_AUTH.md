# Debugging Auth Issues

## Current Problems
1. Session check timing out
2. Profile loading timing out  
3. Google login not working

## Quick Debug Steps

### 1. Check Browser Console
Open DevTools (F12) and look for:
- Any red errors
- Network tab - are requests to Supabase failing?
- Check if `supabase.auth.getSession()` is actually being called

### 2. Check Supabase Dashboard
1. Go to Supabase Dashboard → Authentication → Users
2. Do you see your user account?
3. Check Authentication → Logs for any errors

### 3. Test Session Directly
In browser console, run:
```javascript
// Check if Supabase client is accessible
window.supabase = (await import('./lib/supabase.js')).supabase;

// Try to get session
const { data, error } = await supabase.auth.getSession();
console.log('Session:', data);
console.log('Error:', error);
```

### 4. Check Network
- Open Network tab in DevTools
- Filter by "supabase"
- Try logging in and see if requests are:
  - Failing (404, 500, etc.)
  - Timing out
  - Not being sent at all

### 5. Check Google OAuth Setup
1. Supabase Dashboard → Authentication → Providers → Google
   - Is it enabled (toggle ON)?
   - Are Client ID and Secret filled in?
2. Google Cloud Console
   - Are redirect URIs correct?
   - Is the OAuth consent screen configured?

## Common Issues

### Issue: Session check times out
**Possible causes:**
- Network is slow/unreliable
- Supabase project is paused (free tier)
- CORS issues
- Browser blocking requests

**Fix:** Check Network tab for failed requests

### Issue: Profile loading times out
**Possible causes:**
- RLS policy blocking INSERT
- Database connection slow
- Missing INSERT policy (you already ran this)

**Fix:** Check console for specific error codes

### Issue: Google login redirects but nothing happens
**Possible causes:**
- Redirect URL mismatch
- OAuth not configured in Supabase
- Session not being created after OAuth

**Fix:** Check Supabase Auth logs after attempting login

## Next Steps
1. Share the exact console errors you're seeing
2. Check Network tab - are Supabase requests failing?
3. Try the session check in console (see step 3 above)
