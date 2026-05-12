---
id: T01
parent: S06
milestone: M005
key_files:
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/tests/e2e/calendar-offline.spec.ts
  - apps/web/tests/e2e/calendar-sync.spec.ts
  - apps/web/tests/e2e/fixtures.ts
key_decisions:
  - Use `data-route-mode` and `data-route-reason` on `calendar-route-state` as the stable web proof surface, and keep Playwright helpers/specs bound to those attributes instead of route prose.
duration: 
verification_result: passed
completed_at: 2026-05-11T17:11:36.039Z
blocker_discovered: false
---

# T01: Added typed `calendar-route-state` diagnostics on the web calendar route and migrated the affected web E2E seams to assert route attributes instead of prose.

**Added typed `calendar-route-state` diagnostics on the web calendar route and migrated the affected web E2E seams to assert route attributes instead of prose.**

## What Happened

I first verified the web calendar route and the targeted Playwright seams referenced by the task plan. The route surface in `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` now publishes explicit `data-route-mode` and `data-route-reason` attributes on `data-testid="calendar-route-state"` while still rendering the human-facing copy for users. In the web E2E coverage, `apps/web/tests/e2e/calendar-offline.spec.ts` now proves `trusted-online`, `cached-offline`, and `offline-denied` through `toHaveAttribute(...)` checks and keeps the existing local queue, board, overlap, and denial UI assertions intact. `apps/web/tests/e2e/calendar-sync.spec.ts` likewise asserts the trusted-online route state via attributes for both collaborators. In `apps/web/tests/e2e/fixtures.ts`, the shared open-calendar readiness gate now keys off the structured `data-route-mode` contract before waiting for trusted-online local snapshot readiness, so it no longer infers route mode from rendered prose. No new offline behavior was introduced; the work only hardened the proof seam so future wording changes do not break route-state verification.

## Verification

Ran the task’s required verification command from a fresh local reset: `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts`. It exited 0, and Playwright reported 4 passing tests covering the offline continuity flow and the realtime calendar sync flow. The passing assertions exercised the typed route-state contract for `trusted-online`, `cached-offline`, and `offline-denied` while preserving the existing board, queue, and denial checks.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts` | 0 | ✅ pass | 53590ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/tests/e2e/calendar-offline.spec.ts`
- `apps/web/tests/e2e/calendar-sync.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`
