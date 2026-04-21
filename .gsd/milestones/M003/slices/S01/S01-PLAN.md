# S01: Mobile shell, auth, and trusted calendar scope

**Goal:** Deliver a first-class mobile Caluno shell that reuses the proven trusted-scope/auth contracts, validates Supabase sessions client-side before opening protected routes, and shows only permitted calendars with explicit denied states for malformed or out-of-scope ids.
**Demo:** A user can sign in on mobile, land in a native-feeling shell, see only permitted calendars, and hit truthful denied states when scope is invalid.

## Must-Haves

- `apps/mobile` consumes shared pure trust helpers from a workspace package instead of importing from `apps/web/src`, so R002 denial semantics do not fork on day one.
- Mobile validates a cached Supabase session with `getSession()` plus `getUser()` before opening protected scope, and keeps signed-out, invalid-session, and loading states explicit.
- The mobile shell loads only permitted memberships, groups, calendars, and join-code metadata through authenticated Supabase reads backed by existing RLS, then resolves primary-calendar access only from that trusted inventory.
- Malformed calendar ids reject early as `calendar-id-invalid`, and real-but-out-of-scope ids collapse to `calendar-missing` without probing arbitrary calendar existence.
- Verification passes in named files: `apps/mobile/tests/trusted-core.unit.test.ts`, `apps/mobile/tests/auth-bootstrap.unit.test.ts`, `apps/mobile/tests/shell-scope.unit.test.ts`, `apps/mobile/tests/e2e/auth-scope.spec.ts`, plus web regressions `apps/web/tests/auth/session.unit.test.ts` and `apps/web/tests/routes/protected-routes.unit.test.ts`.

## Threat Surface

- **Abuse**: stale-session replay, calendar-id guessing, return-path tampering, and direct client query attempts must all fail closed before the mobile shell renders protected scope.
- **Data exposure**: only the viewer summary, permitted groups/calendars, and already-authorized join-code/calendar metadata may reach the phone UI; never raw tokens, unrelated memberships, or cross-group calendars.
- **Input trust**: route params, cached auth state, Supabase row payloads, and public env values are untrusted until validated against shared contract helpers and explicit mobile auth/bootstrap guards.

## Requirement Impact

- **Requirements touched**: `R002`, `R009`
- **Re-verify**: web protected-route regression, mobile session bootstrap, permitted calendar inventory shaping, mobile denied-state truthfulness, and Capacitor packaging.
- **Decisions revisited**: `D045`, `D049`

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/trusted-core.unit.test.ts tests/auth-bootstrap.unit.test.ts tests/shell-scope.unit.test.ts`
- `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts`
- `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`

## Observability / Diagnostics

- Runtime signals: mobile auth phase, shell bootstrap state, denied reason, failure phase, and attempted calendar id stay visible in testable UI state instead of generic blank screens.
- Inspection surfaces: `apps/mobile/tests/*.test.ts`, `apps/mobile/tests/e2e/auth-scope.spec.ts`, route-level `data-testid` surfaces, and `pnpm --dir apps/mobile cap:sync` output.
- Failure visibility: missing public env, invalid session, RLS/query failure, empty memberships, malformed route params, and out-of-scope calendar ids remain distinguishable.
- Redaction constraints: never surface Supabase tokens, full profile rows, or cross-group identifiers outside the already permitted shell inventory.

## Integration Closure

- Upstream surfaces consumed: `apps/web/src/lib/access/contract.ts`, `apps/web/src/lib/server/app-shell.ts`, `apps/web/src/lib/schedule/route-contract.ts`, `apps/web/src/lib/supabase/config.ts`, `apps/web/src/routes/(app)/+layout.server.ts`, and `supabase/migrations/20260414_000001_auth_groups_access.sql`.
- New wiring introduced in this slice: a shared `@repo/caluno-core` workspace package, mobile Supabase client/session bootstrap, protected mobile group/calendar routes, Playwright proof for the browser shell, and first-time Capacitor iOS project sync.
- What remains before the milestone is truly usable end-to-end: offline continuity, reminders/push plumbing, and repeated simulator/device UAT after later mobile runtime slices land.

## Decomposition Rationale

The order follows the real risk curve for this slice. T01 retires architecture drift immediately by extracting the pure trust helpers into a shared package and adding the first executable mobile tests. T02 then builds the fail-closed auth substrate, because a phone shell that trusts stale browser state would violate both owned requirements. T03 closes the user-visible product path with a deliberately mobile-first shell and trusted calendar resolution. T04 finishes with browser proof plus native-project packaging, so execution ends with runnable evidence rather than only local component confidence.

## Tasks

- [x] **T01: Extract shared trusted-scope contracts and stand up mobile tests** `est:90m`
  - Why: The slice cannot safely begin mobile implementation while the trusted helpers still live under `apps/web/src`, and `apps/mobile` currently has no executable tests.
  - Files: `packages/caluno-core/package.json`, `packages/caluno-core/src/index.ts`, `packages/caluno-core/src/access.ts`, `packages/caluno-core/src/app-shell.ts`, `packages/caluno-core/src/route-contract.ts`, `packages/caluno-core/src/supabase.ts`, `apps/mobile/package.json`, `apps/mobile/vite.config.ts`, `apps/mobile/tests/trusted-core.unit.test.ts`
  - Do: Extract the pure access/app-shell/route-contract/public-env helpers into `@repo/caluno-core`, rewire web imports without changing denial semantics, add Vitest support to `apps/mobile`, and prove the shared helper contract in a new mobile-local unit test.
  - Verify: `pnpm --dir apps/mobile exec vitest run tests/trusted-core.unit.test.ts && pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts`
  - Done when: mobile imports shared helpers without cross-app reach-in, web regressions stay green, and the new mobile test runner proves the shared denial contract.
- [x] **T02: Implement client-validated Supabase auth bootstrap and sign-in entry** `est:90m`
  - Why: R002 and R009 both fail if mobile trusts stale local auth or keeps the starter page instead of a real protected-entry flow.
  - Files: `apps/mobile/src/lib/supabase/client.ts`, `apps/mobile/src/lib/auth/mobile-session.ts`, `apps/mobile/src/routes/+layout.ts`, `apps/mobile/src/routes/+page.svelte`, `apps/mobile/src/routes/signin/+page.svelte`, `apps/mobile/tests/auth-bootstrap.unit.test.ts`
  - Do: Add the mobile Supabase browser client, implement one-time `getSession()` + `getUser()` validation, keep the slice on password auth, and replace the starter screen with explicit signed-out, invalid-session, loading, and error surfaces.
  - Verify: `pnpm --dir apps/mobile exec vitest run tests/auth-bootstrap.unit.test.ts tests/trusted-core.unit.test.ts && pnpm --dir apps/mobile check`
  - Done when: protected routes stay closed until the session is revalidated, sign-in works through the typed mobile auth store, and auth-state regressions are covered by unit tests.
- [x] **T03: Ship the mobile-first shell and trusted calendar denial states** `est:2h`
  - Why: This is the user-visible heart of the slice: mobile must load only trusted scope, feel like a phone app, and preserve the same fail-closed denial semantics as web.
  - Files: `apps/mobile/src/lib/shell/load-app-shell.ts`, `apps/mobile/src/lib/components/MobileShell.svelte`, `apps/mobile/src/routes/groups/+page.svelte`, `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`, `apps/mobile/src/routes/+layout.svelte`, `apps/mobile/src/app.css`, `apps/mobile/tests/shell-scope.unit.test.ts`
  - Do: Mirror the web app-shell query shape with authenticated Supabase reads, shape the inventory with shared helpers, build a mobile-specific groups/calendar shell, and render explicit denied states for malformed and out-of-scope calendar ids.
  - Verify: `pnpm --dir apps/mobile exec vitest run tests/shell-scope.unit.test.ts tests/auth-bootstrap.unit.test.ts tests/trusted-core.unit.test.ts && pnpm --dir apps/mobile check && pnpm --dir apps/mobile build`
  - Done when: the mobile shell shows only permitted calendars, lands on a primary calendar, and turns guessed or malformed calendar ids into truthful denied surfaces.
- [x] **T04: Add mobile browser proof and Capacitor packaging checks** `est:75m`
  - Why: The slice is not complete until auth/scope behavior is proven end-to-end and the shell is syncable into a real native target.
  - Files: `apps/mobile/playwright.config.ts`, `apps/mobile/tests/e2e/fixtures.ts`, `apps/mobile/tests/e2e/auth-scope.spec.ts`, `apps/mobile/package.json`, `apps/mobile/capacitor.config.ts`, `apps/mobile/ios/App/App.xcodeproj/project.pbxproj`, `apps/mobile/ios/App/App/AppDelegate.swift`
  - Do: Add a dedicated mobile Playwright harness, prove Bob’s permitted scope and Beta denial with real assertions, cover reload and sign-out/invalid-session behavior, and bootstrap/sync the first Capacitor iOS project.
  - Verify: `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts && pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`
  - Done when: the mobile browser proof is green for sign-in/permitted/denied paths, protected routes fail closed after sign-out, and the shell syncs successfully into an iOS Capacitor project.

## Files Likely Touched

- `packages/caluno-core/package.json`
- `packages/caluno-core/src/index.ts`
- `packages/caluno-core/src/access.ts`
- `packages/caluno-core/src/app-shell.ts`
- `packages/caluno-core/src/route-contract.ts`
- `packages/caluno-core/src/supabase.ts`
- `apps/mobile/package.json`
- `apps/mobile/vite.config.ts`
- `apps/mobile/tests/trusted-core.unit.test.ts`
- `apps/mobile/src/lib/supabase/client.ts`
- `apps/mobile/src/lib/auth/mobile-session.ts`
- `apps/mobile/src/routes/+layout.ts`
- `apps/mobile/src/routes/+page.svelte`
- `apps/mobile/src/routes/signin/+page.svelte`
- `apps/mobile/tests/auth-bootstrap.unit.test.ts`
- `apps/mobile/src/lib/shell/load-app-shell.ts`
- `apps/mobile/src/lib/components/MobileShell.svelte`
- `apps/mobile/src/routes/groups/+page.svelte`
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
- `apps/mobile/src/routes/+layout.svelte`
- `apps/mobile/src/app.css`
- `apps/mobile/tests/shell-scope.unit.test.ts`
- `apps/mobile/playwright.config.ts`
- `apps/mobile/tests/e2e/fixtures.ts`
- `apps/mobile/tests/e2e/auth-scope.spec.ts`
- `apps/mobile/capacitor.config.ts`
- `apps/mobile/ios/App/App.xcodeproj/project.pbxproj`
- `apps/mobile/ios/App/App/AppDelegate.swift`
