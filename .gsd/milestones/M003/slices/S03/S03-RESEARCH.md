# S03 Research — Mobile Find time and compact create handoff

**Date:** 2026-04-21

## Summary

S03 should be planned as a **shared-contract extraction plus mobile route/handoff slice**, not as a small UI follow-up. M003/S02 already delivered the hard mobile continuity substrate: trusted shell resolution, cached-offline reopen, local-first calendar runtime, direct trusted Supabase write transport, and explicit diagnostics for route mode, queue state, and reconnect. What is still missing is everything specific to Find time on mobile: there is no `/calendars/[calendarId]/find-time` route in `apps/mobile`, no compact mobile result surface, no shared create-prefill helper available outside `apps/web`, and no way for the existing `ShiftEditorSheet` to auto-open with exact slot values on arrival.

The web product already proves the exact behavior S03 needs to preserve: ranked Top picks before lighter browse windows, explicit invalid/timeout/denied/offline states, a strict timing-only create handoff, slot-derived week targeting, and one-shot URL cleanup after arrival. The safest path is to preserve decisions `D045`, `D046`, `D048`, `D049`, and `D054`–`D057` by extracting the pure Find time and handoff contracts into `@repo/caluno-core`, then building a **phone-first mobile route** that stays backend-backed, fails closed offline, and lands in the existing mobile create sheet instead of inventing a second create flow.

## Requirements Targeting

- **Advances:** `R002` (permission-bound shared calendar scope on mobile), `R009` (mobile as a real first-class Caluno client)
- **Supports:** `R022` (validated mobile continuity substrate that S03 must reuse without widening scope)
- **Preserves:** validated `R008`/`R012` behavior from web — truthful Find time ranking/explanations and fail-closed trust boundaries must not regress during the mobile port

## Recommendation

1. **Extract the pure Find time and handoff contracts before building the mobile route.**
   - `apps/web/src/lib/find-time/matcher.ts`, `apps/web/src/lib/find-time/ranking.ts`, and `apps/web/src/lib/schedule/create-prefill.ts` are the critical pure pieces.
   - Mobile currently cannot consume them without violating `D049`, because they still live under `apps/web`.
   - Move the reusable logic into `@repo/caluno-core`, keep the web wrappers thin, and let mobile and web prove the same contract from one place.

2. **Implement mobile Find time as a live backend-backed route, not a cached/offline extension of S02.**
   - `apps/mobile` uses `@sveltejs/adapter-static`, so it cannot literally reuse `+page.server.ts`.
   - The practical mobile equivalent is an app-local transport/helper that performs live Supabase scope/roster/busy reads and feeds the shared matcher/ranking contract, while preserving the same status semantics already proven on web.
   - Even if the mobile shell can reopen cached-offline calendars, `/find-time` must still render `offline-unavailable` rather than replaying stale answers from local storage.

3. **Keep the UI compact and contextual to the calendar route.**
   - `MobileShell.svelte` only models `groups | calendar`, and the milestone context asks for quick core-loop movement rather than a bloated tab bar.
   - The right entrypoint is from the current mobile calendar surface, likely the `MobileCalendarBoard` hero or a nearby contextual CTA, not a new global shell tab.
   - Reuse the shared data contract, but do not mirror the web page layout route-for-route; `D045` requires a phone-first surface.

4. **Land chosen suggestions in the existing mobile create sheet with one-shot query cleanup.**
   - The current mobile create path already lives in `ShiftEditorSheet.svelte` and is wired into the local-first runtime from S02.
   - S03 should open that same sheet in `create` mode with exact prefilled start/end values, show a small `From Find time` source cue, preserve the slot-derived `start=` week, and strip transient query params immediately after arrival so reload does not reopen the handoff.

## Implementation Landscape

### Key Files

- `packages/caluno-core/package.json` / `packages/caluno-core/src/index.ts`
  - Current shared package exports app-shell, continuity, and schedule contracts, but **not** Find time or create-prefill helpers.
  - S03 likely needs new exports for shared matcher/ranking and timing-only handoff parsing/building.

- `apps/web/src/lib/find-time/matcher.ts`
  - Pure normalization and window-building logic: duration validation, 30-day search range shaping, raw window generation, and ranked-window splitting inputs.
  - Strong extraction candidate for `@repo/caluno-core`.

- `apps/web/src/lib/find-time/ranking.ts`
  - Pure Top-pick eligibility/ranking, blocked-member summaries, nearby-edge explanations, and malformed-contract detection.
  - Strong extraction candidate for `@repo/caluno-core`.

- `apps/web/src/lib/schedule/create-prefill.ts`
  - Already proves the exact timing-only handoff contract S03 needs: build href, parse params, derive destination week, validate ISO instants, and strip one-shot params.
  - Mobile needs this behavior but cannot import from `apps/web`.

- `apps/web/src/lib/server/find-time.ts`
  - Mixes three concerns: trusted scope lookup, live roster/busy data access, and pure matcher/ranking composition.
  - Keep the live data-access layer app-local, but preserve its status/reason/message contract when building mobile transport.

- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts`
  - Shows the current web trust boundary: deny malformed or out-of-scope calendar ids before any find-time query, then shape a typed `findTimeView`.
  - Mobile should preserve the same ordering even if it cannot reuse server-load directly.

- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
  - Existing mobile calendar destination route with trusted shell resolution, continuity-aware route modes, runtime bootstrap, and visible-week metadata.
  - This is the right place to consume and strip create-prefill params on arrival. It currently does **not** parse any find-time handoff state.

- `apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte`
  - Current board hero exposes only `New shift` plus week navigation.
  - Likely place for the compact Find time entrypoint into the new mobile route.

- `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte`
  - Existing phone-first create/edit/move/delete surface used by the mobile runtime.
  - Currently owns `open` and draft seeding locally; it has no prop-driven `openOnArrival`, no prefilled external values, and no source cue.

- `apps/mobile/src/lib/offline/network.ts`
  - Existing Capacitor/network adapter used to express truthful online/offline state.
  - Reuse this for mobile Find time route state instead of adding another connectivity abstraction.

- `apps/mobile/src/lib/offline/transport.ts`
  - Existing pattern for app-local live Supabase transport with typed timeout/query/malformed/forbidden outcomes.
  - Mobile Find time transport should follow this pattern rather than trying to recreate web `+page.server` behavior in a static app.

- `apps/mobile/src/lib/shell/load-app-shell.ts`
  - Already resolves trusted calendar scope and cached continuity gating.
  - Reuse its route/shell context so mobile Find time denies malformed or out-of-scope calendar ids before any busy-data fetch.

- `apps/mobile/tests/e2e/fixtures.ts`
  - Existing mobile Playwright harness for seeded auth, connectivity forcing, calendar open helpers, and persistence manipulation.
  - Best place to add find-time entry helpers and suggestion/handoff inspection helpers.

- `apps/mobile/tests/e2e/calendar-offline.spec.ts`
  - Existing continuity proof already covers the mobile calendar route, offline reopen, pending queue persistence, reconnect drain, and denied continuity.
  - S03 E2E should build on this harness rather than creating a separate test style.

- `apps/web/tests/routes/find-time-routes.unit.test.ts`
  - Already proves the trusted find-time status contract on web.
  - If matcher/ranking extraction touches web wrappers, this suite should be part of the regression bar.

- `apps/web/tests/schedule/create-prefill.unit.test.ts`
  - Already proves strict timing-only handoff behavior, Monday week derivation, invalid rejection, and one-shot cleanup.
  - Must remain green after any extraction.

### Build Order

1. **Shared contract extraction first**
   - Move or recreate pure `find-time` matcher/ranking and `create-prefill` logic under `@repo/caluno-core`.
   - This avoids `apps/mobile` → `apps/web` imports and gives both surfaces one contract for duration/range validation, ranking, explanation, and handoff parsing.

2. **Mobile trusted Find time transport and route**
   - Add a mobile `/calendars/[calendarId]/find-time` route that resolves trusted calendar scope from the existing shell context, checks current network truth, and issues live backend reads only when online.
   - Preserve explicit statuses: `ready`, `no-results`, `invalid-input`, `query-failure`, `timeout`, `malformed-response`, `denied`, and `offline-unavailable`.

3. **Compact mobile UI and entrypoint**
   - Add a contextual Find time CTA from `MobileCalendarBoard`.
   - Build a compact mobile results surface with Top picks first, browse windows second, compact explanation summaries, and deterministic CTA/test attributes for proof.

4. **Suggestion-to-create handoff into the existing mobile sheet**
   - Parse strict timing-only params on the calendar route.
   - Thread the resulting state into `ShiftEditorSheet` so create mode opens once with exact `datetime-local` values and a visible source cue.
   - Strip transient query params after first arrival while preserving the slot-derived `start=` week.

5. **Proof and regression**
   - Add mobile unit and Playwright proof.
   - Rerun targeted web suites if shared extraction changed any web wrapper behavior.

### Verification Approach

**Shared / unit proof**

- `pnpm --dir apps/mobile exec vitest run tests/trusted-core.unit.test.ts <new mobile find-time unit tests>`
  - Add coverage for mobile find-time route-state shaping, offline denial, out-of-scope denial, and create-prefill parsing/cleanup on the mobile destination route.

- If shared extraction changes web wrappers, rerun:
  - `pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/schedule/create-prefill.unit.test.ts`

**Mobile browser proof**

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts <new find-time spec>`

The new mobile find-time browser proof should confirm:
- a permitted mobile user opens Find time from the real calendar route;
- Top picks render before browse windows in a compact surface;
- denied calendar ids stay fail-closed;
- forcing offline yields explicit `offline-unavailable` with no result cards;
- choosing a suggestion lands on the exact calendar week implied by the slot;
- the existing create sheet opens with exact prefilled local values and a visible source cue;
- submitting the create flow produces a visible shift on the intended day;
- reload does not reopen the one-shot handoff.

**App integrity / runtime wiring**

- `pnpm --dir apps/mobile check`
- `pnpm --dir apps/mobile build`
- `sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Exact slot-to-create query contract | `apps/web/src/lib/schedule/create-prefill.ts` (move to `@repo/caluno-core`) | Mobile needs the same fail-closed parsing, week derivation, and one-shot cleanup semantics without inventing a second handoff dialect. |
| Shared window construction and ranking | `apps/web/src/lib/find-time/matcher.ts` + `apps/web/src/lib/find-time/ranking.ts` (extract pure pieces) | Re-implementing Top-pick/browse ranking on mobile would drift from web immediately and violate `D045`/`D049`. |
| Trusted calendar denial semantics | `resolveTrustedCalendarFromAppShell()` / `resolveCalendarPageState()` in `@repo/caluno-core` | Mobile Find time should reject malformed or out-of-scope calendar ids before any roster/busy query runs. |
| Explicit mobile online/offline truth | `apps/mobile/src/lib/offline/network.ts` | Keeps offline-unavailable state aligned with the mobile runtime instead of guessing from ad hoc checks. |
| Local-first create surface | `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte` | The compact handoff should land in the existing mobile create sheet, not a parallel create UI. |

## Constraints

- `apps/mobile/svelte.config.js` uses `@sveltejs/adapter-static`, so the packaged mobile app cannot depend on `+page.server.ts` or SvelteKit server-form actions for its own route logic.
- `D048` forbids cached/offline Find time answers. Even when `protectedEntry.routeMode === 'cached-offline'`, the mobile Find time route must render explicit `offline-unavailable` or denied states rather than replaying stored results.
- `D049`, `D054`, and `D055` forbid cross-importing `apps/web/src` into mobile and require shared pure contracts to live in `@repo/caluno-core`.
- `D057` keeps mobile schedule writes in the client-side runtime plus direct trusted Supabase transport path, so the handoff destination must open the existing client-side sheet rather than inventing a server-form create flow.
- `ShiftEditorSheet.svelte` currently owns `open` and seed state locally; it has no prop-driven open-on-arrival or external prefill-source surface yet.
- `MobileShell.svelte` models only `groups | calendar` as primary tabs, which argues for a contextual calendar-entry flow rather than a new global Find time tab.

## Common Pitfalls

- **Route-for-route web mirroring** — Reusing the web find-time page structure would satisfy parity on paper but violate `D045`’s phone-first UI constraint. Keep the contract, not the layout.
- **Leaving the handoff helper web-local** — If `create-prefill.ts` stays under `apps/web`, mobile will either duplicate validation or cross-import app-local code. Extract it before wiring the arrival flow.
- **Treating cached continuity as find-time authority** — Mobile continuity reopens calendars, not roster/busy answers. The `/find-time` route still has to fail closed offline.
- **Sticky arrival params** — If mobile does not strip `create`, `prefillStartAt`, `prefillEndAt`, and `source` after first render, reload will keep reopening the create sheet and break the one-shot contract already proven on web.
- **Adding a new primary shell tab** — The current shell/tab model and milestone context both favor a contextual route from the calendar surface instead of a broader navigation expansion.

## Open Risks

- The repo currently has no dedicated mobile-consumable Find time backend endpoint. Executors need to decide early whether “server-backed” for mobile means a new web/API endpoint or a direct live Supabase transport that preserves the same trusted status contract and never caches answers locally.
- Extracting `matcher.ts`, `ranking.ts`, and `create-prefill.ts` may surface hidden web-local dependencies or missing exports in `@repo/caluno-core`, which could turn the first task into a small cross-app refactor rather than a simple file move.
- The mobile create sheet currently seeds only from default week/day state. Adding exact arrival prefills without breaking normal manual create, edit, move, and delete flows is the highest UI-state regression surface in this slice.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Mobile UI polish | `frontend-design` | installed |
| Capacitor | `cap-go/capacitor-skills@capacitor-best-practices` | available |
| Capacitor plugins | `capawesome-team/skills@capacitor-plugins` | available |
| Supabase | `supabase/agent-skills@supabase` | available |
| SvelteKit structure | `spences10/svelte-skills-kit@sveltekit-structure` | available |

## Sources

- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — current mobile calendar route already resolves trusted shell/continuity and is the right destination for one-shot create-prefill consumption.
- `apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte` — current board has no Find time entrypoint yet, only `New shift` and week navigation.
- `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte` — current create sheet has no arrival-prefill API or source cue.
- `apps/mobile/src/lib/offline/network.ts` and `apps/mobile/src/lib/offline/transport.ts` — existing mobile patterns for explicit network truth and live trusted Supabase access.
- `apps/mobile/src/lib/shell/load-app-shell.ts` — current continuity/scope resolver to reuse for fail-closed calendar authorization.
- `apps/web/src/lib/find-time/matcher.ts` and `apps/web/src/lib/find-time/ranking.ts` — pure Find time contract pieces suitable for shared extraction.
- `apps/web/src/lib/schedule/create-prefill.ts` — strict timing-only handoff contract already proven on web.
- `apps/web/src/lib/server/find-time.ts` and `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts` — current trusted Find time data-loading/status semantics.
- `apps/web/tests/routes/find-time-routes.unit.test.ts`, `apps/web/tests/schedule/create-prefill.unit.test.ts`, `apps/web/tests/e2e/find-time.spec.ts`, and `apps/web/tests/e2e/calendar-shifts.spec.ts` — proven contract/regression surfaces for the exact behavior mobile now needs in a phone-first form.
- `apps/mobile/tests/e2e/auth-scope.spec.ts` and `apps/mobile/tests/e2e/calendar-offline.spec.ts` — existing mobile E2E harness and continuity proof surfaces to extend.
- `npx skills find "Capacitor"`, `npx skills find "Supabase"`, and `npx skills find "SvelteKit"` — skill discovery for likely execution support.
