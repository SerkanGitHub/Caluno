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
  - Promoted `calendar-route-state` to a typed web proof surface with `data-route-mode` and `data-route-reason` so Playwright assertions no longer depend on human-facing copy.
  - Updated shared web E2E helpers and flow diagnostics to consume route-state attributes first, keeping trusted-online snapshot waits tied to structured mode data.
duration: 
verification_result: mixed
completed_at: 2026-05-11T16:33:36.978Z
blocker_discovered: false
---

# T01: Typed the web calendar route-state proof surface and migrated the targeted web E2E seams from route prose checks to attribute-based assertions.

**Typed the web calendar route-state proof surface and migrated the targeted web E2E seams from route prose checks to attribute-based assertions.**

## What Happened

Added stable route diagnostics to the web calendar route by publishing `data-route-mode` and `data-route-reason` on `data-testid="calendar-route-state"`. Converted the stale web offline and realtime Playwright assertions from copy-based `toContainText(...)` checks to structured `toHaveAttribute(...)` assertions, preserving the existing board, queue, denial, and realtime proof coverage. Updated the shared web E2E fixtures so flow diagnostics read route mode/reason from the typed attributes and `openCalendarWeek` only waits for local snapshot readiness when the structured route mode is `trusted-online`, removing the remaining helper dependency on route prose.

## Verification

Verified the source seam no longer scrapes `calendar-route-state` prose in the targeted web E2E files, and re-ran the sibling realtime suite successfully from a fresh Supabase reset. The full fresh-reset verification command required by the task still fails before route assertions due to a pre-existing service-worker preview readiness error (`data-service-worker-status=error`) inside `expectRuntimeSurfaceReady`, so the new route-state assertions are source-proven and partially runtime-proven but the offline spec remains blocked by that unrelated gate.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts` | 1 | ⚠️ partial — calendar-sync passed, but calendar-offline stopped at a pre-existing service-worker preview readiness failure before the new route assertions ran | 58493ms |
| 2 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-offline.spec.ts -g "previously synced calendar weeks reopen offline, keep local writes across reload, deny unsynced ids fail closed, and drain cleanly after reconnect" tests/e2e/calendar-sync.spec.ts` | 1 | ⚠️ partial — isolated offline continuity case still failed at the same pre-existing `expectRuntimeSurfaceReady` gate before route-mode assertions executed | 45398ms |
| 3 | `rg -n "calendar-route-state.*toContainText|textContent\(\).*trusted-online|includes\('trusted-online'\)" apps/web/tests/e2e/calendar-offline.spec.ts apps/web/tests/e2e/calendar-sync.spec.ts apps/web/tests/e2e/fixtures.ts` | 0 | ✅ pass — no targeted web E2E text scrapes of `calendar-route-state` remain | 41ms |
| 4 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-sync.spec.ts` | 0 | ✅ pass — sibling realtime spec passed from a fresh reset with the new attribute-based route assertions | 40630ms |

## Deviations

None.

## Known Issues

Fresh-reset runs that include `apps/web/tests/e2e/calendar-offline.spec.ts` are still blocked by a pre-existing service-worker preview gate in `expectRuntimeSurfaceReady`; the runtime surface reports `data-service-worker-status="error"` before the new route-state assertions execute.

## Files Created/Modified

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/tests/e2e/calendar-offline.spec.ts`
- `apps/web/tests/e2e/calendar-sync.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`
