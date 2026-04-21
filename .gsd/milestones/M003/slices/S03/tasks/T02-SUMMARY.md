---
id: T02
parent: S03
milestone: M003
key_files:
  - apps/mobile/src/lib/find-time/transport.ts
  - apps/mobile/src/lib/find-time/view.ts
  - apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte
  - apps/mobile/src/lib/supabase/client.ts
  - apps/mobile/tests/mobile-find-time.unit.test.ts
  - .gsd/KNOWLEDGE.md
key_decisions:
  - D060: Keep mobile find-time split into a pure transport helper plus a pure route-state shaper, and always map cached-offline continuity to offline-unavailable instead of rendering cached find-time answers.
duration: 
verification_result: mixed
completed_at: 2026-04-21T14:33:01.561Z
blocker_discovered: false
---

# T02: Added the mobile find-time route, trusted Supabase transport, and fail-closed mobile state coverage for denied/offline/error paths.

**Added the mobile find-time route, trusted Supabase transport, and fail-closed mobile state coverage for denied/offline/error paths.**

## What Happened

I mapped the existing mobile shell, continuity, and direct Supabase transport patterns, then mirrored the web find-time authority contract into a mobile-local implementation instead of inventing a second behavior model. I added `apps/mobile/src/lib/find-time/transport.ts` to enforce fail-closed calendar scope checks, strict duration/start validation, timeout/query-failure separation, malformed roster/busy rejection, and deterministic Top-pick versus browse partitioning on the mobile client. I added `apps/mobile/src/lib/find-time/view.ts` as a pure route-state shaper so cached-offline continuity always resolves to `offline-unavailable`, denied scope stays explicit with a phase/reason, and ready/no-results/error states carry stable counts and diagnostics without relying on Svelte rendering. I then built `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte` on top of the existing mobile shell contract, exposing stable `data-testid` and `data-*` attributes for route status, reason, route mode, network source, Top-pick count, browse count, denial phase, and handoff-ready card metadata. Finally, I added `apps/mobile/tests/mobile-find-time.unit.test.ts` to prove fail-closed mobile route-state shaping and transport behavior across cached-offline continuity, denied route scope, invalid input, timeout, query-failure, malformed-response, no-results, browse-only, and ready partitioning cases.

## Verification

Planned task verification passed on the final code state. `pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts tests/mobile-find-time.unit.test.ts` passed with the new transport/view contract suite plus the shared T01 contract coverage. `pnpm --dir apps/mobile check` initially failed on one Supabase RPC type cast, one invalid Svelte fragment, and one over-specified mocked route state in the new unit file; after fixing those concrete issues, rerunning `pnpm --dir apps/mobile check` passed with zero errors or warnings. I also did a lightweight live browser smoke attempt by starting `apps/mobile` locally and opening `/signin`, but truthful route proof was blocked by missing `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the mobile dev environment, so I recorded that as an environment issue rather than a code failure.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts tests/mobile-find-time.unit.test.ts` | 0 | ✅ pass | 7900ms |
| 2 | `pnpm --dir apps/mobile check` | 1 | ❌ fail | 4400ms |
| 3 | `pnpm --dir apps/mobile check` | 0 | ✅ pass | 5400ms |
| 4 | `pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts tests/mobile-find-time.unit.test.ts` | 0 | ✅ pass | 4600ms |

## Deviations

Included forward-compatible create-handoff CTA metadata (`data-handoff-*` plus exact slot href generation) on the new route cards during T02 so downstream T03 can wire the existing mobile create sheet without revisiting the transport or result-card state contract.

## Known Issues

Local browser smoke verification against `pnpm --dir apps/mobile dev` is currently blocked by missing `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY`, which causes `/signin` to render the configuration-blocked shell instead of the real auth surface. The unit and `check` verification for this task still passed.

## Files Created/Modified

- `apps/mobile/src/lib/find-time/transport.ts`
- `apps/mobile/src/lib/find-time/view.ts`
- `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte`
- `apps/mobile/src/lib/supabase/client.ts`
- `apps/mobile/tests/mobile-find-time.unit.test.ts`
- `.gsd/KNOWLEDGE.md`
