---
estimated_steps: 5
estimated_files: 8
skills_used:
  - frontend-design
  - debug-like-expert
---

# T04: Move calendar reads and writes to a local-first controller with pending-state UI

**Slice:** S03 — Offline local persistence with cached-session continuity
**Milestone:** M001

## Description

Turn the protected calendar page into a local-first experience. This task directly advances **R004** by hydrating the board from the browser-local repository, queueing offline create/edit/move/delete operations, and preserving local changes across reload while still using the server route/actions as the canonical online path.

Keep the current calm board language from S02. Pending/local-only/offline state should appear as integrated board/status-card feedback, not as noisy debug chrome. Reuse the shared recurrence and validation helpers so offline mutations cannot drift from the established schedule rules.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Local repository read/write | Surface a named local persistence failure in the UI and do not pretend the board is up to date. | Keep the board on its last known state and mark the local write as pending/failed instead of dropping it silently. | Reject malformed local rows and keep them out of the rendered board. |
| Offline mutation queue | Preserve the current board snapshot and mark the failed mutation explicitly rather than applying a hidden partial update. | Leave the mutation in a visible retryable state; do not lose user edits. | Reject malformed queue entries and surface the failure in the action strip/state helpers. |
| Online server action reconciliation | Keep the server path canonical when online; if reconciliation fails, retain the local pending state and expose the error instead of claiming sync. | Mark the mutation pending with a retryable/server-unconfirmed state. | Reject malformed action results and keep the board on local data with explicit failure messaging. |

## Load Profile

- **Shared resources**: browser-local repository, mutation queue, board model derivation, and the calendar page hydration controller.
- **Per-operation cost**: one local write plus one board recompute per mutation, optionally followed by a server reconciliation when online.
- **10x breakpoint**: a long pending queue or repeated full-board rebuilds will show up first, so the controller must stay scoped to the visible week and targeted mutation updates.

## Negative Tests

- **Malformed inputs**: invalid shift drafts, malformed queue entries, corrupted local rows, and recurrence inputs that violate the shared schedule rules.
- **Error paths**: repository write failure, queue persistence failure, and online server action returning forbidden/timeout/malformed response.
- **Boundary conditions**: local create/edit/move/delete while fully offline, reload after offline edits, and rehydration of a visible week containing both cached server-confirmed rows and local-only pending rows.

## Steps

1. Add `apps/web/src/lib/offline/mutation-queue.ts` and `apps/web/src/lib/offline/calendar-controller.ts` to manage local-first visible-week hydration plus offline mutation persistence.
2. Update `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` to drive the board from the local-first controller instead of server-only `form` state.
3. Update `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`, `ShiftEditorDialog.svelte`, and `ShiftCard.svelte` so create/edit/move/delete can route through the local-first controller and surface pending/local-only status.
4. Extend `apps/web/src/lib/schedule/board.ts` to summarize local/pending/offline state without regressing the existing online board semantics.
5. Add `apps/web/tests/schedule/offline-queue.unit.test.ts` to prove queue persistence, reload continuity, and explicit failure handling for malformed/local-write error paths.

## Must-Haves

- [ ] Offline create/edit/move/delete operations update the visible board from local state immediately.
- [ ] Local changes survive reload through the repository/queue without depending on the server.
- [ ] The UI clearly distinguishes local-only/pending state from server-confirmed state.
- [ ] Queue/controller tests prove persistence and failure visibility for malformed or failed local writes.

## Verification

- `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/board.unit.test.ts`
- Confirm the board/controller proof covers local mutation persistence, reload continuity, and visible pending/offline state.

## Observability Impact

- Signals added/changed: local queue length, pending mutation status, last local-write failure, and cached-vs-server board source become visible in the calendar UI/state helpers.
- How a future agent inspects this: rerun the offline-queue unit tests and inspect the board action strip / pills for pending, offline, and local-only state.
- Failure state exposed: repository write failures, malformed queued mutations, and offline validation errors no longer masquerade as successful sync.

## Inputs

- `apps/web/src/lib/offline/repository.ts` — local schedule repository from T02.
- `apps/web/src/lib/offline/app-shell-cache.ts` — cached continuity scope from T02.
- `apps/web/src/lib/server/schedule.ts` — canonical online schedule/action contract.
- `apps/web/src/lib/schedule/recurrence.ts` — shared recurrence validation logic.
- `apps/web/src/lib/schedule/board.ts` — current board-shaping helpers.
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte` — current week-board surface.
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` — current create/edit/move dialog surface.
- `apps/web/src/lib/components/calendar/ShiftCard.svelte` — current per-shift action surface.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — current calendar page composition.

## Expected Output

- `apps/web/src/lib/offline/mutation-queue.ts` — persistent offline mutation queue.
- `apps/web/src/lib/offline/calendar-controller.ts` — local-first visible-week controller.
- `apps/web/src/lib/schedule/board.ts` — board helpers updated for pending/local/offline state.
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte` — board UI shows local/pending/offline state.
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` — create/edit/move flows use the local-first controller.
- `apps/web/src/lib/components/calendar/ShiftCard.svelte` — delete and card-level state surface local/pending status.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — calendar page hydrates from the local-first controller.
- `apps/web/tests/schedule/offline-queue.unit.test.ts` — unit proof for queue persistence and failure visibility.
