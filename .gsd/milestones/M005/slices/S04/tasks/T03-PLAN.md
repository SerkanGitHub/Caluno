---
estimated_steps: 39
estimated_files: 2
skills_used: []
---

# T03: Prove advisory-only conflict and clear-state behavior with Playwright

---
estimated_steps: 6
estimated_files: 2
skills_used:
  - test
  - verify-before-complete
---

# T03: Prove advisory-only conflict and clear-state behavior with Playwright

## Why

S04 is not done until the real browser create flow proves both sides of the contract: an overlapping draft shows an advisory before save but still saves, and a clear draft stays advisory-free.

## Negative Tests

- **Malformed inputs**: the fixture helper should report advisory absence cleanly when the surface is not rendered.
- **Error paths**: conflict visibility must be asserted before submit so the test can distinguish missing preview wiring from a later post-save board conflict.
- **Boundary conditions**: a touching-boundary or clearly separated create window stays advisory-free, while the seeded Thursday overlap shows the advisory with the seeded conflicting titles.

## Steps

1. Extend `apps/web/tests/e2e/fixtures.ts` with a helper that reads the create-dialog advisory visibility/text/count and keeps the surface easy to assert.
2. Add a Playwright scenario in `apps/web/tests/e2e/calendar-shifts.spec.ts` that opens the seeded Alpha create dialog, enters an overlapping Thursday window, proves `clash-advisory` appears before submit, verifies the save button remains usable, and confirms the shift still saves.
3. Add a complementary clear-state scenario that uses a touching-boundary or separated create window and proves the advisory stays absent before submit.
4. Keep the assertions anchored to seeded fixture data (`Kitchen prep` / `Supplier call` windows) so browser proof remains deterministic.

## Must-Haves

- [ ] Browser proof checks advisory visibility before submit, not only post-save conflict surfaces.
- [ ] One test proves advisory-only behavior by saving an overlapping draft successfully.
- [ ] One test proves a clear draft does not render the advisory.

## Verification

- `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`

## Observability Impact

- Signals added/changed: deterministic Playwright advisory snapshots for overlap/clear states.
- How a future agent inspects this: rerun the calendar shifts E2E file and inspect the helper-returned advisory payload.
- Failure state exposed: missing preview wiring fails before submit instead of looking like only a board-conflict regression.

## Done when

The browser suite deterministically proves overlapping create drafts warn-but-save and clear create drafts show no advisory.

## Inputs

- `apps/web/tests/e2e/fixtures.ts` — existing browser helpers for create-dialog interaction.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — existing calendar shift/browser coverage.
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` — advisory surface and `data-testid` contract under test.
- `apps/web/tests/e2e/fixtures.ts` — seeded schedule constants used to build deterministic overlap windows.

## Expected Output

- `apps/web/tests/e2e/fixtures.ts` — advisory snapshot helper(s) for the create dialog.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — new overlapping and clear-state browser scenarios.

## Inputs

- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`

## Expected Output

- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`

## Verification

pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts

## Observability Impact

Adds deterministic end-to-end inspection of the new advisory surface so failures localize to pre-submit preview wiring instead of only surfacing after save.
