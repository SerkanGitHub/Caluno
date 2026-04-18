---
id: M002
title: "Shared free-time matching"
status: complete
completed_at: 2026-04-18T21:20:15.317Z
key_decisions:
  - D035 — Treat creator assignment as part of the trusted schedule-create contract and roll back shift creates if assignment writes fail.
  - D036 — Return each find-time candidate as both the exact requested-duration slot and the containing continuous free span.
  - D037 — Cache warmed protected `/find-time` documents for offline boot, but keep the route fail closed with `offline-unavailable` instead of replaying cached results.
  - D040 — Rank truthful candidates before truncation using shared-member count, span slack, nearby-edge pressure, then earlier start.
  - D041 — Render Top picks as the rich explanation surface and browse windows as the lighter truthful inventory.
  - Use a strict timing-only, one-shot route-to-route create-prefill contract for suggestion handoff.
key_files:
  - supabase/migrations/20260418_000001_find_time_member_availability.sql
  - supabase/seed.sql
  - apps/web/src/lib/server/find-time.ts
  - apps/web/src/lib/find-time/matcher.ts
  - apps/web/src/lib/find-time/ranking.ts
  - apps/web/src/lib/schedule/create-prefill.ts
  - apps/web/src/lib/server/schedule.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte
  - apps/web/tests/find-time/member-availability.unit.test.ts
  - apps/web/tests/find-time/matcher.unit.test.ts
  - apps/web/tests/routes/find-time-routes.unit.test.ts
  - apps/web/tests/routes/protected-routes.unit.test.ts
  - apps/web/tests/schedule/create-prefill.unit.test.ts
  - apps/web/tests/e2e/find-time.spec.ts
  - apps/web/tests/e2e/calendar-shifts.spec.ts
lessons_learned:
  - Keep protected availability loading, ranking, and explanation shaping in the trusted server layer; the browser should render trusted payloads rather than derive authority-sensitive answers.
  - For route-to-route schedule prefills, a strict timing-only contract that is consumed once on arrival preserves exact intent without making stale create state sticky.
  - Caching a warmed protected document is acceptable for offline boot only if the route still re-establishes authority before showing results; otherwise fail closed with an explicit unavailable state.
---

# M002: Shared free-time matching

**M002 turned the shared-calendar substrate into a complete shared free-time flow with truthful 30-day availability search, ranked explanation-rich recommendations, and exact suggestion-to-create handoff without weakening authorization or offline safety.**

## What Happened

M002 assembled three completed slices into one coherent planning surface. S01 added truthful member-attributed availability by introducing calendar-scoped shift assignments, a safe roster read path, and a protected `/calendars/[calendarId]/find-time` route that computes bounded 30-day windows while keeping denied, malformed, timeout, query-failure, and offline-unavailable outcomes explicit. S02 then turned that truthful browse contract into a recommendation surface by ranking the full candidate set before truncation, separating `topPicks` from `browseWindows`, and rendering richer free/blocked/nearby-edge explanations in the browser without exposing unauthorized roster or schedule data. S03 completed the user journey by wiring both Top-pick and browse suggestion CTAs into the existing calendar create experience so the chosen slot lands in the correct calendar and visible week with exact start/end values prefilled, a visible `From Find time` cue, and one-shot URL cleanup so stale handoff state does not reopen on reload or later writes.

Verification was re-run at milestone closeout, not assumed from slice completion alone. Because the slice commits were already auto-merged onto `main`, the code-change verification used the equivalent diff from the pre-M002 auto-commit `4e1f537` to `HEAD`, which showed 39 non-`.gsd/` files changed with 6062 insertions across Supabase schema/seed files, trusted server loaders, ranking/matching modules, route UI, create-prefill logic, and browser/unit proof surfaces. Fresh verification then passed with `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts`, `pnpm --dir apps/web exec vitest run tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts`, `pnpm --dir apps/web check`, and `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts tests/e2e/calendar-shifts.spec.ts`.

No separate horizontal checklist items remained open beyond the milestone’s cross-cutting trust-boundary, offline-fail-closed, and observability obligations; those were addressed in implementation and in the closeout verification suite. Cross-slice integration was proven end to end: S01’s exact slot/span contract fed S02’s ranking and explanation payloads, and S03 consumed that same contract directly for calendar create prefills without recomputing availability in the client.

## Decision Re-evaluation

| Decision | Re-evaluation | Evidence | Revisit next milestone? |
| --- | --- | --- | --- |
| D035 — Treat creator assignment as part of the trusted schedule-create contract and roll back shift creates if assignment writes fail. | Still valid. | Truthful availability depends on member attribution staying authoritative; create-prefill and schedule action proof passed without leaking unattributed shifts into find-time results. | No |
| D036 — Return each find-time candidate as both the exact requested-duration slot and the containing continuous free span. | Still valid. | The exact slot powers recommendation browsing and handoff precision, while the containing span still supports explanation density and future flexibility. | No |
| D037 — Cache warmed protected `/find-time` documents for offline boot, but keep the route fail closed with `offline-unavailable` instead of replaying cached results. | Still valid. | The offline Playwright scenario continued to boot the route shell while withholding authoritative results until trusted reads were available. | No |
| D040 — Rank truthful candidates before truncation using shared-member count, span slack, nearby-edge pressure, then earlier start. | Still valid. | Unit and browser proof showed stable Top picks ordering and explanation payloads without chronological-page distortions. | No |
| D041 — Render Top picks as the rich explanation surface and browse windows as the lighter truthful inventory. | Still valid. | The split-density UI shipped cleanly and stayed easy to verify through stable DOM hooks in both route tests and browser proof. | No |
| Suggestion-to-create handoff should use a strict timing-only, one-shot query contract consumed on arrival. | Still valid. | S03 proof showed exact prefill arrival, correct week targeting, visible source cue, and URL cleanup that prevented stale reopen behavior. | No |

## Success Criteria Results

- **Search the next 30 days for truthful shared availability on a permitted calendar:** Met. S01 added trusted member-attributed availability loading plus bounded 30-day matching, and closeout verification passed `tests/find-time/member-availability.unit.test.ts`, `tests/find-time/matcher.unit.test.ts`, `tests/routes/find-time-routes.unit.test.ts`, and the real browser `/find-time` scenarios in `tests/e2e/find-time.spec.ts`.
- **Show why suggested windows work and why nearby times do not:** Met. S02 added pre-truncation ranking, `topPicks`/`browseWindows`, blocked-member summaries, and nearby-edge explanations. Fresh unit verification passed the ranking/route suite, and Playwright proved ranked Top picks plus lighter browse explanations on the real route.
- **Carry a chosen suggestion into the existing create flow with exact timing preserved in the correct calendar/week context:** Met. S03 added the timing-only handoff contract and destination-route prefill consumption. Fresh verification passed `tests/schedule/create-prefill.unit.test.ts`, `tests/routes/protected-routes.unit.test.ts`, and the browser handoff scenarios in both `tests/e2e/find-time.spec.ts` and `tests/e2e/calendar-shifts.spec.ts`.
- **Preserve trusted scope and fail-closed offline behavior while adding the feature:** Met. Unauthorized calendar ids still produced explicit denial, malformed or unavailable trusted reads stayed fail closed, and warmed offline route entry rendered `offline-unavailable` rather than replaying cached authority. This was re-proven by `tests/routes/protected-routes.unit.test.ts` plus the denied/offline Playwright scenarios in `tests/e2e/find-time.spec.ts` and `tests/e2e/calendar-shifts.spec.ts`.

## Definition of Done Results

- **All slices complete:** Met. `gsd_milestone_status(M002)` showed S01, S02, and S03 all `complete`, each with 3/3 tasks done.
- **All slice summaries exist:** Met. `find .gsd/milestones/M002` confirmed `S01-SUMMARY.md`, `S02-SUMMARY.md`, `S03-SUMMARY.md`, all three slice UAT files, and all nine task summaries.
- **Milestone produced real code, not only planning artifacts:** Met. Equivalent code diff from pre-M002 commit `4e1f537` to `HEAD` showed 39 non-`.gsd/` files changed across app code, tests, and Supabase artifacts.
- **Cross-slice integration works:** Met. Fresh verification passed the full unit/check/browser suite, and the browser proof demonstrated the complete path from truthful search to ranked explanation to create-flow handoff.
- **No cross-slice trust-boundary regression:** Met. Explicit denied, malformed, and offline-unavailable paths remained distinct and fail closed in both route and browser proof.

## Requirement Outcomes

- **R008 — Active → Validated.** Supported by closeout verification: `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts`, `pnpm --dir apps/web exec vitest run tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts`, `pnpm --dir apps/web check`, and `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts tests/e2e/calendar-shifts.spec.ts`. Together these proved truthful ranked shared windows, explanation-rich Top picks, exact suggestion-to-create handoff, and preserved denial/offline fail-closed behavior.
- **R002 — No status change (remains active), but advanced with additional proof.** M002 re-verified that shared free-time search and suggestion-driven creation stay inside the permitted calendar boundary: unauthorized calendar ids still short-circuit to denial, and recommendation/create surfaces expose only already-authorized roster names and same-calendar shift titles.
- **R012 — No status change (remains validated), but advanced with additional proof.** M002 reconfirmed malformed inputs, out-of-scope access, and offline entry all fail closed without exposing foreign roster or schedule data.
- **No requirements were deferred, blocked, or moved out of scope during M002.**

## Deviations

None.

## Follow-ups

M003 can build on the completed shared free-time flow instead of revisiting its core contract. The most valuable follow-up remains user-facing role-assignment proof for active requirement R002, plus the planned cross-platform continuity/reminder work. If future milestones expand find-time, they should add telemetry or richer ranking tuning without moving ranking/explanation logic into the client.
