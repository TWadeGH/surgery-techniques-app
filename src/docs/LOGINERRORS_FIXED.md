# Login Fix - January 25, 2026

## 🎯 Problem Summary

**Primary Issue:** React Error #310 - "Rendered more hooks than during the previous render"  
**Symptom:** User could not log in - app crashed immediately after successful authentication  
**Root Cause:** Inline `useCallback` hooks in JSX that only ran when rendering the main app, not when showing LoginView

---

## 🔍 Root Cause Analysis

### The Hook Ordering Violation

When a user was on the **login screen**, `App.jsx` would:
1. Run all hooks at the top level
2. Hit an early return: `if (!currentUser && !loading) return <LoginView />`
3. **Never render the main app JSX** (Header, UserView, modals, etc.)

When the user **signed in**:
1. `currentUser` updated from `null` → user object
2. App re-rendered and now rendered the **main app JSX**
3. The main app JSX had **inline `useCallback(...)` calls** in props:
   ```jsx
   <Header
     onToggleUpcomingCases={useCallback(() => {...}, [])}  // ← Hook called here!
     onSettingsClick={useCallback(() => {...}, [])}         // ← Hook called here!
   />
   ```
4. React saw **more hooks** on the second render → Error #310

**React Rule:** Hooks must be called in the same order on every render. We were calling 0 hooks in the main app on first render (LoginView), then 10+ hooks on second render (main app) → violation.

---

## ✅ Solution: Move All Callbacks to Top Level

### Step 1: Identify All Inline useCallback Calls

**Files to check:**
- `src/App.jsx` - Main component with early returns

**Pattern to find:**
```jsx
// ❌ WRONG - Inline in JSX
<Component prop={useCallback(() => {...}, [])} />
```

**Found instances:**
- `Header` component: `onToggleUpcomingCases`, `onSettingsClick`
- `UserView` component: `onToggleUpcomingCases`, `onToggleFavorites`, `onSearchChange`, `onSuggestResource`, `onCategorySelect`
- `AdminView` component: `onAddResource`, `onEditResource`, `onEditCategories`, `onShowSuggestedResources`
- `CategoryManagementModal`: `onClose` (long inline function)
- "Return to Browse" button: `onClick`

---

### Step 2: Create Stable Callback Handlers

**Location:** `src/App.jsx` lines ~667-718

**Action:** Define all `useCallback` handlers **before any early returns** (before loading/login/onboarding checks)

**Code Added:**
```javascript
// Stable callbacks for main UI — MUST be defined before any early return.
// Inline useCallback in JSX causes Error #310: we return <LoginView /> before
// the main app, so those hooks never run; after sign-in we render main app
// and they do → "Rendered more hooks than during the previous render."
const handleToggleUpcomingCases = useCallback(() => setShowUpcomingCases((prev) => !prev), []);
const handleSettingsClick = useCallback(() => setShowSettings(true), []);
const handleToggleFavorites = useCallback(() => setShowFavoritesOnly((prev) => !prev), []);
const handleSearchChange = useCallback(
  (term) => {
    setSearchTerm(term);
    if (term?.trim() && currentUser) trackSearchQuery(term, currentUser.id, 0);
  },
  [currentUser]
);
const handleSuggestResourceClick = useCallback(() => setShowSuggestForm(true), []);
const handleCategorySelect = useCallback(
  (categoryId) => {
    setSelectedCategoryId(categoryId);
    if (categoryId && currentUser) {
      trackCategorySelection(currentUser.id, categoryId, null);
    }
  },
  [currentUser, categories]
);
const handleAddResourceClick = useCallback(() => setShowAddForm(true), []);
const handleEditResourceClick = useCallback((resource) => setEditingResource(resource), []);
const handleEditCategoriesClick = useCallback(() => setShowCategoryManagement(true), []);
const handleShowSuggestedResourcesClick = useCallback(() => setShowSuggestedResources(true), []);
const handleReturnToBrowse = useCallback(() => setCurrentView(VIEW_MODES.USER), []);
const handleCloseCategoryManagement = useCallback(() => {
  setShowCategoryManagement(false);
  // ... category reload logic (moved from inline onClose)
}, [currentUser?.subspecialtyId]);
```

**Why this works:**
- All hooks run **every render**, regardless of which UI we show
- Hook count is **consistent** between LoginView and main app renders
- React sees the same hooks in the same order → no Error #310

---

### Step 3: Replace Inline useCallback with Handler Refs

**Location:** `src/App.jsx` main return block (lines ~776-900)

**Changes Made:**

**Before (BROKEN):**
```jsx
<Header
  onToggleUpcomingCases={useCallback(() => {
    setShowUpcomingCases(prev => !prev);
  }, [])}
  onSettingsClick={useCallback(() => {
    setShowSettings(true);
  }, [])}
/>
```

**After (FIXED):**
```jsx
<Header
  onToggleUpcomingCases={handleToggleUpcomingCases}
  onSettingsClick={handleSettingsClick}
/>
```

**Applied to:**
- ✅ `Header` component (2 props)
- ✅ `UserView` component (5 props)
- ✅ `AdminView` component (4 props)
- ✅ `CategoryManagementModal` (1 prop - `onClose`)
- ✅ "Return to Browse" button (1 prop - `onClick`)

---

### Step 4: Extract CategoryManagementModal onClose Logic

**Location:** `src/App.jsx` lines ~686-718

**Problem:** The `CategoryManagementModal` had a long inline `onClose` function that:
- Closed the modal
- Reloaded categories from Supabase
- Reloaded procedures for those categories

**Solution:** Extracted to `handleCloseCategoryManagement` callback

**Before (BROKEN - inline in JSX):**
```jsx
<CategoryManagementModal
  currentUser={currentUser}
  onClose={() => {
    setShowCategoryManagement(false);
    if (currentUser?.subspecialtyId) {
      supabase.from('categories').select('*')...
      // ... 20+ lines of logic
    }
  }}
/>
```

**After (FIXED - handler ref):**
```jsx
<CategoryManagementModal
  currentUser={currentUser}
  onClose={handleCloseCategoryManagement}
/>
```

**Handler definition:**
```javascript
const handleCloseCategoryManagement = useCallback(() => {
  setShowCategoryManagement(false);
  // ... same logic, but defined at top level
}, [currentUser?.subspecialtyId]);
```

---

## 🐛 Additional Fixes (Discovered During Debugging)

### Fix #1: LoginView Missing useToast Import

**Problem:** `SuggestResourceModal` used `useToast()` but didn't import it  
**Symptom:** Error when trying to suggest a resource in browse mode  
**Location:** `src/components/resources/SuggestResourceModal.jsx`

**Fix:**
```javascript
// Added import
import { useToast } from '../common';
```

---

### Fix #2: Suggested Resources Not Visible in Admin

**Problem:** "Suggested Resources" banner only showed when `pendingCount > 0`  
**Symptom:** Admins couldn't see the section when there were 0 pending suggestions  
**Location:** `src/components/admin/AdminView.jsx`

**Fix:**
- Changed conditional from `{pendingCount > 0 && (...)}` to always show the banner
- When `pendingCount === 0`, banner shows "0 resources pending review" and is still clickable
- Modal handles empty state gracefully

**Before:**
```jsx
{pendingCount > 0 && (
  <div className="mb-6">
    <button onClick={onShowSuggestedResources}>...</button>
  </div>
)}
```

**After:**
```jsx
<div className="mb-6">
  <button onClick={onShowSuggestedResources}>
    {/* Always visible, shows count even when 0 */}
  </button>
</div>
```

---

### Fix #3: Categories Not Loading

**Problem:** Categories only loaded when `currentUser?.subspecialtyId` existed  
**Symptom:** Users without subspecialty (or with special cases) saw no categories  
**Location:** `src/App.jsx` `loadAllData` function

**Business Rules:**
- **Generalist subspecialty** → see all resources (all subspecialties)
- **Podiatry specialty** (no subspecialty) → same view as "Orthopaedic Surgery + Foot and Ankle"
- **Regular users** → see resources for their subspecialty

**Fix:**
1. Added constants in `src/utils/constants.js`:
   ```javascript
   export const SPECIALTY_SUBSPECIALTY = {
     GENERALIST: 'generalist',
     PODIATRY: 'podiatry',
     ORTHOPAEDIC_SURGERY: 'orthopaedic surgery',
     ORTHOPEDIC_SURGERY: 'orthopedic surgery', // US spelling
     FOOT_AND_ANKLE: 'foot and ankle',
   };
   ```

2. Created `fetchCategoriesAndProceduresForUser` helper:
   - Checks if user's subspecialty is "Generalist" → loads all categories
   - Checks if user's specialty is "Podiatry" → resolves "Foot and Ankle" subspecialty and loads those categories
   - Otherwise → loads categories for user's subspecialty

3. Updated `loadAllData` and `handleCloseCategoryManagement` to use the helper

**Code:**
```javascript
const fetchCategoriesAndProceduresForUser = useCallback(async (user) => {
  let loadAll = false;
  let effectiveSubspecialtyId = user?.subspecialtyId ?? null;

  if (user?.subspecialtyId) {
    const { data: sub } = await supabase
      .from('subspecialties')
      .select('name')
      .eq('id', user.subspecialtyId)
      .maybeSingle();
    const name = (sub?.name || '').toLowerCase();
    if (name === SPECIALTY_SUBSPECIALTY.GENERALIST) {
      loadAll = true;
      effectiveSubspecialtyId = null;
    }
  } else if (user?.specialtyId) {
    // Podiatry: no subspecialty; view = Orthopaedic Surgery + Foot and Ankle
    const { data: spec } = await supabase
      .from('specialties')
      .select('name')
      .eq('id', user.specialtyId)
      .maybeSingle();
    const specName = (spec?.name || '').toLowerCase();
    if (specName === SPECIALTY_SUBSPECIALTY.PODIATRY) {
      // Find Orthopaedic Surgery specialty (try both spellings)
      let ortho = null;
      for (const orthoName of [SPECIALTY_SUBSPECIALTY.ORTHOPAEDIC_SURGERY, SPECIALTY_SUBSPECIALTY.ORTHOPEDIC_SURGERY]) {
        const { data } = await supabase
          .from('specialties')
          .select('id')
          .ilike('name', orthoName)
          .limit(1)
          .maybeSingle();
        if (data?.id) {
          ortho = data;
          break;
        }
      }
      if (ortho?.id) {
        // Find Foot and Ankle subspecialty
        const { data: fa } = await supabase
          .from('subspecialties')
          .select('id')
          .eq('specialty_id', ortho.id)
          .ilike('name', SPECIALTY_SUBSPECIALTY.FOOT_AND_ANKLE)
          .limit(1)
          .maybeSingle();
        if (fa?.id) effectiveSubspecialtyId = fa.id;
      }
    }
    if (!effectiveSubspecialtyId) loadAll = true;
  } else {
    loadAll = true;
  }

  // Load categories based on resolved logic
  let categoriesData = [];
  if (loadAll) {
    const { data } = await supabase.from('categories').select('*').order('order');
    categoriesData = data || [];
  } else if (effectiveSubspecialtyId) {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('subspecialty_id', effectiveSubspecialtyId)
      .order('order');
    categoriesData = data || [];
  }

  // Load procedures for loaded categories
  let proceduresData = [];
  if (categoriesData.length > 0) {
    const { data } = await supabase
      .from('procedures')
      .select('*')
      .in('category_id', categoriesData.map((c) => c.id));
    proceduresData = data || [];
  }
  return { categoriesData, proceduresData };
}, []);
```

---

## 📋 Files Modified

### Core Fixes:
1. **`src/App.jsx`**
   - Moved all `useCallback` handlers to top level (before early returns)
   - Replaced inline `useCallback` in JSX with handler refs
   - Added `fetchCategoriesAndProceduresForUser` helper
   - Updated `loadAllData` to use category helper
   - Updated `handleCloseCategoryManagement` to use category helper

2. **`src/components/resources/SuggestResourceModal.jsx`**
   - Added `import { useToast } from '../common';`

3. **`src/components/admin/AdminView.jsx`**
   - Made "Suggested Resources" banner always visible (not conditional on count > 0)

4. **`src/utils/constants.js`**
   - Added `SPECIALTY_SUBSPECIALTY` constants for Generalist/Podiatry logic

---

## ✅ Verification Steps

### Test Login Flow:
1. ✅ Open app → should show login screen
2. ✅ Enter credentials → should sign in successfully
3. ✅ Should see main app (or onboarding if first time)
4. ✅ No React Error #310 in console
5. ✅ No "Rendered more hooks" errors

### Test Category Loading:
1. ✅ **Generalist user** → should see all categories from all subspecialties
2. ✅ **Podiatry user** → should see categories for "Foot and Ankle" (Orthopaedic Surgery)
3. ✅ **Regular user** → should see categories for their subspecialty only

### Test Suggested Resources:
1. ✅ **Admin with 0 pending** → should see "Suggested Resources" banner with "0 resources pending"
2. ✅ **Admin with pending** → should see banner with count badge
3. ✅ Clicking banner → opens modal (empty or with suggestions)

### Test Suggest Resource:
1. ✅ Click "Suggest Resource" in browse mode → modal opens without error
2. ✅ Fill form and submit → should succeed with toast notification

---

## 🎓 Key Learnings

### React Rules of Hooks:
1. **Hooks must be called in the same order every render**
2. **Hooks must not be called conditionally** (inside if/else, loops, or after early returns)
3. **Hooks must not be called inside JSX** - they must be at the component's top level

### Common Pitfalls:
- ❌ **Inline `useCallback` in JSX props** → Only runs when that JSX renders
- ❌ **Early returns before hooks** → Different hook counts per render path
- ❌ **Conditional hook calls** → Changes hook order between renders

### Best Practices:
- ✅ **Define all hooks at top of component** (before any returns)
- ✅ **Use handler refs in JSX** (pass `handleClick`, not `useCallback(() => {...}, [])`)
- ✅ **Extract complex logic to helpers** (like `fetchCategoriesAndProceduresForUser`)

---

## 🔗 Related Files

- `src/hooks/useAuth.js` - Authentication hook (already had fixes from previous session)
- `src/components/views/LoginView.jsx` - Login UI component
- `src/components/common/Toast.jsx` - Toast notification system
- `src/components/admin/AdminView.jsx` - Admin dashboard
- `src/components/modals/CategoryManagementModal.jsx` - Category management UI

---

## 📝 Notes

- The fix maintains **backward compatibility** - all functionality works the same, just with proper hook ordering
- The category loading logic now handles **special cases** (Generalist, Podiatry) that weren't handled before
- All changes are **non-breaking** - existing users and workflows continue to work

---

**Date:** January 25, 2026  
**Status:** ✅ **RESOLVED** - Login works, categories load correctly, all features functional
