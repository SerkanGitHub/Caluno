---
id: T03
parent: S01
milestone: M003
key_files:
  - apps/mobile/src/lib/shell/load-app-shell.ts
  - apps/mobile/src/lib/components/MobileShell.svelte
  - apps/mobile/src/routes/groups/+page.svelte
  - apps/mobile/src/routes/calendars/[calendarId]/+page.svelte
  - apps/mobile/src/app.css
  - apps/mobile/src/routes/signin/+page.svelte
  - apps/mobile/src/routes/+page.svelte
  - apps/mobile/src/lib/supabase/client.ts
  - apps/mobile/tests/shell-scope.unit.test.ts
  - .gsd/KNOWLEDGE.md
key_decisions:
  - D052: cache the authenticated mobile app-shell snapshot and in-flight trusted load per user so adjacent protected mobile routes reuse one fail-closed RLS-backed inventory instead of refetching scope on every hop.
duration: 
verification_result: passed
completed_at: 2026-04-21T08:30:50.259Z
blocker_discovered: false
---

# T03: Shipped the mobile trusted shell loader, phone-first groups/calendar routes, and explicit denied states for malformed or out-of-scope calendar ids.

**Shipped the mobile trusted shell loader, phone-first groups/calendar routes, and explicit denied states for malformed or out-of-scope calendar ids.**

## What Happened

I added `apps/mobile/src/lib/shell/load-app-shell.ts` as the authenticated client-side trusted inventory loader that mirrors the web app-shell query shape for memberships, groups, calendars, and join codes, validates row shapes fail-closed, and caches the shaped snapshot per user so `/groups` and `/calendars/[calendarId]` reuse one trusted RLS-backed inventory instead of refetching on every hop. I extended the mobile Supabase client type to expose authenticated table reads, then built `apps/mobile/src/lib/components/MobileShell.svelte` plus new phone-first `/groups` and `/calendars/[calendarId]` routes that expose shell bootstrap mode, onboarding state, denied reason, failure phase, and attempted calendar id through visible UI and `data-testid`/`data-*` surfaces. The groups route now renders a deliberate mobile home shell with primary-calendar landing support via `/groups?landing=primary`, while the calendar route resolves access only from the already-shaped trusted inventory and renders truthful `calendar-id-invalid` and `calendar-missing` denied states without probing arbitrary calendar existence. I updated the mobile visual system in `apps/mobile/src/app.css`, nudged the auth/root handoff toward primary-calendar landing, added `apps/mobile/tests/shell-scope.unit.test.ts` to cover onboarding-empty, primary-calendar selection, malformed join-code failure, query failure, and denied-route collapse, recorded decision D052 for module-scoped trusted shell caching, and appended the Supabase `Promise.resolve(...)` timeout-wrapper typing gotcha to `.gsd/KNOWLEDGE.md`.

## Verification

Verified the task contract with `pnpm --dir apps/mobile exec vitest run tests/shell-scope.unit.test.ts tests/auth-bootstrap.unit.test.ts tests/trusted-core.unit.test.ts`, which passed all 18 mobile tests including the new shell-scope regression coverage. Verified compile and packaging health with `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build`, which completed with zero Svelte/TypeScript diagnostics and a successful production build after the new routes, loader, and shared shell were wired. Because this task touches the shared trusted-route contract, I also ran `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts`, and all 27 web regressions still passed. For live UI proof, I started the local mobile dev server, navigated to `/signin` and `/groups` in the browser, confirmed that the protected route redirected back to sign-in, and verified the typed config-blocked surface (`mobile-auth-state` and `mobile-auth-config-error`) rendered truthfully when public Supabase env was absent instead of showing a blank screen. I did not run the later slice-level Playwright/Capacitor commands because those belong to T04 and their proof artifacts/native project are not part of this task yet.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile exec vitest run tests/shell-scope.unit.test.ts tests/auth-bootstrap.unit.test.ts tests/trusted-core.unit.test.ts` | 0 | ✅ pass | 740ms |
| 2 | `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build` | 0 | ✅ pass | 4971ms |
| 3 | `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts` | 0 | ✅ pass | 521ms |

## Deviations

Used `/groups?landing=primary` as the first-launch handoff into the primary calendar instead of hard-redirecting every visit to `/groups`, so the app still keeps a usable groups/home route while new auth flows land on the shared-helper-selected primary calendar. I also stopped short of the slice's T04 Playwright/Capacitor verification commands because this task does not create those proof files or the native project yet; running them now would only create future-task noise rather than real T03 signal.

## Known Issues

Public Supabase env is not configured in this auto-mode workspace session, so live local browser verification could prove only the fail-closed redirect and typed config-error state, not an authenticated protected-shell walkthrough. The UI now exposes that missing-config condition explicitly, and seeded authenticated browser proof remains the T04 Playwright task.

## Files Created/Modified

- `apps/mobile/src/lib/shell/load-app-shell.ts`
- `apps/mobile/src/lib/components/MobileShell.svelte`
- `apps/mobile/src/routes/groups/+page.svelte`
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
- `apps/mobile/src/app.css`
- `apps/mobile/src/routes/signin/+page.svelte`
- `apps/mobile/src/routes/+page.svelte`
- `apps/mobile/src/lib/supabase/client.ts`
- `apps/mobile/tests/shell-scope.unit.test.ts`
- `.gsd/KNOWLEDGE.md`
