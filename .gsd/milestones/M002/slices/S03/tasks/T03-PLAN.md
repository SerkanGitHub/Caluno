---
estimated_steps: 4
estimated_files: 4
skills_used:
  - frontend-design
---

# T03: Add suggestion CTA wiring and prove the end-to-end handoff in the browser

**Slice:** S03 — Suggestion-to-create handoff
**Milestone:** M002

## Description

Close the loop in the real product path. A member should be able to pick a truthful suggestion from either the Top picks surface or the lighter browse inventory, land on the correct calendar week with the exact slot prefilled, create the shift, and reload without reopening the same handoff.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Find-time page rendering of top-pick and browse cards | Keep existing result cards visible and fail the browser proof until CTA wiring is restored. | Preserve the current explicit timeout/offline states instead of adding speculative client fallback. | Do not render handoff links from incomplete window data; keep the card truthful but non-actionable until the payload is fixed. |
| Browser fixtures and seeded create-flow proof | Keep the test red until the real route lands on the correct week, opens the dialog, and creates the shift. | Treat as incomplete; do not weaken assertions around reload, URL cleanup, or created-shift visibility. | Fail fast if handoff attributes or prefilled values are missing instead of rebuilding them in the test helper. |

## Load Profile

- **Shared resources**: one protected find-time route, one protected calendar route, and browser-local UI state during create submission.
- **Per-operation cost**: click one suggestion CTA, land on one board week, submit one create action, then reload once to prove one-shot cleanup.
- **10x breakpoint**: DOM/test fragility and duplicate CTA markup will hurt maintainability before runtime performance matters.

## Negative Tests

- **Malformed inputs**: cards missing exact slot timestamps should not render actionable prefill links.
- **Error paths**: denied calendar route, offline-unavailable route, and missing create dialog state after navigation.
- **Boundary conditions**: a suggestion whose slot lands in a later week than the current search anchor, reload after submit, and browse-card as well as top-pick CTA coverage.

## Steps

1. Add stable CTA links or buttons to both Top picks and browse cards using the shared prefill helper and explicit `data-testid` / handoff attributes for inspection.
2. Update browser fixtures so tests can read the CTA target, board week, and prefilled dialog values without re-deriving them from prose.
3. Extend end-to-end proof to click a real suggestion, assert the destination week and exact `datetime-local` values, submit the create form, verify the new shift appears on the intended day, and confirm reload no longer reopens the same prefill.
4. Keep existing denied and offline `/find-time` proof paths intact so the richer handoff surface does not widen authority or cached behavior.

## Must-Haves

- [ ] Top-pick and browse cards both expose a deterministic suggestion-to-create CTA.
- [ ] Browser proof asserts the CTA target week is derived from the chosen slot, not the original find-time search anchor.
- [ ] Submitting the prefilled dialog creates a visible shift on the destination board day.
- [ ] Reloading after arrival/submission does not keep reopening the same handoff state.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts tests/e2e/calendar-shifts.spec.ts`
- `pnpm --dir apps/web check`

## Observability Impact

- Signals added/changed: CTA `data-testid` / handoff attributes on suggestion cards, prefilled create-dialog field values in the browser, and post-arrival URL cleanup visible in the page URL.
- How a future agent inspects this: use the Playwright specs plus fixture snapshot helpers to read CTA targets, board week attributes, and created-shift visibility.
- Failure state exposed: missing CTA wiring, wrong-week navigation, absent prefill values, and sticky reopen behavior become explicit browser failures.

## Inputs

- `apps/web/src/lib/schedule/create-prefill.ts` — shared handoff contract from T01.
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte` — current Top picks and browse card rendering.
- `apps/web/tests/e2e/fixtures.ts` — existing helpers for board state and find-time card snapshots.
- `apps/web/tests/e2e/find-time.spec.ts` — existing protected-route proof for ready, denied, and offline paths.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — existing board/create-flow browser proof surface.

## Expected Output

- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte` — deterministic suggestion-to-create CTA wiring on Top picks and browse cards.
- `apps/web/tests/e2e/fixtures.ts` — helpers for CTA target, board week, and prefilled create-dialog inspection.
- `apps/web/tests/e2e/find-time.spec.ts` — browser proof for click-through handoff, denial, and offline preservation.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — browser proof that the prefilled create flow yields a visible shift on the intended board day and stays non-sticky on reload.
