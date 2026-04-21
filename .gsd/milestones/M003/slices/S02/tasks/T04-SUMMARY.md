---
id: T04
parent: S02
milestone: M003
key_files:
  - apps/mobile/src/routes/calendars/[calendarId]/+page.svelte
  - apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte
  - apps/mobile/src/lib/components/calendar/ShiftCard.svelte
  - apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte
  - apps/mobile/src/lib/components/calendar/SyncStatusStrip.svelte
  - apps/mobile/src/app.css
  - apps/mobile/tests/mobile-sync-runtime.unit.test.ts
  - .gsd/KNOWLEDGE.md
key_decisions:
  - D057 — Build the mobile calendar board on the client-side mobile offline runtime plus direct trusted Supabase transport instead of server-form actions.
duration: 
verification_result: passed
completed_at: 2026-04-21T11:09:30.693Z
blocker_discovered: false
---

# T04: Replaced the mobile calendar placeholder with a phone-first local-first week board, shift editor sheets, and explicit sync diagnostics.

**Replaced the mobile calendar placeholder with a phone-first local-first week board, shift editor sheets, and explicit sync diagnostics.**

## What Happened

Rewrote `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` so the mobile calendar route now boots a real client-side offline runtime instead of rendering the earlier route-integrity placeholder. The route resolves the trusted or cached calendar scope, shapes the visible week with `buildCalendarWeekBoard()`, persists trusted week continuity for reopened mobile weeks, and exposes stable `data-*` diagnostics for route mode, board source, queue state, sync phase, snapshot origin, and retryable failures. Added new phone-first UI components under `apps/mobile/src/lib/components/calendar/`: `MobileCalendarBoard.svelte` for the compact weekly surface, `ShiftCard.svelte` for dense shift cards with pending/retryable/conflict treatment, `ShiftEditorSheet.svelte` for create/edit/move/delete flows sized for mobile, and `SyncStatusStrip.svelte` for explicit queue/reconnect state with refresh and retry controls. Updated `apps/mobile/src/app.css` with shared warning/danger palette tokens used by the new surface. Extended `apps/mobile/tests/mobile-sync-runtime.unit.test.ts` with a negative-path controller test that proves malformed drafts fail closed and leave the queued week state untouched. During browser proof, static preview surfaced a preview/env-specific failure path, so I validated the live route through the Vite dev server instead and confirmed the denied-state diagnostics render truthfully; fully authenticated board proof is still blocked locally by missing `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_PUBLISHABLE_KEY`, which is an environment issue rather than a build or type-check failure in the shipped code.

## Verification

Ran the task verification bar from the plan and all three required commands passed: `pnpm --dir apps/mobile exec vitest run tests/mobile-sync-runtime.unit.test.ts tests/mobile-continuity.unit.test.ts`, `pnpm --dir apps/mobile check`, and `pnpm --dir apps/mobile build`. Also exercised the real mobile route in the browser via a local `apps/mobile` dev server and confirmed the new calendar route shell and denied-state diagnostics render with the expected `data-testid="calendar-route-state"` surface and explicit denial reason. Full authenticated board interaction could not be proven locally because the dev environment is missing `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY`; the route failed closed with visible configuration diagnostics instead of rendering guessed protected state.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile exec vitest run tests/mobile-sync-runtime.unit.test.ts tests/mobile-continuity.unit.test.ts` | 0 | ✅ pass | 1825ms |
| 2 | `pnpm --dir apps/mobile check` | 0 | ✅ pass | 3468ms |
| 3 | `pnpm --dir apps/mobile build` | 0 | ✅ pass | 3684ms |

## Deviations

Used client-side sheet submissions wired directly into the mobile offline runtime and trusted mobile transport instead of server-form actions, because the mobile calendar route is a browser/Capacitor local-first surface and needs on-device queue control plus reconnect drain semantics.

## Known Issues

Local browser proof cannot complete an authenticated calendar session until `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` are present for `apps/mobile`; unauthenticated/denied proof still renders correctly and all planned command-line verification passed.

## Files Created/Modified

- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
- `apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte`
- `apps/mobile/src/lib/components/calendar/ShiftCard.svelte`
- `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte`
- `apps/mobile/src/lib/components/calendar/SyncStatusStrip.svelte`
- `apps/mobile/src/app.css`
- `apps/mobile/tests/mobile-sync-runtime.unit.test.ts`
- `.gsd/KNOWLEDGE.md`
