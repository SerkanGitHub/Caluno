---
id: T04
parent: S03
milestone: M003
key_files:
  - apps/mobile/tests/e2e/fixtures.ts
  - apps/mobile/tests/e2e/find-time-handoff.spec.ts
  - apps/mobile/package.json
  - apps/mobile/ios/App/CapApp-SPM/Package.swift
  - apps/mobile/ios/App/App.xcodeproj/project.pbxproj
key_decisions:
  - Mirrored the web suite’s deterministic find-time snapshot vocabulary in the mobile Playwright harness so cross-surface contract drift is caught through the same `data-*` assertions.
  - Included the new handoff proof in the default mobile `test:e2e` scripts so future regressions run it automatically instead of relying on ad hoc invocation.
duration: 
verification_result: mixed
completed_at: 2026-05-04T10:36:11.638Z
blocker_discovered: false
---

# T04: Added mobile Find time handoff E2E coverage and bundled it into the mobile regression script.

**Added mobile Find time handoff E2E coverage and bundled it into the mobile regression script.**

## What Happened

I extended `apps/mobile/tests/e2e/fixtures.ts` with deterministic mobile find-time helpers that mirror the shared web contract: direct route opening, result-card snapshots, CTA handoff snapshots, create-sheet arrival inspection, visible-week inspection, and a handoff-backed create submit helper. I then added `apps/mobile/tests/e2e/find-time-handoff.spec.ts` to cover the real calendar-board entrypoint, Top-picks-before-browse ordering, explicit CTA metadata, accepted create-prefill arrival diagnostics, handoff-backed shift creation on the intended day, reload not reopening the one-shot sheet, denied out-of-scope routing, offline-unavailable fail-closed routing with zero result cards, and malformed arrival-prefill params that stay attributable and do not auto-open create. I also updated `apps/mobile/package.json` so the normal mobile `test:e2e` and headed variant include the new regression suite. Runtime/build closure was partially verifiable locally: the mobile and shared web unit suites passed, `pnpm --dir apps/mobile check` passed, `pnpm --dir apps/mobile build` passed, and `cap:sync` refreshed the native iOS package output. The only blocked gate was the planned Supabase-reset-backed Playwright run, which failed immediately because the local Docker daemon was unavailable, preventing local Supabase from starting.

## Verification

Verified the extracted mobile/shared contracts and packaging path with the planned vitest suites, mobile `check`, mobile `build`, and `cap:sync`. The planned mobile Playwright runtime proof was attempted with the exact combined Supabase-reset command, but it failed before browser execution because Docker was not running for local Supabase. Evidence reflects that split clearly: static/unit/native checks passed; the end-to-end runtime gate is still blocked by environment setup, not by an observed app assertion failure.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts tests/mobile-find-time.unit.test.ts tests/mobile-create-prefill.unit.test.ts` | 0 | ✅ pass | 1950ms |
| 2 | `pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts` | 0 | ✅ pass | 2190ms |
| 3 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/find-time-handoff.spec.ts` | 1 | ❌ fail | 540ms |
| 4 | `pnpm --dir apps/mobile check` | 0 | ✅ pass | 3700ms |
| 5 | `pnpm --dir apps/mobile build` | 0 | ✅ pass | 3120ms |
| 6 | `sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'` | 0 | ✅ pass | 720ms |

## Deviations

Extended `apps/mobile/package.json` so the standard `test:e2e` scripts include the new `find-time-handoff.spec.ts` instead of leaving the new proof reachable only by an explicit file path.

## Known Issues

The combined `supabase db reset --local --yes && playwright test ...` verification step cannot run on this machine while the Docker daemon is unavailable, because the local Supabase CLI cannot inspect or start services without Docker.

## Files Created/Modified

- `apps/mobile/tests/e2e/fixtures.ts`
- `apps/mobile/tests/e2e/find-time-handoff.spec.ts`
- `apps/mobile/package.json`
- `apps/mobile/ios/App/CapApp-SPM/Package.swift`
- `apps/mobile/ios/App/App.xcodeproj/project.pbxproj`
