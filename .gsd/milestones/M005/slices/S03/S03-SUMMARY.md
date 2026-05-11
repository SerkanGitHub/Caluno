---
id: S03
parent: M005
milestone: M005
provides:
  - A bounded recurrence suggestion contract that downstream slices can reuse for predictive assistance without widening calendar scope.
  - A verified web create-dialog pattern for surfaced, accepted, dismissed, and rehydrated predictive hints.
  - A recurring-create reconciliation fix that keeps accepted suggestion flows truthful when server responses include off-screen series ids.
requires:
  []
affects:
  - S04
  - S05
  - S06
key_files:
  - apps/web/src/lib/server/schedule.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte
  - apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte
  - apps/web/src/lib/offline/calendar-controller.ts
  - apps/web/tests/routes/protected-routes.unit.test.ts
  - apps/web/tests/schedule/recurrence.unit.test.ts
  - apps/web/tests/schedule/offline-queue.unit.test.ts
  - apps/web/tests/e2e/calendar-shifts.spec.ts
  - apps/web/tests/e2e/fixtures.ts
  - supabase/seed.sql
key_decisions:
  - Use a separate recurrence-suggestion loader that is scoped to the authorized calendar id and a fixed trailing 30-day window ending at the visible week’s exclusive end, and fail closed to null on query errors or malformed rows.
  - Expose the web suggestion surface with stable test/diagnostic hooks so accept, dismiss, and field state can be observed without inference.
  - Allow recurring create reconciliation to tolerate extra trusted server ids for off-screen occurrences while still rejecting underspecified payloads.
patterns_established:
  - Predictive assistance on protected routes should be computed from bounded same-scope history and threaded as nullable UI hints rather than authoritative defaults.
  - Suggestion UI should be calm, explicit, keyboard-accessible, and instrumented with stable `data-testid` hooks plus field-state attributes for browser proof.
  - Local-first recurring reconciliation should map visible staged shifts to the leading trusted server ids and ignore extra off-screen ids instead of requiring exact cardinality.
observability_surfaces:
  - Positive-path server log: `calendar.recurrence-suggestion.computed` with calendar/week/lookback and matched ids metadata.
  - Stable create-dialog hooks: `data-testid="recurrence-suggestion"`, `recurrence-suggestion-accept`, and `recurrence-suggestion-dismiss`.
  - Field snapshot diagnostics proving idle/accepted/dismissed suggestion state across submit, reopen, and reload flows.
drill_down_paths:
  - .gsd/milestones/M005/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M005/slices/S03/tasks/T02-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-05-11T10:28:29.843Z
blocker_discovered: false
---

# S03: Wire recurrence suggestion into web shift create dialog

**The protected web calendar create dialog now surfaces a bounded weekly recurrence suggestion, accepts or dismisses it truthfully, and resets cleanly across reopen, submit, and reload flows with unit and browser proof.**

## What Happened

T01 added a separate fail-closed recurrence-suggestion loader on the protected calendar route. It queries only same-calendar shifts inside the trailing 30-day window ending at the visible week’s exclusive end, validates rows before mapping them into detectRecurrencePattern, and logs a positive-path `calendar.recurrence-suggestion.computed` event only when a concrete suggestion exists. The seeded Alpha fixtures were updated to contain a truthful weekly Monday pattern inside that lookback window while preserving the existing visible-week proof shifts used elsewhere.

T02 wired that nullable suggestion through the web create flow so `ShiftEditorDialog` renders a calm, keyboard-accessible suggestion surface with stable test hooks (`data-testid="recurrence-suggestion"`, `recurrence-suggestion-accept`, `recurrence-suggestion-dismiss`) and suggestion-state diagnostics for field snapshots. Accepting the suggestion pre-fills weekly cadence with interval `1` while leaving repeat bounds blank; dismissing the suggestion leaves the form blank, keeps the fields editable, hides the suggestion for the current page instance, and allows it to return after fresh loader data on reload.

Closeout verification also confirmed the last execution bug was fixed: recurring create reconciliation no longer fails closed when the trusted server returns extra `affectedShiftIds` for off-screen occurrences in the same recurring series. The offline controller now maps only the visible local staged shifts to the leading server ids while still rejecting underspecified payloads. That lets accepted suggestion flows submit bounded recurring creates, reset the dialog cleanly after success, and keep the visible board truthful without leaking off-screen ids into local state.

## Verification

Closeout reran both slice-plan verification commands through `gsd_exec` and they passed.

1. `cd /Users/serkanyeniay/dev/Caluno && pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/recurrence.unit.test.ts` → exit 0. Vitest reported 2/2 files and 32/32 tests passing. This re-proved the bounded route contract, same-calendar lookback filters, positive-path recurrence suggestion logging, invalid-week fallback behavior, and fail-closed null behavior for timeout/error or malformed history rows.
2. `cd /Users/serkanyeniay/dev/Caluno && npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` → exit 0. Playwright reported 5/5 tests passing. This re-proved the seeded weekly suggestion accept flow, dismiss flow, reopen behavior, reload recovery, successful recurring create reset, and continued denied-route behavior for unauthorized calendars.

Operational-readiness signals for this slice are present and verified: the positive-path server log exposes when a suggestion was computed, the dialog exposes stable DOM hooks for surfaced/accepted/dismissed state, query failures fail closed to `null`, and reload is the recovery path that rehydrates fresh suggestion state from trusted loader data.

## Requirements Advanced

- R011 — Surfaced truthful recurrence suggestions from real same-calendar schedule history in the protected web create dialog, with verified accept/dismiss behavior and bounded fail-closed loader semantics.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

Added targeted offline queue unit coverage for recurring create reconciliation after closeout verification exposed that accepted recurrence suggestions could submit a bounded recurring create whose trusted server response returned more ids than the visible board had staged locally.

## Known Limitations

This slice delivers recurrence suggestion UX only on the web create dialog. Conflict advisories, mobile parity, and milestone-wide hardening/validation remain for S04-S06.

## Follow-ups

S04 should add the non-blocking clash advisory to the web shift editor. S05 should carry the same predictive surfaces onto mobile. S06 should finish accessibility/build hardening and validate R011 at milestone close.

## Files Created/Modified

- `apps/web/src/lib/server/schedule.ts` — Added the bounded recurrence-suggestion loader, positive-path log, and supporting server-side validation logic.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` — Threaded recurrenceSuggestion through the protected calendar route load contract.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — Passed the recurrence suggestion into the client-side calendar view wiring.
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte` — Connected dialog-opening state to the recurrence suggestion create flow.
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` — Rendered the calm suggestion UI, accept/dismiss controls, and recurrence field state diagnostics.
- `apps/web/src/lib/offline/calendar-controller.ts` — Relaxed recurring create reconciliation to accept extra off-screen server ids while preserving fail-closed behavior for underspecified payloads.
- `apps/web/tests/routes/protected-routes.unit.test.ts` — Added route contract coverage for bounded suggestion queries, positive-path logging, and fail-closed null behavior.
- `apps/web/tests/schedule/recurrence.unit.test.ts` — Updated recurrence baseline assertions for the truthful weekly Alpha fixture.
- `apps/web/tests/schedule/offline-queue.unit.test.ts` — Added proof that recurring create reconciliation succeeds when the server returns extra ids for off-screen occurrences.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — Added browser proof for recurrence suggestion accept, dismiss, reopen, reload, and successful create reset flows.
- `apps/web/tests/e2e/fixtures.ts` — Updated seeded fixture helpers and recurrence snapshots for suggestion verification.
- `supabase/seed.sql` — Converted the Alpha recurrence baseline into a truthful weekly pattern inside the suggestion lookback window.
