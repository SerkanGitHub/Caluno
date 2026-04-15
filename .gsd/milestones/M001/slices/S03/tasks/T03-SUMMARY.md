---
id: T03
parent: S03
milestone: M001
key_files:
  - apps/web/src/app.d.ts
  - apps/web/src/routes/(app)/+layout.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts
  - apps/web/src/routes/(app)/groups/+page.svelte
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/tests/routes/protected-routes.unit.test.ts
key_decisions:
  - D019: Persist app-shell and week snapshots only from online browser loads, and resolve offline protected routes from browser-local cached scope/repository instead of trusting serialized SSR payloads.
duration: 
verification_result: passed
completed_at: 2026-04-15T08:30:34.496Z
blocker_discovered: false
---

# T03: Added fail-closed offline route loaders for cached protected shells and previously synced calendar weeks.

**Added fail-closed offline route loaders for cached protected shells and previously synced calendar weeks.**

## What Happened

I extended `apps/web/src/app.d.ts` with explicit protected-route state types for trusted-online, cached-offline, and offline-denied branches so the browser-side route continuity contract is typed instead of inferred. In `apps/web/src/routes/(app)/+layout.ts` I added the browser loader that persists a sanitized app-shell snapshot only when the protected shell is online, then reopens groups/navigation from the cached scope when offline without trusting stale serialized SSR data. In `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts` I added the corresponding calendar loader that persists trusted online week snapshots into the browser repository, resolves cached reopen for previously synced calendar ids, and returns explicit fail-closed denied states for unsynced ids, missing snapshots, and malformed cached data. I updated `apps/web/src/routes/(app)/groups/+page.svelte` and `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` to surface the new route state with calm visible copy, cached/offline banners, and explicit reason codes instead of leaving offline branches ambiguous. Finally, I expanded `apps/web/tests/routes/protected-routes.unit.test.ts` to prove offline cached reopen for trusted shell/calendar scope and fail-closed denial for cache-missing, unsynced, and malformed offline route data.

## Verification

`pnpm --dir apps/web check && pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts` passed, proving the new route loaders compile cleanly and the protected-route unit contract now covers cached shell reopen, cached calendar reopen, and explicit fail-closed denial for unsynced or malformed offline inputs. I also ran the slice’s broader unit-suite command `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/offline-store.unit.test.ts tests/schedule/offline-queue.unit.test.ts`, which passed for the currently implemented unit surfaces in S03. The later slice-level Supabase reset and Playwright offline/browser proofs remain pending future tasks in this slice.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web check && pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts` | 0 | ✅ pass | 4313ms |
| 2 | `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/offline-store.unit.test.ts tests/schedule/offline-queue.unit.test.ts` | 0 | ✅ pass | 1706ms |

## Deviations

I persisted trusted app-shell and week snapshots from the new browser route loaders as part of T03 because T02 had introduced the cache/repository contracts but no real route caller was writing them yet; without that glue, the planned cached reopen path would have had no production data source.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/app.d.ts`
- `apps/web/src/routes/(app)/+layout.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts`
- `apps/web/src/routes/(app)/groups/+page.svelte`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/tests/routes/protected-routes.unit.test.ts`
