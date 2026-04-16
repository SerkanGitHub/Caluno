---
id: T03
parent: S06
milestone: M001
key_files:
  - apps/web/src/lib/offline/sync-engine.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/tests/schedule/sync-engine.unit.test.ts
  - .gsd/KNOWLEDGE.md
key_decisions:
  - Wait for a browser session token before opening the shared shift channel and restart the subscription on `INITIAL_SESSION`, `SIGNED_IN`, or `TOKEN_REFRESHED` instead of assuming realtime auth is already hydrated at route mount.
  - Treat retained realtime scope/diagnostics cache reads in the calendar route as untracked state so the route does not recreate its realtime subscription just because it persisted previous diagnostics.
duration: 
verification_result: mixed
completed_at: 2026-04-16T17:56:26.805Z
blocker_discovered: false
---

# T03: Tightened realtime auth/subscription handling and isolated a remaining calendar mount loop that still blocks collaborator browser proof.

**Tightened realtime auth/subscription handling and isolated a remaining calendar mount loop that still blocks collaborator browser proof.**

## What Happened

I started by reproducing the clean-db sync proof again and found the failure had tightened compared with T02: both the primary and collaborator pages now stall earlier at realtime setup, with `data-channel-state="subscribing"` never reaching `ready`, so no collaborator refresh can possibly apply. I read the full sync-engine, calendar route, Playwright helpers, server write path, migrations, and retained failure context before changing code so I could separate subscription setup from later refresh logic.

My first evidence-backed hypothesis was realtime auth hydration: the route signs users in through a server action and then mounts a browser Supabase client on the calendar page, so the shared-shift channel could be opening before a browser session token is available. I patched `apps/web/src/lib/offline/sync-engine.ts` to stop launching the channel when realtime auth returns no token, to surface `REALTIME_AUTH_SESSION_PENDING` instead, and to restart the channel on `INITIAL_SESSION` in addition to `SIGNED_IN` and `TOKEN_REFRESHED`. I locked that behavior with a focused unit regression in `apps/web/tests/schedule/sync-engine.unit.test.ts` that starts with a null session, proves no channel opens yet, then emits `INITIAL_SESSION` and confirms the channel can open and reach `ready`.

That fix passed the targeted unit suite but did not clear the browser proof, so I moved to direct runtime evidence. Using a standalone preview/browser repro against the same calendar route, I confirmed the page still never opened a working realtime channel and the browser console consistently reported `effect_update_depth_exceeded` during calendar mount. That shifted the root-cause model from pure backend/publication suspicion to frontend mount churn: the subscription was being recreated or the page was re-entering effects before the subscribe callback could settle. I audited the calendar route effects and found one retained realtime cache read that should have been untracked. I patched `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` so the reuse check reads retained realtime scope/diagnostics through `untrack(...)` rather than through tracked state.

After that route fix, `pnpm --dir apps/web check` and the focused Vitest regressions passed cleanly, but the isolated clean-db Playwright sync proof still failed in the same substantive place: the collaborator page never reaches `data-channel-state="ready"`, so the task did not yet reach its expected `remote-refresh-state="applied"` output. I appended the new debugging lesson to `.gsd/KNOWLEDGE.md` so future agents do not keep treating this exact stuck-`subscribing` symptom as a backend-only problem.

## Verification

I reran the task-level verification surfaces after each narrow change. The strongest green signal is the typed regression path: `pnpm --dir apps/web check` now passes, and the focused runtime regressions in `tests/schedule/sync-engine.unit.test.ts`, `tests/schedule/board.unit.test.ts`, and `tests/schedule/server-actions.unit.test.ts` all pass, including the new delayed-`INITIAL_SESSION` realtime auth coverage. The browser proof is still red on the primary task contract: after a fresh `supabase db reset --local`, `tests/e2e/calendar-sync.spec.ts` still times out waiting for the collaborator route's realtime diagnostics to leave `subscribing` and reach `ready`, so the later `data-remote-refresh-state="applied"` assertions never become reachable. I also confirmed in a standalone preview/browser repro that the calendar route still emits `effect_update_depth_exceeded` while stuck at `subscribing`, which is the best current explanation for why the subscription never acknowledges even after the auth-hydration fix.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web check && pnpm --dir apps/web exec vitest run tests/schedule/sync-engine.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/server-actions.unit.test.ts` | 0 | ✅ pass | 35900ms |
| 2 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-sync.spec.ts` | 1 | ❌ fail | 57100ms |

## Deviations

Expanded beyond the original single-seam expectation by debugging the browser route itself once the collaborator proof regressed earlier to `data-channel-state="subscribing"` instead of a missing applied refresh. I also used a standalone preview/browser repro to capture console evidence (`effect_update_depth_exceeded`) because the retained Playwright page snapshot alone did not expose the runtime loop.

## Known Issues

The isolated preview-backed browser proof is still red. `tests/e2e/calendar-sync.spec.ts` continues to time out waiting for `data-channel-state="ready"`, and a standalone browser repro against the same route still reports `https://svelte.dev/e/effect_update_depth_exceeded` while the realtime diagnostics remain stuck at `subscribing`. That means at least one additional route/component reactive loop or mount churn path still prevents the shared-shift subscription from acknowledging, so the collaborator refresh/application half of T03 remains incomplete.

## Files Created/Modified

- `apps/web/src/lib/offline/sync-engine.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/tests/schedule/sync-engine.unit.test.ts`
- `.gsd/KNOWLEDGE.md`
