---
estimated_steps: 30
estimated_files: 6
skills_used:
  - debug-like-expert
---

# T04: Prove the mobile Find time flow end to end and keep native wiring green

Close the slice with runnable proof. Extend the existing mobile Playwright harness so it exercises the real calendar-board entrypoint, the new mobile Find time route, explicit denied/offline states, the exact suggestion-to-create handoff, and the post-arrival reload guard. Re-run the shared web regressions and finish with mobile build plus `cap:sync` so the new route stays packaged into the native shell.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Local Supabase + mobile Playwright harness | Stop on the first failing runtime assertion and inspect the named route/editor diagnostics instead of accepting flaky implied success. | Treat the slice as incomplete until the full runtime flow finishes on seeded data. | Fail the spec if route status, CTA metadata, or create-prefill diagnostics are missing or malformed. |
| Shared web regression suites | Block completion until matcher/create-prefill/protected-route regressions stay green against the extracted shared contract. | Treat long-running regressions as incomplete closure rather than skipping cross-surface proof. | Do not ignore malformed or newly missing web contract assertions after the extraction. |
| Mobile build / Capacitor sync | Block completion until `check`, `build`, and `cap:sync` all succeed with the new route and assets. | Treat long-running sync/setup as incomplete native proof. | Do not accept partial native sync output or missing generated project changes. |

## Load Profile

- **Shared resources**: seeded Supabase dataset, mobile Vite preview runtime, Playwright browser/device emulation, shared contract suites, and Capacitor native project generation.
- **Per-operation cost**: one full sign-in, calendar-board entry, Find time search, suggestion handoff, create submission, reload, denied-path check, offline-path check, plus native sync.
- **10x breakpoint**: flaky async waits around route-state changes and post-arrival cleanup will break the proof first if assertions are not pinned to explicit diagnostics.

## Negative Tests

- **Malformed inputs**: out-of-scope calendar id, forced offline route entry, malformed arrival-prefill params, and missing CTA metadata.
- **Error paths**: denied route, `offline-unavailable`, timeout or empty-state route rendering, and reload after arrival cleanup.
- **Boundary conditions**: Top picks before browse windows, earlier search anchor week versus slot-derived week, zero result cards in offline state, and created shift rendered on the intended day after submit.

## Steps

1. Extend `apps/mobile/tests/e2e/fixtures.ts` with helpers to open the mobile Find time route, snapshot CTA metadata, inspect the create-sheet arrival state, and submit the handoff-backed create form.
2. Add `apps/mobile/tests/e2e/find-time-handoff.spec.ts` covering permitted entry from the real board, Top-picks-before-browse ordering, denied out-of-scope route, explicit `offline-unavailable`, chosen-slot handoff into create, visible shift creation on the intended day, and reload not reopening the sheet.
3. Re-run the existing auth/scope and calendar-offline specs together with the new mobile unit suites and shared web regressions so S01/S02 behavior stays regression-safe.
4. Finish with `pnpm --dir apps/mobile check`, `pnpm --dir apps/mobile build`, and `pnpm --dir apps/mobile cap:sync` so the new flow remains wired into the native shell.

## Must-Haves

- [ ] Playwright proves a permitted user can enter Find time from the real mobile calendar board and follow a deterministic suggestion handoff into shift creation.
- [ ] The runtime proof explicitly covers denied and `offline-unavailable` route states with zero result cards shown in those states.
- [ ] The created shift appears on the intended day after submitting the handoff-backed create flow, and reload does not reopen the one-shot sheet.
- [ ] Shared web regressions plus mobile `check` / `build` / `cap:sync` stay green after the slice lands.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts tests/mobile-find-time.unit.test.ts tests/mobile-create-prefill.unit.test.ts`
- `pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/find-time-handoff.spec.ts`
- `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`

## Inputs

- `apps/mobile/tests/e2e/fixtures.ts` — existing mobile Playwright harness from S01/S02 to extend instead of replacing.
- `apps/mobile/tests/e2e/auth-scope.spec.ts` — regression-safe mobile auth/scope proof to keep green.
- `apps/mobile/tests/e2e/calendar-offline.spec.ts` — regression-safe mobile continuity proof to keep green.
- `apps/mobile/playwright.config.ts` — existing mobile Playwright runtime configuration.
- `apps/mobile/package.json` — scripts and dependencies for Playwright, build, and Capacitor sync.
- `apps/web/tests/find-time/matcher.unit.test.ts` — shared matcher regression suite to keep green after extraction.
- `apps/web/tests/routes/find-time-routes.unit.test.ts` — shared trusted route-state regression suite to keep green.
- `apps/web/tests/schedule/create-prefill.unit.test.ts` — shared create-prefill regression suite to keep green.
- `apps/web/tests/routes/protected-routes.unit.test.ts` — shared calendar-arrival regression suite to keep green.

## Expected Output

- `apps/mobile/tests/e2e/fixtures.ts` — Find time route and create-prefill snapshot helpers for the mobile runtime proof.
- `apps/mobile/tests/e2e/find-time-handoff.spec.ts` — end-to-end proof for mobile Find time ordering, denied/offline states, and create handoff.
- `apps/mobile/playwright.config.ts` — harness updates required for the new route proof, if any.
- `apps/mobile/package.json` — scripts/dependencies updated only as needed for the verification path.
- `apps/mobile/ios/App/App.xcodeproj/project.pbxproj` — native sync output after the new route/assets land.
- `apps/mobile/ios/App/CapApp-SPM/Package.swift` — native package sync output kept current after `cap:sync`.

## Verification

pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts tests/mobile-find-time.unit.test.ts tests/mobile-create-prefill.unit.test.ts && pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts && npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/find-time-handoff.spec.ts && pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'
