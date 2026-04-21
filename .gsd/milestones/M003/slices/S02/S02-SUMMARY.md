---
id: S02
parent: M003
milestone: M003
provides:
  - A shared offline/schedule contract that both web and mobile can reuse without `apps/mobile` importing from `apps/web/src`.
  - A Preferences-backed mobile continuity store that can reopen only trusted, previously synced calendar scope offline.
  - A mobile local-first controller/runtime/transport stack with deterministic reconnect drain and retryable failure handling.
  - A phone-first mobile week board and shift editor surface with stable diagnostics for downstream notification and Find time work.
requires:
  - slice: S01
    provides: Trusted mobile auth bootstrap, shaped permitted inventory, denied-state shell, and sign-out/invalid-session guardrails that S02 extends into offline continuity and calendar editing.
affects:
  - S03
  - S04
  - S05
key_files:
  - packages/caluno-core/src/offline/app-shell-cache.ts
  - packages/caluno-core/src/offline/mutation-queue.ts
  - packages/caluno-core/src/offline/sync-engine.ts
  - packages/caluno-core/src/schedule/board.ts
  - packages/caluno-core/src/schedule/conflicts.ts
  - packages/caluno-core/src/schedule/recurrence.ts
  - apps/mobile/src/lib/continuity/mobile-app-shell-cache.ts
  - apps/mobile/src/lib/offline/repository.ts
  - apps/mobile/src/lib/offline/controller.ts
  - apps/mobile/src/lib/offline/transport.ts
  - apps/mobile/src/routes/calendars/[calendarId]/+page.svelte
  - apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte
  - apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte
  - apps/mobile/src/lib/components/calendar/SyncStatusStrip.svelte
  - apps/mobile/tests/continuity-contract.unit.test.ts
  - apps/mobile/tests/mobile-continuity.unit.test.ts
  - apps/mobile/tests/mobile-sync-runtime.unit.test.ts
  - apps/mobile/tests/e2e/calendar-offline.spec.ts
  - apps/mobile/tests/e2e/fixtures.ts
  - apps/mobile/ios/App/App/capacitor.config.json
  - apps/mobile/ios/App/CapApp-SPM/Package.swift
key_decisions:
  - D055 — keep pure continuity, queue/replay, and schedule helpers in `@repo/caluno-core`, with runtime-specific web/mobile adapters left local.
  - D056 — require both a trusted shell snapshot and per-calendar synced week metadata before mobile cached-offline reopen.
  - D057 — use a client-side mobile offline runtime plus direct trusted Supabase transport for create/edit/move/delete instead of server-form actions.
patterns_established:
  - Shared product rules belong in `@repo/caluno-core`; app-local wrappers should only own Svelte/runtime integration.
  - Mobile continuity should validate raw Capacitor Preferences payloads through the shared continuity contract instead of cloning parse rules.
  - Phone-first mobile schedule editing can stay truthful by reading directly from one local-first controller/runtime that owns queue counts, retryable state, and reconnect drain.
observability_surfaces:
  - `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` route-state surface with `data-testid="calendar-route-state"`.
  - `apps/mobile/src/lib/components/calendar/SyncStatusStrip.svelte` sync-strip surface with queue and sync attributes.
  - Playwright assertions in `apps/mobile/tests/e2e/calendar-offline.spec.ts` that read route-mode, pending-count, retryable-count, and sync-phase directly.
  - Unit coverage in `apps/mobile/tests/mobile-continuity.unit.test.ts` and `apps/mobile/tests/mobile-sync-runtime.unit.test.ts` for fail-closed and retryable paths.
drill_down_paths:
  - .gsd/milestones/M003/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M003/slices/S02/tasks/T02-SUMMARY.md
  - .gsd/milestones/M003/slices/S02/tasks/T03-SUMMARY.md
  - .gsd/milestones/M003/slices/S02/tasks/T04-SUMMARY.md
  - .gsd/milestones/M003/slices/S02/tasks/T05-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-21T13:40:53.046Z
blocker_discovered: false
---

# S02: Mobile calendar continuity and editing

**Delivered mobile local-first calendar continuity: previously synced permitted calendars now reopen offline, phone-first shift edits persist as visible pending or retryable work, and reconnect drains them back through the trusted path.**

## What Happened

## Delivered

S02 turned the mobile shell from authenticated scope proof into a truthful local-first schedule client.

1. **Shared continuity and scheduling contract moved into `@repo/caluno-core`.** Pure cached-shell parsing, mutation queue/replay logic, and schedule board/conflict/recurrence helpers now live in the shared package instead of mobile importing from `apps/web/src`. Web runtime wrappers stayed thin and mobile now consumes the same fail-closed continuity and replay rules.
2. **Trusted mobile continuity now survives reload and reopen.** The mobile app persists trusted shell snapshots and per-calendar synced week metadata through Capacitor Preferences-backed adapters, then only reopens a calendar in `cached-offline` mode when session identity, trusted scope, and synced-week evidence still validate. Stale, corrupt, mismatched, or never-synced scope fails closed with explicit denial reasons.
3. **Mobile writes are now local-first and durable.** Create/edit/move/delete mutations stage locally, survive reload or app reopen, remain visible as pending or retryable state, and replay in deterministic order on reconnect. Reconnect drain stops on the first retryable failure instead of hiding later work.
4. **The mobile calendar route is now a real phone-first editing surface.** The previous placeholder route was replaced by a compact mobile week board, shift cards, editor sheets, and a sync status strip that read directly from the mobile offline controller/runtime.
5. **Runtime proof and native sync are closed.** Playwright now proves online warm-up, offline reopen, queued edits across reload, reconnect drain, unsynced-calendar denial, corrupt continuity rejection, invalid-week fallback, and malformed-queue diagnostics. Capacitor sync completed with the expected `@capacitor/app`, `@capacitor/network`, and `@capacitor/preferences` plugins.

## Requirement and Slice Outcome

- **R022 validated:** previously synced permitted calendars reopen offline, offline edits survive reload, and reconnect drains them cleanly through the trusted mobile path.
- **R009 advanced:** mobile now uses shared product substrate plus mobile-specific UI/runtime patterns instead of web imports or placeholder screens.
- **R002 regression-safe:** permission and scope fail-closed behavior remained intact through auth/scope Playwright proof.

## Observability / Diagnostics

The slice shipped explicit proof surfaces instead of leaving continuity failures implicit:

- route surface: `data-testid="calendar-route-state"`
- sync strip surface: `data-testid="calendar-sync-strip"`
- attributes: `data-route-mode`, `data-snapshot-origin`, `data-queue-state`, `data-pending-count`, `data-retryable-count`, `data-sync-phase`
- negative-path attribution: explicit denial reasons, `queue-entry-invalid` diagnostics, retryable queue counts, and paused-drain state
- executable coverage: `apps/mobile/tests/continuity-contract.unit.test.ts`, `apps/mobile/tests/mobile-continuity.unit.test.ts`, `apps/mobile/tests/mobile-sync-runtime.unit.test.ts`, and `apps/mobile/tests/e2e/calendar-offline.spec.ts`

These surfaces make future continuity, notification, and assembled-mobile slices able to inspect route mode, queue state, and replay health without guessing from empty-state UI.

## Operational Readiness

- **Health signal:** route/sync-strip data attributes show whether the route is `trusted-online` or `cached-offline`, what snapshot origin is in effect, how many pending/retryable mutations remain, and whether sync is `idle`, draining, or `paused-retryable`.
- **Failure signal:** corrupt shell state, unsynced calendar reopen attempts, malformed queue payloads, and retryable drain failures surface explicit reason codes rather than silent fallback.
- **Recovery procedure:** when connectivity returns, the user can let automatic drain replay pending work or trigger retry/drain controls from the sync strip. If local verification hits the known local Supabase storage `502` during reset, restart the local Supabase stack and rerun the unchanged proof command.
- **Monitoring gaps:** there is still no remote production telemetry pipeline for mobile continuity events; diagnostics are currently local UI/test surfaces and command-line proof, which is sufficient for milestone development but not yet a shipped ops dashboard.

## Downstream Guidance

S03 can now assume a truthful mobile calendar route exists with shared board shaping, trusted scope reopening, and stable diagnostics. S04/S05 can build notification behavior on top of a mobile runtime that already knows which calendar is trusted, which weeks were synced, and whether local mutations are pending or retryable. Downstream work should preserve the shared `@repo/caluno-core` contract boundary and extend the existing route/sync-strip diagnostics rather than inventing parallel state surfaces.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/continuity-contract.unit.test.ts tests/mobile-continuity.unit.test.ts tests/mobile-sync-runtime.unit.test.ts` — passed; proved shared fail-closed continuity rules, cached-offline reopen, durable queue persistence, deterministic replay order, and retryable drain behavior.
- `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/conflicts.unit.test.ts tests/schedule/recurrence.unit.test.ts` — passed; confirmed the shared `@repo/caluno-core` extraction preserved web offline/schedule behavior.
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts` — passed; proved seeded member sign-in, permitted Alpha calendar access, sign-out closure, malformed persisted-session rejection, trusted online warm-up, cached-offline reopen, offline edit persistence across reload, reconnect drain, unsynced-calendar denial, corrupt continuity rejection, invalid-week fallback, and malformed-queue attribution.
- `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'` — passed; confirmed zero Svelte/TS diagnostics, successful production build, and native plugin sync for `@capacitor/app`, `@capacitor/network`, and `@capacitor/preferences`.
- Observability spot-check: route and sync-strip sources expose `data-route-mode`, `data-snapshot-origin`, `data-queue-state`, `data-pending-count`, `data-retryable-count`, and `data-sync-phase`, and Playwright assertions exercise those surfaces directly.

## Requirements Advanced

- R009 — Moved shared continuity/schedule rules into `@repo/caluno-core` and shipped a phone-first mobile calendar board/editor on top of the shared substrate instead of web imports or placeholder UI.

## Requirements Validated

- R022 — Validated by mobile continuity/runtime unit suites, offline calendar Playwright proof, and mobile check/build/cap sync, showing previously synced permitted calendars reopen offline, edits persist across reload, and reconnect drains deterministically.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

No product-contract deviation was required at slice close. During earlier task work, one local Supabase storage health-check `502` required a local stack restart before rerunning the unchanged reset-plus-Playwright verification command; the final slice verification passed without altering assertions or scope.

## Known Limitations

Find time mobile handoff, notification controls, and cross-surface notification correctness remain in S03-S05. This slice intentionally limits offline reopen to previously synced permitted calendars and previously synced weeks; it does not widen scope by guessing unsynced calendar data.

## Follow-ups

S03 should reuse the new mobile calendar route and shared board/runtime substrate for Find time handoff. S04 and S05 should build notification toggles and delivery correctness on top of the route-mode/queue/sync diagnostics shipped here instead of inventing a second mobile state model.

## Files Created/Modified

- `packages/caluno-core/src/offline/app-shell-cache.ts` — Shared fail-closed cached-shell continuity contract used by both web and mobile.
- `packages/caluno-core/src/offline/mutation-queue.ts` — Shared queue parsing and replay semantics, including malformed-entry attribution.
- `packages/caluno-core/src/offline/sync-engine.ts` — Shared deterministic replay helpers preserved for web and mobile runtime use.
- `apps/mobile/src/lib/continuity/mobile-app-shell-cache.ts` — Capacitor Preferences-backed continuity adapter that validates cached shell payloads through the shared contract.
- `apps/mobile/src/lib/offline/repository.ts` — Durable mobile storage for synced week metadata and queued mutations.
- `apps/mobile/src/lib/offline/controller.ts` — Single mobile local-first control surface for pending, retryable, and drain state.
- `apps/mobile/src/lib/offline/transport.ts` — Trusted mobile schedule transport used for reconnect replay.
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — Replaced placeholder route with the real mobile continuity-aware week board surface and route diagnostics.
- `apps/mobile/src/lib/components/calendar/SyncStatusStrip.svelte` — Stable queue/sync diagnostics plus recovery controls for mobile continuity.
- `apps/mobile/tests/e2e/calendar-offline.spec.ts` — End-to-end offline reopen, reload persistence, reconnect drain, and fail-closed denial proof.
