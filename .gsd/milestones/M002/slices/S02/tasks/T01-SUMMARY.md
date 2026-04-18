---
id: T01
parent: S02
milestone: M002
key_files:
  - apps/web/src/lib/find-time/ranking.ts
  - apps/web/src/lib/find-time/matcher.ts
  - apps/web/src/lib/server/find-time.ts
  - apps/web/tests/find-time/matcher.unit.test.ts
  - apps/web/tests/find-time/member-availability.unit.test.ts
  - apps/web/tests/routes/find-time-routes.unit.test.ts
  - .gsd/DECISIONS.md
  - .gsd/KNOWLEDGE.md
key_decisions:
  - D040 — expose explicit top-pick metadata and sort truthful candidates by shared-member count, slack, nearby-edge pressure, then earlier start before truncation.
duration: 
verification_result: mixed
completed_at: 2026-04-18T17:50:20.083Z
blocker_discovered: false
---

# T01: Added pre-truncation find-time ranking with nearby-constraint explanations and fail-closed busy-row validation.

**Added pre-truncation find-time ranking with nearby-constraint explanations and fail-closed busy-row validation.**

## What Happened

I added a dedicated `apps/web/src/lib/find-time/ranking.ts` module that turns raw truthful matcher windows into ranked candidates with explicit `topPickEligible`, `topPick`, `topPickRank`, `scoreBreakdown`, `blockedMembers`, and `nearbyConstraints` metadata. I refactored `apps/web/src/lib/find-time/matcher.ts` so raw window generation stays separate from recommendation shaping, ranking always runs across the full truthful candidate set before any `maxWindows` truncation, and malformed ranking inputs now fail closed by returning an empty ranked set plus a structured malformed reason instead of guessed explanations. I extended `apps/web/src/lib/server/find-time.ts` so trusted busy intervals now carry same-calendar `shiftTitle` data, reject missing titles as malformed response input, and propagate matcher ranking failures back through the protected search contract as malformed-response state. I expanded the matcher and member-availability unit suites to prove ranking order, tie-break behavior, shortlist eligibility for exactly-two-member shared windows, nearby leading/trailing constraint shaping, empty-roster handling, and malformed duplicate/title-missing rejection. I also updated the existing route unit assertion that had been implicitly assuming chronological browse order so it now matches the new ranked contract.

## Verification

Task-level verification passed with `pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/find-time/member-availability.unit.test.ts` and with the required grep proof confirming `scoreBreakdown`, `nearbyConstraints`, and `shiftTitle` are now first-class contract fields. Slice-level follow-up verification showed the broader Vitest route suite and `pnpm --dir apps/web check` both pass after the ranking change. The slice browser proof command still fails at this task boundary because the current Playwright snapshots assert chronological browse indexes, while T01 intentionally reorders `search.windows` before T03 introduces the new Top picks/browser proof surface; this failure is tracked as expected remaining slice work, not a blocker in the shipped ranking contract.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/find-time/member-availability.unit.test.ts` | 0 | ✅ pass | 1223ms |
| 2 | `rg -n "topPicks|nearbyConstraints|shiftTitle|scoreBreakdown" apps/web/src/lib/find-time/matcher.ts apps/web/src/lib/find-time/ranking.ts apps/web/src/lib/server/find-time.ts` | 0 | ✅ pass | 10ms |
| 3 | `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts` | 0 | ✅ pass | 1301ms |
| 4 | `pnpm --dir apps/web check` | 0 | ✅ pass | 3052ms |
| 5 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts` | 1 | ❌ fail | 32400ms |

## Deviations

Updated `apps/web/tests/routes/find-time-routes.unit.test.ts` during execution to align an existing stale assertion with the new ranked window order, and recorded the ranking-contract choice in D040 plus a related note in `.gsd/KNOWLEDGE.md`.

## Known Issues

`apps/web/tests/e2e/find-time.spec.ts` still fails because its seeded window snapshots assume chronological browse order. That browser proof should be updated in T03 alongside the dedicated Top picks UI so the assertions target ranked shortlist/browse behavior instead of old index positions.

## Files Created/Modified

- `apps/web/src/lib/find-time/ranking.ts`
- `apps/web/src/lib/find-time/matcher.ts`
- `apps/web/src/lib/server/find-time.ts`
- `apps/web/tests/find-time/matcher.unit.test.ts`
- `apps/web/tests/find-time/member-availability.unit.test.ts`
- `apps/web/tests/routes/find-time-routes.unit.test.ts`
- `.gsd/DECISIONS.md`
- `.gsd/KNOWLEDGE.md`
