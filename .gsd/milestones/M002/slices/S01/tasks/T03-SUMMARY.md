---
id: T03
parent: S01
milestone: M002
key_files:
  - apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/tests/e2e/find-time.spec.ts
  - apps/web/tests/e2e/fixtures.ts
  - apps/web/src/service-worker.ts
  - .gsd/KNOWLEDGE.md
key_decisions:
  - D037: cache warmed protected `/find-time` documents so the browser can boot the route offline, but keep the client load fail-closed with `offline-unavailable` instead of replaying cached match results.
duration: 
verification_result: passed
completed_at: 2026-04-18T16:53:54.304Z
blocker_discovered: false
---

# T03: Shipped the protected find-time page, calendar entrypoint, and offline fail-closed browser proof.

**Shipped the protected find-time page, calendar entrypoint, and offline fail-closed browser proof.**

## What Happened

Added `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.ts` so the browser layer classifies the route as `trusted-online` or explicit `offline-unavailable` instead of replaying cached calendar authority when `navigator.onLine` is false. Built `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte` as the real protected UI for the T02 server contract: it renders a calm browseable result list of truthful windows, exposes typed `ready`, `no-results`, `invalid-input`, `query-failure`, `timeout`, `malformed-response`, `denied`, and `offline-unavailable` surfaces, and emits `data-testid` plus ISO-valued result-card attributes so future agents and browser proof can inspect exact route state and member availability. Updated `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` with an obvious `find-time` entry button from the permitted calendar hero. Extended `apps/web/tests/e2e/fixtures.ts` with seeded find-time expectations and route/card helpers, then added `apps/web/tests/e2e/find-time.spec.ts` to prove permitted access with truthful named windows, unauthorized denial, and the browser-load offline fail-closed branch. During verification I discovered a real runtime gap: warmed `/find-time` HTML was not covered by the service worker’s protected navigation cache, so offline boot fell through to browser network errors before the client load could deny access. I fixed that by adding `/calendars/[calendarId]/find-time` to `apps/web/src/service-worker.ts` protected navigation patterns. I also recorded D037 for that warmed-route caching decision and appended a Playwright offline-proof gotcha to `.gsd/KNOWLEDGE.md`.

## Verification

Verified the full slice contract for this task with the named slice-level Vitest suite, a fresh `pnpm --dir apps/web check`, and the required seeded browser proof after `supabase db reset --local --yes`. The final Playwright run passed all three scenarios: a permitted Alpha member entered `/find-time` from the calendar board and browsed truthful named windows, an Alpha-only member received explicit denial on the Beta calendar route, and the browser-load offline branch rendered `offline-unavailable` fail closed for the board entrypoint URL. For the offline browser proof, I used a browser-layer `navigator.onLine = false` override on the next navigation rather than Playwright’s full context-offline mode, because full network disconnection turns the next navigation into a Chrome network error before the SvelteKit browser load can run; that local adaptation is documented in `.gsd/KNOWLEDGE.md`.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/access/policy-contract.unit.test.ts tests/schedule/server-actions.unit.test.ts` | 0 | ✅ pass | 1548ms |
| 2 | `pnpm --dir apps/web check` | 0 | ✅ pass | 3036ms |
| 3 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts` | 0 | ✅ pass | 35102ms |

## Deviations

The planned offline browser proof was adapted to force `navigator.onLine = false` for the next navigation instead of using Playwright context-offline. Full context-offline mode in this app turns the next `/find-time` navigation into a browser network error before the route’s browser `+page.ts` load can execute, so that approach tests raw transport failure rather than the intended fail-closed client logic.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/tests/e2e/find-time.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/src/service-worker.ts`
- `.gsd/KNOWLEDGE.md`
