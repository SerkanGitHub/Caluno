---
estimated_steps: 50
estimated_files: 3
skills_used: []
---

# T02: Add bounded mobile recurrence-suggestion loading and route-level diagnostics

---
estimated_steps: 8
estimated_files: 3
skills_used:
  - test
  - best-practices
---

# T02: Add bounded mobile recurrence-suggestion loading and route-level diagnostics

## Description

The highest-risk gap is data access: the mobile calendar route only loads the visible week today. Add a dedicated trusted-online recurrence-suggestion fetch that mirrors the web query window and fail-closed semantics, then give the route explicit state for suggestion presence/absence/failure so downstream UI work can stay purely presentational.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Mobile Supabase shift-history query | Return `null`, mark the route suggestion state as failed/empty, and do not render guessed predictive UI. | Return `null` with an explicit timeout diagnostic; keep the rest of the week board usable. | Return `null`, record a malformed-response diagnostic, and refuse to infer a recurrence pattern. |

## Load Profile

- **Shared resources**: one extra bounded Supabase read per trusted-online calendar/week activation or explicit refresh.
- **Per-operation cost**: one ordered shift query over a 30-day same-calendar window ending at `visibleWeek.endAt`, plus pure in-memory `detectRecurrencePattern()` evaluation.
- **10x breakpoint**: query count and row volume rise before CPU does; the bounded window and fail-closed null behavior keep the feature from degrading into wide history scans.

## Negative Tests

- **Malformed inputs**: invalid/malformed shift rows or missing arrays yield `null` instead of a partially trusted suggestion.
- **Error paths**: query failures and timeouts keep the week usable while exposing explicit route diagnostics and no suggestion chip.
- **Boundary conditions**: cached-offline or denied routes clear the suggestion state instead of reusing stale online hints.

## Steps

1. Extend `MobileTrustedScheduleTransport` in `apps/mobile/src/lib/offline/transport.ts` with a recurrence-suggestion loader that queries only the active calendar inside the trailing 30-day window ending at `visibleWeekEndAt`.
2. Reuse the same row validation and deterministic `detectRecurrencePattern()` contract as web, returning `null` for timeout/query/malformed cases rather than widening behavior.
3. Add a focused mobile unit/contract file that stubs the transport client and proves successful suggestion loading plus fail-closed null behavior for timeout/error/malformed responses.
4. In `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`, add nullable `recurrenceSuggestion` state plus a compact `recurrenceSuggestionStatus` diagnostic keyed by viewer/calendar/week/routeMode.
5. Clear the suggestion state whenever the route is not trusted-online, the active calendar disappears, or an older async request loses the race.
6. Expose the route diagnostic on `data-testid="calendar-route-state"` so future agents can tell whether the suggestion is absent because there was no pattern or because the loader failed closed.
7. Keep this task limited to data/state plumbing; UI rendering waits for T03.
8. Verify with mobile unit coverage and type-checking before wiring the sheet.

## Must-Haves

- [ ] Mobile recurrence suggestions come only from a same-calendar trailing 30-day query ending at `visibleWeek.endAt`.
- [ ] All loader failures collapse to `null` and explicit diagnostics instead of guessed hints.
- [ ] Route state is ready to pass a nullable suggestion into the board without changing current create/edit UX yet.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/mobile-predictive.unit.test.ts && pnpm --dir apps/mobile check`

## Observability Impact

- Signals added/changed: route-level recurrence suggestion status on `data-testid="calendar-route-state"`.
- How a future agent inspects this: open the mobile calendar route and read the route-state attributes before opening the sheet.
- Failure state exposed: `empty` versus timeout/query/malformed fail-closed states become distinguishable without relying only on missing chip UI.

## Inputs

- `apps/mobile/src/lib/offline/transport.ts` — current trusted mobile week loader and query helpers.
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — route/runtime state owner for the phone calendar surface.
- `apps/web/src/lib/server/schedule.ts` — source-of-truth recurrence-suggestion query semantics to mirror.
- `packages/caluno-core/src/schedule/recurrence.ts` — shared `detectRecurrencePattern()` contract.

## Expected Output

- `apps/mobile/src/lib/offline/transport.ts` — bounded recurrence-suggestion transport method with fail-closed semantics.
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — route-owned suggestion state and diagnostics.
- `apps/mobile/tests/mobile-predictive.unit.test.ts` — unit/contract coverage for success and fail-closed loader behavior.

## Inputs

- `apps/mobile/src/lib/offline/transport.ts`
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/server/schedule.ts`
- `packages/caluno-core/src/schedule/recurrence.ts`

## Expected Output

- `apps/mobile/src/lib/offline/transport.ts`
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
- `apps/mobile/tests/mobile-predictive.unit.test.ts`

## Verification

pnpm --dir apps/mobile exec vitest run tests/mobile-predictive.unit.test.ts && pnpm --dir apps/mobile check

## Observability Impact

Adds explicit route diagnostics for recurrence-suggestion loading so absent, empty, and fail-closed states can be separated during mobile debugging.
