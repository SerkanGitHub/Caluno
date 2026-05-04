# S05 Research — Cross-surface notification correctness and final mobile assembly proof

## Summary
S05 is **targeted research**. The hard substrate from S02-S04 already exists: mobile continuity, compact Find time handoff, per-calendar notification truth, deterministic local reminder ids, and fail-closed notification routing are all in place. The main missing piece is **actual shared-change dispatch wiring** plus **proof that the fully assembled mobile loop hangs together**.

The clearest code-level gap: `supabase/functions/notify-calendar-change/index.ts` exists, but there are **no callers** in either trusted write path:
- `apps/web/src/lib/server/schedule.ts` — canonical web create/edit/move/delete helpers
- `apps/mobile/src/lib/offline/transport.ts` — canonical mobile direct/offline write helpers and reconnect drain path

Current tests prove toggle truthfulness, degraded states, local reminder dedupe-on-resume, and safe tap routing, but they do **not** yet prove that a real schedule change causes a delivered shared-change notification, that disabled calendars stay quiet under actual delivery flow, or that the main/core mobile loop is proven in one assembled tracer-bullet.

## Requirement Focus
- **Primary:** R023 — close the remaining proof bar for quiet disabled calendars, duplicate suppression, and correct notification landing.
- **Also validates:** R009 — milestone-level “the mobile app doesn’t feel fake” proof through one assembled mobile flow.
- **Do not reopen:** R002, R010, R022. Their contracts are already validated; S05 should reuse their proof surfaces, not redesign them.

## Recommendation
Build S05 in this order:

1. **Add one best-effort calendar-change notifier seam** that both trusted mutation paths can call after successful writes.
2. **Wire that notifier into both web and mobile mutation flows** so shared-change delivery is not web-only.
3. **Extend the Playwright notification harness** so tests can stub/capture shared-change dispatch and inspect delivered/pending notification state, not just toggle UI state.
4. **Add one final assembly spec** that walks the real mobile core loop across groups → calendar → offline continuity/find-time handoff → notification landing.
5. **Update default verification commands/scripts** so notification proof is part of the normal mobile E2E bar, not an extra forgotten file.

Important constraint: notification dispatch should be **best-effort**. Canonical schedule writes must stay authoritative even if delivery is degraded or unconfigured.

## Implementation Landscape

### 1) Existing notification substrate is already strong

**Mobile runtime and local reminder dedupe**
- `apps/mobile/src/lib/notifications/runtime.ts`
  - Loads trusted per-device preferences.
  - Reconciles local permission state, pending notifications, push registration, and trusted week snapshots.
  - Resyncs on network reconnect and app resume.
- `apps/mobile/src/lib/notifications/scheduler.ts`
  - `createDeterministicReminderId()` fingerprints `installationId + calendarId + shiftId + triggerAt`.
  - `diffReminderSchedule()` cancels stale ids and only schedules missing ids.
- `apps/mobile/tests/mobile-notification-runtime.unit.test.ts`
  - Already proves: **resume does not duplicate scheduled reminders**.

**Safe notification landing already exists**
- `apps/mobile/src/routes/+layout.svelte`
  - Subscribes to both local and push notification actions and routes them centrally.
- `apps/mobile/src/lib/notifications/router.ts`
  - Normalizes internal paths.
  - Rejects external/unsafe/stale-calendar paths fail-closed.
  - Records explicit diagnostics (`idle`, `navigated`, `path-rejected`, `navigation-timeout`).
- `apps/mobile/tests/mobile-notification-router.unit.test.ts`
  - Covers normalized accepted paths, explicit rejections, timeout diagnostics, and degraded state presentation.

**Cross-surface UI truth is already mirrored**
- `apps/mobile/src/lib/components/notifications/CalendarNotificationToggle.svelte`
  - Shared toggle surface used in both places.
- `apps/mobile/src/routes/groups/+page.svelte`
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
  - Both bootstrap the same notification runtime and expose the same `data-notification-*` surfaces.

### 2) The missing production seam is shared-change dispatch

**Edge function exists, but is not called**
- `supabase/functions/notify-calendar-change/index.ts`
  - Validates auth and calendar access.
  - Loads enabled installation targets for a calendar.
  - Sanitizes `targetPath` to `/groups` or the changed calendar path.
  - Surfaces `provider-unconfigured` vs `delivery-deferred` honestly.

**No current callers**
- `apps/web/src/lib/server/schedule.ts`
  - Contains the trusted web mutation helpers:
    - `createScheduleShift()`
    - `editScheduleShift()`
    - `moveScheduleShift()`
    - `deleteScheduleShift()`
  - No `functions.invoke`, no fetch to the edge function, no dispatch callback.
- `apps/mobile/src/lib/offline/transport.ts`
  - Contains the trusted mobile mutation helpers for create/edit/move/delete and reconnect replay.
  - Also has no dispatch call.

This is the biggest planner-relevant fact: **S04 built the provider-neutral dispatch seam, but S05 still has to connect real mutations to it.**

### 3) Web and mobile mutation paths are separate, so dispatch must be shared deliberately

There are two canonical write authorities:
- **Web:** `apps/web/src/lib/server/schedule.ts`
- **Mobile:** `apps/mobile/src/lib/offline/transport.ts`

If S05 only wires dispatch into web server actions, then:
- web-originated shared changes can notify,
- but mobile-originated trusted writes / reconnect drain cannot.

For R023 closure, planner should assume the notifier must be reusable from **both** paths.

### 4) Current client typing blocks the obvious mobile invoke path

- `apps/mobile/src/lib/supabase/client.ts`
  - `MobileSupabaseDataClient` is currently `Pick<SupabaseClient, 'from' | 'rpc'>` (+ auth wrapper).
  - If S05 uses `supabase.functions.invoke('notify-calendar-change', ...)`, this type must widen and the test doubles/harness must follow.

That makes the first design choice explicit:
- either widen client typing to include `functions`, or
- introduce a separate dispatch adapter/callback instead of calling `functions.invoke` directly from mutation helpers.

For planner purposes, this is a **real seam**, not incidental cleanup.

### 5) Existing tests are close, but they stop short of delivery proof

**Already present**
- `apps/mobile/tests/e2e/calendar-notifications.spec.ts`
  - Proves:
    - exactly one toggle per permitted calendar,
    - enabled state persists across reload,
    - permission-denied state stays explicit,
    - provider-unconfigured state stays explicit,
    - unsafe targets are rejected and safe taps land correctly.
- `apps/mobile/tests/e2e/calendar-offline.spec.ts`
  - Proves continuity/offline/reconnect.
- `apps/mobile/tests/e2e/find-time-handoff.spec.ts`
  - Proves compact find-time → create handoff.
- `apps/mobile/tests/e2e/auth-scope.spec.ts`
  - Proves sign-in/scope/denied states.

**What is still missing**
- A schedule mutation causing a **shared-change notification dispatch**.
- Proof that **enabled calendar gets delivery** while **disabled calendar stays quiet** under actual delivery flow.
- Proof that delivery is **not duplicated** in the end-to-end harness.
- One **assembled-phone** tracer bullet proving the main/core experience across existing slice surfaces.

### 6) The Playwright harness needs one more layer

`apps/mobile/tests/e2e/fixtures.ts` already provides:
- stable installation id seeding,
- frozen time,
- local/push permission simulation,
- manual local/push action triggers,
- pending local notification count,
- RPC stubbing.

What it does **not** currently provide:
- a helper to inspect pending notification ids/payloads per calendar,
- a helper to stub/capture **edge function** calls (`functions/v1/notify-calendar-change`),
- an inbox/log of “delivered” shared-change push events,
- a convenience helper to assert no extra delivery happened.

That makes the harness extension a natural, mostly independent task.

### 7) Default mobile E2E script is behind the actual proof bar

`apps/mobile/package.json`:
- `test:e2e` runs only:
  - `auth-scope.spec.ts`
  - `calendar-offline.spec.ts`
  - `find-time-handoff.spec.ts`
- It **does not include** `calendar-notifications.spec.ts`.

If S05 adds a final assembly or delivery spec, the script should be updated or a clearly-named full-suite script should be added. Otherwise the slice can “pass locally” while the default package script still skips the new proof.

## Natural Seams For Planning

### Seam A — shared calendar-change notifier adapter
Best extraction point for reuse.

Candidate responsibility:
- accept `calendarId`, `changeType`, `targetPath`, optional `shiftId`, headline/body,
- invoke `notify-calendar-change`,
- return a typed best-effort result,
- never widen target paths or trusted scope.

Why first:
- both web and mobile mutation paths need the same behavior,
- unit tests can pin semantics before touching route/UI proof.

### Seam B — web mutation integration
Primary files:
- `apps/web/src/lib/server/schedule.ts`
- `apps/web/tests/schedule/server-actions.unit.test.ts`

Planner note:
- the existing server-action unit test file is the easiest place to prove “dispatch fires on successful writes, not on failed writes, and does not roll back canonical mutations.”

### Seam C — mobile mutation / reconnect integration
Primary files:
- `apps/mobile/src/lib/offline/transport.ts`
- likely mobile transport/runtime tests in existing mobile notification/offline test suites

Planner note:
- this is the only way to cover mobile-originated shared changes and reconnect-drained writes.

### Seam D — Playwright harness + delivery proof
Primary files:
- `apps/mobile/tests/e2e/fixtures.ts`
- `apps/mobile/tests/e2e/calendar-notifications.spec.ts`
- likely one new S05 assembly/delivery spec

Planner note:
- keep using existing `data-*` diagnostics rather than text-only assertions. This matches the project’s observability-first habit and avoids brittle UI-copy coupling.

### Seam E — final assembly proof
Primary files to reuse, not redesign:
- `apps/mobile/tests/e2e/auth-scope.spec.ts`
- `apps/mobile/tests/e2e/calendar-offline.spec.ts`
- `apps/mobile/tests/e2e/find-time-handoff.spec.ts`
- `apps/mobile/tests/e2e/calendar-notifications.spec.ts`

Planner note:
- S05 should add **one integrated tracer bullet**, not replace the focused specs.

## Risks / Constraints

- **Do not rollback writes on notification failure.** Shared-change delivery is secondary to canonical schedule truth.
- **Do not bypass existing path safety.** All delivery landing should continue through `routeNotificationOpen()` and `resolveNotificationOpenTarget()`.
- **Do not invent a second notification truth model.** Reuse existing `data-notification-*`, route diagnostics, queue diagnostics, and create-arrival diagnostics.
- **Be precise about “duplicate suppression.”** Local reminder dedupe already exists and is tested. Shared-change duplicate suppression is still unproven in the current harness; planner should decide whether proof needs delivery-log assertions only or additional dispatch fingerprinting.
- **Docker/local Supabase remains required** for the Playwright proof path (`supabase db reset --local --yes`).
- **No existing Edge Function test harness** is present under `supabase/functions/`; planner should prefer unit tests around notifier callers plus mobile Playwright delivery proof over inventing a large Deno test stack unless necessary.

## Verification Plan

Minimum fresh bar for S05 should likely be:

- `pnpm --dir apps/web exec vitest run tests/schedule/server-actions.unit.test.ts`
- `pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-router.unit.test.ts tests/mobile-notification-runtime.unit.test.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/find-time-handoff.spec.ts tests/e2e/calendar-notifications.spec.ts tests/e2e/<new-s05-spec>.spec.ts`
- `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`

What the new Playwright proof should explicitly assert:
- one enabled calendar receives the expected notification effect,
- one disabled calendar stays quiet,
- repeat/resume/reload does not create duplicate local reminder inventory,
- notification tap lands in the correct protected mobile context,
- assembled flow crosses existing core surfaces without falling back to placeholder behavior.

## Skill Discovery / Relevant Skills

Already installed skills that are directly relevant:
- `observability` — use its bias toward explicit diagnostics; extend existing `data-*` surfaces rather than infer hidden state.
- `verify-before-complete` — especially relevant for S05 because milestone claims depend on fresh delivery and assembly proof, not prior-slice confidence.
- `agent-browser` — useful if a future execution task needs browser-driven inspection beyond Playwright file edits.

Promising external skill suggestions (not installed):
- **Capacitor**
  - `npx skills add cap-go/capacitor-skills@capacitor-best-practices`
  - `npx skills add capawesome-team/skills@capacitor-plugins`
- **Supabase**
  - `npx skills add supabase/agent-skills@supabase`
  - `npx skills add supabase/agent-skills@supabase-postgres-best-practices`
- **Playwright**
  - `npx skills add currents-dev/playwright-best-practices-skill@playwright-best-practices`

These are optional; none are required to plan S05, but all three match the actual technologies in play.

## Planner Takeaway

Treat S05 as **wiring + proof**, not substrate invention.

The planner should assume four concrete tasks are enough:
1. extract/add a reusable best-effort shared-change notifier,
2. wire it into both web and mobile trusted mutation paths,
3. extend the Playwright harness to observe delivery and duplicate state,
4. add final delivery + assembled-mobile proof and fold it into default verification.
