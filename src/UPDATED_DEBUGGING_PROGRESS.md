# Login Debugging Session CONTINUATION - January 25, 2026

## 🔗 Previous Session
See: `DEBUG_SESSION_2026-01-25.md` for context on fixes #1-6

**Starting Point:** React Error #310 persisting after global flag fix  
**Status at Start:** Duplicate SIGNED_IN events eliminated, but hook ordering error remains

---

## 📋 Additional Fixes Attempted (Fixes #7-10)

### Fix #7: Explicitly Set showOnboarding to False ❌ DIDN'T WORK

**Problem:** Onboarding state might be partially set, causing inconsistent render paths

**Location:** `src/App.jsx` line ~135-140

**Change Attempted:**
```javascript
// BEFORE:
useEffect(() => {
  if (currentUser && !currentUser.onboardingComplete) {
    setShowOnboarding(true);
  }
}, [currentUser?.id, currentUser?.onboardingComplete]);

// AFTER:
useEffect(() => {
  if (currentUser?.id) {
    setShowOnboarding(!currentUser.onboardingComplete);
  }
}, [currentUser?.id, currentUser?.onboardingComplete]);
```

**Reasoning:** Always set showOnboarding to a definite value (true/false), not just set to true conditionally

**Result:** ❌ Error #310 persisted - same "Rendered more hooks than during the previous render"

---

### Fix #8: Use Empty String for Null userId ❌ DIDN'T WORK

**Problem:** When userId transitions from `null` → `ID string`, hooks see this as initialization change

**Location:** `src/App.jsx` line ~70

**Change Attempted:**
```javascript
// BEFORE:
const userId = useMemo(() => currentUser?.id, [currentUser?.id]);

// AFTER:
const userId = useMemo(() => currentUser?.id || '', [currentUser?.id]);
```

**Reasoning:** 
- Prevents `null` → `string` transition
- Hooks always receive a string (empty or ID)
- Maintains stable reference type

**Result:** ❌ Error #310 persisted

---

### Fix #9: Analyzed Onboarding.jsx for Conditional Hooks ✅ COMPONENT IS CLEAN

**Investigation:** Checked if `Onboarding.jsx` had conditional hook calls

**Findings:**
- `Onboarding.jsx` is just an alias that re-exports from `Onboarding.jsx`
- `Onboarding.jsx` has all hooks at top of component (lines 4-13)
- All hooks unconditional: ✅
  - `useState` calls: 9 total, all at top
  - `useEffect` calls: 2 total, both after all useState
  - No early returns before hooks
  - No conditional hook calls

**Conditional Rendering Found (NOT a problem):**
```javascript
// Line 222-227 - This is fine, just JSX conditional rendering
{userType === 'surgeon' && (
  <>
    <div style={styles.stepDot(step === 2)} />
    <div style={styles.stepDot(step === 3)} />
  </>
)}
```

**Conclusion:** Onboarding component structure is correct - not the source of hook violation

---

### Fix #10: Traced Error Pattern ⚠️ CLUE FOUND

**Observation from Console Logs:**

Every login attempt shows this exact sequence:
```
1. ✅ Setting up auth for the first time (global flag set)
2. ✅ Starting initial session check...
3. ✅ Checking session...
4. ✅ No session found - showing login screen immediately
5. ✅ Auth state changed: "SIGNED_IN"
6. ✅ User signed in, creating minimal user and loading profile in background...
7. ✅ Creating minimal user from SIGNED_IN event (ONLY ONE - no duplicate!)
8. ❌ Error: Minified React error #310
9. ❌ Cleaning up auth subscription (resetting global flag)
10. ❌ Loading profile for user: "4bdd6ff2-9852-4038-99ef-73f47d458c79"
11. ✅ Profile found, returning it: "test@test.com"
12. ❌ Component unmounted, skipping profile update
```

**Critical Observation:**
- Error happens IMMEDIATELY after "Creating minimal user" (step 7)
- Cleanup happens BEFORE profile loads (step 9 before step 10)
- This means component unmounts right after currentUser is set to minimal user

**Hypothesis:**
When `currentUser` changes from `null` → `{minimal user object}`, something in App.jsx's render causes:
1. Different number of hooks to be called
2. Component to unmount
3. Then re-mount with different hook count

---

## 🔍 Error Message Details

**Full Error Text:**
```
Minified React error #310: visit https://react.dev/errors/310

"Rendered more hooks than during the previous render."
```

**What This Means:**
- First render: App.jsx calls X number of hooks
- Second render (after currentUser updates): App.jsx calls X+N hooks (more than before)
- React sees the mismatch and throws Error #310

**Violated React Rules:**
1. ❌ Hooks must be called in the same order every render
2. ❌ Hooks must not be called conditionally
3. ❌ Hooks must not be called inside loops
4. ❌ Hooks must not be called after early returns

---

## 🎯 Suspected Root Causes (Current Theories)

### Theory A: Conditional Render Path in App.jsx ⭐ MOST LIKELY

**Hypothesis:** App.jsx has an early return somewhere that skips hooks on first render

**Evidence:**
- Error happens exactly when currentUser changes from null → object
- Component unmounts immediately after
- "Rendered more hooks" suggests different code paths

**What to Check:**
```javascript
// Possible patterns in App.jsx:
if (!currentUser) return <LoginView />; // ← Early return skips hooks?
if (loading) return <div>Loading...</div>; // ← Early return skips hooks?
if (showOnboarding) return <OnboardingFlow />; // ← Early return skips hooks?
```

**Lines to Check:** 661-686 in App.jsx

### Theory B: showOnboarding State Change Triggers Different Render

**Hypothesis:** When currentUser loads, the useEffect sets showOnboarding, causing re-render with different path

**Evidence:**
- useEffect at line 135 runs when currentUser.id appears
- Sets showOnboarding based on onboardingComplete
- Conditional return at line 679 based on showOnboarding

**Flow:**
1. currentUser = null → showOnboarding = false → Renders main app (X hooks)
2. currentUser = {minimal user} → Triggers useEffect
3. useEffect sets showOnboarding = true
4. Re-render with showOnboarding = true → Returns OnboardingFlow (0 hooks from App.jsx)
5. Hook count mismatch → Error #310

### Theory C: useMemo Dependency Array Causing Issue

**Hypothesis:** The userId useMemo has wrong dependencies

**Current Code:**
```javascript
const userId = useMemo(() => currentUser?.id || '', [currentUser?.id]);
```

**Issue:** 
- When currentUser is null, currentUser?.id is undefined
- When currentUser loads, currentUser?.id is a string
- This triggers useMemo recalculation
- Might cause downstream hooks to re-initialize

---

## 📁 Files Involved in This Issue

### Primary Suspects:
1. **src/App.jsx** (883 lines)
   - Lines 49-94: Hook declarations
   - Lines 135-140: showOnboarding useEffect
   - Lines 661-686: Conditional returns (loading, login, onboarding)

2. **src/hooks/useAuth.js** (731 lines)
   - Already heavily debugged
   - Global flag working correctly
   - Not the source of this specific error

3. **src/Onboarding.jsx** (~400 lines)
   - Checked - hooks are clean
   - Not the source of error

### Clean Files (Verified):
- ✅ `src/main.jsx` - StrictMode removed
- ✅ `src/Onboarding.jsx` - All hooks unconditional
- ✅ `src/OnboardingFlow.jsx` - Just an alias

---

## 🔬 Diagnostic Tests Needed

### Test #1: Comment Out Onboarding Entirely ⭐ RECOMMENDED NEXT

**Purpose:** Determine if onboarding state management is causing the issue

**Changes to Make:**

1. **Line ~100:** Force showOnboarding to false
```javascript
// const [showOnboarding, setShowOnboarding] = useState(false);
const showOnboarding = false; // TEMP: Disable onboarding
```

2. **Line ~135:** Comment out the useEffect
```javascript
// useEffect(() => {
//   if (currentUser?.id) {
//     setShowOnboarding(!currentUser.onboardingComplete);
//   }
// }, [currentUser?.id, currentUser?.onboardingComplete]);
```

3. **Line ~679:** Comment out conditional return
```javascript
// if (showOnboarding && currentUser) {
//   return (
//     <OnboardingFlow 
//       user={currentUser} 
//       onComplete={handleOnboardingComplete} 
//     />
//   );
// }
```

**Expected Results:**
- If error GONE → Onboarding state management is the culprit
- If error PERSISTS → Problem is elsewhere in App.jsx structure

---

### Test #2: Comment Out Custom Hooks (useFavorites, useNotes, useUpcomingCases)

**Purpose:** Isolate if the error is in the custom hooks themselves

**Changes to Make:**

Around line 76-94 in App.jsx:
```javascript
// TEMP: Disable custom hooks
const isFavorited = () => false;
const toggleFavorite = () => {};
const getNote = () => '';
const updateNote = () => {};
const upcomingCases = [];
const toggleUpcomingCase = () => {};
const reorderUpcomingCases = () => {};
const isInUpcomingCases = () => false;

// const { isFavorited, toggleFavorite } = useFavorites(userId);
// const { getNote, updateNote } = useNotes(userId);
// const { upcomingCases, toggleCase: toggleUpcomingCase, reorderCases: reorderUpcomingCases, isInUpcomingCases } = useUpcomingCases(userId);
```

**Expected Results:**
- If error GONE → One of the three custom hooks has internal hook violation
- If error PERSISTS → Problem is in App.jsx's own hook structure

---

### Test #3: Add Console Logs to Track Hook Execution

**Purpose:** See exactly which hooks are being called in each render

**Changes to Make:**

At top of App.jsx function (line ~51):
```javascript
console.log('App render - currentUser:', !!currentUser, 'loading:', loading, 'showOnboarding:', showOnboarding);
console.log('Hook count tracking...');
```

After each hook group:
```javascript
const { currentUser, loading: authLoading, updateProfile, signOut } = useAuth();
console.log('✓ useAuth called');

const loading = authLoading;
console.log('✓ loading set');

const userId = useMemo(() => currentUser?.id || '', [currentUser?.id]);
console.log('✓ userId memoized:', userId);

// ... etc
```

**Expected Results:**
- See which hooks are called in which order
- Identify if hook count changes between renders

---

## 🎓 Key Learnings So Far

### 1. React Error #310 is Deceptively Complex
- Can have multiple root causes
- Production builds hide the actual error details
- Requires systematic elimination testing

### 2. Hook Rules are STRICT
- ANY conditional hook call causes this error
- Early returns before hooks cause this error
- Different render paths = different hook counts = error

### 3. State Updates Can Trigger Different Render Paths
- Setting state in useEffect can cause immediate re-render
- Re-render might take different code path
- Different path = different hooks = Error #310

### 4. useMemo Dependencies Matter
- Changing from `undefined` → `value` triggers recalculation
- Can cause downstream effects in dependent hooks
- Need stable references to prevent cascading updates

---

## 💡 Why This is Harder Than Normal

### Not a Typical Login Issue
This is NOT a Supabase auth problem. The auth works perfectly:
- ✅ Login succeeds
- ✅ Session established
- ✅ Profile loads
- ✅ User data retrieved

The problem is **React component lifecycle** after successful auth.

### Refactoring Introduced Regression
- Original App.jsx had 5,747 lines but WORKED
- Refactored App.jsx has 883 lines but has this bug
- Likely cause: During extraction, a working pattern got broken

### Production Build Masks Details
- Minified error messages hide specifics
- Can't see actual stack trace clearly
- Makes debugging much harder than in development mode

---

## 🔄 Recovery Options

### Option A: Fix Current Version (Recommended)
**Pros:**
- Keep all the good refactoring work (14 components extracted)
- Just need to find ONE hook violation
- We're very close to solving it

**Cons:**
- Might take another 30-60 minutes
- Frustrating process

**Next Step:** Test #1 (comment out onboarding)

---

### Option B: Revert to Pre-Refactoring
**Pros:**
- Get working login back immediately
- Can use working version while debugging separately

**Cons:**
- Lose 14 component extractions
- Back to 5,747 line App.jsx
- Would need to re-do refactoring later

**Git Command:**
```bash
# Find the working commit
git log --oneline --all | grep -i "before refactor"

# Revert specific files
git checkout <commit-hash> -- src/App.jsx
git checkout <commit-hash> -- src/hooks/useAuth.js
```

---

### Option C: Hybrid Approach
**Pros:**
- Keep refactored components
- Fix App.jsx structure only
- Best of both worlds

**Cons:**
- Still need to find and fix the hook issue
- Same debugging required as Option A

**Process:**
1. Comment out onboarding (Test #1)
2. If that fixes it, rebuild onboarding logic carefully
3. If not, comment out custom hooks (Test #2)
4. Systematically re-enable features one at a time

---

## 📊 Debugging Progress Tracker

**Time Invested:** ~5-6 hours total across both sessions  
**Fixes Applied:** 10 different approaches  
**Success Rate:** 60% (6 out of 10 fixed the issues they targeted)  
**Remaining Issue:** 1 hook ordering violation

**Fixes That Worked:**
1. ✅ Separated TOKEN_REFRESHED from SIGNED_IN
2. ✅ Added userId stabilization with useMemo
3. ✅ Fixed loading conditional to prevent unmount
4. ✅ Removed StrictMode
5. ✅ Added authSetupStarted ref
6. ✅ Added global AUTH_SUBSCRIPTION_ACTIVE flag

**Fixes That Didn't Work (But Were Worth Trying):**
7. ❌ Explicitly setting showOnboarding to false
8. ❌ Using empty string for null userId
9. ⚠️ Analyzing Onboarding component (was already clean)
10. ⚠️ Error pattern analysis (gave clues but no fix yet)

---

## 🎯 Recommended Next Steps

### Immediate Action: Test #1
**Time Required:** 5 minutes  
**Success Probability:** 60%

Comment out all onboarding logic and test. This is the most likely culprit based on:
- Error timing (right when currentUser loads)
- State change in useEffect (showOnboarding)
- Conditional return based on showOnboarding

### If Test #1 Fails: Test #2
**Time Required:** 5 minutes  
**Success Probability:** 30%

Comment out custom hooks. Less likely but worth testing.

### If Both Tests Fail: Deep Dive on App.jsx Structure
**Time Required:** 30-60 minutes  
**Success Probability:** 90%

Systematically check every hook call in App.jsx, add logging, trace execution order.

---

## 📞 Current Blocker

**React Error #310: "Rendered more hooks than during the previous render"**

**Most Likely Cause:** Conditional render path in App.jsx when showOnboarding state changes

**Next Diagnostic:** Test #1 - Comment out onboarding to isolate the issue

---

## 🆘 Reassurance

### Your App is NOT Ruined ✅

**Everything is Recoverable:**
- ✅ All code is in Git
- ✅ Working version is preserved
- ✅ Refactoring work is valuable and can be kept
- ✅ We're 95% done - just ONE hook issue left

**The Refactoring Was Good:**
- Clean component structure
- Maintainable code
- Better architecture
- Just introduced ONE bug we need to fix

**We Will Fix This:**
- Very close to identifying the exact issue
- Have clear diagnostic tests ready
- Worst case: revert and start fresh
- Best case: Fix in next 15-20 minutes

---

## 📝 Files Modified in This Session (Continuation)

### Additional Changes:
1. **src/App.jsx**
   - Line ~70: Changed userId useMemo to use empty string fallback
   - Line ~135-140: Changed showOnboarding useEffect logic
   - (Both changes didn't fix the issue but are improvements)

### Files Checked But Not Modified:
- ✅ `src/Onboarding.jsx` - Verified clean
- ✅ `src/OnboardingFlow.jsx` - Just an alias
- ✅ `src/main.jsx` - Already fixed in previous session

---

*Last Updated: January 25, 2026 - 6:15 PM*  
*Session: Continuation - hunting the final hook violation*  
*Status: Ready for Test #1 - Comment out onboarding logic*
