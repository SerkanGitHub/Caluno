---
id: T01
parent: S02
milestone: M003
key_files:
  - packages/caluno-core/package.json
  - packages/caluno-core/src/index.ts
  - packages/caluno-core/src/offline/types.ts
  - packages/caluno-core/src/offline/app-shell-cache.ts
  - packages/caluno-core/src/offline/mutation-queue.ts
  - packages/caluno-core/src/offline/sync-engine.ts
  - packages/caluno-core/src/schedule/types.ts
  - packages/caluno-core/src/schedule/board.ts
  - packages/caluno-core/src/schedule/conflicts.ts
  - packages/caluno-core/src/schedule/recurrence.ts
  - apps/web/src/lib/offline/sync-engine.ts
  - apps/web/tests/schedule/offline-queue.unit.test.ts
  - apps/web/tests/schedule/sync-engine.unit.test.ts
  - apps/web/tests/schedule/board.unit.test.ts
  - apps/web/tests/schedule/conflicts.unit.test.ts
  - apps/web/tests/schedule/recurrence.unit.test.ts
  - apps/mobile/tests/continuity-contract.unit.test.ts
  - .gsd/KNOWLEDGE.md
key_decisions:
  - D055 — keep pure offline/schedule rules in @repo/caluno-core and leave browser/Svelte/Supabase realtime adapters as thin web-local runtime code.
duration: 
verification_result: passed
completed_at: 2026-04-21T09:36:55.227Z
blocker_discovered: false
---

# T01: Extracted offline continuity and schedule helpers into @repo/caluno-core with shared web/mobile contract coverage.

**Extracted offline continuity and schedule helpers into @repo/caluno-core with shared web/mobile contract coverage.**

## What Happened

I moved the pure cached-shell, mutation-queue, replay/reconnect, and schedule helper logic out of `apps/web/src` into new `packages/caluno-core/src/offline/*` and `packages/caluno-core/src/schedule/*` modules, then added `packages/caluno-core/src/offline/types.ts` and `packages/caluno-core/src/schedule/types.ts` so the extracted code no longer depends on web-local type definitions. I extended `packages/caluno-core/package.json` and `packages/caluno-core/src/index.ts` with stable offline/schedule exports, added the missing `rrule` package dependency at the shared package boundary, and preserved the portability rule by keeping only browser/Svelte/Supabase realtime wiring in `apps/web/src/lib/offline/sync-engine.ts`. On the web side, I converted the old extracted source files into thin re-export facades and rewired the targeted regression tests to import `@repo/caluno-core` directly so the suite now proves the shared package surface instead of only local wrappers. On the mobile side, I created `apps/mobile/tests/continuity-contract.unit.test.ts` to validate stale-session, user-mismatch, unsynced-calendar, deterministic replay order, malformed queue payload, and missing replay-target behavior without any imports from `apps/web/src`. I also recorded the architectural extraction choice in decision D055 and appended a knowledge entry about moving pure type contracts alongside shared helpers.

## Verification

Verified the new shared contract by running the task’s required mobile and web Vitest suites against the final extracted package surface. Then ran `pnpm --dir apps/web check && pnpm --dir apps/mobile check` to confirm the rewritten web runtime wrapper and new core package types compile cleanly in both apps, and ran an `rg` scan over `apps/mobile` to confirm no mobile source imports reach into `apps/web/src`. All checks passed.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile exec vitest run tests/continuity-contract.unit.test.ts` | 0 | ✅ pass | 1597ms |
| 2 | `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/conflicts.unit.test.ts tests/schedule/recurrence.unit.test.ts` | 0 | ✅ pass | 1612ms |
| 3 | `pnpm --dir apps/web check && pnpm --dir apps/mobile check` | 0 | ✅ pass | 5510ms |
| 4 | `rg -n "apps/web/src|\.\./\.\./web|from '.*web.*src|from \".*web.*src" apps/mobile --glob '!**/node_modules/**' || true` | 0 | ✅ pass | 23ms |

## Deviations

Added `packages/caluno-core/src/offline/types.ts` and `packages/caluno-core/src/schedule/types.ts` as supporting shared type surfaces so the extracted helpers could stay pure and avoid importing app-local web types. This was a local implementation adaptation to satisfy the portability constraint, not a product-contract change.

## Known Issues

None.

## Files Created/Modified

- `packages/caluno-core/package.json`
- `packages/caluno-core/src/index.ts`
- `packages/caluno-core/src/offline/types.ts`
- `packages/caluno-core/src/offline/app-shell-cache.ts`
- `packages/caluno-core/src/offline/mutation-queue.ts`
- `packages/caluno-core/src/offline/sync-engine.ts`
- `packages/caluno-core/src/schedule/types.ts`
- `packages/caluno-core/src/schedule/board.ts`
- `packages/caluno-core/src/schedule/conflicts.ts`
- `packages/caluno-core/src/schedule/recurrence.ts`
- `apps/web/src/lib/offline/sync-engine.ts`
- `apps/web/tests/schedule/offline-queue.unit.test.ts`
- `apps/web/tests/schedule/sync-engine.unit.test.ts`
- `apps/web/tests/schedule/board.unit.test.ts`
- `apps/web/tests/schedule/conflicts.unit.test.ts`
- `apps/web/tests/schedule/recurrence.unit.test.ts`
- `apps/mobile/tests/continuity-contract.unit.test.ts`
- `.gsd/KNOWLEDGE.md`
