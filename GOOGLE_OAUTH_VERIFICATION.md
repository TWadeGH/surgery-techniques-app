# Google OAuth Verification — Status & Plan
Last Updated: 2026-02-13

---

## Why This Matters
Google Calendar integration requires OAuth. In "Testing" mode the app is capped at **100 users**. To go fully public, Google must verify the app. Calendar scopes are "sensitive" — verification typically takes 4–6 weeks once submitted.

---

## Current Status: BLOCKED on Branding Verification

Two errors persist every time we submit:

1. **"Your home page does not explain the purpose of your app."**
2. **"Your home page URL does not include a link to your privacy policy."**

---

## What We've Already Done

### Completed ✅
- Created standalone static pages:
  - `https://surgicaltechniques.app/terms.html`
  - `https://surgicaltechniques.app/privacy.html`
- Added Privacy Policy + Terms links to the **login page** (React component)
- Added `<meta name="description">` to `index.html`
- Added `<noscript>` block with privacy link to `index.html`
- Moved privacy/terms links to an always-visible `<footer>` in `index.html`
- Added `<link rel="privacy-policy" href="...">` in `<head>`
- Switched all footer links to absolute URLs
- Resolved the **domain ownership** issue (no longer appearing)

### Why It's Still Failing — Root Cause Theory
The app is a **React SPA**. When Google's branding verification crawler fetches `https://surgicaltechniques.app`, the raw HTML only contains a `<div id="root">` — all visible content is rendered by JavaScript. Google's OAuth checker may not execute JavaScript the same way Googlebot does, meaning:
- It sees the raw HTML (which does now have our footer and meta tags)
- But it may be applying a stricter or cached check that our additions haven't satisfied yet

All our code changes ARE visible in the raw page source (`view-source:https://surgicaltechniques.app`) — the footer and meta tags are there. This suggests Google's checker may be using a cached crawl result or has specific requirements we haven't pinpointed yet.

---

## Things Still To Check (Do These First Next Session)

### 1. Fill in App Domain fields in Branding page
In Google Cloud Console → Auth Platform → **Branding** → scroll down to **"App domain"** section. Make sure ALL three fields are filled in and saved:
- **Home page URL:** `https://surgicaltechniques.app`
- **Privacy Policy URL:** `https://surgicaltechniques.app/privacy.html`
- **Terms of Service URL:** `https://surgicaltechniques.app/terms.html`

This is likely the missing piece. Google cross-checks whether the home page links to the **exact URL** entered in the Privacy Policy field.

### 2. Verify domain in Google Search Console
If not already done:
1. Go to search.google.com/search-console
2. Add `surgicaltechniques.app` as a property
3. Verify via DNS TXT record in Cloudflare
4. Once verified, Google Cloud Console will recognize domain ownership

### 3. Try "I believe the issues found are incorrect"
If fixes above don't work: select **"I believe the issues found are incorrect"** instead of "I have fixed the issues." This routes to a human reviewer who can actually look at the page rather than relying on an automated crawler that may have a SPA blind spot.

### 4. Alternative: Create a real static landing page
If all else fails, replace `index.html` with a static landing/marketing page that:
- Describes the app prominently
- Has visible Privacy Policy and Terms links in plain HTML
- Has a "Sign In" button that routes users into the React app
- Is fully crawlable without JavaScript

This is the most reliable long-term fix and also improves the app's public web presence.

---

## Scopes Still Needed
After branding is resolved, go to **Data Access** and add both calendar scopes:
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/calendar.readonly`

Once scopes are added, Verification Center will show a submission button.

---

## Full Verification Checklist (Google's Requirements)

| Requirement | Status |
|---|---|
| App name | ✅ "Surgical Techniques App" |
| Logo uploaded | ✅ Scalpel icon |
| Support email | ✅ thmoderntx@gmail.com |
| Home page URL | ✅ https://surgicaltechniques.app |
| Privacy Policy URL (in form) | ⚠️ Needs confirming in App domain fields |
| Terms of Service URL (in form) | ⚠️ Needs confirming in App domain fields |
| Privacy link on home page | ⚠️ Added to HTML but checker not accepting |
| App purpose on home page | ⚠️ Added to HTML but checker not accepting |
| Domain ownership verified | ✅ Resolved |
| Calendar scopes added | ❌ Not added yet |
| Verification submitted | ❌ Blocked by branding issues |

---

## Estimated Timeline (Once Unblocked)
- Branding approval: hours to a few days
- Scope verification (sensitive scopes): 4–6 weeks
- Calendar integration fully public: ~6 weeks from submission
