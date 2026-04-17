---
id: T04
parent: S06
milestone: M001
key_files:
  - apps/web/src/lib/offline/sync-engine.ts
  - apps/web/tests/schedule/sync-engine.unit.test.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/src/lib/supabase/client.ts
  - apps/web/src/routes/(app)/+layout.ts
key_decisions:
  - Surface realtime startup failures as explicit retry diagnostics instead of silently hanging in `subscribing` when channel creation/auth application fails.
  - Hydrate the browser Supabase client from the already trusted server session in the protected layout so realtime auth uses the same verified session boundary as SSR routes.
duration: 
verification_result: mixed
completed_at: 2026-04-16T18:29:26.515Z
blocker_discovered: true
---

# T04: Traced the failing preview realtime proof to missing browser-session hydration, patched the route/session wiring, and left milestone artifact updates blocked on final Playwright confirmation.

**Traced the failing preview realtime proof to missing browser-session hydration, patched the route/session wiring, and left milestone artifact updates blocked on final Playwright confirmation.**

## What Happened

I started from the failing `calendar-sync` preview proof and reproduced the exact failure: both the primary and collaborator routes stayed at `data-channel-state="subscribing"` and never reached the expected realtime-ready state. I first verified that the subscription/auth ordering logic in `sync-engine.ts` was already covered by unit tests, then reproduced the browser behavior outside the Playwright harness with a minimal preview-backed Chromium script. That browser repro exposed a hidden Svelte runtime error (`effect_update_depth_exceeded`) on the calendar route, so I focused on the route-level realtime effect instead of continuing to guess at the Playwright assertions. I hardened `sync-engine.ts` to avoid channel creation hangs by caching the last applied realtime token, avoiding duplicate channel recreation on repeated auth-session events, and failing closed into an explicit retry state when channel creation throws. I added unit coverage for duplicate auth-session events during the initial subscribe handshake. I then reworked the calendar route’s realtime state handling in `+page.svelte` so retained diagnostics are cloned as plain data and the initial retained snapshot no longer reads `realtimeDiagnostics` back immediately after writing it, which removed the hidden Svelte update-depth loop in direct browser repros. Once the reactive loop was gone, the browser proof surfaced the next real blocker clearly: realtime moved from a silent `subscribing` hang into `REALTIME_AUTH_APPLY_FAILED`, and a direct browser probe showed the browser had no Supabase auth session stored locally after the server-side sign-in flow. I traced that to the protected layout flow: the app receives a trusted server session from `+layout.server.ts`, but the browser Supabase client was never hydrated with that session, so realtime auth had nothing usable to apply. To address that, I added a `hydrateSupabaseBrowserSession()` helper in `src/lib/supabase/client.ts` and called it from `(app)/+layout.ts` before persisting the offline app-shell snapshot, wrapped fail-closed so trusted SSR data still renders if browser hydration fails. At the timeout boundary I had implemented the session-bridge fix, but I did not complete a fresh green end-to-end rerun of the preview suite after that final change, so I could not safely proceed to the planned S01-S04 assessment generation, requirement updates, or milestone validation rewrite. The remaining recovery path is now precise: rerun the preview-backed browser proof against the new browser-session hydration bridge; if the proof goes green, generate S01-S04 ASSESSMENT artifacts, update R005/R006 (and only R001/R004 if genuinely proven), and then rerun `gsd_validate_milestone`.

## Verification

Verified and gathered evidence in three stages. First, `pnpm --dir apps/web exec vitest run tests/schedule/sync-engine.unit.test.ts` passed after adding coverage for duplicate auth-session events during the initial subscribe handshake. Second, repeated `pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-sync.spec.ts` runs continued to fail before the final browser-session hydration bridge, consistently showing the realtime diagnostics never reaching `ready`. Third, a direct preview-backed Chromium probe confirmed the hidden Svelte `effect_update_depth_exceeded` loop, then confirmed that the loop was removed and the route now fails explicitly with `REALTIME_AUTH_APPLY_FAILED`, which exposed the real auth/session mismatch. After implementing the final `(app)/+layout.ts` browser-session hydration bridge, I did not finish another clean green Playwright rerun before the hard timeout, so milestone artifacts and requirement-validation artifacts were not regenerated in this pass.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web exec vitest run tests/schedule/sync-engine.unit.test.ts` | 0 | ✅ pass | 399ms |
| 2 | `pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-sync.spec.ts` | 1 | ❌ fail | 31900ms |
| 3 | `cd apps/web && pnpm exec node --input-type=module <<'EOF' ... preview-backed Chromium repro ... EOF` | 0 | ✅ pass | 12000ms |

## Deviations

Instead of moving straight into the planned assessment/requirement/validation artifact updates, I had to spend the task on root-cause debugging because the authoritative preview-backed browser proof was still red. That was necessary to avoid writing milestone validation artifacts that claimed repaired realtime proof without a working browser session bridge.

## Known Issues

The final browser-session hydration bridge in `(app)/+layout.ts` was implemented but not re-verified with a fresh green `calendar-sync` or full slice verification run before timeout. Because of that, `.gsd/milestones/M001/slices/S01` through `S04` still do not have the planned ASSESSMENT artifacts from this task, `.gsd/REQUIREMENTS.md` was not updated for R005/R006 in this pass, and `.gsd/milestones/M001/M001-VALIDATION.md` was not regenerated. Resume by rerunning the preview-backed browser proof first; if it passes, finish the artifact/requirement/validation work immediately afterward.

## Files Created/Modified

- `apps/web/src/lib/offline/sync-engine.ts`
- `apps/web/tests/schedule/sync-engine.unit.test.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/supabase/client.ts`
- `apps/web/src/routes/(app)/+layout.ts`
