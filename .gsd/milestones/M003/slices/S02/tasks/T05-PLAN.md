---
estimated_steps: 4
estimated_files: 7
skills_used:
  - debug-like-expert
---

# T05: Prove mobile offline continuity end to end and sync native plugins

**Slice:** S02 — Mobile calendar continuity and editing
**Milestone:** M003

## Description

Close the slice with runnable evidence. Extend the mobile Playwright harness so it proves the real story—online warm-up, offline reopen, offline edit survival across reload, reconnect drain, and fail-closed denial for unsynced calendars—then sync the added Capacitor plugins into the native project so packaging remains truthful.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Local Supabase + Playwright harness | Stop on the first failing runtime assertion and capture the named diagnostic surface instead of accepting flaky implicit success. | Treat the slice as incomplete until the runtime proof finishes on seeded data. | Fail the spec when the UI surfaces malformed or missing continuity metadata. |
| Capacitor native sync | Block completion until `cap:sync` succeeds with the new plugins and generated native project wiring. | Treat long-running sync/setup as incomplete packaging proof. | Do not ignore partial plugin sync output or missing native files. |

## Load Profile

- **Shared resources**: seeded Supabase dataset, mobile Vite preview runtime, Playwright device emulation, and Capacitor native project generation.
- **Per-operation cost**: one full online warm-up, offline transition, reload, queued mutation sequence, reconnect drain, and native sync.
- **10x breakpoint**: flaky timing around offline/online transitions will break first if assertions are not pinned to explicit diagnostics.

## Negative Tests

- **Malformed inputs**: unsynced calendar id, malformed persisted continuity data, invalid week start, and malformed queued payload state surfaced through the UI.
- **Error paths**: offline reopen with no cache, retryable reconnect failure, denied out-of-scope route, and plugin sync failure.
- **Boundary conditions**: zero pending queue, multiple queued writes, reload before reconnect, and reconnect after app resume.

## Steps

1. Extend the mobile Playwright fixtures to warm a trusted calendar week, force offline mode, reload the same route, and inspect the continuity diagnostics instead of relying on generic text.
2. Add `tests/e2e/calendar-offline.spec.ts` covering offline reopen, offline create/edit persistence across reload, reconnect drain to zero, and fail-closed denial for unsynced calendars.
3. Re-run the existing auth/scope spec alongside the new continuity proof so S01 behavior stays regression-safe while S02 lands.
4. Finish with `pnpm --dir apps/mobile cap:sync` so added Capacitor plugins remain wired into the native project after the slice changes.

## Must-Haves

- [ ] Playwright proves a permitted calendar reopens offline after trusted warm-up and keeps pending edits visible across reload.
- [ ] Reconnect drains the queue back to zero through the trusted write path and clears pending badges only after success.
- [ ] Unsynced or out-of-scope calendar ids still fail closed offline.
- [ ] `cap:sync` passes after plugin changes so native packaging stays current.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts`
- `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build`
- `sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`
- `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts`

## Observability Impact

- Signals added/changed: Playwright assertions pin route mode, queue counts, pending badges, and reconnect drain completion to explicit test ids.
- How a future agent inspects this: run the named Playwright specs and inspect the failing `data-testid` surface instead of diffing screenshots blindly.
- Failure state exposed: offline reopen gaps, queue drain stalls, denied-route regressions, and native sync failures each map to a named verification step.

## Inputs

- `apps/mobile/playwright.config.ts` — existing mobile Playwright harness and preview web server setup.
- `apps/mobile/tests/e2e/fixtures.ts` — current mobile Playwright helpers from S01.
- `apps/mobile/tests/e2e/auth-scope.spec.ts` — existing auth/scope regression proof to keep green.
- `apps/mobile/package.json` — script and dependency baseline for the new plugin/runtime proof.
- `apps/mobile/capacitor.config.ts` — Capacitor project configuration that must stay syncable.

## Expected Output

- `apps/mobile/tests/e2e/fixtures.ts` — continuity-aware Playwright helpers for online warm-up, offline reload, and reconnect assertions.
- `apps/mobile/tests/e2e/calendar-offline.spec.ts` — end-to-end offline continuity and reconnect proof.
- `apps/mobile/tests/e2e/auth-scope.spec.ts` — regression-safe auth/scope proof updated only as needed for new diagnostics.
- `apps/mobile/playwright.config.ts` — harness updated for the continuity proof path.
- `apps/mobile/package.json` — scripts/dependencies adjusted for plugin-backed proof if needed.
- `apps/mobile/capacitor.config.ts` — Capacitor runtime config kept consistent with new plugins.
- `apps/mobile/ios/App/App.xcodeproj/project.pbxproj` — native sync output updated after plugin changes.
