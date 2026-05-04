---
estimated_steps: 5
estimated_files: 5
skills_used: []
---

# T02: Wired best-effort shared-change dispatch into all four mobile schedule mutations (create/edit/move/delete including reconnect-drained replays) via a new calendar-change-dispatch helper, with 17 new unit tests proving payload shape, degraded dispatch safety, and replay-safe semantics.

Extend the mobile trusted schedule transport so phone-originated create/edit/move/delete and reconnect-drained writes participate in the same best-effort shared-change notification contract as web. Keep mobile write authority unchanged: if dispatch is unavailable, the queued mutation still resolves truthfully and reconnect continues to use the canonical local-first flow.

Steps:
1. Widen or adapt the mobile Supabase client seam so the transport can invoke `notify-calendar-change` safely from the existing direct-write path.
2. Hook successful create/edit/move/delete outcomes in `apps/mobile/src/lib/offline/transport.ts` into the shared-change dispatch helper without touching failed-write semantics.
3. Extend mobile notification contract/runtime coverage to pin invoke payloads, degraded dispatch handling, and reconnect-safe behavior.

## Inputs

- ``apps/mobile/src/lib/supabase/client.ts``
- ``apps/mobile/src/lib/offline/transport.ts``
- ``apps/mobile/src/lib/notifications/transport.ts``
- ``apps/mobile/tests/mobile-notification-contract.unit.test.ts``
- ``apps/mobile/tests/mobile-notification-runtime.unit.test.ts``

## Expected Output

- ``apps/mobile/src/lib/supabase/client.ts``
- ``apps/mobile/src/lib/offline/transport.ts``
- ``apps/mobile/src/lib/notifications/calendar-change-dispatch.ts``
- ``apps/mobile/tests/mobile-notification-contract.unit.test.ts``
- ``apps/mobile/tests/mobile-notification-runtime.unit.test.ts``

## Verification

pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts

## Observability Impact

Keep mobile dispatch failures visible as degraded notification state or captured test doubles rather than mutating queue/sync semantics, so reconnect diagnosis still reads from the existing notification and continuity surfaces.
