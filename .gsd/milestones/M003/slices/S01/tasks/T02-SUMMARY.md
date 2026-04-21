---
id: T02
parent: S01
milestone: M003
key_files:
  - apps/mobile/package.json
  - apps/mobile/src/lib/supabase/config.ts
  - apps/mobile/src/lib/supabase/client.ts
  - apps/mobile/src/lib/auth/mobile-session.ts
  - apps/mobile/src/routes/+layout.ts
  - apps/mobile/src/routes/+page.svelte
  - apps/mobile/src/routes/signin/+page.svelte
  - apps/mobile/tests/auth-bootstrap.unit.test.ts
key_decisions:
  - D051: use a singleton client-side mobile auth store as the authority for one-time cached-session validation, route guards, and explicit reason-code auth entry surfaces.
duration: 
verification_result: passed
completed_at: 2026-04-21T08:12:02.749Z
blocker_discovered: false
---

# T02: Added a singleton mobile Supabase auth bootstrap with real password sign-in and explicit invalid-session/config-error entry surfaces.

**Added a singleton mobile Supabase auth bootstrap with real password sign-in and explicit invalid-session/config-error entry surfaces.**

## What Happened

I added a mobile Supabase browser wrapper in `apps/mobile/src/lib/supabase/config.ts` and `apps/mobile/src/lib/supabase/client.ts`, reusing the shared public-env reader from `@repo/caluno-core` instead of duplicating env parsing inside the mobile app. On top of that, I implemented `apps/mobile/src/lib/auth/mobile-session.ts` as a singleton client-side auth state machine that bootstraps exactly once, validates cached sessions with `getSession()` plus `getUser()` before treating them as trusted, signs out locally when a cached session is stale or malformed, and exposes explicit `bootstrapping`, `signed-out`, `authenticated`, `invalid-session`, and `error` states with reason-code/detail surfaces for the UI. I then replaced the starter root page with an auth handoff surface in `apps/mobile/src/routes/+page.svelte`, added root route auth guarding in `apps/mobile/src/routes/+layout.ts`, and created `apps/mobile/src/routes/signin/+page.svelte` with a real password sign-in form, retry/reset controls, config-error blocking, and testable `data-testid`/`data-auth-*` signals. Finally, I added `apps/mobile/tests/auth-bootstrap.unit.test.ts` to cover missing env, anonymous boot, valid session reuse, malformed metadata fallback, invalid-session fail-closed behavior, blank credentials, rejected passwords, and reset/sign-out behavior. I also recorded D051 so later mobile shell work reuses this singleton auth/bootstrap authority instead of rebuilding route-local Supabase auth logic.

## Verification

Verified the task contract directly with `pnpm --dir apps/mobile exec vitest run tests/auth-bootstrap.unit.test.ts tests/trusted-core.unit.test.ts`, which passed 12 tests covering the new auth bootstrap store and the shared trusted-core contract. Verified mobile compile health with `pnpm --dir apps/mobile check`, which passed with zero Svelte/TypeScript diagnostics after correcting one `unknown` error path and updating the new sign-in component to Svelte 5 event attributes. As an additional slice-level regression check, `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts` also passed, confirming the shared auth/trusted-route contract still holds on web after the mobile auth extraction and bootstrap work. I explicitly checked that later-slice proof files `apps/mobile/tests/shell-scope.unit.test.ts` and `apps/mobile/tests/e2e/auth-scope.spec.ts` are still absent, so I am not claiming the remaining slice verification commands or Capacitor/browser proof yet.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile exec vitest run tests/auth-bootstrap.unit.test.ts tests/trusted-core.unit.test.ts` | 0 | ✅ pass | 1414ms |
| 2 | `pnpm --dir apps/mobile check` | 0 | ✅ pass | 1832ms |
| 3 | `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts` | 0 | ✅ pass | 1631ms |

## Deviations

Did not run the later slice-level Playwright and Capacitor verification commands because they belong to T03/T04 and their required mobile proof files are not present yet. Instead, I ran the T02 verification commands plus the existing web auth regression command and recorded that the remaining slice-level artifacts are still future-task work.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/package.json`
- `apps/mobile/src/lib/supabase/config.ts`
- `apps/mobile/src/lib/supabase/client.ts`
- `apps/mobile/src/lib/auth/mobile-session.ts`
- `apps/mobile/src/routes/+layout.ts`
- `apps/mobile/src/routes/+page.svelte`
- `apps/mobile/src/routes/signin/+page.svelte`
- `apps/mobile/tests/auth-bootstrap.unit.test.ts`
