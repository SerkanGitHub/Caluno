---
id: T02
parent: S02
milestone: M003
key_files:
  - apps/mobile/package.json
  - apps/mobile/src/lib/continuity/mobile-app-shell-cache.ts
  - apps/mobile/src/lib/offline/repository.ts
  - apps/mobile/src/lib/shell/load-app-shell.ts
  - apps/mobile/src/lib/auth/mobile-session.ts
  - apps/mobile/src/routes/+layout.ts
  - apps/mobile/src/routes/groups/+page.svelte
  - apps/mobile/src/routes/calendars/[calendarId]/+page.svelte
  - apps/mobile/src/lib/components/MobileShell.svelte
  - apps/mobile/tests/mobile-continuity.unit.test.ts
  - apps/mobile/tests/auth-bootstrap.unit.test.ts
  - .gsd/KNOWLEDGE.md
key_decisions:
  - D056 — wrap Capacitor Preferences through the shared continuity contract and require both the trusted shell snapshot and per-calendar synced week metadata before cached-offline calendar reopen.
duration: 
verification_result: passed
completed_at: 2026-04-21T10:03:58.813Z
blocker_discovered: false
---

# T02: Added Preferences-backed mobile continuity so trusted calendars can reopen in cached-offline mode and still fail closed with explicit denial reasons.

**Added Preferences-backed mobile continuity so trusted calendars can reopen in cached-offline mode and still fail closed with explicit denial reasons.**

## What Happened

I added a Capacitor Preferences-backed continuity adapter in `apps/mobile/src/lib/continuity/mobile-app-shell-cache.ts` that reuses the shared `@repo/caluno-core` cached app-shell contract by validating raw persisted JSON through the same fail-closed parser instead of forking the rules on mobile. I also built `apps/mobile/src/lib/offline/repository.ts` as the mobile persistence surface for week metadata and later queue storage, including per-user/per-calendar/per-week keying plus helper functions for remembering synced weeks and clearing continuity state. In `apps/mobile/src/lib/shell/load-app-shell.ts`, I extended the shell loader to persist trusted shell snapshots on successful online loads, expose route mode / snapshot origin / last trusted refresh continuity signals, rehydrate cached snapshots for offline reopen, and deny cached calendar reopen unless both the trusted shell scope still validates and previously synced week metadata exists for the requested calendar. In `apps/mobile/src/lib/auth/mobile-session.ts`, I wired continuity invalidation into invalid-session and sign-out handling so stale shell/week data is cleared fail-closed on session rejection or logout. In `apps/mobile/src/routes/+layout.ts`, `apps/mobile/src/routes/groups/+page.svelte`, `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`, and `apps/mobile/src/lib/components/MobileShell.svelte`, I replaced the blanket live-auth redirect behavior with an explicit protected-entry decision that distinguishes trusted-online, cached-offline, and denied modes while surfacing `data-route-mode`, `data-snapshot-origin`, continuity rejection reason, and last trusted refresh timestamp. I added `apps/mobile/tests/mobile-continuity.unit.test.ts` for persisted continuity writes, cached-offline reopen, and fail-closed stale/corrupt/unsynced rejection paths, and updated `apps/mobile/tests/auth-bootstrap.unit.test.ts` so invalid-session and sign-out regressions prove the new continuity clearing behavior.

## Verification

Verified the task’s required T02 bar by running `pnpm --dir apps/mobile exec vitest run tests/mobile-continuity.unit.test.ts tests/continuity-contract.unit.test.ts`, which passed and confirmed cached-offline reopen plus fail-closed continuity rejection paths, and `pnpm --dir apps/mobile check`, which passed with zero Svelte or TypeScript diagnostics after the new route-data and continuity surfaces were wired in. During implementation I also ran the adjacent mobile auth/shell regression suites (`tests/auth-bootstrap.unit.test.ts` and `tests/shell-scope.unit.test.ts`) to confirm the invalid-session/sign-out clearing and existing trusted-scope shaping behavior still held after the continuity changes.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile exec vitest run tests/mobile-continuity.unit.test.ts tests/continuity-contract.unit.test.ts` | 0 | ✅ pass | 1395ms |
| 2 | `pnpm --dir apps/mobile check` | 0 | ✅ pass | 2447ms |

## Deviations

I did not run the full slice-level commands that depend on future-task artifacts (`mobile-sync-runtime`, later E2E, and native sync proof) during this intermediate task. I reran the task-local verification bar plus adjacent auth/shell regressions instead, because T03/T05 surfaces are not implemented yet.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/package.json`
- `apps/mobile/src/lib/continuity/mobile-app-shell-cache.ts`
- `apps/mobile/src/lib/offline/repository.ts`
- `apps/mobile/src/lib/shell/load-app-shell.ts`
- `apps/mobile/src/lib/auth/mobile-session.ts`
- `apps/mobile/src/routes/+layout.ts`
- `apps/mobile/src/routes/groups/+page.svelte`
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
- `apps/mobile/src/lib/components/MobileShell.svelte`
- `apps/mobile/tests/mobile-continuity.unit.test.ts`
- `apps/mobile/tests/auth-bootstrap.unit.test.ts`
- `.gsd/KNOWLEDGE.md`
