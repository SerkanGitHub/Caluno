---
estimated_steps: 3
estimated_files: 6
skills_used:
  - debug-like-expert
---

# T04: Add mobile browser proof and Capacitor packaging checks

**Slice:** S01 — Mobile shell, auth, and trusted calendar scope
**Milestone:** M003

## Description

Finish the slice with runnable proof instead of trusting local clicks. Add a dedicated mobile Playwright harness against the mobile dev server, verify the seeded auth/scope path end-to-end, and bootstrap the first Capacitor iOS project so the protected shell is packaged into a native target rather than staying browser-only.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Local Supabase + mobile Vite dev server | Stop the proof run and surface setup instructions instead of reporting a misleading app failure. | Fail the test run with explicit server-start diagnostics rather than hanging silently. | Abort the scenario and capture the bad payload in Playwright diagnostics. |
| Cached mobile auth/session state | Clear state between scenarios and fail closed if reload/sign-out leaves protected routes open. | Treat a stuck reload/bootstrap as a test failure. | Reject malformed persisted session data and assert the app returns to sign-in. |
| Capacitor iOS bootstrap/sync | Treat native-project generation as incomplete and keep the slice open until `cap:add:ios` + `cap:sync` succeed. | Do not mark runtime proof complete without a syncable native project. | Re-run sync only after configuration is corrected; never ignore malformed generated config. |

## Load Profile

- **Shared resources**: local Supabase instance, Playwright browser context, Vite dev server, and Capacitor asset sync.
- **Per-operation cost**: one seeded password sign-in, one permitted-shell bootstrap, one denied-route navigation, and one native asset sync per verification run.
- **10x breakpoint**: local Supabase resets and repeated Playwright server startup will get slow first if the proof harness is not scoped tightly.

## Negative Tests

- **Malformed inputs**: invalid/out-of-scope calendar ids and malformed persisted auth state during reload.
- **Error paths**: local Supabase unavailable, sign-in rejection, denied calendar navigation, and Capacitor sync/bootstrap failure.
- **Boundary conditions**: successful reload with a valid session, forced sign-out followed by protected-route denial, and first-run native-project bootstrap when `ios/` does not yet exist.

## Steps

1. Add a mobile Playwright config that reads local Supabase public env, boots the mobile Vite server, and keeps traces/screenshots on failure.
2. Add fixture helpers plus `apps/mobile/tests/e2e/auth-scope.spec.ts` covering Bob sign-in, permitted Alpha calendar access, explicit denial for the Beta calendar id, reload continuity, and protected-route denial after sign-out or invalid session.
3. Bootstrap the first Capacitor iOS project if needed and make `cap:sync` part of the slice proof so the mobile shell is packaged into a real native target.

## Must-Haves

- [ ] Mobile browser proof covers the seeded permitted and denied calendar paths with real assertions.
- [ ] Reload keeps a valid trusted session working, while sign-out or invalid session returns protected routes to sign-in.
- [ ] `apps/mobile` gains a dedicated E2E command and Playwright config.
- [ ] `pnpm --dir apps/mobile cap:add:ios` and `pnpm --dir apps/mobile cap:sync` succeed for the built shell.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts`
- `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`

## Observability Impact

- Signals added/changed: Playwright traces/screenshots and native sync command output become the primary proof surfaces for mobile auth/scope failures.
- How a future agent inspects this: run `pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts` and `pnpm --dir apps/mobile cap:sync`, then inspect retained failure artifacts.
- Failure state exposed: server boot issues, auth regressions, denied-route mismatches, reload/sign-out scope leaks, and native bootstrap problems are all captured explicitly.

## Inputs

- `apps/mobile/package.json` — mobile scripts/dependency surface to extend with E2E proof.
- `apps/mobile/capacitor.config.ts` — current Capacitor shell config.
- `apps/mobile/src/routes/signin/+page.svelte` — sign-in entry surface from T02.
- `apps/mobile/src/routes/groups/+page.svelte` — permitted shell route from T03.
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — denied/permitted calendar route from T03.
- `apps/web/tests/e2e/fixtures.ts` — seeded user/calendar ids to mirror for mobile proof.

## Expected Output

- `apps/mobile/playwright.config.ts` — mobile E2E harness with local Supabase env bootstrap.
- `apps/mobile/tests/e2e/fixtures.ts` — seeded auth/scope constants and helper routines for mobile proof.
- `apps/mobile/tests/e2e/auth-scope.spec.ts` — end-to-end proof of sign-in, permitted scope, denied scope, and sign-out behavior.
- `apps/mobile/package.json` — mobile E2E scripts and dependencies.
- `apps/mobile/ios/App/App.xcodeproj/project.pbxproj` — first native iOS project bootstrap for the mobile shell.
- `apps/mobile/ios/App/App/AppDelegate.swift` — synced Capacitor iOS app entrypoint.
