# Lessons Learned

Document mistakes and patterns to avoid. Update after every correction from the user.

---

## Session: 2026-02-04

### Lesson 1: Check Supabase status for auth failures
**What happened:** Login wasn't working, showed "Failed to fetch" error.
**Root cause:** Supabase was having an infrastructure outage (project showed "Unhealthy").
**Rule:** When auth fails with network errors, check Supabase dashboard and status.supabase.com before debugging code.

---

## Session: 2026-02-11

### Lesson 2: Run security checklist before writing code, not after
**What happened:** Implemented 7 UI changes, built successfully, then was asked "did you use CLAUDE.md?" — revealed the mandatory security checklist, tasks/todo.md, and test-first requirements had been skipped.
**Root cause:** Jumped straight from planning to coding without following session startup sequence. Security checklist felt like overhead on "small" UI changes.
**Rule:** No change is too small to skip the checklist. Write tasks/todo.md first, get user approval, then code. Security audit before implementation catches issues earlier and cheaper.

### Lesson 3: React state closure bug pattern in onboarding step handlers
**What happened:** Step 7 of onboarding triggered `handleComplete()` via `setTimeout(() => handleComplete(), 200)` after `setAnnualCaseVolume(opt.value)`. The `annualCaseVolume` value in the closure was stale, causing the validation alert to fire even after the user selected an option.
**Root cause:** React `setState` is async; the closure captures the old value. A 200ms delay is not guaranteed to resolve the state update.
**Rule:** When calling a function immediately after setState, pass the new value directly as a parameter rather than reading it from state inside the function. Never rely on setTimeout to "wait for" state to update.

### Lesson 4: Security scanners and pre-commit hooks are not installed
**What happened:** Phase 3 of the security checklist (semgrep, gitleaks, snyk) could not run — none are installed. Pre-commit hooks also not configured.
**Root cause:** Infrastructure setup was never completed.
**Rule:** Flag this at the start of each session. These are blocking requirements per CLAUDE.md. Recommend installing before the next code-heavy session.

---

## Template for New Lessons

### Lesson N: [Short title]
**What happened:** [What went wrong]
**Root cause:** [Why it happened]
**Rule:** [What to do differently next time]
