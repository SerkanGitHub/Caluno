# S03: Mobile Find time and compact create handoff

**Goal:** Deliver a phone-first mobile Find time flow that reuses the shared trusted matching and handoff contracts, stays fail-closed for denied/offline states, and lands a chosen slot directly into the existing mobile create sheet with the correct week and exact timing already set.
**Demo:** A user can run Find time on mobile, scan compact Top picks and browse windows, and hand a chosen slot directly into mobile shift creation with the right context already set.

## Must-Haves

- Demo: a permitted mobile user opens Find time from the real calendar board, sees compact Top picks before lighter browse windows, chooses a slot, lands back on the same calendar route with the exact slot week selected, and sees the existing mobile create sheet auto-open once with exact prefilled times plus a visible `From Find time` cue; offline or out-of-scope entry stays explicit and fail-closed.
- `R009`: mobile ships a real Find time flow in `apps/mobile` using mobile-specific UI and the shared Caluno substrate instead of web-only imports or a thin wrapper.
- `R002`: permitted-scope and malformed/out-of-scope denial semantics extend onto the mobile Find time route before any roster or busy query runs.
- `R022`: S03 reuses the already-validated mobile shell/continuity substrate without widening authority; cached-offline calendar reopen does not imply cached Find time answers.
- Preserve validated web behavior from `R008`/`R012`: ranked Top picks stay ahead of browse windows, blocked-member explanations remain truthful, and malformed or incomplete contracts fail closed.
- A chosen suggestion hands off only exact timing data (`start`, `prefillStartAt`, `prefillEndAt`, `source`) into the existing mobile create sheet, preserves the slot-derived week, and strips one-shot params after arrival so reload does not reopen the sheet.
- Threat surface: query-param tampering, calendar-id guessing, stale cached scope replay, malformed busy-interval payloads, and sticky handoff params all fail closed; only already-permitted roster names, member-attributed busy explanations, and exact selected slot timing may reach the mobile UI.
- Requirement impact: touch `R002` and `R009`, support `R022`, preserve validated `R008`/`R012`, and re-verify mobile auth/scope denial truthfulness, cached-offline continuity, Top-pick ordering, blocked-member explanations, strict create-prefill parsing, one-shot cleanup, and native mobile build/sync.
- Decisions revisited: `D045`, `D048`, `D049`, `D054`, `D055`, `D057`, `D058`.
- Verification target files: `apps/mobile/tests/find-time-contract.unit.test.ts`, `apps/mobile/tests/mobile-find-time.unit.test.ts`, `apps/mobile/tests/mobile-create-prefill.unit.test.ts`, `apps/mobile/tests/e2e/find-time-handoff.spec.ts`, `apps/web/tests/find-time/matcher.unit.test.ts`, `apps/web/tests/routes/find-time-routes.unit.test.ts`, `apps/web/tests/schedule/create-prefill.unit.test.ts`, and `apps/web/tests/routes/protected-routes.unit.test.ts`.
- Verification commands: `pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts tests/mobile-find-time.unit.test.ts tests/mobile-create-prefill.unit.test.ts`; `pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts`; `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/find-time-handoff.spec.ts`; `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`.
- Decomposition rationale: T01 retires cross-surface drift first by moving the pure matcher/ranking and timing-only handoff contract into `@repo/caluno-core`; T02 builds the truthful mobile authority layer; T03 spends that authority on the actual phone-first experience and one-shot create handoff; T04 closes the slice with end-to-end proof plus native build/sync.

## Proof Level

- This slice proves: integration

## Integration Closure

Upstream surfaces consumed: `packages/caluno-core/src/app-shell.ts`, `packages/caluno-core/src/route-contract.ts`, `apps/mobile/src/lib/shell/load-app-shell.ts`, `apps/mobile/src/lib/offline/network.ts`, `apps/mobile/src/lib/offline/transport.ts`, `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`, and the existing web matcher/ranking/create-prefill contracts.

New wiring introduced in this slice: shared find-time and create-prefill exports in `@repo/caluno-core`, a mobile `/calendars/[calendarId]/find-time` route with live trusted transport, a contextual calendar-board entrypoint, compact mobile suggestion cards, and a one-shot handoff into `ShiftEditorSheet.svelte`.

What remains before the milestone is truly usable end-to-end: notification control/delivery slices `S04` and `S05`; nothing else in the Find time-to-create path should remain unwired after this slice.

## Verification

- Runtime signals: add stable mobile Find time state/count attributes such as route status, reason code, top-pick count, browse count, route mode, and network truth, plus create-sheet arrival metadata (`data-open-on-arrival`, `data-create-source`, `data-prefill-source`, exact prefill start/end).
- Inspection surfaces: `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte`, `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`, `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte`, and the named mobile/web unit and Playwright suites.
- Failure visibility: denied scope, offline-unavailable, timeout/query failure, malformed matcher data, missing handoff metadata, and sticky post-arrival query params remain attributable through explicit `data-testid` / `data-*` surfaces instead of prose-only UI.
- Redaction constraints: do not expose raw Supabase tokens, cross-group roster details, or any schedule data outside the already-permitted calendar scope.

## Tasks

- [x] **T01: Extract shared find-time matching and create-prefill contracts** `est:2h`
  Extract the pure Find time matcher, ranking, and timing-only create-prefill contract into `@repo/caluno-core` before mobile consumes them. Keep the shared layer free of SvelteKit, browser, and Capacitor runtime assumptions, then rewire web wrappers so existing route behavior stays intact while mobile gains one source of truth for Top-pick ordering, explanation failure modes, and exact slot handoff.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Existing web matcher/ranking helpers | Stop on the first regression and fix the shared extraction before mobile depends on forked Top-pick or explanation logic. | Treat hanging regressions as incomplete extraction and keep mobile off the new shared surface. | Fail closed on invalid windows, duplicate member assignments, or missing shift titles instead of weakening ranking validation for portability. |
| Existing create-prefill helper | Keep the web handoff path on the known-good contract until the shared helper round-trips cleanly. | Do not start mobile arrival wiring while the timing-only contract is unresolved. | Reject malformed or mismatched `start` / `prefillStartAt` / `prefillEndAt` params instead of guessing destination week or slot values. |

## Load Profile

- **Shared resources**: shared package exports, 30-day matcher/ranking helpers, and cross-surface regression suites.
- **Per-operation cost**: pure range normalization, boundary sorting, ranking, explanation shaping, and query-param parsing with no direct network or runtime plugin calls.
- **10x breakpoint**: oversized window sets or hidden app-local imports will break portability and deterministic ranking first.

## Negative Tests

- **Malformed inputs**: blank/invalid duration, invalid search anchor, invalid ISO slot timestamps, zero-length slots, duplicate member busy assignments, missing shift titles.
- **Error paths**: missing shared exports, wrapper imports still reaching into app-local code, and ranking failure paths that should withhold malformed explanations.
- **Boundary conditions**: no results, all-free windows, all-blocked windows, slot week differing from the original search anchor week, and unrelated search params preserved after cleanup.

## Steps

1. Move or recreate the pure matcher/ranking helpers and strict create-prefill parser/builder under `packages/caluno-core/src/find-time/*` and `packages/caluno-core/src/schedule/create-prefill.ts`, adding explicit package exports.
2. Rewire `apps/web/src/lib/find-time/*.ts` and `apps/web/src/lib/schedule/create-prefill.ts` into thin wrappers or re-exports so existing web routes/tests keep their current behavior.
3. Add a mobile-local contract suite that imports the shared helpers directly and proves Top-pick ordering, fail-closed malformed ranking, strict handoff parsing, Monday week derivation, and one-shot cleanup semantics.
4. Keep the shared contract pure so later mobile route work can consume it without importing from `apps/web/src` or depending on Svelte runtime globals.

## Must-Haves

- [ ] Mobile can consume shared matcher/ranking/create-prefill helpers without importing from `apps/web/src`.
- [ ] Web matcher and create-prefill regressions stay green against the extracted shared implementation.
- [ ] Malformed ranking inputs and malformed handoff params still fail closed instead of generating guessed windows or guessed create state.
- [ ] A mobile-local contract test file exists before mobile route wiring begins.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts`
- `pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts`
  - Files: `packages/caluno-core/package.json`, `packages/caluno-core/src/index.ts`, `packages/caluno-core/src/find-time/matcher.ts`, `packages/caluno-core/src/find-time/ranking.ts`, `packages/caluno-core/src/schedule/create-prefill.ts`, `apps/web/src/lib/find-time/matcher.ts`, `apps/web/src/lib/find-time/ranking.ts`, `apps/web/src/lib/schedule/create-prefill.ts`, `apps/mobile/tests/find-time-contract.unit.test.ts`
  - Verify: pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts && pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts

- [x] **T02: Build the trusted mobile Find time route and status model** `est:2h`
  Implement the actual mobile `/calendars/[calendarId]/find-time` route on top of the trusted shell and direct mobile Supabase transport pattern established in S01/S02. This task should keep the route live-backed while online, explicit when offline, and fail-closed for malformed or out-of-scope calendar ids before any roster/busy query runs.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Trusted mobile shell / route scope | Keep the route in denied state and do not query roster or busy data outside already-permitted scope. | Do not fall back to cached Find time answers when trusted scope resolution is unresolved. | Treat malformed or mismatched trusted scope as denied instead of guessing a calendar. |
| Direct Supabase roster/busy transport | Surface explicit `query-failure` and keep result cards closed. | Surface explicit `timeout` and preserve retryable route state without fake windows. | Surface `malformed-response` and withhold Top-pick/browse cards entirely. |
| Mobile network truth | Keep the route explicit as `offline-unavailable` when the device is offline or continuity is `cached-offline`. | Do not start live roster/busy queries while connectivity is ambiguous. | Ignore malformed network plugin payloads and fall back to the last safe browser signal only for connectivity state, not for result data. |

## Load Profile

- **Shared resources**: Supabase roster and shift reads, shared matcher/ranking helpers, trusted shell snapshot, and mobile route-state shaping.
- **Per-operation cost**: one trusted scope check, one roster lookup, one busy-interval query over the bounded 30-day horizon, and local ranking of the returned windows.
- **10x breakpoint**: live busy-interval volume and slow roster reads will hit timeout or query-error surfaces before the compact UI should attempt to render.

## Negative Tests

- **Malformed inputs**: invalid calendar id, blank/invalid duration, invalid `start`, malformed roster rows, malformed busy rows.
- **Error paths**: offline route entry, out-of-scope calendar id, roster timeout, busy-query failure, malformed ranking contract after transport returns.
- **Boundary conditions**: zero windows, only browse windows, multiple Top picks, and continuity `cached-offline` route entry after a calendar already reopened offline.

## Steps

1. Add mobile-local view/transport helpers that resolve trusted calendar scope from the shaped shell, read current network truth, fetch live roster plus busy intervals through Supabase only when online, and compose the shared matcher/ranking contract.
2. Implement `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte` with explicit route states: `ready`, `no-results`, `invalid-input`, `query-failure`, `timeout`, `malformed-response`, `denied`, and `offline-unavailable`.
3. Expose stable `data-testid` / `data-*` diagnostics for route status, reason, route mode, network source, Top-pick count, browse count, and denial phase so Playwright and future agents can attribute failures precisely.
4. Add unit coverage for route-state shaping and fail-closed transport behavior before the calendar board starts linking into the new route.

## Must-Haves

- [ ] The mobile Find time route rejects malformed or out-of-scope calendar ids before any roster or busy query runs.
- [ ] Cached-offline calendar continuity still yields explicit `offline-unavailable` on the Find time route instead of replaying stale answers.
- [ ] The route emits explicit `ready` / `no-results` / `invalid-input` / `query-failure` / `timeout` / `malformed-response` states with deterministic diagnostics.
- [ ] Unit tests prove the route-state contract from the mobile side.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts tests/mobile-find-time.unit.test.ts`
- `pnpm --dir apps/mobile check`
  - Files: `apps/mobile/src/lib/find-time/transport.ts`, `apps/mobile/src/lib/find-time/view.ts`, `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte`, `apps/mobile/src/lib/offline/network.ts`, `apps/mobile/src/lib/shell/load-app-shell.ts`, `apps/mobile/tests/mobile-find-time.unit.test.ts`
  - Verify: pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts tests/mobile-find-time.unit.test.ts && pnpm --dir apps/mobile check

- [ ] **T03: Wire the calendar entrypoint, compact cards, and one-shot create handoff** `est:2h`
  Spend the trusted route-state contract on the actual phone-first UX. Add a contextual Find time entrypoint from the mobile calendar board, keep Top picks explanation-rich while browse cards stay lighter, and thread the selected slot back into the existing `ShiftEditorSheet.svelte` so mobile create opens once with exact values and immediately cleans up one-shot query state.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Mobile Find time route state | Keep the compact UI in explicit error/offline/denied state instead of rendering partial cards. | Preserve the retryable route state and do not auto-open create on stale or incomplete data. | Withhold CTAs when a result card lacks a valid exact slot handoff contract. |
| Existing mobile calendar/editor runtime | Keep normal manual create/edit/move/delete behavior intact if arrival-prefill state is absent or rejected. | Do not leave the create sheet stuck open if the route is still resolving post-arrival cleanup. | Reject malformed prefill params and keep the calendar week renderable without auto-opening the sheet. |
| Browser history / query cleanup | Preserve the slot-derived `start` week while stripping transient handoff params. | Treat delayed navigation cleanup as incomplete handoff and keep tests pinned to the cleaned URL. | Never keep sticky `create` / `prefill*` / `source` params that would reopen on reload. |

## Load Profile

- **Shared resources**: mobile calendar route state, compact result rendering, sheet state, and browser history/query updates.
- **Per-operation cost**: one contextual link from the board, one route render for compact results, and one create-sheet seed/cleanup pass on arrival.
- **10x breakpoint**: dense result-card rendering and repeated arrival-state transitions will break determinism before the underlying shared matcher contract should fail.

## Negative Tests

- **Malformed inputs**: missing `prefillStartAt`, missing `prefillEndAt`, invalid ISO instants, mismatched `start` week, unknown `source`.
- **Error paths**: offline-unavailable route, denied route, CTA with invalid slot metadata, and arrival on malformed prefill params.
- **Boundary conditions**: Top picks present with zero browse cards, browse-only results, earlier search anchor week differing from chosen slot week, and reload immediately after arrival cleanup.

## Steps

1. Add a contextual `find-time-entrypoint` on `MobileCalendarBoard.svelte` that opens the new mobile route for the current visible week rather than introducing a new primary shell tab.
2. Finish the compact mobile results UI: Top picks first with richer explanation and deterministic CTA metadata, browse windows second with lighter summaries, and explicit test ids for ordering/count assertions.
3. Parse strict create-prefill params on the mobile calendar route, thread accepted state into `ShiftEditorSheet.svelte`, auto-open create once with exact datetime-local values and a visible `From Find time` cue, and then strip transient query params while preserving `start=`.
4. Add unit coverage for valid arrival-prefill behavior, malformed rejection, one-shot cleanup, and no-regression manual create behavior.

## Must-Haves

- [ ] A permitted mobile user can open Find time directly from the real calendar board for the current visible week.
- [ ] Compact Top picks render before browse windows and expose deterministic CTA metadata (`data-handoff-source`, week, start, end).
- [ ] The existing mobile create sheet opens once on arrival with exact slot values and a visible `From Find time` cue.
- [ ] Reload after arrival does not reopen the create sheet because one-shot query params were stripped while preserving the slot-derived week.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/mobile-find-time.unit.test.ts tests/mobile-create-prefill.unit.test.ts`
- `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build`
  - Files: `apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte`, `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte`, `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`, `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte`, `apps/mobile/src/app.css`, `apps/mobile/tests/mobile-create-prefill.unit.test.ts`
  - Verify: pnpm --dir apps/mobile exec vitest run tests/mobile-find-time.unit.test.ts tests/mobile-create-prefill.unit.test.ts && pnpm --dir apps/mobile check && pnpm --dir apps/mobile build

- [ ] **T04: Prove the mobile Find time flow end to end and keep native wiring green** `est:90m`
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
  - Files: `apps/mobile/tests/e2e/fixtures.ts`, `apps/mobile/tests/e2e/find-time-handoff.spec.ts`, `apps/mobile/playwright.config.ts`, `apps/mobile/package.json`, `apps/mobile/ios/App/App.xcodeproj/project.pbxproj`, `apps/mobile/ios/App/CapApp-SPM/Package.swift`
  - Verify: pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts tests/mobile-find-time.unit.test.ts tests/mobile-create-prefill.unit.test.ts && pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts && npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/find-time-handoff.spec.ts && pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'

## Files Likely Touched

- packages/caluno-core/package.json
- packages/caluno-core/src/index.ts
- packages/caluno-core/src/find-time/matcher.ts
- packages/caluno-core/src/find-time/ranking.ts
- packages/caluno-core/src/schedule/create-prefill.ts
- apps/web/src/lib/find-time/matcher.ts
- apps/web/src/lib/find-time/ranking.ts
- apps/web/src/lib/schedule/create-prefill.ts
- apps/mobile/tests/find-time-contract.unit.test.ts
- apps/mobile/src/lib/find-time/transport.ts
- apps/mobile/src/lib/find-time/view.ts
- apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte
- apps/mobile/src/lib/offline/network.ts
- apps/mobile/src/lib/shell/load-app-shell.ts
- apps/mobile/tests/mobile-find-time.unit.test.ts
- apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte
- apps/mobile/src/routes/calendars/[calendarId]/+page.svelte
- apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte
- apps/mobile/src/app.css
- apps/mobile/tests/mobile-create-prefill.unit.test.ts
- apps/mobile/tests/e2e/fixtures.ts
- apps/mobile/tests/e2e/find-time-handoff.spec.ts
- apps/mobile/playwright.config.ts
- apps/mobile/package.json
- apps/mobile/ios/App/App.xcodeproj/project.pbxproj
- apps/mobile/ios/App/CapApp-SPM/Package.swift
