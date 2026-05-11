# S04: Wire clash advisory into web shift editor

**Goal:** Wire the shared advisory conflict-preview helper into the web shift editor so overlapping drafts surface a calm, non-blocking warning before save while preserving same-calendar scope and existing create/edit/move flows.
**Demo:** Creating a shift on web that would overlap an existing one shows a non-blocking advisory before confirm. The user can still save. Browser E2E covers conflict and clear scenarios.

## Must-Haves

- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` renders a warning-only `data-testid="clash-advisory"` surface when the current draft overlaps same-calendar visible-week shifts and hides it for clear/touching-boundary drafts.
- The create flow remains advisory-only: submit stays enabled while the advisory is visible, and an overlapping shift can still be saved successfully.
- Visible-week shift context is threaded from `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` into the shared editor entrypoints without widening beyond the already-authorized calendar/week payload.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` covers both an overlapping create draft and a clear create draft.
- Verification passes:
- `pnpm --dir apps/web exec svelte-check --tsconfig ./tsconfig.json`
- `pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts`
- `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`

## Proof Level

- This slice proves: integration — this slice proves the live web editor wiring around the existing `previewShiftConflicts()` contract with real browser interaction, while relying on S02’s unit-contract proof for overlap semantics.

## Integration Closure

Consumes the S02 shared conflict-preview contract and the protected calendar page’s visible-week schedule, then closes the web pre-submit advisory loop for create/edit/move dialogs. Mobile parity remains for S05; launch hardening and R011 validation remain for S06.

## Verification

- Adds an explicit pre-submit inspection surface (`data-testid="clash-advisory"`) plus Playwright advisory snapshots so future agents can distinguish overlapping versus clear drafts before submit without inferring from post-save board conflicts.

## Tasks

- [x] **T01: Thread visible-week shift context into all web shift-editor entrypoints** `est:40m`
  ---
  estimated_steps: 5
  estimated_files: 4
  skills_used:
    - frontend-design
  ---
  - Files: `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`, `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte`, `apps/web/src/lib/components/calendar/ShiftCard.svelte`
  - Verify: pnpm --dir apps/web exec svelte-check --tsconfig ./tsconfig.json && pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/board.unit.test.ts

- [x] **T02: Add live clash-advisory state and warning-only UI to the shared shift editor** `est:1h`
  ---
  estimated_steps: 8
  estimated_files: 2
  skills_used:
    - frontend-design
    - accessibility
  ---
  - Files: `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`, `apps/web/src/app.css`
  - Verify: pnpm --dir apps/web exec svelte-check --tsconfig ./tsconfig.json && pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts

- [x] **T03: Prove advisory-only conflict and clear-state behavior with Playwright** `est:45m`
  ---
  estimated_steps: 6
  estimated_files: 2
  skills_used:
    - test
    - verify-before-complete
  ---
  - Files: `apps/web/tests/e2e/fixtures.ts`, `apps/web/tests/e2e/calendar-shifts.spec.ts`
  - Verify: pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts

## Files Likely Touched

- apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
- apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte
- apps/web/src/lib/components/calendar/ShiftDayColumn.svelte
- apps/web/src/lib/components/calendar/ShiftCard.svelte
- apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte
- apps/web/src/app.css
- apps/web/tests/e2e/fixtures.ts
- apps/web/tests/e2e/calendar-shifts.spec.ts
