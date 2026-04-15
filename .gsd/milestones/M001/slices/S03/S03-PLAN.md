# S03: Offline local persistence with cached-session continuity

**Goal:** Add offline-capable protected-shell continuity and a browser-local schedule repository so previously synced calendars can reopen offline, render cached week data, and accept local schedule edits without weakening the trusted S01/S02 authorization boundary.
**Demo:** A previously signed-in user can reopen synced calendars offline and continue making schedule changes locally in the browser.

## Must-Haves

- Add a browser-local persistence substrate behind repository seams using browser SQLite/WASM plus a service-worker-backed app shell so previously visited protected calendar routes can reopen offline after the browser restarts, directly advancing **R004** and following **D005**.
- Cache only a minimal trusted app-shell/session snapshot after successful online loads, and use it only to reopen previously synced permitted calendars offline; guessed, unsynced, stale, or unauthorized calendar ids must still fail closed, supporting **R001** without weakening the server-side trust model from **R012**.
- Move the calendar route to a local-first state model that hydrates from trusted server data when online or browser-local data when offline, while offline create/edit/move/delete operations persist locally across reloads and clearly surface pending/local-only status in the board UI, directly advancing **R004**.
- Add durable proof files for this slice: `apps/web/tests/auth/session.unit.test.ts`, `apps/web/tests/routes/protected-routes.unit.test.ts`, `apps/web/tests/schedule/offline-store.unit.test.ts`, `apps/web/tests/schedule/offline-queue.unit.test.ts`, and `apps/web/tests/e2e/calendar-offline.spec.ts`, while keeping `apps/web/tests/e2e/calendar-shifts.spec.ts` passing as the online regression surface.

## Threat Surface

- **Abuse**: replaying a stale cached session, guessing a calendar URL that was never synced on this browser, tampering with locally persisted calendar ids or queue entries, and using offline mode to imply authority for writes that were never permitted online.
- **Data exposure**: cached viewer identity, permitted calendar inventory, shift titles/times, queued local mutations, and service-worker-cached route payloads must stay scoped to the current browser profile and may not expose tokens, refresh secrets, or cross-group schedule data.
- **Input trust**: browser-local snapshots, queue entries, route params, and any restored Supabase session payload remain untrusted continuity inputs until they are matched against previously synced permitted scope or revalidated online.

## Requirement Impact

- **Requirements touched**: R001, R004, and the existing denied-scope promise from R012; online schedule-editing behavior from R003 must remain intact while the route becomes local-first.
- **Re-verify**: trusted sign-in and reload, permitted calendar routing, denied calendar handling, same-day schedule rendering, create/edit/move/delete flows, offline reopen after prior sync, local edit persistence across reload, and offline denial for unsynced calendar ids.
- **Decisions revisited**: D003 and D005 drive the local-first/browser-SQLite direction; D007, D008, D012, D014, D015, and D016 remain in force and must not be weakened by cached-session or offline-route changes.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/offline-store.unit.test.ts tests/schedule/offline-queue.unit.test.ts`
- `npx --yes supabase db reset --local --yes`
- `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`
- `pnpm --dir apps/web build && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts`
- The browser proof must show: sign in online once, open the seeded Alpha calendar week, go offline, reload or reopen the same calendar with cached data, create/edit/move/delete locally while offline, reload again with those local changes intact, and keep Beta/unsynced calendar ids fail-closed offline.

## Observability / Diagnostics

- Runtime signals: explicit UI state for online/offline/cached/pending-local modes, cached-calendar availability, queue length / local-write status, and route failure reasons for offline denied states.
- Inspection surfaces: `apps/web/tests/auth/session.unit.test.ts`, `apps/web/tests/routes/protected-routes.unit.test.ts`, `apps/web/tests/schedule/offline-store.unit.test.ts`, `apps/web/tests/schedule/offline-queue.unit.test.ts`, `apps/web/tests/e2e/calendar-offline.spec.ts`, the calendar action strip / pills, and the browser-local repository snapshot/queue helpers under `apps/web/src/lib/offline/*`.
- Failure visibility: last local-write failure, cache-miss / unsynced-calendar reason, visible week source, and Playwright phase diagnostics must stay inspectable without guessing whether the page is online or offline.
- Redaction constraints: never persist or log raw Supabase refresh/access tokens; diagnostics may include seeded ids, calendar ids, and high-level reason codes only.

## Integration Closure

- Upstream surfaces consumed: `apps/web/src/routes/(app)/+layout.server.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`, `apps/web/src/lib/server/schedule.ts`, `apps/web/src/lib/supabase/server.ts`, `apps/web/src/lib/schedule/recurrence.ts`, `apps/web/src/lib/schedule/board.ts`, and the S01/S02 protected-route + denied-state contracts.
- New wiring introduced in this slice: browser-local SQLite/WASM repository + worker, cached app-shell/session snapshot, service worker, browser-only protected-shell fallback loads, offline mutation queue, and a preview-backed Playwright proof path for service-worker/offline continuity.
- What remains before the milestone is truly usable end-to-end: deterministic reconnect/sync reconciliation and live multi-user propagation in S04, plus explicit conflict visibility in S05.

## Tasks

- [x] **T01: Wire the offline runtime substrate and preview proof surface** `est:2h`
  - Why: Offline reopen is not credible until the app can serve a cached shell, initialize the browser-local persistence runtime, and run against a proof surface that actually exercises service workers and cross-origin isolation.
  - Files: `apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/vite.config.ts`, `apps/web/src/hooks.server.ts`, `apps/web/src/service-worker.ts`, `apps/web/playwright.offline.config.ts`
  - Do: Add the browser-local SQLite/WASM dependency, wire COOP/COEP headers for dev/preview/server responses, add a SvelteKit service worker that caches the protected shell and previously visited route assets without expanding authority, and create a preview-backed Playwright config for offline/browser-cache proof instead of relying on the default dev server.
  - Verify: `pnpm --dir apps/web check && pnpm --dir apps/web build`
  - Done when: the app builds with the offline runtime assets in place, headers are configured for SQLite/worker use, and there is a dedicated Playwright config ready to prove real offline reopen.
- [x] **T02: Build the browser-local schedule repository and cached-shell snapshot contract** `est:2h`
  - Why: S03 needs a durable local data boundary for schedule rows plus a minimal cached app-shell/session snapshot before any route can truthfully reopen offline.
  - Files: `apps/web/src/lib/offline/sqlite.worker.ts`, `apps/web/src/lib/offline/repository.ts`, `apps/web/src/lib/offline/app-shell-cache.ts`, `apps/web/src/lib/supabase/client.ts`, `apps/web/tests/auth/session.unit.test.ts`, `apps/web/tests/schedule/offline-store.unit.test.ts`
  - Do: Add a worker-backed repository API for cached schedules, a minimal cached app-shell/session snapshot keyed to the previously trusted viewer/calendar scope, and browser auth helpers that refresh that snapshot only after successful online loads. Keep cached scope continuity-only: it may reopen previously synced calendars on this browser, but it may not mint authority for unsynced ids or changed memberships.
  - Verify: `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/schedule/offline-store.unit.test.ts`
  - Done when: unit proof shows repository reopen persistence, cached permitted-calendar lookup, and fail-closed behavior for unsynced or malformed cached scope.
- [ ] **T03: Add fail-closed cached-shell routing for offline protected pages** `est:2h`
  - Why: The protected shell and calendar route need a browser-side fallback path that can use cached scope offline while preserving the existing online SSR contract as the default path.
  - Files: `apps/web/src/app.d.ts`, `apps/web/src/routes/(app)/+layout.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts`, `apps/web/src/routes/(app)/groups/+page.svelte`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, `apps/web/tests/routes/protected-routes.unit.test.ts`
  - Do: Add typed browser-side load state for online, cached-offline, and offline-denied branches; keep groups/calendar navigation limited to previously synced permitted calendars; and make direct offline access to unsynced calendar ids render an explicit denied state instead of an empty board or guessed data.
  - Verify: `pnpm --dir apps/web check && pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts`
  - Done when: the shell can reopen from cached scope offline, the calendar route bootstraps from cached data when allowed, and unsynced or unauthorized ids still fail closed with named reasons.
- [ ] **T04: Move calendar reads and writes to a local-first controller with pending-state UI** `est:2h30m`
  - Why: The slice demo is only true once offline edits can be created, edited, moved, deleted, and reloaded from local data rather than disappearing when server actions are unavailable.
  - Files: `apps/web/src/lib/offline/mutation-queue.ts`, `apps/web/src/lib/offline/calendar-controller.ts`, `apps/web/src/lib/schedule/board.ts`, `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`, `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`, `apps/web/src/lib/components/calendar/ShiftCard.svelte`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, `apps/web/tests/schedule/offline-queue.unit.test.ts`
  - Do: Hydrate the board from the local repository, route offline create/edit/move/delete through a mutation queue with persistence across reload, keep the current server action path as the online canonical flow, and surface pending/local-only/offline state using the existing calm board/status language instead of noisy debug UI.
  - Verify: `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/board.unit.test.ts`
  - Done when: offline mutations update the board immediately, survive reload from local state, reuse existing recurrence validation, and visibly distinguish local-only work from server-confirmed state.
- [ ] **T05: Prove offline reopen, local persistence, and online-regression safety in Playwright** `est:1h30m`
  - Why: S03 is only finished when the real browser proves the continuity claim end to end and S02's online scheduling proof still passes after the route becomes local-first.
  - Files: `apps/web/tests/e2e/fixtures.ts`, `apps/web/tests/e2e/calendar-shifts.spec.ts`, `apps/web/tests/e2e/calendar-offline.spec.ts`
  - Do: Extend diagnostics to capture online seed, offline transition, cached reopen, and pending-local phases; keep the existing online schedule spec green; and add a dedicated offline spec that proves cache warm-up, offline reopen, local edits across reload, and offline denial for unsynced calendar ids.
  - Verify: `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts && pnpm --dir apps/web build && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts`
  - Done when: both the online and offline browser suites pass with retained diagnostics that clearly show where continuity failed if the flow regresses.

## Files Likely Touched

- `apps/web/package.json`
- `pnpm-lock.yaml`
- `apps/web/vite.config.ts`
- `apps/web/src/hooks.server.ts`
- `apps/web/src/service-worker.ts`
- `apps/web/playwright.offline.config.ts`
- `apps/web/src/lib/offline/sqlite.worker.ts`
- `apps/web/src/lib/offline/repository.ts`
- `apps/web/src/lib/offline/app-shell-cache.ts`
- `apps/web/src/lib/supabase/client.ts`
- `apps/web/tests/auth/session.unit.test.ts`
- `apps/web/tests/schedule/offline-store.unit.test.ts`
- `apps/web/src/app.d.ts`
- `apps/web/src/routes/(app)/+layout.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts`
- `apps/web/src/routes/(app)/groups/+page.svelte`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/tests/routes/protected-routes.unit.test.ts`
- `apps/web/src/lib/offline/mutation-queue.ts`
- `apps/web/src/lib/offline/calendar-controller.ts`
- `apps/web/src/lib/schedule/board.ts`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
- `apps/web/src/lib/components/calendar/ShiftCard.svelte`
- `apps/web/tests/schedule/offline-queue.unit.test.ts`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
- `apps/web/tests/e2e/calendar-offline.spec.ts`
