---
id: S05
parent: M005
milestone: M005
provides:
  - Mobile parity for predictive recurrence suggestion and clash-advisory UI on create/edit/move flows.
  - Shared cross-platform shift-editor advisory logic via `@repo/caluno-core`.
  - Stable diagnostics and E2E proof surfaces that S06 can reuse for final hardening and requirement validation.
requires:
  - slice: S03
    provides: Bounded recurrence-suggestion semantics and web predictive-create contract.
  - slice: S04
    provides: Shared clash-advisory rule and non-blocking conflict behavior.
affects:
  - S06
key_files:
  - packages/caluno-core/src/schedule/shift-editor-advisory.ts
  - packages/caluno-core/src/index.ts
  - packages/caluno-core/package.json
  - apps/web/src/lib/schedule/shift-editor-advisory.ts
  - apps/web/tests/schedule/shift-editor-advisory.unit.test.ts
  - apps/mobile/src/lib/offline/transport.ts
  - apps/mobile/src/routes/calendars/[calendarId]/+page.svelte
  - apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte
  - apps/mobile/src/lib/components/calendar/ShiftCard.svelte
  - apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte
  - apps/mobile/tests/mobile-predictive.unit.test.ts
  - apps/mobile/tests/e2e/fixtures.ts
  - apps/mobile/tests/e2e/mobile-predictive.spec.ts
key_decisions:
  - Shared clash-advisory derivation now lives in `@repo/caluno-core` so web and mobile reuse identical overlap and self-exclusion behavior.
  - Mobile recurrence suggestions stay bounded to the active `calendarId` and trailing 30-day window ending at `visibleWeek.endAt`, with timeout/query/malformed paths failing closed to `null`.
  - Mobile predictive UI uses explicit route diagnostics plus stable sheet test hooks instead of inferring state from chip presence alone.
patterns_established:
  - Use route-owned predictive loader state with explicit diagnostics (`calendar-route-state`) so mobile UI can distinguish ready, empty, dismissed, and fail-closed states.
  - Centralize shift-editor advisory rules in `@repo/caluno-core` and keep app-local wrappers thin to preserve stable import surfaces while sharing logic.
  - Expose stable `data-testid` hooks for predictive suggestion and clash-advisory states so Playwright can prove behavior without brittle selector coupling.
observability_surfaces:
  - `data-testid="calendar-route-state"` now exposes recurrence-suggestion load state on the mobile calendar route.
  - `data-testid="recurrence-suggestion"`, `recurrence-suggestion-accept`, `recurrence-suggestion-dismiss`, and `data-testid="recurrence-field-state"` provide inspectable predictive UI states in `ShiftEditorSheet`.
  - `data-testid="clash-advisory"` exposes overlap guidance before submit for mobile create/edit/move flows.
drill_down_paths:
  - .gsd/milestones/M005/slices/S05/tasks/T01-SUMMARY.md
  - .gsd/milestones/M005/slices/S05/tasks/T02-SUMMARY.md
  - .gsd/milestones/M005/slices/S05/tasks/T03-SUMMARY.md
  - .gsd/milestones/M005/slices/S05/tasks/T04-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-05-11T16:19:37.271Z
blocker_discovered: false
---

# S05: Mobile surfaces for recurrence suggestion and clash advisory

**Mobile ShiftEditorSheet now reaches parity with web predictive-create behavior by loading bounded recurrence suggestions, reusing the shared clash helper, and exposing stable diagnostics proved by mobile smoke coverage.**

## What Happened

S05 closed the mobile parity gap for predictive schedule assistance without widening data scope. T01 moved deriveShiftEditorClashes() into @repo/caluno-core and left the existing web import surface as a thin re-export, so overlap previews and self-exclusion rules are now shared between web and mobile. T02 added a bounded mobile recurrence-suggestion loader in the offline transport that queries only the same calendar over the trailing 30 days ending at visibleWeek.endAt, then fail-closes to null on timeout, query, or malformed data while surfacing explicit route diagnostics on data-testid="calendar-route-state". T03 verified the existing mobile route→board→card→sheet flow already threaded visible-week existingShifts plus recurrenceSuggestion through create, edit, and move entrypoints, and that ShiftEditorSheet already rendered the stable predictive hooks recurrence-suggestion, recurrence-suggestion-accept, recurrence-suggestion-dismiss, recurrence-field-state, and clash-advisory without overwriting draft timing when a weekly suggestion is accepted. T04 verified the dedicated mobile Playwright helper/spec surface already exercised suggestion visible → dismiss → close/reopen hidden → reload visible → accept plus overlap/clear advisory behavior on the real Alpha shared-calendar route. Fresh closeout verification re-ran the slice plan commands and confirmed green unit, typecheck, and end-to-end proof. This advances R011 by delivering the mobile predictive surfaces and shared overlap logic needed for cross-platform predictive assistance; formal requirement validation remains with S06 hardening/validation.

## Verification

Fresh closeout verification passed all slice-plan commands: (1) `pnpm --dir apps/mobile check` → exit 0 in 4103ms with `svelte-check found 0 errors and 0 warnings`; (2) `pnpm --dir apps/web exec vitest run tests/schedule/shift-editor-advisory.unit.test.ts` → exit 0 in 1887ms with 3/3 tests passing; (3) `pnpm --dir apps/mobile exec vitest run tests/mobile-predictive.unit.test.ts` → exit 0 in 1836ms with 4/4 tests passing; (4) `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/mobile-predictive.spec.ts tests/e2e/find-time-handoff.spec.ts tests/e2e/mobile-assembly.spec.ts` → exit 0 in 47812ms with 10/10 Playwright tests passing. Additional observability inspection confirmed the planned predictive diagnostics hooks remain present in the route, sheet, and E2E spec surfaces.

## Requirements Advanced

- R011 — Delivered mobile predictive-create and clash-advisory surfaces, shared overlap logic, explicit diagnostics, and passing mobile smoke coverage needed for cross-platform predictive scheduling assistance.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

T03 and T04 completed as verification-first tasks because the expected mobile predictive wiring and smoke specs were already present in the repository; closeout focused on re-verifying them with fresh evidence rather than introducing additional code changes.

## Known Limitations

R011 is advanced but not yet formally marked validated; S06 still owns accessibility/build hardening and final milestone-level validation.

## Follow-ups

S06 should use these stable mobile diagnostics and shared predictive hooks while validating R011 and completing launch hardening, accessibility, and deployment readiness.

## Files Created/Modified

- `packages/caluno-core/src/schedule/shift-editor-advisory.ts` — Added the shared deriveShiftEditorClashes() helper used by both apps.
- `packages/caluno-core/src/index.ts` — Exported the shared shift-editor advisory helper from the core package.
- `packages/caluno-core/package.json` — Added the schedule/shift-editor-advisory package subpath export.
- `apps/web/src/lib/schedule/shift-editor-advisory.ts` — Reduced the web-local advisory module to a thin re-export of the shared helper.
- `apps/web/tests/schedule/shift-editor-advisory.unit.test.ts` — Retargeted the advisory contract tests to the shared helper import path.
- `apps/mobile/src/lib/offline/transport.ts` — Added bounded recurrence-suggestion loading with fail-closed result handling.
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — Owned recurrence suggestion state/diagnostics and threaded predictive props into the mobile calendar board.
- `apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte` — Passed recurrence suggestion and existing visible-week shifts into create-sheet entrypoints.
- `apps/mobile/src/lib/components/calendar/ShiftCard.svelte` — Threaded visible-week existing shifts into edit and move entrypoints for self-excluding advisory previews.
- `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte` — Rendered stable recurrence suggestion and clash-advisory hooks while preserving draft timing on accept.
- `apps/mobile/tests/mobile-predictive.unit.test.ts` — Covered bounded query shape plus ready/empty/timeout/query-error/malformed fail-closed loader behavior.
- `apps/mobile/tests/e2e/fixtures.ts` — Exposed deterministic helpers for reading mobile recurrence suggestion and clash-advisory state in Playwright.
- `apps/mobile/tests/e2e/mobile-predictive.spec.ts` — Proved dismiss/reload/accept suggestion flow and overlap/clear advisory behavior on the real mobile route.
