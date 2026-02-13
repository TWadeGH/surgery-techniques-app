# Session Todo

## Session: 2026-02-04 (Completed)

### Completed
- [x] Update privacy policy age (13 → 18)
- [x] Add subspecialty admin peer messaging
- [x] Add contact emails to legal pages
- [x] Set jurisdiction to Harris County, Texas
- [x] Push changes to GitHub
- [x] Update CLAUDE.md with coding session guidelines
- [x] Create documentation templates (10 files)
- [x] Build web app for Capacitor
- [x] Sync to native projects
- [x] Test iOS build in Xcode simulator
- [x] Move search bar above categories (UX improvement)

### Notes
- Supabase had an outage mid-session (resolved)
- iOS build successful on Xcode 26.2
- Capacitor 8 uses Swift Package Manager (no CocoaPods needed)
- Search bar now appears above categories on mobile for better UX

---

## Session: 2026-02-10 — Bug Fixes (Completed)

### Completed
- [x] Bug 1: Contact Rep button — removed subspecialty filter from loadCompanies in App.jsx
- [x] Bug 2: Scroll/re-render on tab switch — deep-compare guard in loadUserProfile (useAuth.js)
- [x] Bug 3: Onboarding flash — added profileLoaded state to useAuth; gated onboarding effect in App.jsx
- [x] Bug 4: Admin Add Resource specialty not prepopulated — removed isInitialLoad ref from AddResourceModal.jsx
- [x] Bug 5: Category not appearing — same fix as Bug 4 (selectedSubspecialty effect now always fires)
- [x] Bug 6: All subspecialties shown on login — gated loadAllData on profileLoaded; parallel resource+category fetch

---

## Session: 2026-02-10 — Microsoft Outlook Calendar Integration

### Goal
Add Microsoft Outlook as a second calendar provider alongside Google Calendar.

### Prerequisites (User action required before code can be written)
- [ ] Register app in Microsoft Azure Portal → App registrations
- [ ] Set redirect URI: `https://bufnygjdkdemacqbxcrh.supabase.co/functions/v1/outlook-oauth-callback`
- [ ] Note Application (client) ID + create a Client Secret
- [ ] Add to Supabase secrets: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`

### Tasks
- [ ] Edge Function: `outlook-oauth-callback` (new)
- [ ] Edge Function: `create-calendar-event` (add Microsoft branch)
- [ ] Edge Function: `delete-calendar-event` (add Microsoft branch)
- [ ] Hook: `useCalendarConnection.js` — add `connectMicrosoft()`
- [ ] Hook: `useCalendarEvents.js` — remove hardcoded `provider: 'google'`
- [ ] UI: `SettingsModal.jsx` — add Outlook connect button + connected state
- [ ] UI: `CalendarEventModal.jsx` — add provider selector if both connected
- [ ] End-to-end test
- [ ] Push to GitHub

---

## Session: 2026-02-11 (Completed)

### Completed
- [x] Android build setup — ANDROID_HOME + JAVA_HOME in ~/.zshrc, APK built, tested on emulator
- [x] Custom app icons — scalpel logo, all sizes via @capacitor/assets (Android + iOS + PWA)
- [x] Custom splash screens — full-bleed design, 2732x2732 source, all platform sizes generated

- [x] #1 ResourceCard: "View Implant Info" → "Additional Implant Information"
- [x] #2 SuggestedResourcesModal: grouped by specialty → subspecialty (super_admin) or by subspecialty (specialty_admin), with pill counters
- [x] #3 TermsAcceptanceModal: Back button (in-onboarding: goes back to last step; post-onboarding gate: resets onboarding_complete)
- [x] #4 Podiatry → "Podiatric Surgery" + subtitle in Onboarding and SettingsModal specialty dropdowns
- [x] #5 TermsAcceptanceModal: Decline button (signs user out)
- [x] #6 Onboarding step 7 bug fixed: React state closure — caseVolumeOverride passed directly to handleComplete, loading guard on cards
- [x] #7 SettingsModal: user type dropdown added (surgeon/trainee/app/industry/student)
- [x] Security hardening: allowlist checks added for caseVolumeOverride and selectedUserType

### Deferred
- [ ] #8 Company name search — requires subspecialty_companies join to resources query; investigate schema before implementing

### Known Issues (Pre-existing)
- 13 test failures in helpers.test.js, users.test.js, Toast.test.jsx — all pre-existing, none in changed files
- Pre-commit hooks not configured (.pre-commit-config.yaml missing)
- semgrep, gitleaks, snyk not installed — security scanners needed
- Main bundle chunk size warning (pre-existing)

### Review
Android fully unblocked. Platform tweaks complete. Security checklist done retroactively — gaps identified and fixed. Pre-commit hooks and scanner stack remain outstanding infrastructure work.
