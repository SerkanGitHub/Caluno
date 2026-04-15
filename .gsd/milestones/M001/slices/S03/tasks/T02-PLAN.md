---
estimated_steps: 5
estimated_files: 6
skills_used:
  - debug-like-expert
---

# T02: Build the browser-local schedule repository and cached-shell snapshot contract

**Slice:** S03 — Offline local persistence with cached-session continuity
**Milestone:** M001

## Description

Create the browser-local persistence seams that S03 depends on. This task advances **R004** and supports **R001** by adding a worker-backed schedule repository plus a minimal cached app-shell/session snapshot keyed to previously trusted online scope.

The repository and cache must remain continuity-only boundaries. They can reopen previously synced schedules and permitted calendar inventory on this browser, but they may not mint authority for guessed calendar ids, changed memberships, or stale sessions that have never been proven online.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Browser-local repository bootstrap | Surface repository initialization failure as a named unsupported/offline-state condition and stop short of pretending data was persisted. | Abort the open call and keep the UI on the explicit unavailable branch until the repo responds. | Reject malformed rows/snapshots and leave the cache unavailable instead of rehydrating guessed schedule data. |
| Cached app-shell/session snapshot read/write | Keep the shell in online-only mode until the snapshot contract is valid again. | Treat the cached snapshot as unavailable and avoid partial continuity state. | Fail closed for malformed scope data so unsynced calendars never appear as permitted. |
| Browser Supabase session helper | Preserve online auth behavior and do not trust a broken local session helper for offline continuity. | Treat the cached session as stale/unavailable. | Reject malformed session payloads and clear the continuity cache rather than widening access. |

## Load Profile

- **Shared resources**: browser-local database bytes, cached app-shell snapshot storage, and repository open/close cycles across reloads.
- **Per-operation cost**: one repository init plus small upsert/read/delete operations for the visible week and cached shell snapshot.
- **10x breakpoint**: repeated week snapshots and queued local changes grow repository size first, so the repository API must stay scoped to specific user/calendar/week data instead of caching everything.

## Negative Tests

- **Malformed inputs**: corrupt cached JSON, malformed schedule rows, unknown calendar ids, and stale cached scope for a different user.
- **Error paths**: repository open failure, snapshot parse failure, and browser session helper returning unusable local state.
- **Boundary conditions**: first open with no cache, reopen after a successful sync, and lookup for a calendar that exists online but was never synced locally.

## Steps

1. Create `apps/web/src/lib/offline/sqlite.worker.ts` and `apps/web/src/lib/offline/repository.ts` to expose a small repository API for schedule week snapshots and local mutation storage.
2. Add `apps/web/src/lib/offline/app-shell-cache.ts` to persist the minimal cached viewer + permitted-calendar scope needed for offline continuity on this browser.
3. Extend `apps/web/src/lib/supabase/client.ts` so browser-side auth/session helpers can cooperate with the cached-shell snapshot without exposing raw tokens in logs or diagnostics.
4. Update `apps/web/tests/auth/session.unit.test.ts` to cover the cached-session continuity boundary separately from the trusted online `safeGetSession()` contract.
5. Add `apps/web/tests/schedule/offline-store.unit.test.ts` to prove repository reopen persistence and fail-closed behavior for unsynced calendars or malformed cached scope.

## Must-Haves

- [ ] The repository API supports local schedule snapshot read/write/reopen for a specific user/calendar/week scope.
- [ ] Cached app-shell/session state stores only the minimal continuity data needed for offline reopen.
- [ ] Unsynced or malformed cached scope fails closed rather than showing guessed permitted calendars.
- [ ] Unit tests lock the continuity boundary for repository reopen and cached-shell lookup.

## Verification

- `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/schedule/offline-store.unit.test.ts`
- Confirm the unit suite proves repository persistence across reopen and denied behavior for unsynced cached calendars.

## Observability Impact

- Signals added/changed: repository capability/initialization status, cached app-shell freshness, and local schedule snapshot availability become inspectable state.
- How a future agent inspects this: rerun the session/offline-store unit tests and inspect repository/cache helper outputs instead of scraping ad hoc browser storage keys.
- Failure state exposed: unsupported persistence mode, corrupt cached snapshots, and unsynced-calendar misses surface as named conditions.

## Inputs

- `apps/web/src/lib/supabase/client.ts` — existing browser-side Supabase client helper.
- `apps/web/src/lib/supabase/server.ts` — trusted online session contract that offline continuity must not replace.
- `apps/web/src/routes/(app)/+layout.server.ts` — authoritative online app-shell scope that the cache will mirror.
- `apps/web/src/lib/server/schedule.ts` — current online schedule DTOs and route contract.
- `apps/web/tests/auth/session.unit.test.ts` — current auth/session unit proof surface.

## Expected Output

- `apps/web/src/lib/offline/sqlite.worker.ts` — worker bootstrap for the browser-local repository.
- `apps/web/src/lib/offline/repository.ts` — repository API for cached schedules and local mutation data.
- `apps/web/src/lib/offline/app-shell-cache.ts` — cached app-shell/session continuity helper.
- `apps/web/src/lib/supabase/client.ts` — browser-side auth/session helper updated for cached continuity.
- `apps/web/tests/auth/session.unit.test.ts` — unit coverage for the cached-session continuity boundary.
- `apps/web/tests/schedule/offline-store.unit.test.ts` — unit proof for repository reopen persistence and fail-closed lookup.
