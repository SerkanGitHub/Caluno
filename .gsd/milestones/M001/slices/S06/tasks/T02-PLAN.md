---
estimated_steps: 30
estimated_files: 4
skills_used:
  - debug-like-expert
---

# T02: Harden realtime collaborator proof around stable board and refresh signals

Use the installed `debug-like-expert` skill before coding. The clean-db sync rerun suggests the shared create itself lands, but the browser spec still over-asserts on transient action-strip timing. Replace timing-sensitive success checks with stronger board/queue/realtime assertions, keep next-week scope-guard proof intact, and only investigate runtime code if the collaborator page still fails to refresh after the stronger evidence surfaces are in place.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Multi-session Playwright collaborator setup | Fail with retained diagnostics for both sessions rather than collapsing back to a single-page proof. | Stop on channel/refresh readiness failure and capture both pages' realtime state instead of sleeping longer. | Treat unexpected page state as proof-invalid and preserve the flow attachment. |
| Realtime change-detection + trusted refresh path | Prove the primary create from board/queue state first, then localize any failure to channel readiness vs remote refresh application. | Abort when `data-remote-refresh-state` never leaves `idle` and capture the last signal/channel metadata. | Inspect `sync-engine.ts` / `+page.svelte` rather than trusting a transient action-strip label. |

## Load Profile

- **Shared resources**: local Supabase reset, preview runtime, two browser sessions, realtime channel, trusted route invalidation.
- **Per-operation cost**: one isolated sync spec run with a seeded baseline, a shared create, and one collaborator refresh path.
- **10x breakpoint**: realtime readiness and trusted refresh settle before action-strip rendering, so assertions must prefer those calmer signals.

## Negative Tests

- **Malformed inputs**: collaborator on the wrong week, missing conflict card id, or malformed realtime payloads.
- **Error paths**: channel never reaches `ready`, remote refresh stays `idle`/`failed`, or created overlap appears only after manual reload.
- **Boundary conditions**: seeded Thursday baseline remains 1 pair before the create, grows to 3 pairs after the create, and the out-of-scope next-week collaborator remains unchanged.

## Steps

1. Re-run `tests/e2e/calendar-sync.spec.ts` on a clean local reset and confirm whether the first red assertion is still the `SHIFT_CREATED` action-strip timing check.
2. Extend `apps/web/tests/e2e/fixtures.ts` with any missing helpers needed to wait on board conflict counts, queue drain, and `data-remote-refresh-state` instead of transient action-strip text.
3. Update `apps/web/tests/e2e/calendar-sync.spec.ts` so the primary create is proven by visible shift card + conflict count + `0 pending / 0 retryable`, and the collaborator refresh is proven by `remote-refresh-state="applied"` plus the new overlap warnings.
4. If the stronger spec is still red, patch the smallest runtime seam in `apps/web/src/lib/offline/sync-engine.ts` and/or `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` to fix the real refresh application bug, then rerun the isolated sync proof.

## Must-Haves

- [ ] The primary session proves the overlapping create from stable board and queue state without depending on immediate `SHIFT_CREATED` text.
- [ ] The collaborator session proves a realtime-driven trusted refresh by reaching `data-remote-refresh-state="applied"` and showing the new overlap warning without manual reload.
- [ ] The next-week collaborator guard still shows no refresh and no out-of-scope overlap card.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-sync.spec.ts`
- `pnpm --dir apps/web exec vitest run tests/schedule/sync-engine.unit.test.ts tests/schedule/board.unit.test.ts`

## Observability Impact

- Signals added/changed: sync proof now trusts queue counts, conflict summaries, channel state, and remote refresh state before transient action-strip messaging.
- How a future agent inspects this: rerun `calendar-sync.spec.ts` and compare primary vs collaborator flow diagnostics for board conflict counts and realtime state.
- Failure state exposed: whether the red state is assertion drift, channel readiness, remote refresh application, or scope-guard logic becomes explicit.

## Inputs

- `apps/web/tests/e2e/calendar-sync.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/src/lib/offline/sync-engine.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/tests/e2e/calendar-offline.spec.ts`

## Expected Output

- `apps/web/tests/e2e/calendar-sync.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/src/lib/offline/sync-engine.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`

## Verification

npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-sync.spec.ts

## Observability Impact

Keeps collaborator proof centered on queue/conflict/realtime diagnostics so refresh failures can be localized to channel or route invalidation behavior.
