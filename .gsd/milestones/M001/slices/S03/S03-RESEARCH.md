# M001/S03 — Research

**Date:** 2026-04-15

## Summary

S03 primarily owns **R004** (previously synced schedule data can be read and edited locally in the browser while offline) and directly supports **R001** (cached-session continuity for previously synced calendars). It also has to preserve the S01/S02 trust boundary for **R012**: offline continuity must not turn guessed calendar ids or stale membership into authority. In the current codebase, that boundary is strong online but there is **no offline substrate yet**. `apps/web/src/routes/(app)/+layout.server.ts` hard-requires `locals.safeGetSession()`, and `safeGetSession()` in `apps/web/src/lib/supabase/server.ts` calls `auth.getUser()` after `getSession()`. That means a hard offline reopen cannot currently resolve a trusted SSR session or protected route; it will redirect or fail before the calendar page can render.

The other major constraint is that the calendar experience is entirely **server-loaded and server-mutated** today. `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` loads the visible week from Supabase, and `CalendarWeekBoard`/`ShiftEditorDialog` submit SvelteKit form actions for create/edit/move/delete. That preserves S02’s authority model, but it also means there is no client-side schedule store, no mutation queue, no browser persistence dependency, no service worker, and no way to reopen the app offline after a browser restart. The natural S03 shape is therefore: keep the current server contract as the online canonical path, but add a browser-local repository plus cached app-shell snapshot and an offline boot path that only unlocks calendars already synced on this browser.

## Recommendation

Implement S03 as a **local-first read/write layer behind repository seams**, not as ad hoc localStorage patches. The cleanest fit with D005 is to add **official SQLite Wasm** (`@sqlite.org/sqlite-wasm`) in a worker-backed repository using OPFS when available, with the UI talking to that repository rather than directly depending on server action results. Keep `apps/web/src/lib/schedule/recurrence.ts` as the shared validation/occurrence authority and keep `apps/web/src/lib/server/schedule.ts` as the online canonical adapter; S03 should add a browser-side schedule repository and cached shell snapshot, not replace the server contract.

For route continuity, do **not** weaken S01’s trusted SSR auth rule. Online auth should still be proven server-side. Offline continuity should be a separate client-only branch that becomes available only when the browser already holds (a) a persisted authenticated session/cached identity snapshot and (b) a previously synced permitted calendar snapshot. In practice that means introducing a service worker for offline asset reloads, a cached app-shell snapshot keyed by user/calendar scope, and a client-side calendar state source in `+page.svelte` that can hydrate from server data when online or local data when offline. Per the installed `frontend-design` skill, keep offline/pending-state UI integrated into the existing calm board/status-card language rather than adding noisy generic debug chrome.

## Implementation Landscape

### Key Files

- `apps/web/package.json` — currently has no browser-local persistence dependency; add the SQLite/WASM package and, if needed, a dedicated offline E2E preview script.
- `apps/web/vite.config.ts` — current config has no custom headers; if S03 uses official SQLite Wasm + OPFS, this is the dev/preview seam for `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers.
- `apps/web/src/hooks.server.ts` — current online auth boundary stays here; if global response headers are needed outside Vite preview/dev, this is also a likely production hook point.
- `apps/web/src/app.d.ts` — App/PageData types currently know only `session`, `user`, and `authStatus`; S03 likely needs typed cached-shell/offline-state data exposed to the route UI.
- `apps/web/src/lib/supabase/client.ts` — unused browser client today; this is the seam for browser-side session awareness, reconnect detection, and any cached-session snapshot refresh logic.
- `apps/web/src/lib/supabase/server.ts` — `safeGetSession()` proves the current constraint: offline SSR cannot rely on it because `getUser()` is network-validating.
- `apps/web/src/routes/(app)/+layout.server.ts` — still authoritative for online membership/calendar scope. S03 should preserve this for online, then add a client-side fallback path rather than mutating it into a weak auth check.
- `apps/web/src/routes/(app)/groups/+page.svelte` — existing protected shell/navigation. If offline mode needs a cached inventory entrypoint, this page may need a minimal offline-aware state badge or fallback list from cached scope.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` — current online loader + server actions. Preserve this as the canonical remote adapter; S03 may add companion client helpers, but the trusted server route should remain intact for online flows.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — the main UI seam. It currently derives board state directly from server `data` + `form`; S03 needs to lift schedule state into client state so the page can render from local cache and apply offline mutations.
- `apps/web/src/lib/server/schedule.ts` — existing canonical schedule DTOs, validation entrypoints, action result types, and authority checks. Reuse its types/messages where possible; do not duplicate recurrence or failure-reason vocabulary.
- `apps/web/src/lib/schedule/recurrence.ts` — shared domain logic for visible-range validation and recurrence expansion. This should be reused by the offline repository/queue layer instead of reimplementing recurrence math.
- `apps/web/src/lib/schedule/board.ts` — stable board-shaping logic already independent from transport. Keep using it after state moves from server-only data to local-first state.
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte` — existing meta/status strip is the right place to surface offline, cached, and pending-local-change state.
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` — today this is a server-action form wrapper. This is the natural seam for intercepting create/edit/move into a local repository command path while preserving the same UX.
- `apps/web/src/lib/components/calendar/ShiftCard.svelte` — delete currently posts directly to the server. S03 will need a local delete path and pending-state rendering here too.
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte` — mostly presentational; likely unchanged except for richer state propagation.
- `apps/web/src/service-worker.ts` (new) — needed if “reopen offline” must survive browser restart and cold navigation. No service worker exists today.
- `apps/web/src/lib/offline/*` or `apps/web/src/lib/schedule/local/*` (new) — best location for SQLite init, repository, cached shell snapshot, and pending mutation queue.
- `apps/web/tests/auth/session.unit.test.ts` — useful contract surface for the online-vs-cached-session distinction.
- `apps/web/tests/routes/protected-routes.unit.test.ts` — extend or complement with tests that offline cached calendars stay fail-closed for unsynced/unauthorized ids.
- `apps/web/tests/e2e/fixtures.ts` — current diagnostics harness should be extended with offline/online phase markers and pending-mutation context.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — baseline online lifecycle proof to keep passing while S03 refactors the route into local-first state.
- `apps/web/tests/e2e/calendar-offline.spec.ts` (new) — dedicated S03 browser proof for cache seed → offline reopen → local edits.
- `apps/web/playwright.config.ts` — current config runs `vite dev`. That is fine for current online tests but a weak fit for service-worker/offline-reopen proof; S03 likely needs preview/build-backed browser verification or a second config.

### Build Order

1. **Prove the browser-local substrate first**: choose and wire the SQLite/WASM repository, capability detection, and service-worker/offline asset strategy. This is the highest-risk part and unblocks every later decision.
2. **Add cached protected-shell continuity**: persist the minimal trusted app-shell snapshot (viewer + memberships + permitted calendars) after successful online loads, then add a client-side offline boot path that only exposes previously synced calendars. This retires the current “offline SSR redirect” blocker for R001/R004.
3. **Move calendar state to a local-first route model**: refactor `+page.svelte` and calendar dialogs/cards so they render from repository state and apply create/edit/move/delete locally, while keeping the existing server contract as the online authority path.
4. **Add pending-mutation/status surfaces**: once writes are local, surface queued/local-only state in the existing status-card/board meta language so users can tell what is saved locally and what still needs sync.
5. **Only then add browser proof**: preserve current online tests, then add dedicated offline reload/reopen proof and local-write persistence proof. Verification will be much easier once the substrate and route seams are stable.

### Verification Approach

- Static/type safety:
  - `pnpm --dir apps/web check`
- Unit coverage for local-first logic:
  - `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts tests/schedule/recurrence.unit.test.ts tests/schedule/offline-store.unit.test.ts tests/schedule/offline-queue.unit.test.ts`
- Local backend reset for deterministic seed/calendar scope:
  - `npx --yes supabase db reset --local --yes`
- Browser proof:
  - keep the current online schedule proof passing: `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`
  - add a dedicated offline proof, ideally against a preview/build-backed server once a service worker exists: `pnpm --dir apps/web build && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts`
- Required observable behaviors for S03:
  - sign in online and open the seeded Alpha calendar week once
  - reload/open the same calendar offline and still render the previously synced week
  - create/edit/move/delete while offline and see those changes persist after reload
  - show a clear local/pending status in the UI instead of pretending remote sync already happened
  - keep unsynced or unauthorized calendar ids fail-closed offline (e.g. direct Beta URL still denied if it was never synced/permitted)

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Browser recurrence expansion/validation | Existing `apps/web/src/lib/schedule/recurrence.ts` + `rrule` | S02 already proved this path; reusing it avoids divergence between online and offline shift math. |
| Browser-local SQL engine | `@sqlite.org/sqlite-wasm` worker + OPFS | D005 already points at browser SQLite/WASM; the official package gives a real SQLite engine instead of inventing pseudo-SQL over localStorage/IndexedDB. |
| Offline asset reload/caching | SvelteKit `src/service-worker.*` | SvelteKit already knows how to bundle/register a service worker; this is cleaner than bespoke registration/caching glue. |

## Constraints

- D005 is explicit: web local persistence should follow the **browser SQLite/WASM** direction behind repository seams.
- The current protected shell is **server-authoritative**. `safeGetSession()` calls `getUser()`, so hard offline SSR cannot be the continuity mechanism.
- No browser persistence or sync dependency exists yet in `apps/web/package.json`.
- No `src/service-worker.*` file exists, so “reopen offline after browser restart” is not currently credible.
- No `+layout.ts` / `+page.ts` universal load exists under `src/routes`; all protected route data currently comes from server loads.
- Current create/edit/move/delete UI is built around SvelteKit form actions, which cannot satisfy offline write requirements without a client-side interception/repository path.
- Official SQLite Wasm OPFS persistence requires worker usage plus COOP/COEP headers; the repo currently has neither.
- `apps/web/playwright.config.ts` uses `vite dev`; that is fine for online flows but likely not the right proof surface for real service-worker/offline-reopen behavior.

## Common Pitfalls

- **Letting cached session data become new authority** — offline continuity should only unlock previously synced, previously permitted calendar scope. Fresh login, guessed ids, and newly changed memberships must still require online trusted resolution.
- **Keeping the page server-only and merely “caching responses”** — that may make a visited page visible offline, but it does not solve offline create/edit/move/delete or deterministic local state.
- **Binding UI directly to raw SQLite tables** — keep a repository boundary so S04 can layer sync/reconciliation on top without rewriting every component.
- **Assuming service worker caching alone makes POST actions work offline** — it only helps reopen/navigation/assets. Local writes still need an explicit client-side command + queue path.
- **Forgetting OPFS isolation headers** — the official SQLite Wasm path will look broken or silently unavailable if COOP/COEP is not configured in dev/preview/production.
- **Breaking the calm board UX with debug-first chrome** — follow the existing status-card/pill language and the `frontend-design` skill’s bias toward integrated, production-grade surfaces.

## Open Risks

- The biggest implementation choice is where to introduce the offline boot path: a client-side layout/page load, a route-local hydration store, or both. The planner should keep this decision early and explicit.
- Official SQLite Wasm + OPFS may be straightforward in production but awkward in local dev/test until headers and worker loading are nailed down.
- Browser proof for “close and reopen offline” may require a separate preview/build Playwright flow rather than incremental edits to the current dev-server config.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Supabase | `supabase/agent-skills@supabase` | available via `npx skills add supabase/agent-skills@supabase` |
| SvelteKit | `spences10/svelte-skills-kit@sveltekit-data-flow` | available via `npx skills add spences10/svelte-skills-kit@sveltekit-data-flow` |
| Playwright | `currents-dev/playwright-best-practices-skill@playwright-best-practices` | available via `npx skills add currents-dev/playwright-best-practices-skill@playwright-best-practices` |
| UI design/polish | `frontend-design` | installed / available in AGENTS.md |

## Sources

- `getSession()` reads session state locally while `getUser()` validates the user with the server, which explains why the current SSR auth boundary cannot authorize a hard offline reopen (source: [Supabase JS Client](https://context7.com/supabase/supabase-js/llms.txt))
- Official SQLite Wasm supports worker-backed OPFS persistence and requires COOP/COEP headers for that mode (source: [sqlite/sqlite-wasm README](https://github.com/sqlite/sqlite-wasm/blob/main/README.md))
- SvelteKit auto-bundles/registers `src/service-worker.*` and documents cache strategies that can make visited pages work offline (source: [SvelteKit service workers](https://github.com/sveltejs/kit/blob/main/documentation/docs/30-advanced/40-service-workers.md))
- Vite exposes `server.headers` and `preview.headers`, which are the likely dev/preview seams for required cross-origin-isolation headers (source: [Vite server options](https://github.com/vitejs/vite/blob/main/docs/config/server-options.md), [Vite preview options](https://github.com/vitejs/vite/blob/main/docs/config/preview-options.md))
