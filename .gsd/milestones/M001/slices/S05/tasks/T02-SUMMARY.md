---
id: T02
parent: S05
milestone: M001
key_files:
  - apps/web/tests/e2e/fixtures.ts
  - apps/web/tests/e2e/calendar-shifts.spec.ts
  - apps/web/tests/e2e/calendar-offline.spec.ts
  - apps/web/tests/e2e/calendar-sync.spec.ts
  - apps/web/src/lib/offline/repository.ts
  - apps/web/src/lib/offline/runtime.ts
  - apps/web/vite.config.ts
  - .gsd/KNOWLEDGE.md
key_decisions:
  - D028 — Serve Vite dev/preview assets with worker isolation/resource headers and bootstrap browser-local SQLite through the project `sqlite.worker.ts` entrypoint instead of the library default worker.
duration: 
verification_result: mixed
completed_at: 2026-04-16T11:03:31.999Z
blocker_discovered: false
---

# T02: Added conflict-aware browser proof helpers and preview SQLite worker fixes, but offline cached reopen and realtime-ready verification still need follow-up.

**Added conflict-aware browser proof helpers and preview SQLite worker fixes, but offline cached reopen and realtime-ready verification still need follow-up.**

## What Happened

Extended the shared Playwright fixture with explicit conflict readers, waits, and richer retained diagnostics so flow attachments now capture board/day/shift conflict state alongside queue, sync, realtime, and denial metadata. Updated `calendar-shifts.spec.ts` to prove the seeded Thursday overlap warning, the clean Wednesday touch boundary, and the unchanged unauthorized-calendar denial surface without mutating the seeded schedule before downstream proof. Expanded `calendar-offline.spec.ts` and `calendar-sync.spec.ts` to assert local overlap visibility, reload/reconnect expectations, collaborator propagation, and next-week scope guards. While running the real preview-backed proof, I confirmed the offline repository never initialized because Vite-served worker assets lacked isolation/resource headers and the default sqlite worker resolved its wasm path incorrectly under preview. I fixed that by stamping the worker isolation headers onto dev/preview asset responses, adding explicit `Cross-Origin-Resource-Policy`, and changing the offline repository to use the project `sqlite.worker.ts` entrypoint so Vite bundles the wasm asset through the project worker path. That repaired the previously missing route-level local/sync/realtime surfaces and unblocked trusted-online proof, but the offline cached reopen still falls to `snapshot-missing` and the realtime channel remains `closed`, so the end-to-end offline/realtime proof is only partially complete.

## Verification

Verified the shipped changes with real project commands and direct preview inspection. `pnpm --dir apps/web check && pnpm --dir apps/web build` passed after the Vite header/plugin and sqlite worker repository changes. `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` passed and now proves the seeded Thursday overlap plus clean Wednesday boundary without mutating the seed state. The preview-backed offline/realtime proof improved materially: the route-level local-first, sync, and realtime diagnostics now mount under preview after the worker/header fixes, and manual browser inspection showed the board/local/sync/conflict surfaces together. However `pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts` still fails because the offline reopen path reports `offline-denied` with `snapshot-missing` instead of `cached-offline`, and the collaborator channel state stays `closed` instead of `ready`, so the final must-have proof remains incomplete.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web check && pnpm --dir apps/web build` | 0 | ✅ pass | 8300ms |
| 2 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` | 0 | ✅ pass | 32500ms |
| 3 | `pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts` | 1 | ❌ fail | 43700ms |

## Deviations

Trimmed `apps/web/tests/e2e/calendar-shifts.spec.ts` down to the seeded trusted-online conflict and denied-route proof so it no longer mutates seeded data before the offline/realtime verification chain. Also expanded the task beyond test-only edits by fixing preview/dev worker asset headers and routing the offline repository through the project sqlite worker entrypoint after direct browser evidence showed the default worker/runtime path never initialized the browser-local repository under preview.

## Known Issues

`pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts` still fails in two places: (1) after forcing the browser offline, the route falls to `offline-denied` with `snapshot-missing` instead of reopening `cached-offline`, which means the trusted week snapshot is not yet persisted early enough for the cached reopen expectation; and (2) the realtime diagnostics stay `closed` instead of reaching `ready` in the collaborator proof, so the collaborator refresh assertions never trigger. The preview worker/header issue that previously left `controllerState` null is fixed, but these two runtime behaviors still need follow-up.

## Files Created/Modified

- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
- `apps/web/tests/e2e/calendar-offline.spec.ts`
- `apps/web/tests/e2e/calendar-sync.spec.ts`
- `apps/web/src/lib/offline/repository.ts`
- `apps/web/src/lib/offline/runtime.ts`
- `apps/web/vite.config.ts`
- `.gsd/KNOWLEDGE.md`
