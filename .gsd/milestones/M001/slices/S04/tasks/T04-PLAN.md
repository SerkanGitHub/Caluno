---
estimated_steps: 4
estimated_files: 5
skills_used:
  - debug-like-expert
---

# T04: Prove reconnect reconciliation and multi-user live propagation in Playwright

## Description

Turn the sync design into durable browser proof. This task retires the known S03 browser-proof fragility while adding explicit reconnect and multi-user live-update evidence for **R005**.

Load the installed `debug-like-expert` skill before changing browser proof so flow diagnostics, phase markers, and failure artifacts stay ahead of flake rather than being added after a red run.

## Steps

1. Extend `apps/web/tests/e2e/fixtures.ts` with a second seeded collaborator (use `dana@example.com` or `alice@example.com` from `supabase/seed.sql`), multi-page helpers, and richer sync/realtime diagnostics such as sync phase, channel state, queue summary, and last failure.
2. Expand `apps/web/tests/e2e/calendar-offline.spec.ts` to prove offline create/edit/move/delete drain after reconnect without losing route scope or local board continuity.
3. Add `apps/web/tests/e2e/calendar-sync.spec.ts` to prove one signed-in member sees another member's online shift change propagate live while both remain within the shared calendar scope.
4. Keep `apps/web/tests/e2e/calendar-shifts.spec.ts` green as the online scheduling regression surface and use the preview-backed Playwright config plus local Supabase reset as the slice-closing contract.

## Must-Haves

- [ ] Browser proof covers reconnect queue drain and multi-user live propagation.
- [ ] Flow diagnostics retain enough sync/realtime context to localize flake or trust-boundary failures.
- [ ] Existing online scheduling proof remains green after sync and realtime wiring.

## Inputs

- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/calendar-offline.spec.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
- `apps/web/playwright.offline.config.ts`
- `supabase/seed.sql`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`

## Expected Output

- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/calendar-offline.spec.ts`
- `apps/web/tests/e2e/calendar-sync.spec.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
- `apps/web/playwright.offline.config.ts`

## Verification

`npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts && pnpm --dir apps/web build && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts`

## Observability Impact

- Expand retained Playwright flow diagnostics to include sync phase, channel status, queue summary, visible-week source, and last remote/local failure.
- Keep the browser proof able to show whether a failure came from auth scope, reconnect drain, realtime delivery, or refresh/replay logic.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Playwright preview-backed runtime and service worker | Stop the proof and capture diagnostics rather than claiming reconnect behavior on an untrusted runtime. | Retry only after the preview/runtime surface is healthy again. | Treat the runtime surface as invalid and fail the spec with explicit diagnostics. |
| Multi-user auth/session setup | Fail the affected scenario with preserved flow context; do not continue with guessed collaborator state. | Abort the scenario and attach sync diagnostics before rerun. | Reject the collaborator context and keep the failure localized to the auth setup step. |

## Load Profile

- **Shared resources**: preview server, local Supabase stack, two Playwright pages/contexts, and retained flow-diagnostics attachments.
- **Per-operation cost**: one local stack reset plus serial multi-step browser scenarios with reload, offline toggles, and cross-page waits.
- **10x breakpoint**: slower CI or local machines will expose wait/settling assumptions first, so the specs should prefer explicit sync-state assertions over arbitrary timeouts.

## Negative Tests

- **Malformed inputs**: unsynced calendar ids, expired cached scope, and mismatched collaborator/session context.
- **Error paths**: reconnect that leaves entries retryable, realtime channel not delivering updates, preview runtime missing service-worker/isolation prerequisites, and trusted refresh failing after a remote signal.
- **Boundary conditions**: offline reload before reconnect, reconnect with four pending mutations, two online members on the same visible week, and one member navigating away while another member writes.
