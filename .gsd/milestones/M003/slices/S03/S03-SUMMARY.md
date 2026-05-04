---
id: S03
parent: M003
milestone: M003
provides:
  - Compact mobile Find time route with Top picks first, browse windows second, and explicit denied/offline/error surfaces.
  - Exact slot-to-create handoff into the existing mobile `ShiftEditorSheet` with preserved week context and cleanup-after-arrival behavior.
  - Shared matcher/ranking/prefill contracts used by both web and mobile.
  - Deterministic mobile E2E proof surfaces for final assembled app verification in S05.
requires:
  - slice: S01
    provides: Trusted mobile shell, auth, and permitted calendar inventory / denial semantics for route entry.
  - slice: S02
    provides: Mobile calendar continuity runtime, existing create/edit sheet, and local-first reconnect surfaces used by the handoff destination.
affects:
  - S05
key_files:
  - packages/caluno-core/src/find-time/matcher.ts
  - packages/caluno-core/src/find-time/ranking.ts
  - packages/caluno-core/src/schedule/create-prefill.ts
  - apps/mobile/src/lib/find-time/transport.ts
  - apps/mobile/src/lib/find-time/view.ts
  - apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte
  - apps/mobile/src/routes/calendars/[calendarId]/+page.svelte
  - apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte
  - apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte
  - apps/mobile/tests/e2e/find-time-handoff.spec.ts
key_decisions:
  - Extract shared find-time matcher/ranking and timing-only create-prefill helpers into `@repo/caluno-core`, leaving app-local wrappers thin.
  - Keep mobile Find time live-backed and fail closed offline; cached-offline continuity never replays stale matching answers.
  - Reuse the existing `ShiftEditorSheet` for Find time handoff and strip one-shot query params immediately after arrival.
  - Make the mobile Playwright handoff assertions contract-focused instead of brittle against earlier suite data mutations.
patterns_established:
  - Use `@repo/caluno-core` as the single source of truth for matcher/ranking/prefill contracts across web and mobile.
  - For authority-sensitive mobile features, keep transport and view-state shaping pure and fail closed when trust or connectivity is missing.
  - Use one-shot arrival parsing plus immediate query cleanup for URL-based mobile handoffs.
  - In mobile Playwright flows, prefer contract assertions (metadata, fail-closed states, handoff behavior) over brittle exact inventories when earlier tests mutate seeded data.
observability_surfaces:
  - `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte` route-state attributes for status, reason, route mode, network source, top-pick count, browse count, and denial phase.
  - `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` create-arrival diagnostics for accepted/rejected prefill state, source, start/end, and one-shot cleanup.
  - `apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte` board entry and handoff metadata (`find-time-entrypoint`, `data-entry-*`).
  - Playwright fixture helpers for result-card snapshots, CTA metadata snapshots, create-sheet arrival inspection, and board visible-week inspection.
drill_down_paths:
  - .gsd/milestones/M003/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M003/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M003/slices/S03/tasks/T03-SUMMARY.md
  - .gsd/milestones/M003/slices/S03/tasks/T04-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-05-04T10:50:05.331Z
blocker_discovered: false
---

# S03: S03

**Mobile Find time is now real on the phone: live-backed when trusted connectivity exists, explicit when denied or offline, and able to hand a chosen slot directly into the existing mobile create sheet.**

## What Happened

## Delivered

S03 completed the mobile Find time slice end to end. The slice extracted the pure matcher, ranking, and timing-only create-prefill contract into `@repo/caluno-core`, then used that shared contract to build a compact mobile `/calendars/[calendarId]/find-time` route that stays authoritative online, explicit when denied, and fail-closed offline. On the mobile calendar route, selected Find time suggestions now hand directly into the existing `ShiftEditorSheet` with exact start/end values, a visible `From Find time` cue, preserved target week context, and immediate cleanup of one-shot query params so reload does not reopen the create sheet.

## Cross-slice value

This slice consumes S01's trusted shell/scope model and S02's mobile calendar continuity + create/edit sheet, then produces the mobile Find time surface that S05 needs for final assembled proof. Downstream work can treat the mobile route/context contract as settled: compact Top picks and browse windows expose deterministic `data-*` diagnostics, exact handoff metadata is stable, and offline/non-authoritative entry fails closed instead of guessing.

## Patterns established

- Shared cross-surface business logic lives in `@repo/caluno-core`; mobile/web wrappers stay thin.
- Mobile Find time authority is split into a pure transport helper and a pure view-state shaper, which keeps failure modes testable without Svelte rendering.
- Find time handoff reuses the existing mobile create sheet rather than creating a second editor path.
- Mobile E2E proof should assert stable route/handoff contracts, not brittle fixed result inventories after earlier suite mutations.

## Observability and failure visibility

The slice added or stabilized explicit route-state and handoff diagnostics across the mobile calendar and Find time routes: result counts, route status/reason, denial phase, route mode, network source, handoff readiness, handoff week/start/end attributes, create-arrival status, and one-shot cleanup state. These surfaces make failures attributable in both unit and browser proof and give S05 dependable hooks for final assembly checks.

## Gate closure

- **Product/UX closure:** a permitted mobile user can enter Find time from the real board, scan Top picks before browse windows, and create a shift from a chosen slot without losing calendar/week context.
- **Trust-boundary closure:** denied and offline routes stay explicit and fail closed; the mobile slice does not widen authority from cached data.
- **Integration closure:** the shared matcher/ranking/prefill contract now powers both web and mobile, and the handoff lands in the already-proven mobile editor rather than a special-case path.
- **Operational closure:** the full mobile proof now includes Docker-backed local Supabase reset, Playwright route proof, Svelte diagnostics, production build, and Capacitor sync so the slice is packaged into the native shell rather than only unit-tested.


## Verification

Fresh slice verification passed after the final code changes. Mobile unit coverage passed with `pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts tests/mobile-find-time.unit.test.ts tests/mobile-create-prefill.unit.test.ts` (16/16 tests). Preserved web regressions passed with `pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts` (43/43 tests). Runtime proof passed with `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/find-time-handoff.spec.ts` (10/10 tests), covering trusted sign-in/scope, offline continuity, reconnect drain, compact mobile Find time, denied/offline fail-closed states, exact slot handoff, and reload cleanup. Closure checks also passed with `pnpm --dir apps/mobile check` (0 Svelte errors, 0 warnings), `pnpm --dir apps/mobile build`, and `sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`.

## Requirements Advanced

- R002 — Extended the trusted mobile permission boundary onto Find time route entry and denied states so out-of-scope calendars never reveal or query matching data.

## Requirements Validated

- R009 — Fresh slice verification passed: `pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts tests/mobile-find-time.unit.test.ts tests/mobile-create-prefill.unit.test.ts`, `pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts`, `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/find-time-handoff.spec.ts`, and `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

S03 intentionally stops at mobile Find time and handoff. It does not add notification controls or notification-open routing; those remain S04/S05 work. The local runtime proof depends on Docker-backed Supabase being available before the Playwright harness runs.

## Follow-ups

S04/S05 should reuse the new mobile `data-*` route-state and handoff diagnostics rather than inventing separate notification-routing or final-assembly proof hooks. Keep future mobile E2E assertions pinned to stable contract signals so earlier suite mutations do not create false negatives.

## Files Created/Modified

- `packages/caluno-core/src/find-time/matcher.ts` — Extracted shared matcher, ranking, and timing-only create-prefill contracts for mobile/web reuse.
- `apps/mobile/src/lib/find-time/transport.ts` — Added mobile trusted find-time transport and pure route-state shaping with fail-closed offline/denied handling.
- `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte` — Built the compact mobile Find time route and result surfaces with deterministic handoff metadata.
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — Reused the existing mobile calendar route and shift editor for one-shot Find time arrival handoff and query cleanup.
- `apps/mobile/tests/e2e/find-time-handoff.spec.ts` — Added mobile Find time E2E coverage and made the assertions robust against earlier suite mutations while preserving contract checks.
