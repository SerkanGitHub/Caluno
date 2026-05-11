# S01: S01 — UAT

**Milestone:** M004
**Written:** 2026-05-05T19:03:39.664Z

# UAT: M004/S01 — Stale Route-Mode Assertion Fix

## UAT Type
Test-code correctness fix. This UAT verifies that the mobile E2E spec assertion for offline route mode aligns with the production `trusted-offline` mode introduced in M003/S05. No production behavior changed.

## Preconditions
- `apps/mobile` dependencies installed (`pnpm install`)
- Playwright mobile E2E environment configured (same as M003/S05)
- No changes to production `MobileCalendarController` or `MobileOfflineRouteMode`

## Test Cases

### TC-01: Mobile offline spec — trusted warm-up test passes
**Steps:**
1. Run `pnpm --dir apps/mobile exec playwright test tests/e2e/calendar-offline.spec.ts --grep 'trusted warm-up'`
2. Observe exit code and test result

**Expected outcome:** Exit 0, 1 test passed. No assertion errors on line 41.

### TC-02: Line 41 assertion value is 'trusted-offline'
**Steps:**
1. Open `apps/mobile/tests/e2e/calendar-offline.spec.ts`
2. Locate line 41 (the assertion immediately after `setSimulatedConnectivity(page, false)`)
3. Confirm the expected attribute value is `'trusted-offline'`

**Expected outcome:** `data-route-mode` is asserted as `'trusted-offline'`, not `'trusted-online'`.

### TC-03: Web spec is unaffected
**Steps:**
1. Inspect `apps/web/tests/e2e/calendar-offline.spec.ts` lines 100-125
2. Confirm `trusted-online` assertions are in online-warmup context (before any offline toggle)

**Expected outcome:** Web spec assertions remain correct and unchanged.

## Edge Cases
- The fix is test-only; no production code paths were modified.
- The `trusted-offline` mode is exercised only after `setSimulatedConnectivity(page, false)` within an already-trusted session.

## Not Proven By This UAT
- Full mobile E2E suite (other tests beyond the single grep match)
- Live device/native build behavior
- Production `MobileCalendarController` offline-to-online transition (proven in M003/S05)
- Web offline continuity paths (covered by M001 and M003 browser proofs)
