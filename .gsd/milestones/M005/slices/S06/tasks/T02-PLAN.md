---
estimated_steps: 45
estimated_files: 3
skills_used: []
---

# T02: Add focused axe coverage for the web predictive create editor

---
estimated_steps: 5
estimated_files: 3
skills_used:
  - accessibility
  - test
  - verify-before-complete
---

# T02: Add focused axe coverage for the web predictive create editor

**Slice:** S06 — Hardening, accessibility, and deployment readiness
**Milestone:** M005

## Description

Add the missing accessibility harness where the slice already has the best seeded proof surface: the web predictive create editor. Install `@axe-core/playwright` only where it is needed, open the existing predictive create flow in `calendar-shifts.spec.ts`, and run an axe scan scoped to the live create editor subtree so S06 can truthfully claim zero new WCAG 2.1 AA violations on the predictive surface without turning into a whole-app accessibility rewrite.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Local Supabase-backed seeded Playwright environment | Fail the test run and fix the accessibility/test seam before closing the slice. | Treat as environment/runtime blocker; do not weaken the check or skip the test silently. | N/A for this task; the proof reads rendered DOM state, not a custom response payload. |

## Negative Tests

- **Malformed inputs**: Keep the accessibility scope pinned to the actual `create-shift-editor` subtree so missing selectors fail loudly instead of scanning the wrong surface.
- **Error paths**: Axe violations must fail the spec with actionable node/rule output; do not catch and downgrade them to logs.
- **Boundary conditions**: The predictive editor must still be opened through the seeded recurrence-suggestion path already used by the spec, not through ad hoc fixture state.

## Steps

1. Add `@axe-core/playwright` to `apps/web/package.json` and update `pnpm-lock.yaml`.
2. Extend `apps/web/tests/e2e/calendar-shifts.spec.ts` with a dedicated accessibility test/step that signs in, opens the seeded predictive create editor, and scopes the scan to the open editor surface.
3. Reuse existing helper flows and stable hooks like `create-shift-editor` / `recurrence-suggestion`; avoid whole-page selectors when the editor subtree is available.
4. Keep the assertion truthful: zero new WCAG 2.1 AA violations on the predictive create surface, with no silent disables unless a concrete, documented false positive is proven.
5. Run the targeted web predictive spec from a fresh Supabase reset.

## Must-Haves

- [ ] The repo gains an executable axe-core Playwright seam for the web predictive create surface.
- [ ] The accessibility proof stays slice-scoped to the real predictive editor and fails loudly on violations.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`
- Confirm the new accessibility proof executes on the seeded predictive create editor and reports zero violations.

## Observability Impact

- Signals added/changed: Playwright axe failure output tied to the predictive create subtree.
- How a future agent inspects this: run the dedicated `calendar-shifts.spec.ts` accessibility proof and inspect the failing rule/node details.
- Failure state exposed: accessibility regressions now fail in CI/local proof with explicit WCAG rule names instead of remaining implicit.

## Inputs

- `apps/web/package.json` — current web test dependencies.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — seeded predictive create proof seam.
- `apps/web/tests/e2e/fixtures.ts` — existing helpers for opening the create editor and cleaning proof shifts, if needed.

## Expected Output

- `apps/web/package.json` — adds `@axe-core/playwright`.
- `pnpm-lock.yaml` — lockfile updated for the new dependency.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — focused accessibility proof for the predictive create editor.

## Inputs

- `apps/web/package.json`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`

## Expected Output

- `apps/web/package.json`
- `pnpm-lock.yaml`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`

## Verification

npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts

## Observability Impact

Adds an explicit accessibility-proof surface for the predictive web editor so future regressions surface as named axe rule failures instead of manual QA drift.
