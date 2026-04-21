# S02 Research — Mobile calendar continuity and editing

## Summary

- **Primary requirement:** `R022` (owner `M003/S02`) — previously synced calendars must reopen on mobile, offline edits must remain visible/pending, and reconnect must reconcile cleanly.
- **Supporting requirement:** `R009` — the phone app must stay a real Caluno surface, not a thin web wrapper.
- **Current state after S01:** mobile has trusted auth/bootstrap, permitted shell inventory, and truthful denied states, but **no calendar schedule load, no shift editor, no offline snapshot, no queue, no reconnect drain, and no continuity-aware auth gate**.
- **Key planner insight:** S02 is not “add a few inputs to the current calendar page.” The current mobile shell structurally **cannot** reopen offline yet because protected-route entry is still gated on an active authenticated session and all calendar data is fetched live.

## Requirements Targeting

- **Owns:** `R022`
- **Supports:** `R009`
- `R002` is already advanced by S01 and should remain regression-safe, but it is not the main implementation target for this slice.

## Skill Alignment

- **Installed skill:** `frontend-design`
  - Relevant rule: build distinctive, production-grade UI and avoid generic AI/web-wrapper aesthetics.
  - Why it matters here: D045/D049 already push mobile-specific flows over route-for-route web mirroring. Executors doing the calendar/editor UI should treat this as a **phone-first surface**, not a transplanted desktop board.

### Promising external skills to suggest (do not install automatically)

- **Capacitor** — `npx skills add cap-go/capacitor-skills@capacitor-best-practices`
  - Highest-signal result from `npx skills find "Capacitor"` (521 installs).
- **Capacitor plugins** — `npx skills add capawesome-team/skills@capacitor-plugins`
  - Useful if the slice adopts official/native plugins for persistence, lifecycle, or connectivity (270 installs).
- **Supabase** — `npx skills add supabase/agent-skills@supabase`
  - Strongest directly relevant Supabase result (27.4K installs).
- **SvelteKit** — `npx skills add spences10/svelte-skills-kit@sveltekit-structure`
  - Lower priority than Capacitor/Supabase here, but it was the most relevant SvelteKit result (428 installs).

## Recommendation

1. **Reuse the proven web local-first contract, not the web UI.**
   - The web already proves the hard parts: fail-closed offline reopen, local-first mutation staging, reconnect drain ordering, retryable failure handling, and truthful denied states.
   - The mobile UI should be different, but the continuity contract should stay the same.

2. **Follow the D050 pattern again: move pure continuity/schedule logic into a shared workspace boundary, keep runtime adapters app-local.**
   - Avoid `apps/mobile` importing from `apps/web/src`.
   - Extract/share only the pure parts: schedule validation, local queue/replay semantics, and data contracts.
   - Keep Svelte view components, Supabase browser client calls, and Capacitor plugin integration local to each app.

3. **Do not try to reuse SvelteKit server actions on mobile.**
   - `apps/mobile/svelte.config.js` uses `@sveltejs/adapter-static`, and the Capacitor runtime ships static assets from `build/`.
   - The packaged mobile app will not have the web app’s `?/createShift` / `?/editShift` / `?/moveShift` / `?/deleteShift` action transport.
   - Mobile needs its own **trusted transport adapter** that uses the mobile Supabase client/RLS boundary but emits the **same action reason/message contract** as web.

4. **Use native-friendly persistence and lifecycle hooks for the mobile runtime.**
   - Current web repository depends on sqlite-wasm + worker + OPFS. That is a browser-oriented runtime choice, not a mobile-native one.
   - Best near-term fit for S02 is an app-local Capacitor-backed persistence/lifecycle layer:
     - **Preferences** for persistent key/value snapshots/queue JSON
     - **Network** for connectivity status + change listeners
     - **App** for resume/pause/appStateChange-triggered refresh/drain
   - This keeps the pure continuity contract reusable while swapping only the runtime adapter.

## Implementation Landscape

### Existing mobile files and what they currently do

- `apps/mobile/src/routes/+layout.ts`
  - Hard-gates `/groups` and `/calendars/*` to `authState.phase === 'authenticated'`.
  - **This is the first structural blocker for R022.** Offline continuity cannot reopen protected routes while this gate requires a live authenticated phase.

- `apps/mobile/src/lib/auth/mobile-session.ts`
  - Singleton auth/bootstrap authority.
  - Validates cached Supabase session with `getSession()` + `getUser()` and exposes explicit signed-out / invalid-session / error states.
  - Good substrate, but currently **all protected-route entry depends on it succeeding online-style**.

- `apps/mobile/src/lib/shell/load-app-shell.ts`
  - Loads memberships/groups/calendars/join codes directly from the mobile Supabase browser client.
  - Caches only **in memory** (`shellCache`, `inflightLoads`).
  - **No durable trusted shell snapshot exists yet**, so offline reopen after app close/reload cannot work.

- `apps/mobile/src/routes/groups/+page.svelte`
  - Renders trusted inventory from `loadMobileAppShell()`.
  - No offline fallback, no continuity metadata, no cached-shell mode.

- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
  - Currently just resolves whether a permitted calendar exists in the trusted shell inventory.
  - No schedule load, no shifts, no create/edit UI, no offline state, no reconnect state.

- `apps/mobile/package.json`
  - Has only `@capacitor/core`, `@capacitor/ios`, `@capacitor/android`, `@capacitor/cli`.
  - **No** `@capacitor/preferences`, `@capacitor/network`, or `@capacitor/app` yet.

- `apps/mobile/capacitor.config.ts`
  - Basic Capacitor config only; no plugin-specific runtime setup.

### Existing shared/web code worth reusing or extracting

#### Already shared in `@repo/caluno-core`

- `packages/caluno-core/src/route-contract.ts`
  - Already contains `VisibleWeek`, `CalendarShift`, `CalendarScheduleView`, `resolveVisibleWeek()`, `createEmptyCalendarScheduleView()`, and `resolveTrustedCalendarFromAppShell()`.
  - This is the existing pure cross-surface contract boundary. S02 should extend this pattern instead of inventing a mobile-only type system.

#### Web continuity substrate to reuse conceptually

- `apps/web/src/lib/offline/app-shell-cache.ts`
  - Persists a trusted shell snapshot with session continuity metadata and fail-closed rules for stale sessions / user mismatch / unsynced calendar ids.
  - This is the **closest existing answer** to “how do we reopen protected scope offline without widening access?”

- `apps/web/src/lib/supabase/client.ts`
  - `buildSupabaseSessionContinuity()` is the existing session-expiry/shaping helper used to bound cached continuity.

- `apps/web/src/lib/offline/repository.ts`
  - Defines the **important abstraction**: `OfflineScheduleRepository` plus an internal `RepositoryDriver`.
  - The browser driver is sqlite-wasm/OPFS-specific and should **not** be copied blindly to mobile.
  - The abstraction itself is the reusable seam.

- `apps/web/src/lib/offline/mutation-queue.ts`
  - Pure queue contract for `pending-server` vs `retryable`, plus payload validation and ack/update semantics.

- `apps/web/src/lib/offline/sync-engine.ts`
  - Pure reconnect/replay logic:
    - `rebaseTrustedScheduleWithLocalQueue()`
    - `decideTrustedRefreshSnapshotWrite()`
    - `drainReconnectQueue()`
    - failure/ordering rules
  - This is one of the highest-value extraction targets because it encodes the proven continuity contract.

- `apps/web/src/lib/offline/calendar-controller.ts`
  - Pure-ish local-first controller/state machine for snapshot load, queue inspection, mutation staging, finalize/retry handling, and reconnect phase tracking.
  - Strong candidate for extraction with only transport/runtime adapters changed.

#### Pure schedule/view helpers that are already mobile-safe in spirit

- `apps/web/src/lib/schedule/types.ts`
- `apps/web/src/lib/schedule/recurrence.ts`
- `apps/web/src/lib/schedule/conflicts.ts`
- `apps/web/src/lib/schedule/board.ts`

These files are mostly pure logic and are good candidates for shared extraction. They already cover:
- create/edit/move validation
- bounded recurrence expansion
- overlap/conflict summaries
- board/day/shift view-model shaping

#### Web transport truth to preserve

- `apps/web/src/lib/server/schedule.ts`
  - This file is the source of truth for reason codes, message strings, and insert/update sequencing for:
    - create single shift
    - create recurring series + occurrences + assignments
    - edit
    - move
    - delete
  - Mobile does **not** need the same transport, but it should preserve these action-state semantics as closely as possible.

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
  - Shows how the web route maps trusted write outcomes into the controller.
  - Mobile needs an equivalent adapter, not an import.

### Important gaps / constraints the planner should account for

1. **Offline continuity is blocked at route entry, not only at data fetch.**
   - `apps/mobile/src/routes/+layout.ts` currently redirects any unauthenticated access away from `/groups` and `/calendars/*`.
   - S02 must introduce a continuity-aware protected-shell mode, or no downstream schedule work will be reachable offline.

2. **There is no durable trusted shell snapshot on mobile.**
   - `loadMobileAppShell()` caches in memory only.
   - App close/reopen will drop scope knowledge entirely today.

3. **There is no schedule data layer at all in mobile.**
   - No schedule reads.
   - No shift editor state.
   - No queue/snapshot persistence.
   - No reconnect drain.

4. **The current browser repository driver is not the mobile solution.**
   - `createBrowserScheduleRepository()` is built around a SQLite worker + OPFS persistent storage.
   - Even if this works in desktop Chromium, it is the wrong assumption to anchor a Capacitor runtime on.

5. **Do not rely only on `navigator.onLine` for real mobile runtime behavior.**
   - Web code uses `window` online/offline events.
   - Mobile should layer in Capacitor `Network.getStatus()` + `networkStatusChange` and app lifecycle hooks.

6. **Observability is part of the contract, not polish.**
   - S01 established stable `data-testid` / `data-*` proof surfaces.
   - S02 should continue this pattern for local state, queue counts, sync phase, cached snapshot origin, and pending/retry badges.

## Don’t Hand-Roll

- **Do not invent a custom “mobile-only offline contract.”** Reuse the queue/replay/retry semantics already proven on web.
- **Do not cross-import from `apps/web/src` into `apps/mobile`.** D049/D050 already set the boundary pattern.
- **Do not keep mobile continuity in ad hoc component state.** App close/reopen is part of the acceptance bar.
- **Do not use raw `localStorage`/`navigator.onLine` alone as the mobile runtime story** if official Capacitor plugins are available.

## Natural Seams / Suggested Task Boundaries

### 1. Continuity substrate first

**Why first:** without this, offline reopen is impossible and any calendar/editor UI work will only function online.

Likely files:
- `apps/mobile/src/routes/+layout.ts`
- `apps/mobile/src/lib/auth/mobile-session.ts`
- `apps/mobile/src/lib/shell/load-app-shell.ts`
- new mobile continuity cache/storage module(s)
- possible shared package extraction for cache/session/offline contracts

Target outcome:
- previously trusted shell scope can reopen offline in a bounded mode
- unsynced/stale/mismatched sessions still fail closed
- shell route surfaces expose continuity mode truthfully

### 2. Shared schedule/offline contract extraction

**Why second:** this is the cleanest way to avoid mobile/web drift while reusing the hardest already-proven logic.

Best candidates:
- `apps/web/src/lib/offline/mutation-queue.ts`
- `apps/web/src/lib/offline/sync-engine.ts`
- `apps/web/src/lib/offline/calendar-controller.ts`
- `apps/web/src/lib/schedule/types.ts`
- `apps/web/src/lib/schedule/recurrence.ts`
- `apps/web/src/lib/schedule/conflicts.ts`
- `apps/web/src/lib/schedule/board.ts`

Target outcome:
- one pure local-first schedule contract shared by web and mobile
- app-local adapters for storage, transport, and view components

### 3. Mobile schedule transport + persistence adapters

**Why third:** once the shared contract exists, mobile needs app-local glue for real runtime behavior.

Likely new modules:
- mobile schedule loader using the Supabase browser client
- mobile write adapter mapping create/edit/move/delete to the existing action-state contract
- Capacitor-backed snapshot/queue repository driver
- connectivity/lifecycle integration

Potential dependencies:
- `@capacitor/preferences`
- `@capacitor/network`
- `@capacitor/app`

### 4. Mobile-native calendar/editor UI

**Why fourth:** once state/transport are truthful, the UI can stay intentionally phone-first.

Likely files:
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
- new mobile calendar/shift components under `apps/mobile/src/lib/components/`

Target outcome:
- previously synced week opens
- create/edit flows work offline
- pending/retry state is visible on the board/cards
- reconnect truthfully drains or pauses on failure

### 5. Proof / regression coverage

**Why last:** this slice must ship with real evidence, not implied confidence.

Likely files:
- new mobile unit tests for cache/repository/controller/transport contracts
- new Playwright continuity spec in `apps/mobile/tests/e2e/`
- possible web regression runs if shared modules move

## Verification Plan

### Minimum automated proof for S02

1. **Mobile unit tests** for continuity substrate
   - cached shell/session continuity rules
   - schedule snapshot persistence
   - queue persistence + malformed payload fail-closed behavior
   - reconnect drain ordering / retryable stop behavior

2. **Mobile Playwright E2E** for the browser-shell proof
   - sign in online
   - open permitted calendar week
   - warm trusted cache
   - force offline
   - reload/reopen same calendar
   - create/edit shift offline
   - verify pending markers survive reload
   - reconnect
   - verify queue drains and pending clears
   - verify unsynced/out-of-scope calendar ids still fail closed offline

3. **Packaging evidence**
   - `pnpm --dir apps/mobile build`
   - `sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`
   - If plugins are added, `cap:sync` becomes mandatory proof that native project wiring stayed valid.

### Commands the planner can likely reuse

- `pnpm --dir apps/mobile check`
- `pnpm --dir apps/mobile exec vitest run tests/auth-bootstrap.unit.test.ts tests/shell-scope.unit.test.ts <new-mobile-continuity-tests>`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts <new-mobile-continuity-spec>`
- `pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`

### If shared modules are extracted from web

Also re-run the web contract/regression suites that currently prove the continuity model:
- `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts tests/routes/protected-routes.unit.test.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts`

## Risks / Watchpoints

- **Biggest structural risk:** trying to bolt offline logic directly into `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` without first changing the protected-route/auth/shell continuity model.
- **Biggest drift risk:** copying web queue/replay/controller code into mobile instead of sharing the pure contract.
- **Biggest runtime risk:** assuming the browser sqlite-wasm/OPFS path is the mobile persistence strategy.
- **Biggest truthfulness risk:** letting cached mobile continuity bypass session expiry / user mismatch / unsynced calendar rules already established on web.
- **Biggest UX risk:** porting the desktop week board literally instead of shaping a phone-first editor/board flow.

## Sources

### Code read
- `apps/mobile/src/routes/+layout.ts`
- `apps/mobile/src/lib/auth/mobile-session.ts`
- `apps/mobile/src/lib/shell/load-app-shell.ts`
- `apps/mobile/src/routes/groups/+page.svelte`
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
- `apps/mobile/package.json`
- `apps/mobile/capacitor.config.ts`
- `apps/mobile/svelte.config.js`
- `packages/caluno-core/src/route-contract.ts`
- `apps/web/src/routes/(app)/+layout.ts`
- `apps/web/src/lib/offline/app-shell-cache.ts`
- `apps/web/src/lib/offline/repository.ts`
- `apps/web/src/lib/offline/mutation-queue.ts`
- `apps/web/src/lib/offline/sync-engine.ts`
- `apps/web/src/lib/offline/calendar-controller.ts`
- `apps/web/src/lib/schedule/types.ts`
- `apps/web/src/lib/schedule/recurrence.ts`
- `apps/web/src/lib/schedule/conflicts.ts`
- `apps/web/src/lib/schedule/board.ts`
- `apps/web/src/lib/server/schedule.ts`
- `apps/web/tests/e2e/calendar-offline.spec.ts`
- `apps/web/tests/schedule/offline-queue.unit.test.ts`
- `apps/web/tests/schedule/sync-engine.unit.test.ts`
- `apps/mobile/tests/e2e/auth-scope.spec.ts`

### Docs checked
- Context7: Capacitor official docs for **Preferences**, **Network**, and **App** plugin APIs
  - Preferences: persistent native key/value storage
  - Network: `getStatus()` + `networkStatusChange`
  - App: `appStateChange`, `resume`, `pause`

### Skill discovery commands run
- `npx skills find "Capacitor"`
- `npx skills find "Supabase"`
- `npx skills find "SvelteKit"`
