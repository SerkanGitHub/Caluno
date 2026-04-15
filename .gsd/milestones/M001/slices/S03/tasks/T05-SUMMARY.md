---
id: T05
parent: S03
milestone: M001
key_files:
  - apps/web/src/lib/offline/protected-routes.ts
  - apps/web/src/lib/schedule/route-contract.ts
  - apps/web/src/routes/(app)/+layout.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/tests/e2e/fixtures.ts
  - apps/web/tests/e2e/calendar-offline.spec.ts
  - apps/web/tests/e2e/calendar-shifts.spec.ts
  - apps/web/tests/e2e/auth-groups-access.spec.ts
  - apps/web/tests/routes/protected-routes.unit.test.ts
  - apps/web/src/lib/schedule/recurrence.ts
  - apps/web/src/lib/server/schedule.ts
key_decisions:
  - Moved route-only helper exports into library modules so SvelteKit route validation no longer rejects shared helper functions in `+layout.ts` and `+page.ts`.
  - Changed browser-side calendar repository access to lazy imports so sqlite-wasm is only evaluated in the browser, not during SSR/universal route evaluation.
duration: 
verification_result: mixed
completed_at: 2026-04-15T13:28:33.463Z
blocker_discovered: true
---

# T05: Extracted protected-route/offline Playwright scaffolding, but browser proof is still blocked by unresolved rrule SSR/browser interop on calendar routes.

**Extracted protected-route/offline Playwright scaffolding, but browser proof is still blocked by unresolved rrule SSR/browser interop on calendar routes.**

## What Happened

I started by applying the required debugging discipline and reading the slice/task plans plus the current offline/calendar route code, Playwright fixtures, and existing e2e specs. The first concrete failure was not in the offline flow itself: `calendar-shifts.spec.ts` was blocked by invalid named exports from route modules. I extracted the pure route helpers into `apps/web/src/lib/offline/protected-routes.ts`, updated the affected route files and unit-test imports, and then split browser-safe visible-week/calendar-scope helpers into `apps/web/src/lib/schedule/route-contract.ts` so the universal route code no longer imported `$lib/server/*` at runtime. I also updated `apps/web/tests/e2e/fixtures.ts` to retain richer flow diagnostics (runtime/service-worker state, route mode, local queue summary, action summaries, and denied-route metadata) and rewrote `apps/web/tests/e2e/calendar-offline.spec.ts` into the planned continuity proof shape. While rerunning the online browser regression, I found additional runtime blockers: stale e2e assertions against the groups shell text, eager offline-repository imports causing SSR to evaluate the sqlite-wasm path, and then an `rrule` CommonJS/ESM interop mismatch that still prevents `/calendars/[calendarId]` from rendering under the Playwright/Vite SSR path. I corrected the stale groups-shell expectations and converted the browser-side repository usage in `+page.ts` and `+page.svelte` to lazy imports so sqlite initialization stays browser-only. A manual browser repro against a local dev server then isolated the remaining calendar-route failure to `rrule` interop: browser preloading failed when `recurrence.ts` used the package as a default export, and after switching imports, SSR failed because `src/lib/server/schedule.ts` expected a named `RRule` export from a CommonJS module. I stopped at that point rather than continue another debugging loop under hard timeout. The durable state now includes the helper extraction, the lazy repository import changes, the updated e2e assertions, and the partially implemented offline Playwright proof file, but the task’s browser verification bar is not yet met because the calendar route still 500s before the proof can run.

## Verification

I reran the required type-check gate after the helper extraction and lazy-import changes, and it passed (`pnpm --dir apps/web check`). I then reran the online Playwright regression against a fresh web server (`CI=1 pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`). That browser gate still fails before the calendar shell appears because `/calendars/[calendarId]` returns 500. The failing server log is explicit: `src/lib/server/schedule.ts` now imports `RRule` as a named export, but the installed `rrule` package is CommonJS in the SSR path, so Vite reports `Named export 'RRule' not found`. Earlier in a live browser repro, the opposite import form (`default`) failed on the browser path for `src/lib/schedule/recurrence.ts`. In short: the calendar route currently needs a single SSR/browser-safe `rrule` interop strategy before the online regression and the new offline continuity proof can pass.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web check` | 0 | ✅ pass | 2674ms |
| 2 | `CI=1 pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` | 1 | ❌ fail | 12100ms |

## Deviations

I went beyond the planned Playwright-only scope to fix prerequisite runtime blockers: route-helper exports were moved out of `+layout.ts`/`+page.ts`, browser-safe route-contract helpers were introduced, browser-side repository access was made lazy to keep sqlite-wasm out of SSR evaluation, and stale e2e assertions were updated to the current groups-shell copy. I also rewrote `apps/web/tests/e2e/calendar-offline.spec.ts`, but the proof could not be validated because the calendar route still fails before test execution reaches the local-first flow.

## Known Issues

The remaining blocker is the `rrule` import boundary. `apps/web/src/lib/schedule/recurrence.ts` needs a browser-compatible import shape, while `apps/web/src/lib/server/schedule.ts` needs an SSR-compatible import shape, and the current state does not satisfy both. Until that is resolved, `/calendars/[calendarId]` returns 500 in Playwright, `calendar-shifts.spec.ts` fails before `calendar-shell` renders, and `calendar-offline.spec.ts` remains unverified. I also did not reach the slice-level vitest bundle, Supabase reset + offline Playwright run, or the final preview-backed offline proof because the online browser gate never cleared.

## Files Created/Modified

- `apps/web/src/lib/offline/protected-routes.ts`
- `apps/web/src/lib/schedule/route-contract.ts`
- `apps/web/src/routes/(app)/+layout.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/calendar-offline.spec.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
- `apps/web/tests/e2e/auth-groups-access.spec.ts`
- `apps/web/tests/routes/protected-routes.unit.test.ts`
- `apps/web/src/lib/schedule/recurrence.ts`
- `apps/web/src/lib/server/schedule.ts`
