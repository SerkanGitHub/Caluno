---
id: T01
parent: S04
milestone: M003
key_files:
  - supabase/migrations/20260422_000001_device_notifications.sql
  - apps/mobile/src/lib/notifications/types.ts
  - apps/mobile/src/lib/notifications/device-installation.ts
  - apps/mobile/src/lib/notifications/transport.ts
  - apps/mobile/src/lib/notifications/state.ts
  - apps/mobile/tests/mobile-notification-contract.unit.test.ts
key_decisions:
  - Use an app-generated stable installation UUID as the durable notification identity instead of treating the push token as a primary key.
  - Persist remote notification intent and subscription health server-side per installation/calendar pair, guarded by calendar-scope RPC helpers and RLS.
  - Keep mobile notification transport/persistence separate from the pure state shaper so UI surfaces can expose honest desired/local/remote truth and degraded reasons.
duration: 
verification_result: passed
completed_at: 2026-05-04T11:07:19.192Z
blocker_discovered: false
---

# T01: Added the mobile device-notification control plane with stable installation persistence, scoped Supabase preference RPCs, and fail-closed contract tests.

**Added the mobile device-notification control plane with stable installation persistence, scoped Supabase preference RPCs, and fail-closed contract tests.**

## What Happened

Implemented the durable notification substrate for mobile before any UI toggle work. Added `supabase/migrations/20260422_000001_device_notifications.sql` to create stable per-device installation records and per-installation/per-calendar notification preference rows, with updated-at triggers, RLS policies, and scoped RPC helpers for installation registration plus preference read/write that preserve existing calendar access boundaries. Added `apps/mobile/src/lib/notifications/device-installation.ts` to persist one app-generated installation id per device, repair malformed stored records only through the typed helper, and keep token rotation bound to the same installation instead of using the push token as identity. Added `apps/mobile/src/lib/notifications/transport.ts` and `state.ts` to split trusted Supabase persistence from pure UI-facing state shaping, so desired toggle intent, local reminder readiness, remote subscription health, sync phase, and degraded reason codes remain distinct. Added `apps/mobile/src/lib/notifications/types.ts` for the shared typed reason/status model, and `apps/mobile/tests/mobile-notification-contract.unit.test.ts` to prove stable installation persistence, malformed-storage repair, out-of-scope rejection, duplicate-row fail-closed behavior, timeout/denial handling, and sibling calendar state separation.

## Verification

Verified the mobile contract and SQL path with fresh local evidence. `pnpm --dir apps/mobile run check` passed with zero Svelte/TypeScript errors. `pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts` passed 7 notification contract tests covering installation survival across reload, token rotation on the same installation, malformed storage repair, storage failure/incomplete registration rejection, scoped transport reads/writes, timeout/denial handling, and combined state shaping. `npx --yes supabase db reset --local --yes` recreated the local database and applied `20260422_000001_device_notifications.sql` successfully.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile run check` | 0 | ✅ pass | 3430ms |
| 2 | `pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts` | 0 | ✅ pass | 1510ms |
| 3 | `npx --yes supabase db reset --local --yes` | 0 | ✅ pass | 25460ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `supabase/migrations/20260422_000001_device_notifications.sql`
- `apps/mobile/src/lib/notifications/types.ts`
- `apps/mobile/src/lib/notifications/device-installation.ts`
- `apps/mobile/src/lib/notifications/transport.ts`
- `apps/mobile/src/lib/notifications/state.ts`
- `apps/mobile/tests/mobile-notification-contract.unit.test.ts`
