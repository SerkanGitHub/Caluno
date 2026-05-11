---
id: S01
parent: M004
milestone: M004
provides:
  - (none)
requires:
  []
affects:
  []
key_files:
  - ["apps/mobile/tests/e2e/calendar-offline.spec.ts"]
key_decisions:
  - (none)
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-05-05T19:03:39.664Z
blocker_discovered: false
---

# S01: S01

**Fixed stale route-mode assertion in mobile E2E test: changed 'trusted-online' to 'trusted-offline' at line 41 of apps/mobile/tests/e2e/calendar-offline.spec.ts to align with the trusted-offline mode introduced in M003/S05.**

## What Happened

This slice addressed a single test-code correctness issue surfaced as a known gap in M003/S05. When M003/S05/T05 introduced `trusted-offline` as a distinct `MobileOfflineRouteMode` (the mode the `MobileCalendarController` transitions into when connectivity drops within an already-trusted session), the mobile E2E spec at line 41 was not updated to match — it still asserted `data-route-mode='trusted-online'` immediately after calling `setSimulatedConnectivity(page, false)`. Production behavior was always correct; only the test assertion was stale.

T01 investigated both `apps/web/tests/e2e/calendar-offline.spec.ts` (the file referenced in the task plan) and `apps/mobile/tests/e2e/calendar-offline.spec.ts`. The web spec's two `trusted-online` assertions (lines 104 and 120) are in valid online-warmup context and needed no change. The mobile spec line 41 was the actual stale assertion. The fix was a one-character token change: `'trusted-online'` → `'trusted-offline'`.

Post-fix verification: `pnpm --dir apps/mobile exec playwright test tests/e2e/calendar-offline.spec.ts --grep 'trusted warm-up'` returned exit 0, 1 passed in 6.8s.

## Verification

Ran: `pnpm --dir apps/mobile exec playwright test tests/e2e/calendar-offline.spec.ts --grep 'trusted warm-up'` → exit 0, 1 passed (6.8s). The previously-stale assertion now matches the production trusted-offline route mode. Web spec was inspected and confirmed correct (no stale assertions).

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

Task plan referenced apps/web/tests/e2e/calendar-offline.spec.ts as the target file, but investigation confirmed the actual stale assertion is in apps/mobile/tests/e2e/calendar-offline.spec.ts. The correct file was fixed.

## Known Limitations

None. This was a test-code-only fix with no production impact.

## Follow-ups

None.

## Files Created/Modified

None.
