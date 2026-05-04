---
estimated_steps: 40
estimated_files: 6
skills_used: []
---

# T01: Create the device notification control plane and persistence contract

---
estimated_steps: 20
estimated_files: 6
skills_used:
  - best-practices
  - debug-like-expert
---

# T01: Create the device notification control plane and persistence contract

Build the durable substrate behind the single mobile notification toggle before any UI claims the feature exists. The executor should create the stable installation identity and the server-side per-device/per-calendar preference contract first, then expose a typed mobile transport/state layer that can tell the UI the difference between desired toggle state, local reminder readiness, and remote subscription health.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Supabase notification tables / RLS | Fail closed and keep toggle state unreadable rather than inferring preferences outside permitted calendar scope. | Surface a typed persistence failure and leave the calendar in a degraded unsynced state. | Reject malformed preference rows or installation records, clear unsafe local assumptions, and require a fresh trusted read. |
| Stable installation persistence | Generate or recover one installation id per device; if storage fails, keep toggles disabled/degraded instead of fabricating device identity. | Surface installation bootstrap failure explicitly and block writes that would orphan remote subscriptions. | Refuse malformed stored ids and regenerate only through the typed helper, not ad hoc component code. |
| Trusted calendar scope from the shell | Never write preference rows for calendars missing from the permitted inventory. | Keep the control plane read-only until scope is known. | Treat scope mismatch as a hard denial, not a recoverable toggle drift. |

## Load Profile

- **Shared resources**: Supabase device-installation rows, per-calendar preference rows, and mobile trusted-shell inventory.
- **Per-operation cost**: one installation lookup/upsert plus one per-calendar preference read/write round-trip per toggle action.
- **10x breakpoint**: duplicate installation rows or token-rotation churn will create drift before UI rendering cost becomes the problem.

## Negative Tests

- **Malformed inputs**: blank calendar ids, malformed stored installation ids, duplicate preference rows, and incomplete registration payloads.
- **Error paths**: RLS denial for out-of-scope calendars, storage failure during installation bootstrap, and transport timeout while syncing preference state.
- **Boundary conditions**: first launch with no installation id, token rotation on an existing installation, multiple calendars enabled on one device, and one disabled calendar beside an enabled sibling.

## Steps

1. Add a new notification migration that introduces stable device-installation and per-device/per-calendar preference tables, unique constraints, update triggers, and access policies/RPC helpers that respect existing calendar scope instead of inventing a global notification surface.
2. Add an app-local installation helper that persists one app-generated installation id on device and can upsert rotated push-token metadata against the same installation without using the token as the primary key.
3. Build a typed mobile notification transport/state module that reads and writes preference rows, separates desired toggle state from local reminder and remote subscription status, and exposes degraded reasons like `installation-unavailable`, `sync-failed`, or `provider-unconfigured`.
4. Add unit proof that installation ids survive reload, token rotation updates the same installation record, out-of-scope calendars are rejected, and malformed rows fail closed.

## Must-Haves

- [ ] A stable installation id exists outside the push token and becomes the durable key for all device notification state.
- [ ] Per-calendar preference rows are keyed by installation id plus calendar id, not by user-global settings.
- [ ] Combined status distinguishes toggle intent, permission state, local reminder readiness, remote subscription readiness, and degraded reason codes.
- [ ] Unit tests prove fail-closed behavior for malformed storage, scope mismatch, and token rotation.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts`
- `npx --yes supabase db reset --local --yes`

## Observability Impact

- Signals added/changed: installation bootstrap status, preference sync phase, remote subscription degraded reason.
- How a future agent inspects this: query the new notification tables after local reset and inspect the state helper / unit suite outputs.
- Failure state exposed: installation and persistence failures become typed states instead of a silent false toggle.

## Inputs

- ``apps/mobile/src/lib/shell/load-app-shell.ts` — trusted permitted calendar inventory and existing route-scoped access contract.`
- ``apps/mobile/src/routes/groups/+page.svelte` — existing permitted-calendar list that will eventually consume the new state.`
- ``supabase/migrations/20260414_000001_auth_groups_access.sql` — existing group/calendar access helpers and RLS boundary to preserve.`
- ``supabase/migrations/20260416_000001_schedule_realtime.sql` — current shared-change publication seam that remote subscriptions will build on.`

## Expected Output

- ``supabase/migrations/20260422_000001_device_notifications.sql` — notification device-installation and per-calendar preference schema with access controls.`
- ``apps/mobile/src/lib/notifications/types.ts` — typed combined notification state and reason-code model.`
- ``apps/mobile/src/lib/notifications/device-installation.ts` — stable installation id persistence and token-rotation helper.`
- ``apps/mobile/src/lib/notifications/transport.ts` — trusted mobile transport for reading/writing device notification preference state.`
- ``apps/mobile/src/lib/notifications/state.ts` — combined status shaper that keeps local and remote readiness distinct.`
- ``apps/mobile/tests/mobile-notification-contract.unit.test.ts` — contract proof for installation persistence, fail-closed scope, and malformed rows.`

## Verification

pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts && npx --yes supabase db reset --local --yes

## Observability Impact

Installation bootstrap, persistence sync, and remote subscription degradation all cross storage/DB boundaries and must emit typed reason codes that later UI surfaces can expose directly.
