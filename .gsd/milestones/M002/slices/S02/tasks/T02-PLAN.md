---
estimated_steps: 4
estimated_files: 4
skills_used:
  - debug-like-expert
---

# T02: Return ranked shortlist and browse payloads from the protected route

**Slice:** S02 — Ranked suggestions and explanation quality
**Milestone:** M002

## Description

Once the ranking contract is stable, wire it into the existing protected `/find-time` server path so authorization, invalid-input handling, and explicit failure states remain unchanged while the ready payload becomes recommendation-aware. Keep this task server-focused: the output should be a route contract the browser can render directly.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Trusted roster/busy loader in `find-time.ts` | Preserve existing `denied` / `query-failure` behavior and do not emit partial ranked payloads. | Surface the same timeout reasons as S01 and keep `topPicks` / `browseWindows` empty. | Return `malformed-response` and refuse to shape shortlist explanations from bad rows. |
| Ranking/explanation layer from `ranking.ts` | Keep the route on the last explicit failure branch rather than falling back to chronological browse order. | N/A | Treat malformed ranked candidates as a server contract failure and fail the route tests. |

## Load Profile

- **Shared resources**: one roster read, one bounded shift query, and in-memory ranking over the resulting candidate set.
- **Per-operation cost**: unchanged DB query count from S01 plus ranking/shaping in the server layer.
- **10x breakpoint**: ready-path payload size and ranking cost will degrade first if the route returns duplicate explanation data on every browse card.

## Negative Tests

- **Malformed inputs**: malformed `calendarId`, missing duration, malformed range anchor, and malformed ranked candidate fields.
- **Error paths**: roster timeout, assignment timeout, malformed roster/busy responses, and denied calendar scope.
- **Boundary conditions**: `ready` state with zero shortlist candidates but non-empty browse results, truncated ranked browse lists, and two-member shortlist thresholds.

## Steps

1. Update `apps/web/src/lib/server/find-time.ts` so `loadFindTimeSearchView()` composes the ranking layer into a ready payload with `topPicks`, `browseWindows`, total counts, and clear explanation data for each candidate.
2. Keep `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts` on the same protected route and denied-state conventions, changing only the richer ready-path payload shape.
3. Expand `apps/web/tests/routes/find-time-routes.unit.test.ts` to assert ranked ordering, shortlist separation, preserved fail-closed branches, and the search-state metadata needed by the UI.
4. Re-verify that malformed ids, out-of-scope calendars, and trusted query failures still short-circuit before any protected data is exposed.

## Must-Haves

- [ ] The route returns separate shortlist and browse arrays instead of asking the browser to derive ranking.
- [ ] Existing `denied`, `invalid-input`, `query-failure`, `timeout`, `malformed-response`, and `no-results` states stay explicit.
- [ ] Ranked ready payloads remain scoped to the authorized calendar roster and same-calendar busy intervals only.
- [ ] Route tests cover both recommendation quality and fail-closed boundary behavior.

## Verification

- `pnpm --dir apps/web exec vitest run tests/routes/find-time-routes.unit.test.ts tests/find-time/matcher.unit.test.ts tests/find-time/member-availability.unit.test.ts`
- `rg -n "topPicks|browseWindows|blockedMembers|nearbyConstraints" apps/web/src/lib/server/find-time.ts apps/web/src/routes/'(app)'/calendars/'[calendarId]'/find-time/+page.server.ts`

## Observability Impact

- Signals added/changed: ready-path search payload now exposes shortlist/browse separation and explanation fields while preserving typed failure reasons.
- How a future agent inspects this: run route unit tests or inspect the serialized search payload returned by `+page.server.ts`.
- Failure state exposed: empty shortlist vs ready browse results, malformed explanation payloads, and fail-closed auth branches remain distinguishable.

## Inputs

- `apps/web/src/lib/server/find-time.ts` — current protected search contract from S01 plus T01 ranking inputs.
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts` — protected route entrypoint that must preserve denied-state behavior.
- `apps/web/tests/routes/find-time-routes.unit.test.ts` — route contract proof surface to extend.
- `apps/web/tests/find-time/matcher.unit.test.ts` — ranked candidate behavior already proven in T01 and reused here.

## Expected Output

- `apps/web/src/lib/server/find-time.ts` — recommendation-aware ready payload with shortlist and browse separation.
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts` — protected route load consuming the richer server contract.
- `apps/web/tests/routes/find-time-routes.unit.test.ts` — route proof for ranking quality plus fail-closed branches.
- `apps/web/tests/find-time/matcher.unit.test.ts` — any supporting contract updates needed by route assertions.
