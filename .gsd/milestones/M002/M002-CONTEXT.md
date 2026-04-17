# M002: Shared free-time matching

**Gathered:** 2026-04-18
**Status:** Ready for planning

## Project Description

M002 adds a dedicated shared free-time matching flow on top of the validated M001 scheduling substrate. Inside a shared calendar, the user can open a Find time view, search across everyone who belongs to that calendar, and see both a shortlist of top candidate windows and a browseable list of valid windows over the next 30 days. The system should explain who is free and which nearby busy constraints excluded adjacent times, then let the user take a suggested window and land in a prefilled create flow.

## Why This Milestone

M001 proved Caluno can hold trusted shared schedules, offline continuity, reconnect sync, collaborator refresh, and visible conflict warnings. M002 is the first milestone that turns that substrate into the product’s differentiator: helping people actually find workable time together instead of manually reading calendars and reconciling conflicts in their heads. This needs to happen now because the scheduling foundation is already validated, and the next meaningful product step is using that real schedule data to produce useful, trustworthy suggestions.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Open a shared calendar’s Find time view and get suggested meetup windows across everyone in that calendar for the next 30 days.
- Choose a suggested window and land in a prefilled create flow using that time.

### Entry point / environment

- Entry point: protected shared-calendar browser route, expected as `/calendars/[calendarId]/find-time`
- Environment: browser / local dev / production-like web proof surface
- Live dependencies involved: Supabase auth + Postgres + existing protected SvelteKit server layer

## Completion Class

- Contract complete means: duration input, candidate window generation, ranking, explanation shaping, and prefill payload generation are covered by unit/integration proof with deterministic fixtures.
- Integration complete means: the protected calendar route, trusted membership scope, real shared schedule data, Find time view, and prefilled create flow all work together in the live browser flow.
- Operational complete means: fail-closed auth/scope behavior, explicit no-results state, and calm retryable query failure handling all hold in the real route lifecycle; no additional daemon/supervision behavior is required in this milestone.

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A signed-in member opens a permitted shared calendar’s Find time view, searches the next 30 days for a chosen duration, and sees top picks that feel right plus a fuller browseable list.
- The user can inspect a suggested window, see who is free and what nearby busy constraints excluded adjacent times, then choose it and land in the existing create flow with the time prefilled.
- We cannot fake this with isolated interval math alone: milestone completion requires the live protected route, trusted membership scope, real calendar schedule data, and browser handoff into the prefilled create flow.

## Architectural Decisions

### Dedicated Find Time Route

**Decision:** Implement M002 as a dedicated shared-calendar Find time view, expected as a sibling protected route such as `/calendars/[calendarId]/find-time`, instead of embedding matching directly into the main week board.

**Rationale:** The current calendar route already carries trusted schedule loading, local-first continuity, sync diagnostics, realtime diagnostics, and dense board interactions. Matching is a distinct planning mode with its own inputs, explanation model, and result browsing behavior. A dedicated route keeps that mental model clear and preserves the existing board as the editing surface.

**Alternatives Considered:**
- Embed matching into the week board — rejected for the first version because it would mix editing and search into one crowded surface and make the proof flow harder to reason about.

### Source of Truth vs Matching Logic Split

**Decision:** Keep Supabase/Postgres as the source of truth for membership scope and busy intervals, but implement candidate generation, ranking, and explanation logic primarily in the SvelteKit server layer rather than pushing the whole matching engine into SQL.

**Rationale:** Postgres is strong at filtering busy intervals and enforcing scope, but ranking and explanation rules will likely evolve as the product learns what “top picks feel right” means. Keeping matching logic in the server layer follows the existing codebase pattern of thin-but-trusted composed server logic over Supabase and keeps iteration easier.

**Alternatives Considered:**
- Implement the full matching/ranking/explanation engine in SQL or RPC — rejected for the first version because it would make ranking and explanation changes harder to evolve.

### Calendar-Scoped, Caluno-Only Matching

**Decision:** M002 matches only within one shared calendar, across everyone who belongs to that calendar, using only Caluno’s own schedule data.

**Rationale:** This keeps the authority model aligned with M001’s validated protected route boundary. It also avoids pulling outside calendar integrations or cross-calendar federation into the first matching milestone before the core matching behavior is proven.

**Alternatives Considered:**
- Cross-calendar or cross-group matching — rejected for M002 because it would widen authority and complexity too early.
- External calendar sync in M002 — rejected because the milestone goal is to prove useful matching on trusted in-product schedule data first.

### Availability Contract and Prefill Handoff

**Decision:** For M002, existing shift/event entries count as hard busy time, everything else counts as available unless later milestones add richer maintained constraints, and selecting a suggested window should reuse the existing create flow first rather than introducing a new event model in this milestone.

**Rationale:** The user explicitly wants a practical first version. This contract is simple, explainable, and compatible with the validated schedule substrate. Reusing the existing create flow keeps the handoff real and reduces the risk of introducing a second scheduling object before the matching experience itself is proven.

**Alternatives Considered:**
- Add richer maintained constraints now (preferred hours, buffers, rest rules) — deferred until the baseline matching behavior is validated.
- Introduce a separate event model/editor in M002 — rejected because the first milestone should prove search-to-prefill with the current scheduling surface.

### Ranking Bar for the First Version

**Decision:** Rank results so the top picks feel right rather than aiming for exhaustive perfect ordering in the first version.

**Rationale:** The biggest risk to retire first is missing obvious windows users expect to see. A shortlist that technically sorts every valid window but still surfaces obviously inconvenient suggestions would fail the product bar. The first version should prefer full-group-valid windows, earlier windows in the 30-day range, and cleaner surrounding space with fewer nearby edge conflicts.

**Alternatives Considered:**
- Optimize for exhaustive correctness before user-perceived usefulness — rejected because M002’s product value depends on trust and practical usefulness, not just interval completeness.

## Error Handling Strategy

Auth and calendar scope stay fail-closed. If the user is not trusted for the calendar, the Find time route should not guess, partially reveal, or widen access. No-results is a normal explicit state, not an error: if no valid window exists for the chosen duration in the next 30 days, the UI should say so clearly and explain the absence at a high level.

Malformed inputs such as invalid duration or bad route/filter parameters should produce direct validation feedback without server ambiguity. If matching queries fail or time out, the UI should show a calm retryable failure state rather than stale or guessed results. Explanation logic must not invent certainty: if a trustworthy explanation block cannot be produced, the system should either degrade to a simpler truthful explanation or treat the result as incomplete rather than making up reasoning.

Offline/local caches from M001 must not mint matching authority for unsynced scope. M002 may use established trusted route boundaries and existing schedule data, but it must not widen matching access or silently claim matching availability where the trusted current schedule scope is unavailable.

## Risks and Unknowns

- Missing obvious windows — if the matcher fails to surface times users expect to see, the whole feature will look broken even if the interval math is technically valid.
- Weak explanation quality — if users cannot understand why a window works or why nearby times were excluded, trust in the matching results will collapse.
- Reused create-flow mismatch — the existing create flow may need light language or UX adaptation so the meetup-planning handoff feels intentional rather than awkward.
- Ranking quality drift — “top picks feel right” is the desired bar, but the exact threshold for acceptable ranking may require careful fixture design to prove.

## Existing Codebase / Prior Art

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` — current protected calendar route and server-authoritative route contract that M002 should parallel rather than bypass.
- `apps/web/src/lib/server/schedule.ts` — existing trusted schedule loading, validation, and server-layer composition over Supabase that M002 should follow for matching logic.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — current calendar UI surface showing how protected calendar state, diagnostics, and action handoff are presented.
- `apps/web/src/lib/offline/*` — existing local-first and fail-closed continuity substrate that M002 must not weaken or widen.
- `supabase/migrations/20260415_000002_schedule_shifts.sql` and `supabase/seed.sql` — authoritative schedule storage and deterministic fixtures the matching milestone can build on.

## Relevant Requirements

- `R008` — This milestone is the primary owner: Caluno computes shared free-time windows across two or more users and explains why a suggested window works.
- `R002` — M002 depends on the existing shared-calendar membership boundary and must preserve that sharing model.
- `R012` — Matching must keep auth, row-level policy, and sharing boundaries fail-closed.
- `R007` — The Find time flow should preserve the calm, clear, stress-friendly interaction style proven in M001.

## Scope

### In Scope

- Shared-calendar Find time view for one protected calendar.
- Matching across everyone who belongs to that calendar.
- Search horizon of 30 days.
- Duration presets plus custom duration input.
- Ranked shortlist plus browseable full result list.
- Explanations showing who is free and which nearby busy constraints excluded adjacent times.
- Search-to-prefill handoff into the existing create flow.
- Explicit states for invalid input, no-results, server/query failure, and denied scope.

### Out of Scope / Non-Goals

- Outside calendar integrations.
- Cross-calendar or cross-group matching.
- New standalone event model in this milestone.
- Richer maintained constraints such as preferred hours, buffers, travel rules, or rest logic.
- Predictive or AI-assisted recommendation behavior beyond deterministic ranking/explanation on current schedule data.

## Technical Constraints

- Must preserve M001’s protected-route, membership-derived access boundary.
- Must use existing Caluno schedule entries as the busy-time source of truth.
- Must not widen authority through offline/local cache behavior.
- Should align with the existing SvelteKit server-layer composition over Supabase instead of creating a separate parallel API surface first.
- Needs to work within the current web-first proof surface before later mobile or external-sync milestones.

## Integration Points

- Protected calendar route model — M002 should integrate as a sibling protected calendar flow rather than bypassing route scope.
- Supabase/Postgres schedule data — matching reads real shared schedule entries and membership-scoped calendar data.
- Existing create flow — selecting a result should prefill the current create surface instead of introducing a separate object in M002.
- Existing diagnostics/fail-closed patterns — M002 should follow the same calm visible-state conventions already used in the shared calendar routes.

## Testing Requirements

M002 should require deterministic unit/integration proof for candidate generation, duration validation, ranking, and explanation shaping using seeded shared-calendar fixtures. It should also require browser proof for the live protected Find time flow, including: loading the route for a permitted shared calendar, showing shortlist plus browseable results, handling no-results and invalid input explicitly, preserving denied-scope behavior for unauthorized routes, and successfully handing a chosen result into a prefilled create flow. Verification should emphasize the real user-visible risk: obvious windows must not be missed in the tested fixture scenarios.

## Acceptance Criteria

- A permitted shared-calendar member can open a dedicated Find time view and search across everyone in that calendar for the next 30 days.
- The user can choose from duration presets or provide a custom duration.
- The route returns both a shortlist of top candidate windows and a browseable list of valid windows.
- Top picks feel right for the seeded proof scenarios and do not surface obviously inconvenient windows ahead of clearly better options.
- Each candidate window can explain who is free and what nearby busy constraints excluded adjacent times.
- Choosing a suggestion lands the user in the existing create flow with the suggested time prefilled.
- No-results, invalid-input, query-failure, and denied-scope states are explicit and calm.
- Matching remains fail-closed with respect to calendar membership and trusted route scope.

## Open Questions

- Whether the reused create flow should get lighter meetup-oriented wording in M002 while still using the existing underlying schedule model.
- Whether explanation detail should be equally rich in the shortlist and browseable list, or intentionally lighter in the full list for scanability.
