---
estimated_steps: 4
estimated_files: 7
skills_used:
  - debug-like-expert
---

# T02: Add durable trusted shell continuity and offline route reopening on mobile

**Slice:** S02 — Mobile calendar continuity and editing
**Milestone:** M003

## Description

Retire the main structural blocker from research: mobile currently forgets scope as soon as the process dies and refuses all protected routes unless auth is actively live. This task should persist a bounded trusted shell snapshot plus week snapshot metadata on device, then teach the protected entry path to reopen only previously synced permitted routes in a truthful cached-offline mode.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| `@capacitor/preferences` storage adapter | Keep protected routes fail-closed and surface continuity as unavailable instead of silently dropping into partial cached mode. | Treat storage read/write latency as continuity-unavailable and fall back to online-only entry until it succeeds. | Clear corrupt continuity records and expose the reason rather than widening access from guessed cache state. |
| Mobile auth bootstrap and shell loader | Preserve the existing authenticated guard for online mode and never trust cached scope for a different user. | Show a continuity bootstrap failure surface rather than hanging the route indefinitely. | Reject mismatched session, user, or calendar scope and redirect/signpost fail-closed. |

## Load Profile

- **Shared resources**: device key/value storage, shell snapshot JSON, and week snapshot metadata keyed by user/calendar/week.
- **Per-operation cost**: one shell snapshot read on protected entry and one snapshot write after a trusted online refresh.
- **10x breakpoint**: excessive full-snapshot rewrites on every route hop will cause storage churn first if writes are not deduplicated.

## Negative Tests

- **Malformed inputs**: corrupt continuity JSON, expired continuity session, user mismatch, invalid calendar id, unsynced calendar reopen attempt.
- **Error paths**: storage unavailable, shell load timeout, refresh failure after cache warm-up, and protected-route redirect with continuity disabled.
- **Boundary conditions**: first launch with no cache, cached shell with no groups, cached shell with no previously synced week, and reload after app close.

## Steps

1. Add Capacitor Preferences-backed storage helpers for trusted shell snapshots and offline week metadata using the shared continuity contract from T01.
2. Extend `loadMobileAppShell()` and the protected layout entry so mobile can distinguish trusted online, cached offline, needs-group, and fail-closed denied states without trusting a different user or unsynced calendar.
3. Persist and invalidate continuity records alongside trusted online shell loads, sign-out, and invalid-session handling.
4. Add unit tests that prove offline reopen works only for previously synced permitted calendars and still fails closed on stale, corrupt, mismatched, or unsynced continuity state.

## Must-Haves

- [ ] A previously synced permitted calendar can reopen in `cached-offline` mode after reload/app restart.
- [ ] Stale session, user mismatch, corrupt cache JSON, or unsynced calendar ids still keep protected scope closed.
- [ ] Continuity persistence is keyed tightly enough that one user cannot inherit another user’s cached shell or week.
- [ ] The mobile shell exposes a visible reason when cached continuity is unavailable or rejected.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/mobile-continuity.unit.test.ts tests/continuity-contract.unit.test.ts`
- `pnpm --dir apps/mobile check`

## Observability Impact

- Signals added/changed: cached-offline versus trusted-online route mode, continuity rejection reason, snapshot origin, and last trusted refresh timestamp.
- How a future agent inspects this: run `pnpm --dir apps/mobile exec vitest run tests/mobile-continuity.unit.test.ts` and inspect mobile route `data-*` continuity surfaces.
- Failure state exposed: corrupt cache, stale session, user mismatch, and unsynced calendar reopen attempts become visible instead of generic redirects.

## Inputs

- `packages/caluno-core/src/offline/app-shell-cache.ts` — shared cached-shell continuity contract extracted in T01.
- `packages/caluno-core/src/offline/mutation-queue.ts` — shared queue semantics reused for stored week metadata.
- `apps/mobile/src/lib/auth/mobile-session.ts` — current protected-entry auth authority from S01.
- `apps/mobile/src/lib/shell/load-app-shell.ts` — current shell loader that only caches in memory.
- `apps/mobile/src/routes/+layout.ts` — current route gate that blocks all protected routes without live auth.
- `apps/mobile/tests/shell-scope.unit.test.ts` — existing shell denial proof to keep regression-safe.

## Expected Output

- `apps/mobile/package.json` — Capacitor persistence dependencies added for mobile continuity.
- `apps/mobile/src/lib/continuity/mobile-app-shell-cache.ts` — app-local continuity storage adapter using the shared cached-shell contract.
- `apps/mobile/src/lib/offline/repository.ts` — mobile snapshot read/write surface for week metadata and later queue storage.
- `apps/mobile/src/lib/shell/load-app-shell.ts` — trusted shell loader extended with continuity persistence and cache-aware reopen behavior.
- `apps/mobile/src/lib/auth/mobile-session.ts` — continuity invalidation wired into sign-out and invalid-session handling.
- `apps/mobile/src/routes/+layout.ts` — protected route gate updated for truthful `cached-offline` reopen behavior.
- `apps/mobile/tests/mobile-continuity.unit.test.ts` — unit proof for offline reopen and fail-closed rejection paths.
