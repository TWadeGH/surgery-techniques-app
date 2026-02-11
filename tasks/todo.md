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
