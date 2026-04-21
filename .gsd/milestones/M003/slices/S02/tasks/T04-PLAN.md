---
estimated_steps: 4
estimated_files: 6
skills_used:
  - frontend-design
  - debug-like-expert
---

# T04: Ship the phone-first calendar board and shift editor with explicit sync diagnostics

**Slice:** S02 — Mobile calendar continuity and editing
**Milestone:** M003

## Description

With truthful continuity and reconnect plumbing in place, use it to make mobile feel like a real Caluno surface instead of a web placeholder. This task should replace the current route-integrity placeholder with a phone-first week board and shift editor that keeps pending, retryable, and cached-offline state visible without copying the desktop screen.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Calendar controller runtime | Render a named failure panel with inspectable sync diagnostics instead of an empty board. | Keep the last cached week visible and expose refresh/drain as pending. | Fail closed on malformed controller state rather than guessing board or editor values. |
| Shift editor form handling | Keep validation errors inline and avoid mutating local state until the draft is normalized. | Preserve the current form draft and prevent duplicate submit taps. | Reject malformed local draft values and keep the pending queue unchanged. |

## Load Profile

- **Shared resources**: route-level Svelte state, board rendering for a visible week, and editor interactions against local queue state.
- **Per-operation cost**: rendering one week board plus action strips, badges, and editor drawers for the active calendar.
- **10x breakpoint**: dense weeks with many cards and repeated editor toggles will stress board rendering and state churn first if the view model is not pre-shaped.

## Negative Tests

- **Malformed inputs**: invalid visible-week search param, blank shift title, end-before-start, unsupported recurrence bounds.
- **Error paths**: retryable queue state, cached-offline reopen with no trusted refresh yet, controller failure panel, and denied/out-of-scope route state.
- **Boundary conditions**: empty week, same-day overlap badges, local-only created shift ids, and reload while pending entries exist.

## Steps

1. Replace the calendar placeholder route with a mobile-first board that reads the local-first controller state and clearly distinguishes trusted-online, cached-offline, pending, and retryable phases.
2. Add phone-first shift card and editor components for create/edit/move/delete flows, keeping form shaping on the shared schedule helpers from T01.
3. Surface stable `data-testid` and `data-*` diagnostics for route mode, queue counts, sync phase, snapshot origin, and retryable failures.
4. Keep the UI distinct from desktop Caluno—compact cards, stacked actions, and calm diagnostics—while preserving the shared product semantics.

## Must-Haves

- [ ] The calendar route shows a real mobile week board, not only route-integrity placeholder text.
- [ ] Offline-created and offline-edited shifts stay visible across reload with pending or retryable badges.
- [ ] Create/edit/move/delete actions are available from phone-first controls and remain truthful about validation or sync failure.
- [ ] Route/test-id diagnostics make it obvious whether the board is trusted-online, cached-offline, draining, or paused-retryable.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/mobile-sync-runtime.unit.test.ts tests/mobile-continuity.unit.test.ts`
- `pnpm --dir apps/mobile check`
- `pnpm --dir apps/mobile build`

## Observability Impact

- Signals added/changed: visible board source label, queue badges, sync phase strip, retryable detail, and snapshot-origin/test-id surfaces on the calendar screen.
- How a future agent inspects this: inspect `data-testid` surfaces on `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` and verify them in Playwright.
- Failure state exposed: validation errors, retryable queue pauses, cached-offline reopen, and controller failure panels become directly visible in the UI.

## Inputs

- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — current placeholder calendar route.
- `apps/mobile/src/lib/offline/controller.ts` — mobile local-first controller state from T03.
- `packages/caluno-core/src/schedule/board.ts` — shared board and status shaping helpers.
- `packages/caluno-core/src/schedule/recurrence.ts` — shared draft shaping and validation helpers.
- `apps/mobile/src/app.css` — existing mobile shell styling baseline.

## Expected Output

- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — calendar route rewritten around the local-first controller and phone-first diagnostics.
- `apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte` — compact mobile week board component.
- `apps/mobile/src/lib/components/calendar/ShiftCard.svelte` — phone-first shift card with pending/retryable status treatment.
- `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte` — create/edit/move/delete control surface sized for mobile.
- `apps/mobile/src/lib/components/calendar/SyncStatusStrip.svelte` — explicit queue and reconnect status surface.
- `apps/mobile/src/app.css` — updated mobile styling to support the new board and editor surfaces.
