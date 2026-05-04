# S05: S05: Notification delivery closure and final mobile assembly — UAT

**Milestone:** M003
**Written:** 2026-05-04T16:46:31.856Z

# S05 UAT: Notification Delivery Closure and Final Mobile Assembly

## UAT Type
Automated unit + integration proof. No live push infrastructure required — notification delivery semantics are proven at unit level with mocked edge-function seams, and E2E proof uses Playwright harness stubs for dispatch capture.

## Preconditions
- Local Supabase stack running (`npx supabase start`)
- DB seeded with Alpha shared calendar, seeded shifts, Alice Owner + Bob Member + Dana Multi-Group members
- `pnpm --dir apps/mobile build` and `pnpm --dir apps/web build` clean
- No pre-existing pending shifts in the DB (run `supabase db reset` before E2E)

## Test Cases

### TC-01: Web schedule mutation dispatches shared-change notification
**Steps:**
1. Run `pnpm --dir apps/web exec vitest run tests/schedule/server-actions.unit.test.ts`
2. Observe the `schedule server helpers — dispatch wiring` describe block

**Expected:** 12 new dispatch tests pass alongside 9 pre-existing tests (21 total). Tests confirm: create/edit/move/delete each invoke the notifier after canonical success; write-error/forbidden/invalid-calendarId paths skip dispatch; degraded dispatch (error/timeout) preserves canonical success result.

### TC-02: Mobile schedule mutation dispatches shared-change notification
**Steps:**
1. Run `pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts`
2. Observe dispatch, payload shape, and degraded-dispatch tests

**Expected:** All tests pass. create/edit/move/delete each dispatch with correct calendarId/changeType/shiftId; degraded dispatch (unavailable functions seam) does not affect write result; replay-drained mutations also dispatch.

### TC-03: Enabled calendar records delivery effect, disabled calendar stays quiet
**Steps:**
1. Reset DB: `npx supabase db reset --local --yes`
2. Run `pnpm --dir apps/mobile exec playwright test tests/e2e/calendar-notifications.spec.ts`
3. Inspect delivery inventory snapshots in the test report

**Expected:** All specs pass. Enabled Alpha shared calendar: `data-delivered-change-count >= 1` after a shift write. Disabled calendar: `data-delivered-change-count = 0`. Reload/resume: pending reminder inventory count does not increase (no duplicates).

### TC-04: Notification tap routes through fail-closed mobile contract
**Steps:**
1. In `calendar-notifications.spec.ts` notification-open routing tests, observe `data-navigation-result` attributes

**Expected:** Notification taps targeting permitted calendar context navigate successfully (`data-navigation-result="permitted"`). Taps targeting denied/invalid scope are rejected (`data-navigation-result="denied"`).

### TC-05: trusted-offline route mode when connectivity drops
**Steps:**
1. Navigate to a permitted calendar page (trusted-online)
2. Call `setSimulatedConnectivity(page, false)` in a Playwright test
3. Read `data-route-mode` from `[data-testid="calendar-route-state"]`

**Expected:** `data-route-mode="trusted-offline"` (not `trusted-online`). On reconnect: `data-route-mode="trusted-online"`.

### TC-06: Final assembled mobile tracer bullet (5 phases)
**Steps:**
1. Reset DB: `npx supabase db reset --local --yes`
2. Run `pnpm --dir apps/mobile exec playwright test tests/e2e/mobile-assembly.spec.ts`
3. Observe all 5 phases

**Expected:** Phase 1 (sign-in, calendar open) — passes. Phase 2 (offline continuity, trusted-offline mode) — passes. Phase 3 (find-time handoff into create) — passes when run against clean DB. Phase 4 (notification delivery) — passes. Phase 5 (negative paths, fail-closed) — passes.

### TC-07: Default test:e2e bar includes notification and assembly specs
**Steps:**
1. Run `pnpm --dir apps/mobile test:e2e`
2. Confirm the command runs `calendar-notifications.spec.ts` and `mobile-assembly.spec.ts`

**Expected:** Both specs are included in the default bar output. No manual extra command needed.

### TC-08: Find-time skips shifts with no assignments (no false ASSIGNMENTS_MISSING)
**Steps:**
1. Create a shift in the seeded Alpha calendar with no `shift_assignments`
2. Run the find-time route for that calendar
3. Observe the response

**Expected:** Shift is skipped in busy-interval computation; find-time returns `status="ready"` not `FIND_TIME_ASSIGNMENTS_MISSING` error.

## Edge Cases
- Dispatch timeout (5 000 ms): canonical write result is returned as success; dispatch failure logged with typed reason; no exception reaches caller.
- Functions seam unavailable (mobile offline): dispatch is skipped; queued mutation resolves truthfully; reconnect drain still succeeds and attempts dispatch at drain time.
- Invalid calendarId/shiftId in dispatch payload: sanitizer rejects UUID format check and skips dispatch; schedule write is unaffected.
- Forged/replayed dispatch payload: calendarId validated against session scope; path sanitized before forwarding to edge function.

## Not Proven By This UAT
- Live push notification delivery to a real device OS (APNs/FCM) — this requires a provisioned device and is deferred to live integration testing.
- Notification delivery under network latency or push provider outage — best-effort contract is proven at unit level; live failure modes require production monitoring.
- Cross-device notification deduplication (same calendar, two devices) — deduplication at device level is proven; cross-device dedup is a Supabase edge function concern outside this slice's scope.
- Performance under load (hundreds of concurrent shift mutations triggering dispatch) — not tested; best-effort semantics ensure load cannot block writes.
