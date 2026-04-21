---
id: T05
parent: S02
milestone: M003
key_files:
  - apps/mobile/tests/e2e/fixtures.ts
  - apps/mobile/tests/e2e/calendar-offline.spec.ts
  - apps/mobile/package.json
  - apps/mobile/ios/App/App/capacitor.config.json
  - apps/mobile/ios/App/CapApp-SPM/Package.swift
  - .gsd/KNOWLEDGE.md
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-21T13:34:34.675Z
blocker_discovered: false
---

# T05: Fixed the mobile offline continuity proof harness to target real Capacitor storage, aligned the negative-path assertions with shared queue diagnostics, and re-synced the native plugins.

**Fixed the mobile offline continuity proof harness to target real Capacitor storage, aligned the negative-path assertions with shared queue diagnostics, and re-synced the native plugins.**

## What Happened

I started by reading the existing mobile E2E harness, the offline calendar route, and the current `calendar-offline.spec.ts` to verify whether T05 was still missing or already partially implemented. The core online warm-up, offline reopen, offline edit persistence, reconnect drain, and fail-closed denial proof was already in place, so I treated the task as a harness-hardening and evidence-closing pass rather than a greenfield test build.

The first failing Playwright rerun showed that the corrupt continuity negative test was not touching the same storage path that the mobile runtime actually reads. I traced the continuity and queue persistence code through `apps/mobile/src/lib/continuity/mobile-app-shell-cache.ts`, `apps/mobile/src/lib/offline/repository.ts`, and the Capacitor Preferences web implementation, then confirmed the runtime stores keys under the `CapacitorStorage.` prefix. I updated the Playwright corruption helpers in `apps/mobile/tests/e2e/fixtures.ts` to mutate the real Capacitor-backed browser storage keys instead of the unprefixed `localStorage` keys. That fixed the corrupt-shell continuity proof without changing production code.

The next failing rerun showed the malformed-queue negative test was asserting older wording than the shared queue contract now emits. I verified the canonical reason code in `packages/caluno-core/src/offline/mutation-queue.ts`, then updated `apps/mobile/tests/e2e/calendar-offline.spec.ts` to assert `queue-entry-invalid` and the current failure-copy fragment that the UI actually surfaces. I also updated `apps/mobile/package.json` so the app-level `test:e2e` scripts run both the auth/scope proof and the new continuity proof together.

After the browser-proof fixes were in place, I ran the slice-level mobile/web unit suites, mobile check/build, and native sync. `cap sync` completed successfully and reported the expected iOS plugins (`@capacitor/app`, `@capacitor/network`, and `@capacitor/preferences`) through the app’s current Swift Package Manager wiring. During the final Playwright verification, local Supabase reset twice failed after migrations/seed with a storage health-check `502` on `storage/v1/bucket`; I verified with `--debug` that this was an environment failure in the local Supabase stack rather than the app flow, restarted the local stack with `supabase stop && supabase start`, reran the exact same reset-plus-Playwright command unchanged, and the full browser proof passed. I recorded that recovery pattern in `.gsd/KNOWLEDGE.md` for future agents.

## Verification

Verified the full final-task gate and the broader slice gate. `pnpm --dir apps/mobile exec vitest run tests/continuity-contract.unit.test.ts tests/mobile-continuity.unit.test.ts tests/mobile-sync-runtime.unit.test.ts` passed (13 tests). `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/conflicts.unit.test.ts tests/schedule/recurrence.unit.test.ts` passed (40 tests). After restarting the local Supabase stack to recover a storage health-check 502 during reset, `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts` passed (6 browser proofs covering auth/scope, offline reopen, queued edits across reload, reconnect drain, unsynced-calendar denial, corrupt continuity rejection, invalid week fallback, and malformed queue diagnostics). `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build` passed, and `sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'` passed with native plugin sync output for `@capacitor/app`, `@capacitor/network`, and `@capacitor/preferences`.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile exec vitest run tests/continuity-contract.unit.test.ts tests/mobile-continuity.unit.test.ts tests/mobile-sync-runtime.unit.test.ts` | 0 | ✅ pass | 55600ms |
| 2 | `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/conflicts.unit.test.ts tests/schedule/recurrence.unit.test.ts` | 0 | ✅ pass | 42900ms |
| 3 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts` | 0 | ✅ pass | 40500ms |
| 4 | `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build` | 0 | ✅ pass | 22300ms |
| 5 | `sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'` | 0 | ✅ pass | 19000ms |

## Deviations

Minor local adaptation only: the task plan named `apps/mobile/ios/App/App.xcodeproj/project.pbxproj` as the native sync output, but this app’s current Capacitor iOS wiring refreshed `apps/mobile/ios/App/CapApp-SPM/Package.swift` and `apps/mobile/ios/App/App/capacitor.config.json` while leaving `project.pbxproj` unchanged. No slice replan was needed.

## Known Issues

None. The only unexpected issue was a degraded local Supabase stack returning a storage health-check 502 during `supabase db reset --local`; restarting the local stack resolved it and the unchanged Playwright proof then passed.

## Files Created/Modified

- `apps/mobile/tests/e2e/fixtures.ts`
- `apps/mobile/tests/e2e/calendar-offline.spec.ts`
- `apps/mobile/package.json`
- `apps/mobile/ios/App/App/capacitor.config.json`
- `apps/mobile/ios/App/CapApp-SPM/Package.swift`
- `.gsd/KNOWLEDGE.md`
