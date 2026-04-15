---
estimated_steps: 4
estimated_files: 3
skills_used:
  - debug-like-expert
---

# T05: Prove offline reopen, local persistence, and online-regression safety in Playwright

**Slice:** S03 — Offline local persistence with cached-session continuity
**Milestone:** M001

## Description

Close the loop on the slice with browser proof. This task proves the real user-facing claim: after a trusted online visit, a user can go offline, reopen the same calendar, continue editing locally, reload again, and still see those local changes.

Preserve the online regression surface from S02 while adding a dedicated offline spec. The retained diagnostics must clearly mark online seed, offline transition, cached reopen, local mutation phases, and offline denied-route checks so future failures are explainable.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Local Supabase reset / seeded proof data | Stop the task, fix fixtures or the seed contract, and do not trust any browser proof built on drifting schedule ids. | Treat the proof run as incomplete and rerun only after the local stack is healthy. | Reject ambiguous fixture state and keep the spec pinned to deterministic seeded ids. |
| Online Playwright regression spec | Fix the route/controller regression before adding offline-only assertions; do not let S03 pass by only proving offline branches. | Treat the browser proof as incomplete and rerun after stabilizing the online flow. | Reject malformed diagnostics and keep phase/context capture explicit. |
| Offline Playwright preview/spec path | Fix the preview/runtime or service-worker warm-up issue instead of downgrading the proof to a weaker dev-server scenario. | Keep the offline proof failing until the real preview-backed flow succeeds. | Reject ambiguous offline results and capture enough diagnostics to see whether the break was cache warm-up, route boot, or local persistence. |

## Load Profile

- **Shared resources**: local Supabase seed data, browser cache/storage state, and Playwright trace/video/diagnostics artifacts.
- **Per-operation cost**: one online proof run plus one preview-backed offline proof run with multiple reload/offline transitions.
- **10x breakpoint**: repeated browser restarts and artifact retention grow runtime/artifact cost first, so the offline spec should stay focused on one seeded calendar and a small number of local mutations.

## Negative Tests

- **Malformed inputs**: invalid/offline calendar URLs, missing cached scope, and stale or empty cached state before warm-up.
- **Error paths**: service-worker cache miss, local edit lost after reload, and offline denied-route regression for unsynced calendar ids.
- **Boundary conditions**: first online warm-up, fully offline reload, repeated offline reload after local edits, and direct offline navigation to the seeded Beta/unsynced calendar id.

## Steps

1. Extend `apps/web/tests/e2e/fixtures.ts` so diagnostics capture online seed, offline transition, cached reopen, queue/local-edit state, and offline denial context.
2. Keep `apps/web/tests/e2e/calendar-shifts.spec.ts` green as the online regression surface after the route becomes local-first.
3. Add `apps/web/tests/e2e/calendar-offline.spec.ts` to prove online warm-up, offline reopen, offline create/edit/move/delete, reload continuity, and offline denial for unsynced calendar ids.
4. Run the full online + offline verification commands from the slice plan and keep the retained artifacts useful for future debugging.

## Must-Haves

- [ ] The existing online browser schedule proof still passes after local-first/offline work lands.
- [ ] The offline browser proof covers cache warm-up, offline reopen, local edits across reload, and offline denial for unsynced calendar ids.
- [ ] Flow diagnostics retain phase/context needed to debug continuity failures.
- [ ] Verification runs against the preview-backed offline config rather than a weaker dev-server shortcut.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts && pnpm --dir apps/web build && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts`
- Confirm retained trace/video/flow-diagnostics artifacts explain the exact phase if offline continuity breaks.

## Observability Impact

- Signals added/changed: Playwright flow diagnostics gain offline/cached/pending-local phases and cached calendar context.
- How a future agent inspects this: rerun the online/offline specs and inspect retained trace, video, and `flow-diagnostics` artifacts for the exact phase where continuity broke.
- Failure state exposed: cache warm-up misses, service-worker regressions, offline denied-route failures, and lost local edits become reproducible browser artifacts.

## Inputs

- `apps/web/tests/e2e/fixtures.ts` — shared browser diagnostics and seeded fixture helpers.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — current online schedule regression proof.
- `apps/web/playwright.offline.config.ts` — preview-backed offline/browser-cache proof config from T01.
- `apps/web/src/service-worker.ts` — offline runtime cache behavior from T01.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — local-first calendar UI from T04.

## Expected Output

- `apps/web/tests/e2e/fixtures.ts` — diagnostics updated for offline continuity phases.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — online regression proof kept current with the local-first route.
- `apps/web/tests/e2e/calendar-offline.spec.ts` — dedicated offline continuity browser proof.
