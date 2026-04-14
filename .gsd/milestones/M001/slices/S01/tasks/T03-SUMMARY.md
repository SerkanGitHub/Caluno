---
id: T03
parent: S01
milestone: M001
key_files:
  - apps/web/src/routes/(auth)/signin/+page.server.ts
  - apps/web/src/routes/(auth)/signin/+page.svelte
  - apps/web/src/routes/(auth)/callback/+server.ts
  - apps/web/src/routes/(auth)/logout/+server.ts
  - apps/web/src/routes/(app)/+layout.server.ts
  - apps/web/src/routes/(app)/groups/+page.server.ts
  - apps/web/src/routes/(app)/groups/+page.svelte
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/src/lib/server/auth-flow.ts
  - apps/web/src/lib/server/app-shell.ts
  - apps/web/src/routes/+page.svelte
  - apps/web/src/app.css
  - apps/web/src/app.html
  - apps/web/static/favicon.svg
  - apps/web/tests/routes/protected-routes.unit.test.ts
  - apps/web/tests/access/policy-contract.unit.test.ts
  - supabase/migrations/20260414_000001_auth_groups_access.sql
  - supabase/seed.sql
  - .gsd/KNOWLEDGE.md
key_decisions:
  - Centralize memberships and permitted calendars in `(app)/+layout.server.ts`, then resolve `/calendars/[calendarId]` entirely from that trusted parent scope so guessed ids fail closed without extra nested queries.
  - Treat callback, logout, sign-in, join, and denied outcomes as named UI/runtime states with high-level reason codes instead of blank pages or raw provider/database errors.
  - Remove external font fetches and add a local favicon so browser diagnostics stay focused on auth/access failures instead of avoidable asset noise.
duration: 
verification_result: passed
completed_at: 2026-04-14T21:50:09.229Z
blocker_discovered: false
---

# T03: Shipped the protected auth, onboarding, and permitted-calendar routes with explicit denied states and real local browser proof.

**Shipped the protected auth, onboarding, and permitted-calendar routes with explicit denied states and real local browser proof.**

## What Happened

Replaced the starter landing page with a session-aware Caluno entrypoint, added a deliberate `/signin` experience with server-side email/password auth, and implemented `/callback` and `/logout` handlers that collapse auth failures into safe, visible reason codes. Built the protected `(app)` shell so authenticated requests load memberships, groups, join-code visibility, and permitted calendars once in the layout, then reused that trusted scope in `/groups` and `/calendars/[calendarId]`. The groups screen now supports create-group and join-group actions with inline validation and typed join/create error surfaces, while the calendar route renders either a permitted shell or an explicit denied state with a named reason and failure phase instead of silent empty data. During real-browser verification I found two runtime issues outside the initial route code: local SQL-seeded auth users needed token-field normalization for GoTrue password login, and `redeem_group_join_code` needed `ON CONFLICT ON CONSTRAINT group_memberships_pkey` because the `RETURNS TABLE` output names made the conflict target ambiguous at runtime. I fixed both in `supabase/seed.sql` and the migration, added route-level unit coverage for anonymous routing, malformed calendar ids, join validation, and callback fallback, recorded the reusable app-shell decision as D007, and appended both local-runtime gotchas to `.gsd/KNOWLEDGE.md`. I also removed blocked external font requests and added a local favicon so browser diagnostics now reflect auth/access behavior rather than avoidable asset failures. The final browser proof covered the signed-out entrypoint, invalid-session fallback after a local reset, onboarding-empty state for a fresh local user, inline `JOIN_CODE_INVALID` handling, successful join into Alpha Team with redirect into the permitted calendar shell, and explicit denial for a guessed Beta calendar URL with reason `calendar-missing` and failure phase `calendar-lookup`. A debug bundle for the browser proof was written to `.artifacts/browser/2026-04-14T21-47-36-677Z-t03-browser-proof`.

## Verification

Verified the task-level and slice-level command checks that are in scope for T03: `pnpm -C apps/web check` passed with zero Svelte diagnostics, `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/access/policy-contract.unit.test.ts tests/routes/protected-routes.unit.test.ts` passed all 30 auth/access/route tests, `pnpm exec tsc --pretty false --noEmit packages/db/src/tenant.ts` stayed compile-clean, and `npx --yes supabase db reset --local` completed successfully after the join-RPC and seed-auth fixes. I also exercised the real browser flow against the local app and Supabase runtime: the signed-out root and `/signin` surfaces rendered, a reset session redirected into the visible invalid-session surface, a fresh local proof user hit the onboarding-empty groups state, an invalid join code rendered the inline join-error surface, a valid `ALPHA123` join redirected into the permitted Alpha calendar shell, and direct navigation to the Beta calendar id rendered the explicit access-denied surface with visible reason/failure-phase text. After replacing external font imports and wiring a local favicon, fresh browser console and network error buffers were empty on reload of the denied page.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm -C apps/web check` | 0 | ✅ pass | 3153ms |
| 2 | `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/access/policy-contract.unit.test.ts tests/routes/protected-routes.unit.test.ts` | 0 | ✅ pass | 1957ms |
| 3 | `pnpm exec tsc --pretty false --noEmit packages/db/src/tenant.ts` | 0 | ✅ pass | 1001ms |
| 4 | `npx --yes supabase db reset --local` | 0 | ✅ pass | 27420ms |
| 5 | `Browser spot-check against http://127.0.0.1:5174: signed-out entrypoint rendered, invalid-session fallback rendered after reset, a fresh local user saw onboarding-empty on /groups, `JOIN_CODE_INVALID` rendered inline for an invalid code, `ALPHA123` redirected into the permitted Alpha calendar shell, and `/calendars/bbbbbbbb-bbbb-2222-2222-222222222222` rendered the explicit denied surface with reason `calendar-missing` and failure phase `calendar-lookup`; fresh console and network error buffers were empty after the final reload.` | 0 | ✅ pass | 0ms |

## Deviations

Extended the planned file list with shared server helpers (`apps/web/src/lib/server/auth-flow.ts`, `apps/web/src/lib/server/app-shell.ts`), a route-level unit test, `apps/web/src/app.html`, and a static favicon so the protected-route logic stays reusable and the browser diagnostics stay quiet. I also tightened the existing Supabase migration and seed after manual browser proof exposed a real `redeem_group_join_code` conflict-target ambiguity and a local GoTrue token-field issue in SQL-seeded auth users.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/routes/(auth)/signin/+page.server.ts`
- `apps/web/src/routes/(auth)/signin/+page.svelte`
- `apps/web/src/routes/(auth)/callback/+server.ts`
- `apps/web/src/routes/(auth)/logout/+server.ts`
- `apps/web/src/routes/(app)/+layout.server.ts`
- `apps/web/src/routes/(app)/groups/+page.server.ts`
- `apps/web/src/routes/(app)/groups/+page.svelte`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/server/auth-flow.ts`
- `apps/web/src/lib/server/app-shell.ts`
- `apps/web/src/routes/+page.svelte`
- `apps/web/src/app.css`
- `apps/web/src/app.html`
- `apps/web/static/favicon.svg`
- `apps/web/tests/routes/protected-routes.unit.test.ts`
- `apps/web/tests/access/policy-contract.unit.test.ts`
- `supabase/migrations/20260414_000001_auth_groups_access.sql`
- `supabase/seed.sql`
- `.gsd/KNOWLEDGE.md`
