---
estimated_steps: 5
estimated_files: 5
skills_used:
  - frontend-design
---

# T03: Ship the browseable `/find-time` UI, calendar entrypoint, and offline fail-closed browser proof

**Slice:** S01 — Truthful availability search route
**Milestone:** M002

## Description

Close the real user path after the trusted server contract exists. This task should add the calendar entrypoint, a calm browseable UI for valid windows, and explicit runtime states for denied, invalid-input, no-results, query-failure, and offline-unavailable behavior. The browser layer must fail closed offline rather than replay cached authority from the week board.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| `/find-time` server route payload | Render a typed error/denied state rather than partial results. | Surface a query-timeout state instead of showing an empty list. | Render the malformed-response state and keep the route diagnostic visible. |
| Browser offline handling in `+page.ts` | Fail closed and show offline-unavailable instead of loading stale cached results. | N/A | Reject cached/unknown data and keep the route denied. |
| Playwright seeded browser proof | Stop on the first failed state assertion and retain evidence instead of retrying blindly. | Capture the visible route/result state and current URL rather than extending waits. | Treat the run as proof-invalid and inspect the route state surfaces. |

## Load Profile

- **Shared resources**: protected Svelte route load, browser navigation, local Supabase seed/reset, Playwright runtime.
- **Per-operation cost**: one route load per search with a bounded result list over 30 days.
- **10x breakpoint**: DOM rendering and long result lists will fail first if the UI does not keep the browse list compact and derived from server-shaped data.

## Negative Tests

- **Malformed inputs**: unsupported duration query param, stale calendar id in the URL, malformed result rows from the server.
- **Error paths**: unauthorized member access, offline navigation, query failure, explicit no-results state.
- **Boundary conditions**: first valid window, last valid window inside the 30-day horizon, zero results, and switching from the calendar board into `/find-time`.

## Steps

1. Add `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.ts` so the browser layer explicitly denies offline entry instead of trying to reuse cached calendar continuity.
2. Build `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte` with duration controls, calm result cards, named member availability, and visible typed state surfaces for ready/empty/error/denied/offline outcomes.
3. Update `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` to expose an obvious entrypoint into `/find-time` from the permitted calendar surface.
4. Add `apps/web/tests/e2e/find-time.spec.ts` and any shared helpers in `apps/web/tests/e2e/fixtures.ts` to prove permitted search, unauthorized denial, and offline-unavailable behavior against seeded data.
5. Run `pnpm --dir apps/web check` plus the browser proof so the UI closes with both compile-time and runtime evidence.

## Must-Haves

- [ ] The calendar page exposes a clear path into `/calendars/[calendarId]/find-time`.
- [ ] A permitted member can browse valid windows for a chosen duration and see named member availability in the results.
- [ ] Denied, invalid-input, no-results, query-failure, and offline-unavailable states are explicit and visually distinct.
- [ ] Browser proof covers permitted access, unauthorized access, and offline fail-closed behavior.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts`
- `pnpm --dir apps/web check`

## Observability Impact

- Signals added/changed: visible `find-time` route/result state surfaces for ready, empty, denied, query-failed, and offline-unavailable outcomes.
- How a future agent inspects this: open the route in browser proof or inspect the rendered `data-testid` state surfaces in the Playwright spec.
- Failure state exposed: the browser path makes offline denial and server-query failures explicit instead of hiding them behind cached route continuity.

## Inputs

- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts` — protected server payload from T02.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — current protected calendar UI and navigation context.
- `apps/web/tests/e2e/auth-groups-access.spec.ts` — existing protected-route browser proof pattern.
- `apps/web/tests/e2e/fixtures.ts` — seeded users, calendars, and shared Playwright helpers.

## Expected Output

- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.ts` — browser load with explicit offline denial.
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte` — browseable find-time UI and state surfaces.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — entrypoint into `/find-time`.
- `apps/web/tests/e2e/find-time.spec.ts` — browser proof for permitted, denied, and offline behavior.
- `apps/web/tests/e2e/fixtures.ts` — shared helpers for find-time browser assertions.
