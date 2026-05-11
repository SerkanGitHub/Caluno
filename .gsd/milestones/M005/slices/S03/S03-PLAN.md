# S03: Wire recurrence suggestion into web shift create dialog

**Goal:** Wire the shared recurrence-pattern helper into the protected web calendar create dialog so the seeded Alpha week surfaces a calm suggestion chip, accepting it truthfully pre-fills weekly recurrence fields, dismissing it leaves the form blank, and both behaviors are covered by route-unit plus browser proof.
**Demo:** Opening the web shift create dialog on a calendar with a known pattern surfaces a suggestion chip. Accepting pre-fills recurrence fields. Dismissing leaves the form blank. Browser E2E covers both paths.

## Must-Haves

- **Demo:** Opening the protected Alpha calendar week with qualifying seeded history surfaces a recurrence suggestion inside the create dialog; accepting it selects weekly cadence with interval `1` while leaving repeat bounds empty, and dismissing it hides the suggestion while keeping the form blank.
- ## Must-Haves
- The recurrence suggestion is derived only from same-calendar shifts in a trailing 30-day window ending at the route’s visible-week exclusive end and fails closed to `null` on query errors or malformed data.
- The create dialog exposes a calm, keyboard-accessible suggestion surface with stable test ids and does not leak accepted/dismissed state across close, submit, reload, or reopen cycles.
- Seeded Alpha browser fixtures contain a truthful weekly pattern that satisfies the shared helper contract and can deterministically drive Playwright proof.
- ## Threat Surface
- **Abuse**: query-param tampering must not widen predictive evidence beyond the authorized `calendarId` plus the fixed trailing window.
- **Data exposure**: no cross-calendar history or additional member data is surfaced beyond existing shift metadata already visible in the protected calendar route.
- **Input trust**: visible-week params, DB rows, and loader results are treated as untrusted and fail closed to a missing suggestion.
- ## Requirement Impact
- **Requirements touched**: R011 directly, while preserving R002 calendar-scope boundaries and re-verifying R003 recurrence-create behavior on web.
- **Re-verify**: protected calendar route load contract, create-dialog recurrence submission defaults, and seeded `calendar-shifts` browser flow.
- **Decisions revisited**: D063 and D064.
- ## Verification
- `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/recurrence.unit.test.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`

## Proof Level

- This slice proves: Integration proof: bounded server-loader contract plus real browser create-dialog runtime. Real runtime required: yes. Human/UAT required: no.

## Integration Closure

Consumes `detectRecurrencePattern` from `@repo/caluno-core`, the protected calendar route loader, and the create-dialog wiring chain (`+page.server.ts` → `+page.svelte` → `CalendarWeekBoard.svelte` → `ShiftEditorDialog.svelte`). After this slice, recurrence suggestions are live on the web create flow; milestone end-to-end still needs the conflict advisory, mobile parity, and hardening slices.

## Verification

- Add a positive-path server log when a recurrence suggestion is computed and stable DOM inspection hooks for the suggestion surface (`data-testid="recurrence-suggestion"`, accept/dismiss controls, and recurrence field state) so future agents can tell whether the hint was generated, surfaced, accepted, or dismissed without guessing.

## Tasks

- [x] **T01: Add a bounded recurrence-suggestion route contract and truthful weekly fixture baseline** `est:70m`
  ---
  estimated_steps: 7
  estimated_files: 6
  skills_used:
    - test
    - verify-before-complete
  ---
  - Files: `apps/web/src/lib/server/schedule.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`, `apps/web/tests/routes/protected-routes.unit.test.ts`, `apps/web/tests/schedule/recurrence.unit.test.ts`, `supabase/seed.sql`, `apps/web/tests/e2e/fixtures.ts`
  - Verify: pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/recurrence.unit.test.ts

- [x] **T02: Wire the create-dialog suggestion UX and prove accept/dismiss flows in Playwright** `est:85m`
  ---
  estimated_steps: 8
  estimated_files: 6
  skills_used:
    - frontend-design
    - accessibility
    - test
    - verify-before-complete
  ---
  - Files: `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`, `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`, `apps/web/src/app.css`, `apps/web/tests/e2e/fixtures.ts`, `apps/web/tests/e2e/calendar-shifts.spec.ts`
  - Verify: npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts

## Files Likely Touched

- apps/web/src/lib/server/schedule.ts
- apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts
- apps/web/tests/routes/protected-routes.unit.test.ts
- apps/web/tests/schedule/recurrence.unit.test.ts
- supabase/seed.sql
- apps/web/tests/e2e/fixtures.ts
- apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
- apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte
- apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte
- apps/web/src/app.css
- apps/web/tests/e2e/calendar-shifts.spec.ts
