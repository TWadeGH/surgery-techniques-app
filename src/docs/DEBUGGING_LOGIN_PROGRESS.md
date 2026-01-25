# Login Debugging Session - January 25, 2026

## 🚨 Current Issue: React Error #310 on Login

**Status:** Making progress - narrowed down from infinite loop to hook ordering issue  
**App State:** Refactored (883 lines, components extracted), deployed on Cloudflare Pages  
**Test Account:** test@test.com / onboarding_complete = true in profiles table

---

## 📋 Session Timeline & Fixes Applied

### Session Start: Component Refactoring Complete
- ✅ **App.jsx refactored** from 5,747 lines → 883 lines
- ✅ **14 components extracted** to separate files
- ✅ **Custom hooks** in place (useAuth, useFavorites, useNotes, useUpcomingCases)
- ❌ **Problem discovered:** White screen after login with React Error #310

---

## 🔧 Fix #1: Separate TOKEN_REFRESHED from SIGNED_IN (useAuth.js)

**Problem:** Infinite loop - TOKEN_REFRESHED event was loading profile repeatedly

**Location:** `src/hooks/useAuth.js` line ~451  

**Change Made:**
```javascript
// BEFORE (BROKEN):
} else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
  // Both events reload profile → Infinite loop!
}

// AFTER (FIXED):
} else if (event === 'SIGNED_IN') {
  // Only SIGNED_IN loads profile
} else if (event === 'TOKEN_REFRESHED') {
  // TOKEN_REFRESHED just updates loading state
  // Does NOT reload profile!
}
```

**Result:** Reduced infinite loop but didn't fully fix Error #310

---

## 🔧 Fix #2: Stabilize userId with useMemo (App.jsx)

**Problem:** Hook re-initialization on every currentUser object change

**Location:** `src/App.jsx` line ~70

**Change Made:**
```javascript
// Add this line:
const userId = useMemo(() => currentUser?.id, [currentUser?.id]);

// Then use userId instead of currentUser?.id:
useFavorites(userId)           // Instead of useFavorites(currentUser?.id)
useNotes(userId)               // Instead of useNotes(currentUser?.id)  
useUpcomingCases(userId)       // Instead of useUpcomingCases(currentUser?.id)
```

**Why:** Prevents hooks from re-initializing when currentUser properties change (like onboardingComplete)

**Result:** Reduced re-renders but Error #310 persisted

---

## 🔧 Fix #3: Prevent Unmounting During Profile Load (App.jsx)

**Problem:** App was unmounting and switching to LoginView while profile was loading

**Location:** `src/App.jsx` line 675

**Change Made:**
```javascript
// BEFORE (BROKEN):
if (!currentUser) {
  return <LoginView onLogin={() => {}} />;
}

// AFTER (FIXED):
if (!currentUser && !loading) {
  return <LoginView onLogin={() => {}} />;
}
```

**Why:** Prevents switching to LoginView while loading is true, avoiding unmount mid-authentication

**Result:** Improved but Error #310 still occurred

---

## 🔧 Fix #4: Remove StrictMode (main.jsx)

**Problem:** React StrictMode causes intentional double-mounting in development

**Location:** `src/main.jsx` lines 15 & 19

**Change Made:**
```javascript
// BEFORE:
<StrictMode>
  <ToastProvider>
    <App />
  </ToastProvider>
</StrictMode>

// AFTER:
<ToastProvider>
  <App />
</ToastProvider>
```

**Result:** Eliminated double-mounting but discovered duplicate auth subscriptions still happening

---

## 🔧 Fix #5: Add authSetupStarted Ref (useAuth.js)

**Problem:** Auth subscription being set up multiple times per instance

**Location:** `src/hooks/useAuth.js` line ~36 & ~380

**Changes Made:**

1. Add ref:
```javascript
const authSetupStarted = useRef(false); // Line 36
```

2. Check ref in useEffect:
```javascript
useEffect(() => {
  if (authSetupStarted.current) {
    console.log('Auth already set up, skipping duplicate setup');
    return;
  }
  authSetupStarted.current = true;
  // ... rest of setup
}, []);
```

3. Reset in cleanup:
```javascript
return () => {
  authSetupStarted.current = false;
  // ... rest of cleanup
};
```

**Result:** Helped but didn't prevent cross-instance duplicates

---

## 🔧 Fix #6: Add Global Flag (useAuth.js) ✅ LATEST

**Problem:** Multiple instances of useAuth hook creating multiple subscriptions (React Fast Refresh)

**Location:** `src/hooks/useAuth.js` line ~27

**Changes Made:**

1. **Add global flag before hook function:**
```javascript
// Global flag to prevent duplicate auth subscriptions across all instances
// This is necessary because React Fast Refresh can cause multiple hook instances
let AUTH_SUBSCRIPTION_ACTIVE = false;
```

2. **Check global flag first in useEffect (line ~385):**
```javascript
useEffect(() => {
  // CRITICAL: Check global flag first to prevent duplicate subscriptions
  if (AUTH_SUBSCRIPTION_ACTIVE) {
    console.log('Auth subscription already active globally, skipping setup');
    return;
  }
  
  // CRITICAL: Prevent duplicate auth setup using ref
  if (authSetupStarted.current) {
    console.log('Auth already set up in this instance, skipping');
    return;
  }
  
  // Set both flags
  AUTH_SUBSCRIPTION_ACTIVE = true;
  authSetupStarted.current = true;
  console.log('Setting up auth for the first time (global flag set)');
  
  // ... rest of setup
```

3. **Reset global flag in cleanup (line ~534):**
```javascript
return () => {
  console.log('Cleaning up auth subscription (resetting global flag)');
  AUTH_SUBSCRIPTION_ACTIVE = false; // Reset global flag
  isMounted.current = false;
  authSetupStarted.current = false;
  // ... rest of cleanup
};
```

**Result:** ✅ **Duplicate SIGNED_IN events eliminated!** Only one "Creating minimal user" log now.

---

## 🎯 Current Status (Latest Test)

### Console Output Analysis:
```
✅ Setting up auth for the first time (global flag set)
✅ Starting initial session check...
✅ Auth state changed: "SIGNED_IN"
✅ User signed in, creating minimal user and loading profile in background...
✅ Creating minimal user from SIGNED_IN event  (ONLY ONE NOW!)
❌ Error: Minified React error #310
❌ Cleaning up auth subscription (resetting global flag)
❌ Component unmounted, skipping profile update
```

### What's Fixed:
- ✅ No more infinite loop
- ✅ No more duplicate SIGNED_IN events
- ✅ Auth subscription only created once
- ✅ Profile loads successfully (348ms)

### What's Still Broken:
- ❌ React Error #310: "Rendered more hooks than during the previous render"
- ❌ Component unmounts immediately after creating minimal user
- ❌ White screen persists

---

## 🔍 Next Steps to Debug

### Step 1: Identify Which Component Has Hook Violation
**Action Required:** Click the red Error #310 in console to expand stack trace

**What to look for:**
- Component name causing the error
- Which hook is being called conditionally
- Line number in the component

### Step 2: Possible Causes to Investigate

#### A. Conditional Hook Calls
Look for patterns like:
```javascript
// ❌ WRONG - Hook called conditionally
if (someCondition) {
  const [state, setState] = useState();
}

// ✅ CORRECT - Hook always called
const [state, setState] = useState();
if (someCondition) {
  // Use state here
}
```

#### B. Early Returns Before Hooks
```javascript
// ❌ WRONG - Return before hooks
if (!data) return null;
const [state, setState] = useState();

// ✅ CORRECT - All hooks first, then conditionals
const [state, setState] = useState();
if (!data) return null;
```

#### C. Hooks in Loops or Callbacks
```javascript
// ❌ WRONG
items.map(() => useEffect(() => {}, []));

// ✅ CORRECT
useEffect(() => {
  items.forEach(item => { /* logic */ });
}, [items]);
```

### Step 3: Check Specific Files

Priority order to check for hook violations:

1. **App.jsx** (lines 49-200)
   - All hooks at top of component?
   - No conditional useState/useEffect/useMemo?
   - No early returns before line ~140?

2. **useAuth.js** (entire file)
   - `loadUserProfile` callback has early return (OK - it's inside callback)
   - Main hook body - all hooks unconditional?

3. **useFavorites.js** (lines 27-50)
   - Check if hooks are always called
   - Early return is inside `loadFavorites` callback (should be OK)

4. **useNotes.js** (lines 27-50)
   - Same checks as useFavorites

5. **useUpcomingCases.js** (lines 27-50)
   - Same checks as useFavorites

### Step 4: Alternative Debugging Approach

If stack trace doesn't help, try this:

1. **Temporarily simplify App.jsx hooks:**
```javascript
// Comment out these hooks temporarily:
// const { isFavorited, toggleFavorite } = useFavorites(userId);
// const { getNote, updateNote } = useNotes(userId);
// const { upcomingCases, toggleCase, reorderCases, isInUpcomingCases } = useUpcomingCases(userId);

// Replace with dummy versions:
const isFavorited = () => false;
const toggleFavorite = () => {};
const getNote = () => '';
const updateNote = () => {};
const upcomingCases = [];
const toggleCase = () => {};
const reorderCases = () => {};
const isInUpcomingCases = () => false;
```

2. **Test if error persists**
   - If error GONE → Problem is in one of those hooks
   - If error PERSISTS → Problem is in App.jsx or useAuth

3. **Re-enable hooks one at a time** to find culprit

---

## 📁 Files Modified in This Session

### Core Authentication:
- `src/hooks/useAuth.js` - Multiple fixes for infinite loop and duplicates
- `src/App.jsx` - Added userId memoization, fixed loading conditional
- `src/main.jsx` - Removed StrictMode wrapper

### Components (Refactored Earlier):
- `src/components/views/LoginView.jsx` - Extracted (224 lines)
- `src/components/views/UserView.jsx` - Extracted (270 lines)
- 12 other components in components/ folder

### Database Changes Suggested (NOT YET DONE):
None yet - all fixes have been frontend code changes

---

## 🎓 Key Learnings

### React Error #310 Has Two Meanings:
1. **"Rendered more hooks"** - Hook called conditionally or different count per render
2. **"Infinite loop"** - Component re-rendering infinitely (less common message)

### Auth Subscription Best Practices:
- Use global flag for module-level state
- Use ref flag for instance-level state  
- Both needed to prevent duplicates in development with Fast Refresh

### Hook Dependencies:
- Object references change even if IDs are the same
- Use `useMemo` to stabilize primitive values (IDs, strings)
- Prevents hook re-initialization on parent re-renders

---

## 🔗 Useful References

- [React Error #310 Documentation](https://react.dev/errors/310)
- [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [Supabase Auth Events](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)

---

## 💾 Quick Recovery Commands

If you need to revert or check current state:

```bash
# Check current deployed version
git log --oneline -5

# See what changed recently
git diff HEAD~1 HEAD src/hooks/useAuth.js

# Revert specific file if needed
git checkout HEAD~1 -- src/hooks/useAuth.js
```

---

## ✅ Testing Checklist

Once error is fixed, verify:

- [ ] Login with Google works without errors
- [ ] Login with email/password works (if implemented)
- [ ] Profile loads correctly
- [ ] Onboarding appears for new users
- [ ] Onboarding skipped for existing users (onboarding_complete = true)
- [ ] No console errors
- [ ] No infinite loops
- [ ] Resources load in main view
- [ ] Favorites work
- [ ] Notes work
- [ ] Upcoming cases work
- [ ] Admin view accessible (if admin user)

---

## 📞 Current Blocker

**React Error #310: "Rendered more hooks than during the previous render"**

**Next Action:** Get expanded stack trace from console error to identify exact component and hook causing the issue.

**Time Investment:** ~3-4 hours of debugging so far. Very close to resolution - just need to identify which component has the conditional hook call.

---

*Last Updated: January 25, 2026 - 5:20 PM*  
*Session: Debugging React Error #310 after component refactoring*
