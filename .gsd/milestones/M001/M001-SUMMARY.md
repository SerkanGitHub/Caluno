---
id: M001
title: "Shared scheduling substrate"
status: complete
completed_at: 2026-04-17T07:44:45.170Z
key_decisions:
  - D002 — Keep Supabase plus a thin SvelteKit server layer as the backend access pattern for the substrate.
  - D003 — Preserve local-first clients with server-canonical reconciliation after reconnect.
  - D006/D007/D008 — Keep the trusted SSR auth/session and membership-derived access boundary fail-closed for protected calendar routes.
  - D009/D011/D012 — Use concrete `shifts` rows plus server-authoritative calendar route actions for schedule editing.
  - D015/D018/D019/D020 — Reopen only previously synced permitted calendars offline from cached trusted scope plus browser-local snapshots.
  - D022/D023/D024/D025 — Treat sync/reconnect/realtime as replay over trusted state, with route actions as the only write authority and Realtime as change detection only.
  - D026/D027 — Derive visible conflict warnings from the effective visible week and keep them separate from transport diagnostics.
  - D030 — Hydrate the browser Supabase client from trusted layout session data before opening shared realtime channels.
key_files:
  - apps/web/src/hooks.server.ts
  - apps/web/src/routes/(app)/+layout.server.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/src/routes/(app)/+layout.ts
  - apps/web/src/service-worker.ts
  - apps/web/src/lib/offline/repository.ts
  - apps/web/src/lib/offline/sync-engine.ts
  - apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte
  - apps/web/tests/e2e/calendar-offline.spec.ts
  - apps/web/tests/e2e/calendar-sync.spec.ts
  - supabase/migrations/20260414_000001_auth_groups_access.sql
  - supabase/migrations/20260415_000002_schedule_shifts.sql
  - supabase/migrations/20260416_000001_schedule_realtime.sql
  - supabase/seed.sql
lessons_learned:
  - Preview-backed browser proof should derive its baseline from current visible state when earlier specs mutate shared seeded fixtures in the same run.
  - Hydrating the browser Supabase client from trusted layout session data before realtime subscribe prevents misleading auth-apply failures and keeps collaborator refresh proof stable.
  - Keeping overlap warnings purely derived from visible schedule data lets offline, reconnect, and realtime flows share one conflict model without widening write authority.
---

# M001: Shared scheduling substrate

**Validated the complete web-first shared scheduling substrate: trusted access, multi-shift editing, offline continuity, deterministic reconnect sync, live collaborator refresh, and visible conflict warnings now work together in one assembled proof run.**

## What Happened

M001 turned the repository into a working shared scheduling substrate rather than a planned skeleton. S01 established the trusted Supabase/SvelteKit SSR auth boundary, group onboarding, permitted-calendar scope loading, and explicit fail-closed denied routes. S02 added the concrete schedule model with authoritative `shifts` rows, bounded recurrence, server-mediated create/edit/move/delete actions, and the calm custom week board. S03 extended that route surface into browser-local continuity with service-worker-backed reopen, cached trusted scope, visible-week snapshots, and queued local mutations that survive reload while offline. S04 then added deterministic replay/rebase, reconnect draining through the existing trusted route actions, and realtime-driven trusted refreshes. S05 layered non-blocking visible conflict warnings onto the effective visible week without conflating them with transport diagnostics. S06 hardened the remaining browser proof seams by aligning browser realtime startup with trusted layout session data, stabilizing Playwright identity/baseline handling, and closing the last combined-run verification gap.

Milestone verification now demonstrates the assembled product contract end to end. The combined clean-reset preview-backed Playwright command for `calendar-offline.spec.ts` plus `calendar-sync.spec.ts` passes, proving cached-session offline reopen, offline local edits, reload continuity, reconnect drain, live collaborator refresh, next-week scope guards, and persistent conflict visibility in one run. Earlier slice proof remains intact: auth/group/access browser proof passed, the protected calendar CRUD surface passed, focused contract/unit regressions passed (40 tests across conflicts, board, offline queue, sync engine, and server actions), and validation artifacts plus slice assessments exist on disk. Code-change verification also passed using the integration-base equivalent against `origin/main`, confirming the milestone produced substantial non-`.gsd/` implementation changes in the web app, shared DB helper surface, and Supabase schema/seed files.

Decision re-evaluation: the milestone's key architecture choices all held under assembled proof. Supabase plus thin SvelteKit server composition remained sufficient for auth, RLS, sync, and realtime; local-first with server-canonical reconciliation proved workable once reconnect and realtime replay were routed through trusted server actions; the offline browser SQLite/repository seam supported real continuity without widening authority; and derived visible conflict warnings stayed compatible with offline, reconnect, and collaborator refresh flows. The only milestone-scope requirement intentionally left active is R002, because membership-derived sharing is proven but explicit user-facing role-assignment proof still belongs to later work rather than being overstated here.

## Success Criteria Results

- **Previously synced calendars reopen offline and queued local edits survive reload.** Passed. Evidence: the clean-reset combined preview-backed Playwright command `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts` completed successfully and `calendar-offline.spec.ts` proved cached reopen, offline create/edit/move/delete, reload continuity, and fail-closed offline denial for unsynced routes.
- **Reconnect drain returns to `0 pending / 0 retryable`.** Passed. Evidence: the same combined Playwright proof showed the offline queue draining back to server-confirmed state after connectivity returned.
- **Collaborator updates appear live and next-week scope guards remain fail-closed.** Passed. Evidence: `calendar-sync.spec.ts` in the same combined command proved realtime collaborator refresh reaches `data-remote-refresh-state="applied"` and a collaborator viewing the next week ignores current-week writes.
- **Missing S01-S04 assessment artifacts exist.** Passed. Evidence: `.gsd/milestones/M001/slices/S01/S01-ASSESSMENT.md` through `S04-ASSESSMENT.md` are present, alongside all slice summaries.
- **Milestone assembly proof is green end-to-end.** Passed. Evidence: the last historical blocker—the combined offline+sync command—now passes after the sync proof was updated to derive its overlap baseline from the currently visible trusted week state.
- **Horizontal checklist.** No remaining unchecked horizontal checklist items were identified during milestone validation refresh.

## Definition of Done Results

- [x] All roadmap slices are complete in the GSD DB: `gsd_milestone_status(M001)` reports S01-S06 status `complete` with all tasks done.
- [x] Slice closeout artifacts exist on disk: S01-S06 summaries are present, and S01-S05 assessment artifacts are present where expected for validation/audit.
- [x] Cross-slice integration works at the assembled milestone level: auth/access, schedule CRUD, offline continuity, reconnect replay, realtime collaborator refresh, and conflict visibility all passed the combined browser verification flow.
- [x] Actual code changes exist beyond planning artifacts: `git diff --stat HEAD $(git merge-base HEAD origin/main) -- ':!.gsd/'` showed non-`.gsd/` changes across `apps/web`, `packages/db`, `supabase`, and config files.
- [x] Validation artifact refreshed to PASS before completion: `.gsd/milestones/M001/M001-VALIDATION.md` now records milestone verdict `pass` with all success criteria checked.
- Horizontal checklist: no additional unchecked horizontal checklist items remained after validation refresh.

## Requirement Outcomes

| Requirement | Previous status | New status | Evidence |
|---|---|---|---|
| R001 | active | validated | Combined clean-reset preview-backed browser proof passed for trusted sign-in, cached-session offline reopen of previously synced Alpha calendars, reload continuity, and fail-closed unsynced Beta denial. |
| R003 | validated | validated | S02 schedule CRUD + recurrence browser/unit proof remains green and was preserved by later slices. |
| R004 | active | validated | Combined preview-backed browser proof passed for offline read/edit continuity, local queue persistence across reload, and reconnect reconciliation. |
| R005 | active | validated | Combined collaborator proof plus passing `sync-engine` / `offline-queue` regressions proved deterministic reconnect replay and live shared refresh propagation. |
| R006 | active | validated | Conflict/unit/browser proof now shows board/day/shift overlap warnings surviving offline reload, reconnect drain, and collaborator refresh. |
| R007 | validated | validated | The calm week board, explicit controls, denied states, and visible diagnostics remained green through milestone closeout. |
| R012 | active | validated | Policy/unit/browser proof across auth, denied routes, RLS-backed schedule actions, and combined offline+sync verification kept cross-group access fail-closed. |
| R002 | active | active | Membership-derived sharing and permitted access are proven, but explicit user-facing role-assignment proof was not separately completed, so the requirement remains active. |

## Deviations

Used `origin/main` as the integration-base equivalent for the code-change diff because the working branch itself is `main`, so `git merge-base HEAD main` collapses to `HEAD` and would falsely show no milestone code changes. Verification commands continued to use the repo-standard `pnpm --dir apps/web exec ...` form instead of `pnpm -C apps/web ...` for reliable app-local CLI resolution.

## Follow-ups

Start M002 from the now-validated substrate. Keep R002 active until explicit user-facing role-assignment proof is added, and preserve the new dynamic-baseline pattern in preview-backed browser specs whenever multiple files mutate the same seeded fixture week.
