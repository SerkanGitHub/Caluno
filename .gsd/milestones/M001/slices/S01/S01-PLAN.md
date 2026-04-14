# S01: Auth, groups, and secure shared-calendar access

**Goal:** Establish the authenticated entrypoint, group membership model, and row-level access boundary that lets a user sign in, create or join a group, and open only calendars they are permitted to access in the browser.
**Demo:** A user can sign in, create or join a group, and open only the shared calendars they are allowed to access in the browser.

## Must-Haves

- Add a trusted Supabase SSR auth boundary in SvelteKit with typed `App.Locals` / `App.PageData`, request-scoped clients, and a documented cached-session contract for previously synced calendars so S01 advances **R001** without overstating offline readiness.
- Model `profiles`, `groups`, `group_memberships`, `calendars`, and join-code/token onboarding in Supabase SQL with roles and row-level policies that derive access from authenticated membership instead of client-submitted IDs, directly advancing **R002** and **R012**.
- Ship protected browser routes for sign-in, sign-out, create-group, join-group, permitted-calendar listing, and access-denied handling so the roadmap demo is true in the actual web entrypoint.
- Leave `packages/db` compile-safe and explicitly non-authoritative for S01 so downstream slices inherit a working shared package instead of a broken half-adopted DB layer.
- Add durable proof files for the auth boundary and secure-access contract: `apps/web/tests/auth/session.unit.test.ts`, `apps/web/tests/access/policy-contract.unit.test.ts`, and `apps/web/tests/e2e/auth-groups-access.spec.ts`.

## Threat Surface

- **Abuse**: guessed calendar IDs, forged join-code redemption, replayed invite links, privilege escalation through client-submitted `group_id` / `calendar_id`, and trusting cached cookies without server revalidation.
- **Data exposure**: auth cookies, user email/profile data, group membership records, join codes/tokens, and shared calendar identifiers must never leak across groups or into logs.
- **Input trust**: group names, join codes, route params, auth callback state, and every calendar/group identifier from the browser are untrusted until validated server-side or by RLS.

## Requirement Impact

- **Requirements touched**: R001, R002, R012.
- **Re-verify**: trusted login/logout, cached-session bootstrapping for previously synced calendars, group creation, join-group redemption, permitted-calendar listing, direct unauthorized calendar navigation, and sign-out access removal.
- **Decisions revisited**: D002 and D004 remain in force; D006 makes Supabase SQL the temporary schema authority for this slice so later work does not split ownership with `packages/db`.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `pnpm -C apps/web check`
- `pnpm -C apps/web vitest run tests/auth/session.unit.test.ts tests/access/policy-contract.unit.test.ts`
- `pnpm exec tsc --pretty false --noEmit packages/db/src/tenant.ts`
- `supabase db reset --local && pnpm -C apps/web playwright test tests/e2e/auth-groups-access.spec.ts`
- The browser proof must show an explicit access-denied surface for an unauthorized calendar URL rather than silent empty data, and the failing phase must be visible in test output or trace artifacts.

## Observability / Diagnostics

- Runtime signals: trusted-user resolution outcome in the root server load, explicit create/join/access-denied action states, and policy-driven authorization failures surfaced as typed server results rather than silent empties.
- Inspection surfaces: browser UI states for signed-out / join-error / access-denied paths, `pnpm -C apps/web vitest run ...` for auth and access contract regressions, and `supabase db reset --local` + Playwright trace artifacts for end-to-end proof.
- Failure visibility: the failing phase (session bootstrap, join redemption, calendar lookup, or RLS denial) must be visible in the response path or test output without dumping secrets.
- Redaction constraints: never log raw auth tokens, cookies, or join codes; logs and UI states may show high-level reason codes only.

## Integration Closure

- Upstream surfaces consumed: `apps/web/src/routes/+layout.svelte`, `apps/web/src/routes/+page.svelte`, the SvelteKit hooks/layout contract, and Supabase SSR + Postgres RLS conventions from D002.
- New wiring introduced in this slice: `apps/web/src/hooks.server.ts`, root session loads, `(auth)` and `(app)` route groups, Supabase migration/seed files, and the browser test entrypoint that drives the shared-calendar access flow against a local Supabase runtime.
- What remains before the milestone is truly usable end-to-end: multi-shift scheduling UI, browser-local persistence/offline reopening, sync/realtime propagation, and conflict visibility in S02-S05.

## Tasks

- [x] **T01: Establish the Supabase SSR auth boundary and typed session contract** `est:1h30m`
  - Why: Every downstream slice depends on a trusted request-scoped auth seam; this task closes the biggest current gap and creates the first executable proof for R001.
  - Files: `apps/web/package.json`, `.env.example`, `apps/web/src/app.d.ts`, `apps/web/src/hooks.server.ts`, `apps/web/src/lib/supabase/server.ts`, `apps/web/src/lib/supabase/client.ts`, `apps/web/src/routes/+layout.server.ts`, `apps/web/tests/auth/session.unit.test.ts`
  - Do: Add Supabase SSR and Vitest dependencies, document required env keys, create typed auth locals/page data, wire request-scoped server/browser clients, and add a unit test that proves anonymous, authenticated, and invalid-session handling fails closed.
  - Verify: `pnpm -C apps/web check && pnpm -C apps/web vitest run tests/auth/session.unit.test.ts`
  - Done when: The web app has a typed trusted-user contract in server code, missing or invalid auth state is explicit, and the auth boundary test passes.
- [x] **T02: Model groups, join onboarding, and calendar access in Supabase SQL** `est:2h`
  - Why: S01 owns the real access boundary for R002 and R012, so schema and RLS must exist before UI flows can claim secure sharing.
  - Files: `supabase/config.toml`, `supabase/migrations/20260414_000001_auth_groups_access.sql`, `supabase/seed.sql`, `packages/db/src/client.ts`, `packages/db/src/index.ts`, `packages/db/src/tenant.ts`, `apps/web/tests/access/policy-contract.unit.test.ts`
  - Do: Create the first Supabase config/migration/seed artifacts for profiles, groups, memberships, calendars, and join codes; enforce access through RLS/helper SQL; and reduce `packages/db` to compile-safe helpers so it no longer blocks future slices.
  - Verify: `pnpm exec tsc --pretty false --noEmit packages/db/src/tenant.ts && pnpm -C apps/web vitest run tests/access/policy-contract.unit.test.ts`
  - Done when: Schema authority is explicit in `supabase/`, unauthorized calendar access is denied by contract, and `packages/db` type-checks cleanly.
- [x] **T03: Build the protected auth, group onboarding, and permitted-calendar routes** `est:2h30m`
  - Why: This task turns the auth and access contracts into the visible roadmap demo users will actually exercise in the browser.
  - Files: `apps/web/src/routes/+page.svelte`, `apps/web/src/routes/(auth)/signin/+page.svelte`, `apps/web/src/routes/(auth)/callback/+server.ts`, `apps/web/src/routes/(auth)/logout/+server.ts`, `apps/web/src/routes/(app)/+layout.server.ts`, `apps/web/src/routes/(app)/groups/+page.server.ts`, `apps/web/src/routes/(app)/groups/+page.svelte`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
  - Do: Replace the starter landing page with a session-aware entrypoint, add auth callback/logout routes, build protected onboarding and calendar routes around trusted server data, and use `frontend-design` for the auth/onboarding/access-denied surfaces without weakening server-side checks.
  - Verify: `pnpm -C apps/web check && pnpm -C apps/web vitest run tests/auth/session.unit.test.ts tests/access/policy-contract.unit.test.ts`
  - Done when: Anonymous users are redirected into auth, members can create or join a group, permitted calendars render in the protected app shell, and unauthorized calendar IDs show an explicit denied surface.
- [x] **T04: Prove the end-to-end auth and secure-access flow with browser tests** `est:1h30m`
  - Why: The slice is not complete until the real browser entrypoint, local Supabase runtime, and secure-access boundary are proven together under a repeatable test.
  - Files: `apps/web/playwright.config.ts`, `apps/web/tests/e2e/auth-groups-access.spec.ts`, `apps/web/tests/e2e/fixtures.ts`, `apps/web/package.json`
  - Do: Add Playwright config and fixtures for the local Supabase runtime, script the sign-in/create-or-join/permitted-calendar flow, assert the unauthorized calendar denial path, and capture trace-friendly diagnostics that localize auth vs onboarding vs RLS failures.
  - Verify: `supabase db reset --local && pnpm -C apps/web playwright test tests/e2e/auth-groups-access.spec.ts`
  - Done when: A real browser test passes for both the permitted-calendar path and the denied path, sign-out removes protected access, and failures emit enough trace output to debug quickly.

## Files Likely Touched

- `apps/web/package.json`
- `.env.example`
- `apps/web/src/app.d.ts`
- `apps/web/src/hooks.server.ts`
- `apps/web/src/lib/supabase/server.ts`
- `apps/web/src/lib/supabase/client.ts`
- `apps/web/src/routes/+layout.server.ts`
- `apps/web/tests/auth/session.unit.test.ts`
- `supabase/config.toml`
- `supabase/migrations/20260414_000001_auth_groups_access.sql`
- `supabase/seed.sql`
- `packages/db/src/client.ts`
- `packages/db/src/index.ts`
- `packages/db/src/tenant.ts`
- `apps/web/tests/access/policy-contract.unit.test.ts`
- `apps/web/src/routes/+page.svelte`
- `apps/web/src/routes/(auth)/signin/+page.svelte`
- `apps/web/src/routes/(auth)/callback/+server.ts`
- `apps/web/src/routes/(auth)/logout/+server.ts`
- `apps/web/src/routes/(app)/+layout.server.ts`
- `apps/web/src/routes/(app)/groups/+page.server.ts`
- `apps/web/src/routes/(app)/groups/+page.svelte`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/playwright.config.ts`
- `apps/web/tests/e2e/auth-groups-access.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`
