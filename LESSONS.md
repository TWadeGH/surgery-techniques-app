# Lessons Learned

Document mistakes and patterns to avoid. Update after every correction from the user.

---

## Session: 2026-02-04

### Lesson 1: Check Supabase status for auth failures
**What happened:** Login wasn't working, showed "Failed to fetch" error.
**Root cause:** Supabase was having an infrastructure outage (project showed "Unhealthy").
**Rule:** When auth fails with network errors, check Supabase dashboard and status.supabase.com before debugging code.

---

## Template for New Lessons

### Lesson N: [Short title]
**What happened:** [What went wrong]
**Root cause:** [Why it happened]
**Rule:** [What to do differently next time]
