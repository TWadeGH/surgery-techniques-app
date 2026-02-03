# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A surgical techniques resource app built with React 19, Vite 7, and Supabase (PostgreSQL + Auth). Deployed to Cloudflare Pages. JavaScript only (no TypeScript).

## Commands

- `npm run dev` — Dev server on localhost:5176
- `npm run build` — Production build to `dist/`
- `npm run lint` — ESLint
- `npm test` — Vitest (watch mode)
- `npm run test:coverage` — Coverage report
- `npx vitest run src/path/to/file.test.js` — Run a single test file

## Architecture

**No React Router.** The app uses view-mode switching (USER/ADMIN) managed in `src/App.jsx`, which is the central orchestrator (~1500 lines). Views live in `src/components/views/`.

**State management is hook-based** with no Redux or Context. Domain logic lives in custom hooks under `src/hooks/`:
- `useAuth` — Session management, profile loading, role-based permissions
- `useResources` — Resource fetching with specialty/subspecialty filtering
- `useFavorites`, `useNotes`, `useUpcomingCases` — User data CRUD

**Data flows directly through Supabase.** Hooks and components call the Supabase client (`src/lib/supabase.js`) directly. `src/services/authService.js` wraps Supabase Auth methods.

**Role hierarchy:** super_admin > specialty_admin > subspecialty_admin > user. RLS policies enforce access at the database level (see `comprehensive_rls_policies.sql`).

**Analytics** are de-identified and only track "Surgeon" and "Resident/Fellow" user types via `src/lib/analytics.js`.

## Key Files

- `src/App.jsx` — Main app component, view routing, state coordination
- `src/hooks/useAuth.js` — Auth flow, profile management, role detection
- `src/utils/constants.js` — App-wide enums and config values
- `src/lib/supabase.js` — Supabase client (anon key hardcoded for client-side use)
- `*.sql` files in repo root — Database schema migrations, apply manually via Supabase SQL editor

## Config

- Vite config: path alias `@` → `./src` (in vitest.config.js)
- Tailwind dark mode: class-based
- ESLint: flat config format (eslint.config.js)
- Environment variables use `VITE_` prefix (currently hardcoded in supabase.js)

## Security Checklist (Mandatory)

This is the primary security gate for all coding tasks. No task is complete until every applicable item is addressed. If asked to implement a feature, follow all four phases in order.

### Phase 1: Security TDD (Pre-Implementation)

Before writing functional code, generate a security-first plan:

- **Threat Model:** Identify the 10 most dangerous vulnerabilities the feature could introduce (e.g., SSRF, BOLA, XSS).
- **"Break-it" Tests:** Write a test suite designed to trigger those 10 vulnerabilities.
- **Edge Case Fuzzing:** Define 50 edge cases (nulls, Unicode, 100k+ item arrays, negative numbers) for automated testing.

### Phase 2: Mandatory Knowledge Audit

#### Input & Data Integrity
- Sanitize all user inputs (SQLi, XSS, Command Injection) using allowlists and type-checking.
- Prevent path traversal — no `../` manipulation in file system operations.
- Mask or encrypt PII. No sensitive data in logs or comments.

#### Access & Identity
- Verify permissions (RBAC) server-side before every sensitive operation.
- Zero hardcoded credentials. Use environment variables or secret managers.
- Code runs with minimum necessary permissions (least privilege).

#### Supply Chain & Dependencies
- Verify all suggested packages are real and not hallucinated/slopsquatting targets.
- Use strict version pinning in package.json.

### Phase 3: Automated Scanner Stack

Run and resolve all errors before opening a PR:

| Tool | Focus | Command |
|------|-------|---------|
| Semgrep | OWASP Top 10 | `semgrep scan --config=auto` |
| Gitleaks | Secret Detection | `gitleaks detect --verbose` |
| Snyk | Dependency CVEs | `snyk test` |

### Phase 4: Final Verification

- **Internal Critique:** Identify where shortcuts were taken or logic is most fragile.
- **100% Pass Rate:** All unit tests and "Break-it" tests must pass.
- **Pre-commit Lock:** Confirm `.pre-commit-config.yaml` is active and blocking the commit.
