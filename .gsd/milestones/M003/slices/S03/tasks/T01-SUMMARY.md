---
id: T01
parent: S03
milestone: M003
key_files:
  - packages/caluno-core/src/find-time/matcher.ts
  - packages/caluno-core/src/find-time/ranking.ts
  - packages/caluno-core/src/schedule/create-prefill.ts
  - packages/caluno-core/package.json
  - packages/caluno-core/src/index.ts
  - apps/web/src/lib/find-time/matcher.ts
  - apps/web/src/lib/find-time/ranking.ts
  - apps/web/src/lib/schedule/create-prefill.ts
  - apps/mobile/tests/find-time-contract.unit.test.ts
key_decisions:
  - D059: Place pure find-time matcher/ranking and timing-only create-prefill helpers in @repo/caluno-core while keeping apps/web helpers as thin re-export wrappers.
duration: 
verification_result: mixed
completed_at: 2026-04-21T14:15:53.054Z
blocker_discovered: false
---

# T01: Extracted shared find-time matcher/ranking and create-prefill contracts into caluno-core with mobile contract coverage.

**Extracted shared find-time matcher/ranking and create-prefill contracts into caluno-core with mobile contract coverage.**

## What Happened

I traced the existing web matcher, ranking, and create-prefill helpers to verify they were pure enough to extract and identified the only portability dependency: datetime-local formatting, which already lived in `packages/caluno-core/src/schedule/board.ts`. I copied the matcher, ranking, and strict create-prefill contracts into `packages/caluno-core`, extended the package exports and barrel, and rewired the web helper files into thin re-export wrappers so existing route and component imports stayed stable. I then added `apps/mobile/tests/find-time-contract.unit.test.ts` that imports the shared helpers directly and proves deterministic top-pick ordering, fail-closed malformed ranking behavior, strict handoff parsing, Monday week derivation, and one-shot cleanup semantics. During verification, the preserved web regressions passed immediately; the new mobile contract suite failed once because the test expected an 08:00 anchor while the shared search-range helper intentionally normalizes a `YYYY-MM-DD` query to midnight UTC. I corrected the test to match the actual shared contract and reran the full planned verification successfully.

## Verification

Verified the extracted shared contract with the planned Vitest suites. `pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts` initially exposed one incorrect expectation in the new mobile test around midnight range anchoring; after fixing the test to match the shared helper’s real behavior, I reran the full planned command `pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts && pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts`, which passed. The preserved web matcher, route, protected-route, and create-prefill regressions stayed green against the extracted caluno-core implementation.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts` | 1 | ❌ fail | 45100ms |
| 2 | `pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts` | 0 | ✅ pass | 17600ms |
| 3 | `pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts && pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts` | 0 | ✅ pass | 3700ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/caluno-core/src/find-time/matcher.ts`
- `packages/caluno-core/src/find-time/ranking.ts`
- `packages/caluno-core/src/schedule/create-prefill.ts`
- `packages/caluno-core/package.json`
- `packages/caluno-core/src/index.ts`
- `apps/web/src/lib/find-time/matcher.ts`
- `apps/web/src/lib/find-time/ranking.ts`
- `apps/web/src/lib/schedule/create-prefill.ts`
- `apps/mobile/tests/find-time-contract.unit.test.ts`
