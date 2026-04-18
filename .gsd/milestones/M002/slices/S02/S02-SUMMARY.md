---
id: S02
parent: M002
milestone: M002
provides:
  - A truthful ranked recommendation contract for `/calendars/[calendarId]/find-time`, including `topPicks`, `browseWindows`, exact slot timestamps, containing free spans, blocked-member summaries, and nearby busy-edge explanations.
  - A distinct Top picks UI surface with richer explanation density plus a lighter browse inventory for the remaining ranked windows.
  - Stable DOM and test surfaces that downstream work can use to verify recommendation order, explanation payloads, denial, and offline behavior without re-deriving the ranking contract.
requires:
  - slice: S01
    provides: Trusted member-attributed availability loading, exact slot/span window contracts, protected route authorization, and fail-closed offline boot behavior for `/find-time`.
affects:
  - S03
key_files:
  - apps/web/src/lib/find-time/ranking.ts
  - apps/web/src/lib/find-time/matcher.ts
  - apps/web/src/lib/server/find-time.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte
  - apps/web/tests/find-time/matcher.unit.test.ts
  - apps/web/tests/find-time/member-availability.unit.test.ts
  - apps/web/tests/routes/find-time-routes.unit.test.ts
  - apps/web/tests/e2e/fixtures.ts
  - apps/web/tests/e2e/find-time.spec.ts
key_decisions:
  - D040 — Add a dedicated ranking module that emits explicit shortlist metadata and orders truthful candidates by shared-member count, span slack, nearby-edge pressure, then earlier start before truncation.
  - D041 — Render Top picks as the high-density explanation surface and keep browse windows as a lighter truthful inventory with stable DOM hooks for browser inspection.
patterns_established:
  - Rank truthful shared-free-time candidates before truncation in the trusted server layer; do not try to recover recommendation quality by reordering an already-trimmed browse page.
  - Keep explanation shaping server-authored: blocked-member summaries and leading/trailing nearby constraints should be delivered as trusted payload fields rather than reconstructed in the browser from raw busy rows.
  - Use a split-density UI pattern for recommendation surfaces: Top picks carry the rich explanation block, while browse cards stay compact and scan-friendly but remain truthful and inspectable.
observability_surfaces:
  - Typed `status` / `reason` / `message` route states for ready, denied, invalid-input, query-failure, timeout, malformed-response, no-results, and offline-unavailable outcomes.
  - Ranked-window explanation diagnostics in the ready payload: `topPick`, `topPickRank`, `scoreBreakdown`, `blockedMembers`, and `nearbyConstraints`.
  - Stable UI inspection hooks including `find-time-route-state`, `find-time-search-state`, `find-time-top-picks`, `find-time-browse-results`, `find-time-top-pick-*`, and `find-time-browse-window-*` data/test-id surfaces.
  - Deterministic browser snapshot helpers in `apps/web/tests/e2e/fixtures.ts` and browser proof in `apps/web/tests/e2e/find-time.spec.ts` for shortlist order, nearby-edge summaries, denial, and offline fail-closed behavior.
drill_down_paths:
  - .gsd/milestones/M002/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S02/tasks/T02-SUMMARY.md
  - .gsd/milestones/M002/slices/S02/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-18T20:00:09.713Z
blocker_discovered: false
---

# S02: Ranked suggestions and explanation quality

**Delivered a ranked, explanation-rich `/calendars/[calendarId]/find-time` recommendation surface that highlights truthful Top picks before the browse list, explains who is free and what nearby busy edges block adjacent times, and keeps denied/offline behavior fail closed.**

## What Happened

## Delivered Scope
S02 turned the truthful browse route from S01 into an actual recommendation surface. The slice added a dedicated ranking layer that scores the full truthful candidate set before truncation, shaped the protected server contract into separate `topPicks` and `browseWindows` payloads, and redesigned the route UI so Top picks carry the high-density explanation layer while the remaining browse inventory stays compact and scan-friendly.

## What Actually Shipped
T01 introduced `apps/web/src/lib/find-time/ranking.ts` and refactored the matcher/server contract so ranking is computed on the full truthful window set, not the already-truncated chronological page. Ranked windows now expose explicit shortlist metadata (`topPickEligible`, `topPick`, `topPickRank`), score breakdown fields, blocked-member summaries, and nearby leading/trailing busy constraints with same-calendar shift titles when trusted data is available. Malformed busy-row inputs fail closed instead of producing guessed explanations.

T02 hardened the protected route contract in `apps/web/src/lib/server/find-time.ts` so ready responses return separate `topPicks` and `browseWindows` arrays while preserving compatibility `windows` ordering as shortlist-first followed by browse results. Route coverage now proves shortlist separation, ranked ordering, empty-shortlist ready states, malformed trusted-row handling, and out-of-scope denial without relaxing the existing permission boundary.

T03 shipped the visible browser experience in `+page.svelte` and the real browser proof. The route now renders a distinct Top picks section before the browse list, with richer "who is free", "who is blocked", and "why earlier/later times fail" panels plus stable `data-testid` and data-attribute hooks for ranking and nearby-constraint inspection. Browse cards intentionally stay lighter-weight, showing compact free-member and nearby-edge summaries without duplicating the full shortlist explanation block. The e2e fixture/spec now proves real ranked order, explanation fallback for fully-free top picks, blocked-member nearby-edge summaries on browse results, explicit denial on another group's calendar, and fail-closed offline entry from the warmed calendar board.

## Verification Summary
All planned slice-level verification passed on the final assembled slice. `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts` passed with 24/24 tests green. `pnpm --dir apps/web check` passed with 0 errors and 0 warnings. `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts` passed all three browser scenarios: ranked Top picks plus browse explanations for a permitted Alpha member, explicit denial on the Beta calendar for an unauthorized member, and fail-closed offline entry on a warmed `/find-time` route.

## Observability & Diagnostics
The observability surface planned for this slice is live. The server still exposes typed `status` / `reason` / `message` states for ready, denied, invalid-input, query-failure, timeout, malformed-response, no-results, and offline-unavailable outcomes. Ranked windows now carry stable explanation diagnostics including score breakdowns, blocked-member summaries, and leading/trailing nearby-constraint metadata. The UI exposes those diagnostics through `find-time-route-state`, `find-time-search-state`, `find-time-top-picks`, `find-time-browse-results`, `find-time-top-pick-*`, and `find-time-browse-window-*` hooks, and the Playwright fixture can read those DOM attributes back into deterministic snapshots for future slices.

## Operational Readiness
Health signal: a permitted member can open `/calendars/[calendarId]/find-time`, search a trusted 30-day range, and immediately see ranked Top picks before the lighter browse inventory. Failure signals: denied, invalid-input, malformed-response, timeout, no-results, and offline-unavailable states remain explicit and distinct. Recovery procedure: restore connectivity for offline-unavailable, correct invalid duration/start input, or rerun once trusted Supabase reads recover for query/timeout failures; the route intentionally withholds suggestions until the server can shape them from trusted roster and busy data. Monitoring gaps: there is still no selected-window handoff telemetry or create-flow proof; S03 remains responsible for carrying a chosen suggestion into the existing schedule-create experience.

## Dependency Contract For Downstream Slices
S03 can now assume that `/find-time` already produces a truthful recommendation contract with exact slot timestamps, containing free spans, explicit shortlist rank, free-member lists, blocked-member summaries, and nearby busy-edge explanations. It does not need to recompute ranking or derive explanations client-side. Downstream work must preserve the existing fail-closed boundary: only authorized calendar names and same-calendar shift titles appear in recommendation surfaces, denied calendars never expose foreign roster data, and warmed offline route documents still render `offline-unavailable` instead of replaying cached authority.

## Limitations / Remaining Work
This slice stops at recommendation quality. It does not yet let a user choose a suggestion and land in the existing create flow with that exact time prefilled. That handoff is the purpose of S03 rather than a gap in the recommendation contract delivered here.

## Verification

Passed all planned slice checks:
- `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts` → 24 tests passed.
- `pnpm --dir apps/web check` → 0 errors, 0 warnings.
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts` → 3/3 browser scenarios passed (ranked top picks + browse proof, unauthorized denial, offline fail-closed).

Observability surfaces were also confirmed during verification: typed `status`/`reason`/`message` route states remained distinguishable in unit and browser proof, while `find-time-top-picks`, `find-time-browse-results`, per-card `data-testid` hooks, and nearby-constraint data attributes stayed readable through the Playwright fixture snapshot helpers.

## Requirements Advanced

- R002 — Re-verified that shared free-time recommendations remain inside the permitted calendar boundary: unauthorized calendar ids still short-circuit to explicit denial, and the recommendation UI exposes only already-authorized roster names and same-calendar shift titles.
- R012 — Re-confirmed the existing auth/RLS/sharing boundary under richer recommendation payloads, including fail-closed malformed-response handling, explicit denial, and offline-unavailable behavior that withholds results when authority cannot be re-established.

## Requirements Validated

- R008 — Validated by passing `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts`, `pnpm --dir apps/web check`, and `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts`, which together proved truthful ranked shared windows, explanation-rich Top picks, nearby busy-edge summaries, explicit denial, and fail-closed offline behavior on `/calendars/[calendarId]/find-time`.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

Suggestion-to-create handoff is still missing; selecting a ranked window does not yet open the existing create flow with prefilled time. That work belongs to S03.

## Follow-ups

S03 should consume the existing exact slot/span/top-pick contract directly, preserve the fail-closed authorization and offline boundaries, and add a deterministic handoff into the calendar create experience without recomputing ranking or explanation logic in the client.

## Files Created/Modified

- `apps/web/src/lib/find-time/ranking.ts` — Added the dedicated ranking/explanation layer for truthful candidates before truncation.
- `apps/web/src/lib/find-time/matcher.ts` — Refactored raw window generation to compose with ranking metadata and nearby-constraint shaping.
- `apps/web/src/lib/server/find-time.ts` — Split ready payloads into `topPicks` and `browseWindows` and preserved fail-closed malformed/denied behavior.
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte` — Rendered the distinct Top picks surface, compact browse inventory, and stable DOM diagnostics for explanations.
- `apps/web/tests/find-time/matcher.unit.test.ts` — Covered ranking order, tie-breaks, shortlist eligibility, and nearby-constraint proof.
- `apps/web/tests/find-time/member-availability.unit.test.ts` — Covered trusted busy-row shaping, shift-title preservation, and malformed fail-closed behavior.
- `apps/web/tests/routes/find-time-routes.unit.test.ts` — Proved ranked shortlist/browse contract separation, denial, and malformed-response fail-closed behavior.
- `apps/web/tests/e2e/fixtures.ts` — Captured deterministic snapshots for Top picks and browse cards in the seeded browser proof.
- `apps/web/tests/e2e/find-time.spec.ts` — Verified ranked Top picks, lighter browse cards, explicit denial, and offline fail-closed behavior in the real route.
