# Surgery Techniques App – Testing Progress

**Last updated:** 2026-01-27  
**Tester:** Theresa Sandoval  

This document summarizes the manual testing completed so far against the master checklist in `TESTING_DOCUMENT.md`.

---

## 1. Basic Authentication (Test 1)

### 1.1 Login Flow (Google OAuth) – ✅ PASS (after fixes)
- **Scenario:** Incognito window, open `http://localhost:5176`, click “Sign in with Google”.
- **Result:**
  - App loads to login screen (no white screen).
  - Google sign‑in succeeds and returns to main app.
  - Console: no React hook ordering errors; React error #310 no longer appears.
- **Notes / Fixes:**
  - `useAuth.js` updated to:
    - Create a minimal `currentUser` as soon as `SIGNED_IN` fires.
    - Prioritize `session.user.email` so the correct Google email displays.
  - `LoginView.jsx` updated to validate email/password, sanitize error messages, and avoid long “frozen” loading states.

### 1.2 Session Persistence – ✅ PASS
- **Scenario:** Log in, then refresh the page (Cmd+R / F5).
- **Result:**
  - User remains logged in; app does **not** return to login screen.
  - Categories and resources reload correctly after refresh.
- **Key Logic:**
  - `useAuth.checkSession()` explicitly sets `currentUser` and `loading=false` when a valid Supabase session exists.
  - `App.jsx` uses `currentUser` (with `specialtyId` / `subspecialtyId`) to decide whether to show onboarding or main app.

### 1.3 Logout – ✅ PASS
- **Scenario:** From main app, open Settings, click “Sign Out”, then log back in.
- **Result:**
  - User is returned to the login screen on sign‑out.
  - Subsequent login (email or Google) succeeds and loads the main app.
- **Notes:**
  - `signOut` in `useAuth` clears `currentUser` and resets loading/error state cleanly.

---

## 2. Onboarding Flow (Test 2)

### 2.1 Check Current State – ✅ COMPLETED
- **Implementation:**
  - Onboarding is **enabled** and controlled dynamically in `App.jsx`:
    - `showOnboarding` is `true` when:
      - `currentUser.specialtyId` or `currentUser.subspecialtyId` is missing, **or**
      - `currentUser.onboardingComplete === false`.
    - Otherwise, the main app is shown.
  - `App.jsx` now renders `Onboarding` (not `OnboardingFlow`) so that specialty/subspecialty selection runs through the Podiatry/Foot & Ankle logic.
- **Recorded state:**
  - `Onboarding Status: ENABLED`
  - `Reason: Uses presence of specialty/subspecialty and onboardingComplete flag to determine if onboarding is required.`

### 2.2 New User Onboarding – ✅ PASS (with Podiatry mapping)
- **Setup:**
  - In Supabase `profiles`, created/modified a test user with:
    - `primary_specialty_id = NULL`
    - `primary_subspecialty_id = NULL`
    - `onboarding_complete = false`
- **Flow:**
  1. Log in with the test account.
  2. Onboarding screen appears instead of main app.
  3. Step 1: User type selection (`surgeon`, `industry`, `student`) works.
  4. Step 2: Specialty list loads from `specialties` table.
  5. Step 3: Subspecialty list loads from `subspecialties` table (except for Podiatry – see below).
  6. Click “Continue” / “Complete Setup”.
  7. User lands on the main app.
  8. Supabase `profiles` shows:
     - `user_type` set
     - `primary_specialty_id` and `primary_subspecialty_id` set
     - `onboarding_complete = true`
- **Special Podiatry case:**
  - `Onboarding.jsx`:
    - Detects when the user chooses **Podiatry**.
    - Calls `mapPodiatryToFootAnkle()` to map to:
      - Specialty: **Orthopedic Surgery**
      - Subspecialty: **Foot & Ankle**
    - Skips the subspecialty step for Podiatry and saves the mapped IDs.
- **Security adjustments:**
  - We **removed strict UUID‑shape / all‑zero rejection** in `Onboarding.jsx` because current seed data uses all‑zero UUIDs.
  - We kept:
    - Required‑field checks for specialty, subspecialty, and userType.
    - `userType` allowlist (`surgeon`, `industry`, `student`, `trainee`).
    - No PII in logs; user‑facing errors are sanitized.

### 2.3 Existing User (Skip Onboarding) – ⏳ PENDING
- **To test next:**
  - Use a profile where:
    - `primary_specialty_id` and `primary_subspecialty_id` are set.
    - `onboarding_complete = true`.
  - Log in and confirm:
    - Onboarding screen does **not** appear.
    - Main app loads directly.

---

## 3. Category & Resource Loading (Test 3)

### 3.1 Regular User (with Subspecialty) – ✅ PASS
- **Setup:**
  - Log in as a user whose profile has a specific subspecialty (non‑Generalist, non‑Podiatry).
- **Behavior:**
  - Left sidebar categories load successfully.
  - Categories are filtered to the user’s **subspecialty** only.
  - Clicking different categories loads associated resources; when a category has none, UI shows an empty/“no resources” state without crashing.
  - No infinite spinners or blank screens observed.
- **Implementation details:**
  - `App.jsx` uses `fetchCategoriesAndProceduresForUser(currentUser)`:
    - If user has a normal subspecialty → restricts categories to that subspecialty.
    - Uses `procedures` table with `in('category_id', ...)` to fetch resources per category.

### 3.2 Generalist User – ⏳ PENDING
- **Expected behavior:**
  - User with subspecialty **Generalist** should see **all categories** across subspecialties.
  - Categories should be clearly attributable to their underlying subspecialties.
- **Implementation hook:**
  - `fetchCategoriesAndProceduresForUser` checks the subspecialty name:
    - If it equals `SPECIALTY_SUBSPECIALTY.GENERALIST` → `loadAll = true` and loads all categories.
- **Remaining work:**
  - Create/identify a **Generalist** profile in Supabase.
  - Run through the 3.2 steps and log results.

### 3.3 Podiatry User – ⏳ PENDING (logic implemented)
- **Implementation (already in code):**
  - If the user’s **specialty** is Podiatry and they have **no subspecialty**:
    - `fetchCategoriesAndProceduresForUser`:
      - Resolves Orthopedic Surgery’s ID (UK/US spelling variants handled).
      - Resolves the **Foot & Ankle** subspecialty ID under Orthopedic Surgery.
      - Sets `effectiveSubspecialtyId` to that Foot & Ankle ID.
      - Loads categories and procedures for Foot & Ankle.
- **To test:**
  - In `profiles`, set:
    - `primary_specialty_id` → Podiatry row.
    - `primary_subspecialty_id = NULL`.
  - Log in and verify:
    - Categories shown match Orthopedic Surgery → Foot & Ankle view.
    - Resources load without errors.

---

## 4. Dark Mode & UI (Partial from Test 7.2)

### Dark Mode Toggle – ✅ FUNCTIONAL, THEME TUNING PENDING
- **Behavior:**
  - Settings → Dark Mode toggle calls `onDarkModeToggle`.
  - `darkMode` state in `App.jsx`:
    - Persists in `localStorage['darkMode']`.
    - Applies/removes `document.documentElement.classList.add('dark')`.
  - `tailwind.config.js` updated with `darkMode: 'class'`.
  - `styles.css` and `index.css` updated so base colors respond to `.dark`.
- **Current status:**
  - Toggle events fire and the `.dark` class is added/removed correctly.
  - Visual differences between themes are present but may need further polish (future Test 7.2 work).

---

## 5. Database Integrity & UUID Fix Attempts (Out of Scope for App Logic)

### What was discovered
- Seed data in Supabase uses **all-zero UUIDs** for:
  - `specialties.id` – Orthopedic Surgery, Podiatry.
  - Several `subspecialties.id` – including Foot & Ankle and others.
- Integrity checks show:
  - **0 invalid foreign keys** from `profiles` to `specialties` / `subspecialties`.
  - Relationships between categories, subspecialties, and specialties are internally consistent.

### What was attempted (then abandoned)
- Several SQL migration scripts (`fix_specialty_uuids*.sql`, `fix_uuids_SAFE_SIMPLE.sql`) were drafted to:
  - Replace all-zero UUIDs with new `gen_random_uuid()` values.
  - Update all foreign key references.
  - Work around audit triggers (`log_procedure_changes`) and `procedure_history` FK constraints.
- These scripts became complex and risky for production data.

### Final decision (current state)
- **Do not modify Supabase data further** during this testing phase.
- Keep:
  - Existing all-zero UUIDs as legitimate IDs.
  - Application logic updated to **not reject** these IDs.
- All onboarding and filtering logic now treats these IDs as valid, relying on:
  - Presence/non‑null checks.
  - Known mapping rules (e.g., Podiatry → Orthopedic Surgery + Foot & Ankle).

---

## 6. Summary of Test Status vs. Master Checklist

| Test ID | Area                              | Status     | Notes                                                    |
|--------:|-----------------------------------|------------|---------------------------------------------------------|
| 1.1     | Login Flow (Google)              | ✅ Passed  | No React 310, no hook errors, correct email display     |
| 1.2     | Session Persistence              | ✅ Passed  | Remains logged in after refresh                         |
| 1.3     | Logout & Re-login                | ✅ Passed  | Clean logout → login works                              |
| 2.1     | Onboarding State                 | ✅ Done    | Onboarding enabled; uses specialty/subspecialty/flag    |
| 2.2     | New User Onboarding              | ✅ Passed  | Includes Podiatry mapping → Foot & Ankle                |
| 2.3     | Existing User Skip Onboarding    | ⏳ Pending | To verify with completed profile                        |
| 3.1     | Categories – Regular User        | ✅ Passed  | Subspecialty‑scoped categories & resources              |
| 3.2     | Categories – Generalist User     | ⏳ Pending | Requires Generalist test profile                        |
| 3.3     | Categories – Podiatry User       | ⏳ Pending | Logic implemented; test with Podiatry profile           |
| 7.2     | Dark Mode Toggle                 | ✅ Partial | Toggle works; visual polish still in progress           |

All other tests from `TESTING_DOCUMENT.md` (4.x–10.x) are **not yet executed** and remain to be tested.

