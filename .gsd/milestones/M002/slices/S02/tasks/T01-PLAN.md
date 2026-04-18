---
estimated_steps: 4
estimated_files: 5
skills_used:
  - debug-like-expert
---

# T01: Build the ranked candidate contract and nearby-constraint proof

**Slice:** S02 — Ranked suggestions and explanation quality
**Milestone:** M002

## Description

Retire the core S02 risk in pure code before any route or UI wiring. Split recommendation shaping from raw window generation, rank against the full truthful candidate set before truncation, and attach explanation metadata that can say who is free, who is blocked, and which nearby busy intervals define the invalid edges around a candidate.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Raw availability spans from `matcher.ts` | Keep the task incomplete and do not fall back to UI-only sorting of already truncated windows. | N/A | Reject invalid span or member data and keep ranked candidates empty rather than inventing explanations. |
| Busy-interval rows shaped in `find-time.ts` | Keep explanation fields absent and fail the contract tests instead of silently omitting blocked/nearby context. | Surface timeout behavior through the existing loader tests; do not change auth/query semantics here. | Reject unknown or duplicate member assignments and refuse to trust nearby-constraint output. |

## Load Profile

- **Shared resources**: in-memory candidate ranking over a bounded 30-day horizon plus trusted busy-interval metadata.
- **Per-operation cost**: one pass to produce raw candidate spans and one bounded pass to score/select shortlist candidates.
- **10x breakpoint**: candidate scoring and nearby-constraint lookup will degrade first if the implementation rescans every busy interval per window instead of reusing ordered data.

## Negative Tests

- **Malformed inputs**: empty roster, malformed busy intervals, invalid duration bounds, and missing shift titles in explanation rows.
- **Error paths**: duplicate/unknown member assignments, ranking after truncation, and explanation shaping from malformed candidate data.
- **Boundary conditions**: equal-score tie breaks, candidates with exactly two free members, no shared shortlist candidates, and leading/trailing edge constraints at the 30-day bounds.

## Steps

1. Add `apps/web/src/lib/find-time/ranking.ts` to convert truthful raw windows into ranked candidates with score breakdowns, blocked-member summaries, nearby leading/trailing constraints, and shortlist selection rules.
2. Refactor `apps/web/src/lib/find-time/matcher.ts` as needed so ranking runs on the full candidate set before any `maxWindows` truncation and uses truthful metrics only: shared-member count, continuous-span slack, nearby edge pressure, then earlier start.
3. Extend trusted busy-interval shaping in `apps/web/src/lib/server/find-time.ts` so same-calendar shift titles can participate in nearby-constraint explanations without widening roster or schedule scope.
4. Add unit coverage in `apps/web/tests/find-time/matcher.unit.test.ts` and `apps/web/tests/find-time/member-availability.unit.test.ts` for ranking order, shortlist eligibility, tie-break behavior, nearby-constraint shaping, and malformed/duplicate assignment rejection.

## Must-Haves

- [ ] Ranked candidates are derived from the full truthful candidate set before truncation.
- [ ] Nearby explanations include blocked members plus leading/trailing busy constraints without requiring the browser to infer adjacency.
- [ ] Shortlist eligibility is explicit and test-covered for shared availability rather than hidden in UI conditionals.
- [ ] Malformed roster/assignment data still fails closed instead of producing guessed explanations.

## Verification

- `pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/find-time/member-availability.unit.test.ts`
- `rg -n "topPicks|nearbyConstraints|shiftTitle|scoreBreakdown" apps/web/src/lib/find-time/matcher.ts apps/web/src/lib/find-time/ranking.ts apps/web/src/lib/server/find-time.ts`

## Observability Impact

- Signals added/changed: ranked-candidate score breakdowns and nearby-constraint metadata become first-class trusted outputs.
- How a future agent inspects this: run the matcher/member-availability unit suites and inspect the ranking/explanation types directly.
- Failure state exposed: pre-truncation ranking regressions, malformed constraint rows, and shortlist-threshold mistakes become test-visible.

## Inputs

- `apps/web/src/lib/find-time/matcher.ts` — current raw truthful window generator and duration/range normalization.
- `apps/web/src/lib/server/find-time.ts` — trusted roster/busy loader that must stay fail closed.
- `apps/web/tests/find-time/matcher.unit.test.ts` — existing matcher contract coverage to extend.
- `apps/web/tests/find-time/member-availability.unit.test.ts` — trusted busy-interval and scope regression coverage.

## Expected Output

- `apps/web/src/lib/find-time/ranking.ts` — ranked candidate types, scoring, shortlist selection, and nearby-constraint shaping.
- `apps/web/src/lib/find-time/matcher.ts` — matcher exports adjusted so ranking happens before truncation.
- `apps/web/src/lib/server/find-time.ts` — busy-interval shape extended for truthful nearby explanations.
- `apps/web/tests/find-time/matcher.unit.test.ts` — ranking, tie-break, shortlist, and edge-constraint proof.
- `apps/web/tests/find-time/member-availability.unit.test.ts` — fail-closed coverage for new explanation metadata inputs.
