---
estimated_steps: 5
estimated_files: 3
skills_used: []
---

# T01: Added best-effort shared-change dispatch to all four trusted web schedule mutations via a new calendar-change-notifier helper, with 12 new unit tests proving success-path dispatch, skip-on-failure, and degraded-dispatch semantics.

Add a reusable post-write notifier seam for the trusted web schedule helpers and call it only after canonical create/edit/move/delete success is already known. Keep the edge-function invoke best-effort and scope-safe: sanitize the target calendar path, send only minimal shift/calendar metadata, and leave schedule results authoritative even when dispatch times out or degrades.

Steps:
1. Extract a small helper around the existing web schedule write layer to invoke `notify-calendar-change` with the active member context.
2. Call the helper from successful web create/edit/move/delete paths, including recurring create output, while skipping failed writes.
3. Extend server-action unit coverage to prove dispatch fires on success, is skipped on failed writes, and does not rewrite canonical write success when the dispatch seam errors.

## Inputs

- ``apps/web/src/lib/server/schedule.ts``
- ``supabase/functions/notify-calendar-change/index.ts``
- ``apps/web/tests/schedule/server-actions.unit.test.ts``

## Expected Output

- ``apps/web/src/lib/server/calendar-change-notifier.ts``
- ``apps/web/src/lib/server/schedule.ts``
- ``apps/web/tests/schedule/server-actions.unit.test.ts``

## Verification

pnpm --dir apps/web exec vitest run tests/schedule/server-actions.unit.test.ts

## Observability Impact

Preserve explicit dispatch outcome handling in unit proof so a future agent can distinguish canonical write success from notification delivery degradation without guessing from the schedule action state alone.
