---
estimated_steps: 28
estimated_files: 6
skills_used:
  - debug-like-expert
---

# T02: Build the trusted mobile Find time route and status model

Implement the actual mobile `/calendars/[calendarId]/find-time` route on top of the trusted shell and direct mobile Supabase transport pattern established in S01/S02. This task should keep the route live-backed while online, explicit when offline, and fail-closed for malformed or out-of-scope calendar ids before any roster/busy query runs.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Trusted mobile shell / route scope | Keep the route in denied state and do not query roster or busy data outside already-permitted scope. | Do not fall back to cached Find time answers when trusted scope resolution is unresolved. | Treat malformed or mismatched trusted scope as denied instead of guessing a calendar. |
| Direct Supabase roster/busy transport | Surface explicit `query-failure` and keep result cards closed. | Surface explicit `timeout` and preserve retryable route state without fake windows. | Surface `malformed-response` and withhold Top-pick/browse cards entirely. |
| Mobile network truth | Keep the route explicit as `offline-unavailable` when the device is offline or continuity is `cached-offline`. | Do not start live roster/busy queries while connectivity is ambiguous. | Ignore malformed network plugin payloads and fall back to the last safe browser signal only for connectivity state, not for result data. |

## Load Profile

- **Shared resources**: Supabase roster and shift reads, shared matcher/ranking helpers, trusted shell snapshot, and mobile route-state shaping.
- **Per-operation cost**: one trusted scope check, one roster lookup, one busy-interval query over the bounded 30-day horizon, and local ranking of the returned windows.
- **10x breakpoint**: live busy-interval volume and slow roster reads will hit timeout or query-error surfaces before the compact UI should attempt to render.

## Negative Tests

- **Malformed inputs**: invalid calendar id, blank/invalid duration, invalid `start`, malformed roster rows, malformed busy rows.
- **Error paths**: offline route entry, out-of-scope calendar id, roster timeout, busy-query failure, malformed ranking contract after transport returns.
- **Boundary conditions**: zero windows, only browse windows, multiple Top picks, and continuity `cached-offline` route entry after a calendar already reopened offline.

## Steps

1. Add mobile-local view/transport helpers that resolve trusted calendar scope from the shaped shell, read current network truth, fetch live roster plus busy intervals through Supabase only when online, and compose the shared matcher/ranking contract.
2. Implement `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte` with explicit route states: `ready`, `no-results`, `invalid-input`, `query-failure`, `timeout`, `malformed-response`, `denied`, and `offline-unavailable`.
3. Expose stable `data-testid` / `data-*` diagnostics for route status, reason, route mode, network source, Top-pick count, browse count, and denial phase so Playwright and future agents can attribute failures precisely.
4. Add unit coverage for route-state shaping and fail-closed transport behavior before the calendar board starts linking into the new route.

## Must-Haves

- [ ] The mobile Find time route rejects malformed or out-of-scope calendar ids before any roster or busy query runs.
- [ ] Cached-offline calendar continuity still yields explicit `offline-unavailable` on the Find time route instead of replaying stale answers.
- [ ] The route emits explicit `ready` / `no-results` / `invalid-input` / `query-failure` / `timeout` / `malformed-response` states with deterministic diagnostics.
- [ ] Unit tests prove the route-state contract from the mobile side.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts tests/mobile-find-time.unit.test.ts`
- `pnpm --dir apps/mobile check`

## Inputs

- `packages/caluno-core/src/find-time/matcher.ts` — shared window-building contract extracted in T01.
- `packages/caluno-core/src/find-time/ranking.ts` — shared ranking and explanation contract extracted in T01.
- `packages/caluno-core/src/schedule/create-prefill.ts` — shared handoff contract used for CTA metadata.
- `apps/mobile/src/lib/shell/load-app-shell.ts` — trusted mobile shell and calendar scope resolver from S01.
- `apps/mobile/src/lib/offline/network.ts` — existing mobile connectivity truth source from S02.
- `apps/mobile/src/lib/offline/transport.ts` — existing direct mobile Supabase transport pattern to mirror.
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — existing calendar route whose route mode and trusted scope must stay consistent.
- `apps/mobile/tests/e2e/fixtures.ts` — existing mobile harness patterns and seeded scope assumptions.

## Expected Output

- `apps/mobile/src/lib/find-time/transport.ts` — mobile-local trusted roster/busy transport with explicit failure semantics.
- `apps/mobile/src/lib/find-time/view.ts` — typed route-state shaping and compact result partitioning for mobile.
- `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte` — real mobile Find time route with fail-closed offline/denied states.
- `apps/mobile/src/lib/offline/network.ts` — connectivity helper extended only as needed for the new route-state proof.
- `apps/mobile/src/lib/shell/load-app-shell.ts` — trusted scope helpers reused or extended for Find time route entry.
- `apps/mobile/tests/mobile-find-time.unit.test.ts` — unit proof for mobile route-state shaping, failures, and Top-pick/browse partitioning.

## Verification

pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts tests/mobile-find-time.unit.test.ts && pnpm --dir apps/mobile check
