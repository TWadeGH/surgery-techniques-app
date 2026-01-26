[TESTING_CHECKLIST.md](https://github.com/user-attachments/files/24864339/TESTING_CHECKLIST.md)
# Complete Testing Checklist - Surgery Techniques App

**Date Created:** January 25, 2026  
**Purpose:** Systematic testing after login debugging and component refactoring  
**Status:** Ready for testing

---

## 📋 Testing Overview

This document provides a comprehensive checklist to verify all functionality after:
- 8-hour debugging session fixing React Error #310
- Component refactoring (5,747 lines → 883 lines)
- Login flow fixes (inline useCallback removal)
- Category loading logic improvements

---

## 🎯 Testing Priority Levels

⭐ **CRITICAL** - Must work for app to be functional  
🔶 **HIGH** - Important features users rely on  
🔷 **MEDIUM** - Nice-to-have features  
⚪ **LOW** - Polish and edge cases

---

## 🧪 Test Suite

### **Test 1: Basic Authentication** ⭐ CRITICAL

#### 1.1 Login Flow
- [ ] Open app in **incognito/private window**
- [ ] Should see login screen (not white screen)
- [ ] Click "Sign in with Google"
- [ ] Successfully authenticate
- [ ] Should land on main app (not Error #310)
- [ ] **Console check:** No errors, no "Rendered more hooks"

**Expected Result:** Smooth login, no errors, app loads  
**Bug Severity if Fails:** CRITICAL

---

#### 1.2 Session Persistence
- [ ] After logging in, **refresh the page** (F5 or Cmd+R)
- [ ] Should stay logged in (not return to login screen)
- [ ] App loads correctly without re-authentication

**Expected Result:** User remains logged in across page refreshes  
**Bug Severity if Fails:** HIGH

---

#### 1.3 Logout
- [ ] Click settings/profile icon (if visible)
- [ ] Click "Sign Out" button
- [ ] Should return to login screen
- [ ] Try logging in again - should work

**Expected Result:** Clean logout, can log back in  
**Bug Severity if Fails:** HIGH

---

### **Test 2: Onboarding Flow** 🔶 HIGH

#### 2.1 Check Current State
**First, determine if onboarding is enabled:**
- [ ] Go to GitHub → `src/App.jsx` 
- [ ] Search for `showOnboarding`
- [ ] Check if it's commented out: `const showOnboarding = false;`
- [ ] **If commented out:** Onboarding is disabled, skip to Test 3
- [ ] **If active:** Continue with tests below

**Notes:** Document current state here:
```
Onboarding Status: [ENABLED / DISABLED]
Reason: [If disabled, why?]
```

---

#### 2.2 New User Onboarding (if enabled)
**Setup:**
1. Go to Supabase Dashboard → Table Editor → profiles
2. Create or modify test user with `onboarding_complete = false`

**Tests:**
- [ ] Log in with test account
- [ ] Should see onboarding screen (not main app)
- [ ] Step 1: Select user type (surgeon/trainee/industry/student)
- [ ] Step 2: Select specialty (if surgeon)
- [ ] Step 3: Select subspecialty (if surgeon)
- [ ] Click "Complete" or "Continue" at each step
- [ ] After completion, should land on main app
- [ ] Check Supabase: `onboarding_complete` should now be `true`

**Expected Result:** Smooth onboarding flow, data saved  
**Bug Severity if Fails:** HIGH

---

#### 2.3 Existing User (skip onboarding)
- [ ] Log in with account where `onboarding_complete = true`
- [ ] Should skip onboarding entirely
- [ ] Should go straight to main app

**Expected Result:** No onboarding shown for existing users  
**Bug Severity if Fails:** MEDIUM

---

### **Test 3: Category & Resource Loading** ⭐ CRITICAL

#### 3.1 Regular User (with Subspecialty)
**Setup:** Log in as user with a specific subspecialty (not Generalist, not Podiatry)

- [ ] Categories load on left sidebar/navigation
- [ ] Should see categories **only for your subspecialty**
- [ ] Click on a category
- [ ] Resources should load for that category
- [ ] Click through 3-4 different categories
- [ ] All should load resources (or show "no resources" if empty)
- [ ] No blank screens or indefinite loading spinners

**Expected Result:** Categories and resources load correctly  
**Bug Severity if Fails:** CRITICAL

---

#### 3.2 Generalist User
**Setup:** Log in as user with subspecialty = "Generalist"  
(Create test user in Supabase if needed)

- [ ] Should see **ALL categories** from all subspecialties
- [ ] Verify categories from multiple subspecialties are visible
- [ ] Categories should be clearly labeled with their subspecialty
- [ ] All resources should be accessible

**Expected Result:** Generalist sees everything  
**Bug Severity if Fails:** HIGH

---

#### 3.3 Podiatry User
**Setup:** Log in as user with specialty = "Podiatry" and no subspecialty  
(Create test user in Supabase if needed)

- [ ] Should see categories for **"Foot and Ankle"** subspecialty
- [ ] This should match the view of "Orthopaedic Surgery + Foot and Ankle"
- [ ] Resources should load correctly

**Expected Result:** Podiatry users see Foot & Ankle content  
**Bug Severity if Fails:** HIGH (business logic requirement)

---

### **Test 4: Core Features** 🔶 HIGH

#### 4.1 Favorites
- [ ] Click heart icon on a resource
- [ ] Heart should fill/highlight (visual feedback)
- [ ] Refresh the page (F5)
- [ ] Favorite should persist (heart still filled)
- [ ] Click heart again to unfavorite
- [ ] Heart should unfill
- [ ] Refresh - unfavorite should persist
- [ ] Toggle "Show Favorites Only" filter
- [ ] Should only show favorited resources
- [ ] Toggle off - all resources reappear

**Expected Result:** Favorites persist and filter works  
**Bug Severity if Fails:** HIGH

---

#### 4.2 Notes
- [ ] Click on a resource card to view details
- [ ] Find notes section
- [ ] Add a note (e.g., "Test note 123")
- [ ] Wait 3-5 seconds (auto-save)
- [ ] Refresh the page
- [ ] Note should persist
- [ ] Edit the note (change text)
- [ ] Wait for auto-save
- [ ] Refresh - changes should persist
- [ ] Delete/clear the note
- [ ] Refresh - note should be gone

**Expected Result:** Notes auto-save and persist  
**Bug Severity if Fails:** HIGH

---

#### 4.3 Upcoming Cases
- [ ] Find "Add to Upcoming Cases" button on a resource
- [ ] Click it
- [ ] Resource should appear in "Upcoming Cases" sidebar/section
- [ ] Add 2-3 more resources to upcoming cases
- [ ] Try dragging to reorder cases
- [ ] Order should change
- [ ] Refresh page
- [ ] Upcoming cases and order should persist
- [ ] Remove a case from upcoming cases
- [ ] Should disappear immediately
- [ ] Refresh - removal should persist

**Expected Result:** Upcoming cases work with drag-drop and persistence  
**Bug Severity if Fails:** HIGH

---

#### 4.4 Search
- [ ] Locate search bar
- [ ] Type a query (e.g., "suture")
- [ ] Results should filter in real-time as you type
- [ ] Should see only matching resources
- [ ] Try another search term
- [ ] Results update
- [ ] Clear search (delete text or click X)
- [ ] All resources should reappear

**Expected Result:** Real-time search filtering works  
**Bug Severity if Fails:** MEDIUM

---

### **Test 5: Suggest Resource Feature** 🔷 MEDIUM

#### 5.1 User: Suggest Resource Modal
- [ ] Find "Suggest Resource" button (in browse mode)
- [ ] Click it
- [ ] Modal should open (no console errors)
- [ ] Fill out the form:
  - [ ] Select a category (dropdown should work)
  - [ ] Select a procedure (dropdown should work)
  - [ ] Enter resource name
  - [ ] Enter resource URL
  - [ ] Add description (optional)
- [ ] Click "Submit"
- [ ] Should see success toast notification
- [ ] Modal should close
- [ ] **Console check:** No errors, especially no "useToast is not defined"

**Expected Result:** Suggestion submitted successfully  
**Bug Severity if Fails:** MEDIUM

---

#### 5.2 Admin: View Suggested Resources
**Setup:** Log in as admin user

- [ ] Should see "Suggested Resources" banner at top of admin view
- [ ] Banner should show count of pending suggestions (even if 0)
- [ ] Click the banner
- [ ] Modal opens showing pending suggestions
- [ ] **If no suggestions:** Should show empty state gracefully
- [ ] **If suggestions exist:**
  - [ ] Can see suggestion details
  - [ ] Can approve suggestion
  - [ ] Can reject suggestion
  - [ ] Can edit suggestion before approving
  - [ ] Actions work without errors

**Expected Result:** Admin can manage suggestions  
**Bug Severity if Fails:** MEDIUM

---

### **Test 6: Admin Features** 🔷 MEDIUM (If Admin User)

#### 6.1 Admin View Access
**Setup:** Log in with admin account

- [ ] Should see "Admin" tab/button in header
- [ ] Click to switch to admin view
- [ ] Should see admin dashboard
- [ ] Should see resources list
- [ ] Should see analytics (if implemented)

**Expected Result:** Admin view accessible  
**Bug Severity if Fails:** HIGH (for admins)

---

#### 6.2 Add Resource
- [ ] Click "Add Resource" button
- [ ] Modal/form opens
- [ ] Fill out all required fields:
  - [ ] Category
  - [ ] Procedure
  - [ ] Resource name
  - [ ] URL
  - [ ] Description
  - [ ] Image (if applicable)
- [ ] Click "Submit" or "Add"
- [ ] Should see success message
- [ ] Resource should appear in resources list
- [ ] Check user view - resource should be visible there too

**Expected Result:** New resource created successfully  
**Bug Severity if Fails:** HIGH (for admins)

---

#### 6.3 Edit Resource
- [ ] Find existing resource in admin list
- [ ] Click edit button/icon
- [ ] Modal opens with current data pre-filled
- [ ] Modify one or more fields
- [ ] Save changes
- [ ] Should see success message
- [ ] Changes should appear immediately in list
- [ ] Check user view - changes should be visible

**Expected Result:** Resource edits persist  
**Bug Severity if Fails:** HIGH (for admins)

---

#### 6.4 Category Management
- [ ] Click "Manage Categories" button
- [ ] Modal should open
- [ ] Should see list of categories
- [ ] Should see list of procedures under categories
- [ ] Try editing if functionality exists
- [ ] Close modal - should close cleanly

**Expected Result:** Category management accessible  
**Bug Severity if Fails:** MEDIUM

---

#### 6.5 Analytics Dashboard
**Note:** If not yet implemented, skip this section

- [ ] Navigate to analytics section
- [ ] Should see metrics/charts
- [ ] Data should load (no indefinite spinners)
- [ ] No errors loading data

**Expected Result:** Analytics display correctly  
**Bug Severity if Fails:** LOW

---

### **Test 7: UI/UX Polish** ⚪ LOW

#### 7.1 Responsive Design
- [ ] Resize browser window to narrow width (~400px)
- [ ] UI should adapt to mobile layout
- [ ] Navigation should work (hamburger menu if applicable)
- [ ] All buttons should be clickable
- [ ] Text should be readable (not cut off)
- [ ] Resize back to desktop width
- [ ] UI should adapt back to desktop layout

**Expected Result:** Responsive design works  
**Bug Severity if Fails:** LOW

---

#### 7.2 Dark Mode (if implemented)
- [ ] Find dark mode toggle (settings or header)
- [ ] Toggle dark mode on
- [ ] UI should switch to dark theme
- [ ] All text should remain readable
- [ ] Refresh page
- [ ] Dark mode preference should persist
- [ ] Toggle back to light mode
- [ ] Should switch themes smoothly

**Expected Result:** Dark mode works and persists  
**Bug Severity if Fails:** LOW

---

#### 7.3 Loading States
- [ ] Throughout all tests, observe loading indicators
- [ ] Spinners should appear when data is loading
- [ ] Spinners should disappear when data loads
- [ ] No indefinite loading states (stuck spinners)
- [ ] Transitions should be smooth

**Expected Result:** Good loading UX  
**Bug Severity if Fails:** LOW

---

### **Test 8: Error Handling** 🔷 MEDIUM

#### 8.1 Network Errors
**Setup:** Intentionally create network issues

- [ ] Start using the app normally
- [ ] Turn off wifi/internet briefly (10-15 seconds)
- [ ] Try to perform an action (e.g., save note, add favorite)
- [ ] Should see error message (not crash)
- [ ] Turn wifi back on
- [ ] Try action again
- [ ] Should work now
- [ ] App should recover gracefully

**Expected Result:** Graceful degradation on network issues  
**Bug Severity if Fails:** MEDIUM

---

#### 8.2 Invalid Data
- [ ] Try submitting forms with missing required fields
- [ ] Should see validation error messages
- [ ] Should not submit
- [ ] Should not crash
- [ ] Fill in required fields
- [ ] Should submit successfully

**Expected Result:** Form validation works  
**Bug Severity if Fails:** MEDIUM

---

### **Test 9: Console Checks** ⭐ CRITICAL

**This test runs alongside all other tests**

#### 9.1 No Errors During Testing
- [ ] Open browser DevTools (F12 or Cmd+Option+I)
- [ ] Click "Console" tab
- [ ] Clear console (click trash icon)
- [ ] Go through Tests 1-8 above
- [ ] Monitor console for red error messages
- [ ] **Should see NO red errors**
- [ ] Yellow warnings are acceptable (but note them)

**Expected Result:** Clean console, no errors  
**Bug Severity if Fails:** Depends on error

---

#### 9.2 Specific Console Checks

**Auth Setup Logs** (on page load/login):
```
✅ Expected:
Setting up auth for the first time (global flag set)
Starting initial session check...
Creating minimal user from SIGNED_IN event

❌ Should NOT see:
Creating minimal user from SIGNED_IN event (TWICE)
Rendered more hooks than during the previous render
Uncaught Error: Minified React error #310
```

**Profile Loading** (after login):
```
✅ Expected:
Loading profile for user: "..."
Profile found, returning it: "user@example.com"

❌ Should NOT see:
Profile loading exceeded 30 second timeout
Component unmounted, skipping profile update
```

**Document any unexpected console messages here:**
```
[Note any warnings or errors observed]
```

---

### **Test 10: Cross-Browser Testing** ⚪ LOW (Optional)

**Note:** Only if time permits. Chrome is primary target.

#### 10.1 Chrome
- [ ] Run Tests 1-9 in Chrome
- [ ] All tests pass

#### 10.2 Safari
- [ ] Run Tests 1-9 in Safari
- [ ] All tests pass
- [ ] Note any differences

#### 10.3 Firefox
- [ ] Run Tests 1-9 in Firefox
- [ ] All tests pass
- [ ] Note any differences

#### 10.4 Edge
- [ ] Run Tests 1-9 in Edge
- [ ] All tests pass
- [ ] Note any differences

---

## 📊 Testing Results Summary

**Fill this out after completing all tests:**

### Overall Status
- **Total Tests:** [Count]
- **Passed:** [Count] ✅
- **Failed:** [Count] ❌
- **Skipped:** [Count] ⏭️
- **Date Tested:** [Date]
- **Tester:** [Your Name]

### Critical Issues Found
1. [Issue description - if any]
2. [Issue description - if any]

### High Priority Issues Found
1. [Issue description - if any]
2. [Issue description - if any]

### Medium/Low Priority Issues
1. [Issue description - if any]
2. [Issue description - if any]

### Notes
[Any additional observations]

---

## 🐛 Bug Report Template

**Use this template when documenting bugs:**

### Bug #[Number]: [Short Description]

**Severity:** CRITICAL / HIGH / MEDIUM / LOW

**Test Section:** [Which test revealed this bug]

**Steps to Reproduce:**
1. Do this
2. Then this
3. Then this
4. See error

**Expected Behavior:**  
[What should happen]

**Actual Behavior:**  
[What actually happens]

**Console Errors:**  
```
[Copy/paste any console errors here]
```

**Screenshots:**  
[Attach if applicable]

**Environment:**
- Browser: [Chrome/Safari/etc]
- OS: [Mac/Windows/etc]
- User Type: [Admin/Regular User/etc]

**Workaround:**  
[If you found a temporary workaround, note it here]

---

## 🎯 Recommended Testing Order

**Phase 1: Core Functionality** (Do First)
1. Test 1: Authentication ⭐
2. Test 9: Console Checks ⭐
3. Test 3: Categories/Resources ⭐

**Phase 2: Main Features** (Do Second)
4. Test 4: Core Features (Favorites, Notes, Upcoming Cases)
5. Test 5: Suggest Resource

**Phase 3: Admin & Polish** (Do Third)
6. Test 2: Onboarding (if enabled)
7. Test 6: Admin Features (if admin user)
8. Test 7: UI/UX
9. Test 8: Error Handling

**Phase 4: Optional** (If Time Permits)
10. Test 10: Cross-Browser

---

## 📝 Daily Testing Log

**Use this to track testing sessions:**

### Session 1: [Date]
**Time:** [Start - End]  
**Tests Completed:** [Test numbers]  
**Bugs Found:** [Count]  
**Status:** [In Progress / Completed]  
**Notes:**
- [Note 1]
- [Note 2]

### Session 2: [Date]
**Time:** [Start - End]  
**Tests Completed:** [Test numbers]  
**Bugs Found:** [Count]  
**Status:** [In Progress / Completed]  
**Notes:**
- [Note 1]
- [Note 2]

---

## ✅ Sign-Off Checklist

**Before declaring testing complete:**

- [ ] All CRITICAL tests pass
- [ ] All HIGH priority tests pass
- [ ] All known CRITICAL/HIGH bugs documented
- [ ] Console is clean (no red errors)
- [ ] Login works consistently
- [ ] Core features (favorites, notes, upcoming cases) work
- [ ] Admin functions work (if applicable)
- [ ] Testing results documented above

**Sign-Off:**
- **Tester:** [Your Name]
- **Date:** [Date]
- **Status:** READY FOR PRODUCTION / NEEDS FIXES

---

*Document Version: 1.0*  
*Last Updated: January 25, 2026*  
*Purpose: Post-refactoring comprehensive testing*
