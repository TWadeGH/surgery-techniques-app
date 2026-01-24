# Debugging Blank Page Issue

## Quick Checks

If you're seeing a blank page at `localhost:4173` (preview server), try these steps:

### 1. Check Browser Console

**Open Developer Tools** (F12 or Cmd+Option+I) and check:
- **Console tab**: Look for JavaScript errors (red text)
- **Network tab**: Check if files are loading (look for 404 errors)
- **Elements tab**: Check if `<div id="root">` has any content

### 2. Common Issues

#### JavaScript Error
- **Symptom**: Blank page, error in console
- **Solution**: Check the error message in console
- **Common causes**:
  - Import error (missing file)
  - Syntax error
  - Runtime error in component

#### CSS Not Loading
- **Symptom**: Page loads but looks broken
- **Solution**: Check Network tab for CSS file loading

#### ErrorBoundary Catching Error
- **Symptom**: Error message displayed instead of blank
- **Solution**: Check what error ErrorBoundary caught

#### Loading State Stuck
- **Symptom**: Spinner visible but never finishes
- **Solution**: Check if Supabase connection is working

### 3. Quick Fixes

#### Rebuild
```bash
npm run build
npm run preview
```

#### Check for Import Errors
```bash
npm run lint
```

#### Test in Dev Mode
```bash
npm run dev
```
Visit `localhost:5176` - if this works, the issue is with the build.

### 4. Check These Files

1. **Browser Console** - Most important! Look for errors
2. **Network Tab** - Check if assets are loading
3. **Elements Tab** - See if React rendered anything

### 5. Common Error Messages

- **"Cannot find module"** → Missing import
- **"useToast must be used within ToastProvider"** → Provider issue
- **"Cannot read property of undefined"** → Null/undefined error
- **"Failed to fetch"** → Network/Supabase connection issue

### 6. Test Steps

1. **Open browser console** (F12)
2. **Check for errors** (red messages)
3. **Check Network tab** - are files loading?
4. **Try dev mode**: `npm run dev` and visit `localhost:5176`
5. **Check if root div has content** in Elements tab

### 7. If Still Blank

Check if it's a Supabase connection issue:
- The app might be waiting for authentication
- Check if Supabase URL/key are correct
- Check browser console for Supabase errors

---

## Most Likely Causes

1. **JavaScript Error** - Check browser console
2. **Import Error** - Missing file or wrong path
3. **Supabase Connection** - Network/CORS issue
4. **ErrorBoundary** - Component error being caught

**First step: Always check the browser console for errors!**
