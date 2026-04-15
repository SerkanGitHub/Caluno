---
id: T02
parent: S03
milestone: M001
key_files:
  - apps/web/src/lib/offline/sqlite.worker.ts
  - apps/web/src/lib/offline/repository.ts
  - apps/web/src/lib/offline/app-shell-cache.ts
  - apps/web/src/lib/supabase/client.ts
  - apps/web/tests/auth/session.unit.test.ts
  - apps/web/tests/schedule/offline-store.unit.test.ts
  - .gsd/DECISIONS.md
key_decisions:
  - D018: offline continuity stores only sanitized viewer/scope/session data in browser cache, while durable week snapshots and local mutations stay behind the repository seam.
duration: 
verification_result: passed
completed_at: 2026-04-15T08:14:52.566Z
blocker_discovered: false
---

# T02: Added the offline schedule repository and cached shell/session continuity contract with fail-closed unit proof.

**Added the offline schedule repository and cached shell/session continuity contract with fail-closed unit proof.**

## What Happened

I added `apps/web/src/lib/offline/sqlite.worker.ts` as the project-owned SQLite worker bootstrap and built `apps/web/src/lib/offline/repository.ts` around a small repository seam for scoped week snapshots plus local mutation storage. The default browser path opens a worker-backed OPFS SQLite database and exposes inspectable initialization state, while the same repository contract also supports an injected shared-memory driver so node-based unit tests can prove reopen persistence without faking the production browser path. I also added `apps/web/src/lib/offline/app-shell-cache.ts` to persist only the minimal continuity snapshot for this browser: viewer identity, sanitized session expiry metadata, permitted groups/calendars, primary calendar id, and onboarding state. That cache validates its contract on read, clears malformed payloads, rejects stale or mismatched sessions, and fails closed for calendar ids that were never synced locally. In `apps/web/src/lib/supabase/client.ts` I extended the browser helper surface with sanitized continuity-session builders/readers so later route code can cooperate with the cached shell without ever persisting raw Supabase access or refresh tokens. Finally, I updated `apps/web/tests/auth/session.unit.test.ts` and added `apps/web/tests/schedule/offline-store.unit.test.ts` to lock the trusted online `safeGetSession()` path apart from the offline continuity path, prove repository reopen persistence, and prove fail-closed behavior for unsynced or malformed cached scope.

## Verification

I ran the task verification suite `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/schedule/offline-store.unit.test.ts`, which passed with 12/12 tests green. Those tests cover sanitized browser continuity-session shaping, stale cached-session rejection, repository persistence across reopen for a single user/calendar/week scope, malformed cached snapshot rejection, and fail-closed denial for calendar ids that were never synced into local trusted scope. I also ran `pnpm --dir apps/web check`, which passed with zero Svelte/TypeScript diagnostics, so the new worker import, repository/cache contracts, and Supabase client helpers compile cleanly. For the slice-level verification surface, the task-local unit proof passed and `pnpm --dir apps/web check` also passed; the remaining slice-wide route/E2E/offline browser proofs are intentionally still pending later tasks in S03.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/schedule/offline-store.unit.test.ts` | 0 | ✅ pass | 1762ms |
| 2 | `pnpm --dir apps/web check` | 0 | ✅ pass | 3173ms |

## Deviations

Added an injected shared-memory repository driver for deterministic node Vitest coverage because the task’s proof surface runs outside a real browser worker/OPFS environment. The shipped browser default remains the worker-backed SQLite repository required by the slice contract.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/lib/offline/sqlite.worker.ts`
- `apps/web/src/lib/offline/repository.ts`
- `apps/web/src/lib/offline/app-shell-cache.ts`
- `apps/web/src/lib/supabase/client.ts`
- `apps/web/tests/auth/session.unit.test.ts`
- `apps/web/tests/schedule/offline-store.unit.test.ts`
- `.gsd/DECISIONS.md`
