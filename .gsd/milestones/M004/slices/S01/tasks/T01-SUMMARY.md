---
id: T01
parent: S01
milestone: M004
key_files:
  - apps/mobile/tests/e2e/calendar-offline.spec.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-05-04T17:03:10.384Z
blocker_discovered: false
---

# T01: Fixed stale route-mode assertion in apps/mobile/tests/e2e/calendar-offline.spec.ts line 41: changed 'trusted-online' to 'trusted-offline' to match the production mode introduced in M003/S05.

**Fixed stale route-mode assertion in apps/mobile/tests/e2e/calendar-offline.spec.ts line 41: changed 'trusted-online' to 'trusted-offline' to match the production mode introduced in M003/S05.**

## What Happened

The task plan identified the stale assertion as being in apps/web/tests/e2e/calendar-offline.spec.ts at line ~41, but investigation revealed the actual file with the mismatch is apps/mobile/tests/e2e/calendar-offline.spec.ts. The web spec uses setBrowserOffline and its two 'trusted-online' assertions (lines 104 and 120) are in the correct online-warmup context, not stale.

The mobile spec at line 41 calls setSimulatedConnectivity(page, false) — which drops connectivity within a trusted session — and then immediately asserts data-route-mode equals 'trusted-online'. M003/S05/T05 introduced 'trusted-offline' as a distinct MobileOfflineRouteMode that MobileCalendarController transitions into when connectivity drops within an already-trusted session (setNetwork() was wired to flip routeMode between trusted-online/trusted-offline). The S05 summary explicitly flagged this assertion as a known test-code gap.

The fix: changed `'trusted-online'` to `'trusted-offline'` at line 41 of the mobile spec. This is not a production regression — the production controller behavior is correct; the test assertion was written before the trusted-offline mode existed.

The web e2e run failed on an unrelated service-worker/preview-server infrastructure issue (requires a running vite preview build with COEP/COOP headers — pre-existing, not caused by this change).

## Verification

Ran: pnpm --dir apps/mobile exec playwright test tests/e2e/calendar-offline.spec.ts --grep "trusted warm-up" → 1 passed (6.8s). The previously stale assertion now matches the production trusted-offline route mode.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile exec playwright test tests/e2e/calendar-offline.spec.ts --grep 'trusted warm-up'` | 0 | ✅ pass | 6800ms |

## Deviations

Task plan referenced apps/web/tests/e2e/calendar-offline.spec.ts as the file to fix, but the actual stale assertion (line 41, setSimulatedConnectivity pattern) is in apps/mobile/tests/e2e/calendar-offline.spec.ts. The web spec has no stale trusted-online assertion. Fixed the correct file per the S05 summary evidence.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/tests/e2e/calendar-offline.spec.ts`
