# S02 — Research

**Date:** 2026-04-15

## Summary

S02 owns **R003** (multi-shift browser scheduling) and **R007** (stress-friendly browser UX), while also shaping the data surface that **R006** conflict visibility will depend on later. The current codebase has a trusted calendar route and denied-state contract from S01, but there is **no scheduling schema, no shift loader, no edit actions, no client-side schedule state, and no browser calendar component yet**. `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` is still a placeholder shell, and the only authoritative Supabase schema today is the single S01 migration plus `supabase/seed.sql`.

The safest path is to **keep the S01 trust boundary intact** and layer scheduling on top of it instead of introducing direct browser-authoritative writes. The protected `(app)` layout should remain the source of permitted calendar scope, while the `[calendarId]` page grows into a page-scoped schedule loader/editor for one visible date range at a time. Do not widen `(app)/+layout.server.ts` to preload shifts for all calendars.

For the model, prefer **concrete editable shift occurrences** as the primary record, with optional recurrence/series metadata for grouped operations, instead of a first-cut “virtual recurrence only” system. That keeps multi-shift-per-day rendering simple, makes move/edit/delete operations deterministic, and gives later offline/sync/conflict slices concrete rows to queue, reconcile, and compare. Use an existing recurrence library for rule generation/preview instead of hand-rolling recurrence math.

## Recommendation

Build S02 as a **custom Svelte week/day scheduling surface** with **server-mediated CRUD/move/delete flows** and **SQL-backed concrete shift rows**.

Recommended shape:

- **Keep authorization anchored to S01**:
  - `apps/web/src/routes/(app)/+layout.server.ts` continues to resolve trusted memberships and permitted calendars once.
  - `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` validates the route from parent scope, then loads only the requested calendar’s schedule window.
  - All write paths should verify the calendar/shift through trusted server state or Supabase RLS-backed RPCs; do not introduce client-supplied group ids.
- **Use concrete occurrence rows as the edit surface**:
  - Add a new Supabase migration with scheduling tables/policies/functions rather than modifying the S01 migration in place.
  - Store exact `start_at` / `end_at` timestamps so multiple and overlapping shifts can exist on the same day.
  - For recurring patterns, create a `shift_series`/pattern record plus generated concrete `shifts` rows stamped with a shared `series_id` (or equivalent). Require an explicit repeat-until/count boundary for M001 so generation stays deterministic.
- **Keep the browser UI custom, not library-default**:
  - The current app already has a distinctive dark editorial visual language in `apps/web/src/app.css`. A stock calendar widget will clash unless heavily themed.
  - The installed `frontend-design` skill explicitly recommends choosing a clear aesthetic direction, avoiding generic UI defaults, and matching motion complexity to the actual UX need. For this slice that points toward a restrained, high-clarity board with obvious controls, not overloaded calendar chrome.
  - Prefer a week view with per-day stacks, clear “Add shift” affordances, and explicit edit/move/delete controls. That satisfies “browser editing flows” with less integration risk than first-pass drag-and-drop.
- **Do not hand-roll recurrence logic**:
  - Use `rrule` for recurrence serialization, preview, and server-side expansion of weekly/monthly patterns.
  - If drag/drop becomes an explicit acceptance requirement, FullCalendar is the existing solution space to borrow from, but it should be treated as a fallback because it adds theming/integration overhead the current app does not yet need.

## Implementation Landscape

### Key Files

- `supabase/migrations/20260414_000001_auth_groups_access.sql` — current schema/RLS authority for S01; do **not** overload it with S02 changes. Add a new migration for shift tables, policies, helper functions, and any recurrence write RPCs.
- `supabase/seed.sql` — current deterministic auth/group/calendar fixtures; extend with seeded shifts/series covering multi-shift same-day, overlapping, moved, and recurring cases.
- `apps/web/src/routes/(app)/+layout.server.ts` — trusted app-shell boundary; keep calendar inventory loading here, but keep shift loading out of this parent layout.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` — current route trust wrapper; this should become the page-scoped schedule loader and write-action entry point while preserving the denied-state contract.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — currently a placeholder; replace the “next slice” stub with the real scheduling surface while keeping the explicit denied UI branch intact.
- `apps/web/src/lib/server/app-shell.ts` — existing trusted calendar resolution helpers; reuse this seam and avoid duplicating authorization logic in new schedule code.
- `apps/web/src/lib/access/contract.ts` — shared access contract used by unit tests; extend only if the schedule write/load rules need additional pure helpers.
- `apps/web/src/app.css` — all current app styling lives here; either extend it or introduce a small calendar-specific companion stylesheet/module, but do not assume Tailwind or an existing component library.
- `apps/web/tests/routes/protected-routes.unit.test.ts` — existing route/loader guardrail coverage; extend it with schedule loader/action denial cases.
- `apps/web/tests/e2e/fixtures.ts` — seeded users/calendars and browser diagnostics helper; extend with seeded shift ids/ranges for deterministic browser proof.
- `apps/web/tests/e2e/auth-groups-access.spec.ts` — reference pattern for browser-proof flow, denial assertions, and cold-start handling; mirror its diagnostics style for schedule CRUD/browser editing proof.
- `apps/web/playwright.config.ts` — existing local Supabase + Vite browser-proof harness; verification should keep fitting this loop.

### New Seams To Introduce

- `apps/web/src/lib/schedule/types.ts` — normalized shift, series, editor payload, and visible-range types.
- `apps/web/src/lib/schedule/recurrence.ts` — `rrule`-based recurrence conversion/expansion helpers, kept pure for unit testing.
- `apps/web/src/lib/server/schedule.ts` — page-scoped schedule queries plus write helpers/RPC wrappers that preserve trusted calendar boundaries.
- `apps/web/src/lib/components/calendar/` — if the page starts to grow, split the scheduling surface into focused Svelte components (toolbar, day column, shift card, editor dialog) instead of leaving all logic in `+page.svelte`.
- `apps/web/tests/schedule/*.unit.test.ts` — pure tests for recurrence expansion, day grouping, visible-range filtering, and form payload normalization.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — browser proof for create/edit/move/delete/multi-shift flows.

### Build Order

1. **Prove the data model first**
   - Add the new migration, RLS/policies, any write RPCs, and seed data.
   - Lock the model with unit tests around recurrence expansion and per-day grouping before building UI.
   - This retires the main R003 risk: avoiding another hidden single-shift-per-day assumption.

2. **Add server-side schedule loading/writes on the protected calendar route**
   - Extend `[calendarId]/+page.server.ts` to load a bounded visible range and expose typed create/edit/move/delete actions.
   - Keep authorization route-local and fail-closed by reusing parent `appShell` data.
   - This preserves S01’s security contract while giving the browser a real schedule surface.

3. **Build the custom browser editor surface**
   - Replace the placeholder panel with a week/day board that supports multiple cards per day, clear empty states, and explicit create/edit/move/delete controls.
   - Keep the denied-state branch unchanged.
   - Make the first cut keyboard/form friendly; treat drag/drop as optional follow-on unless the planner confirms it is required for slice acceptance.

4. **Add browser proof last**
   - Cover the happy path and one or two sharp failure cases: unauthorized calendar route still denied, same-day multiple shifts visible, recurring create produces multiple occurrences, move/delete visibly update the board.

### Verification Approach

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/*.unit.test.ts`
- `npx --yes supabase db reset --local --yes`
- `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`

Observable proof the slice is really done:

- A permitted member can open `/calendars/[calendarId]` and see **multiple shifts on the same day**.
- Creating a recurring pattern immediately renders multiple concrete occurrences in the visible range.
- Editing one shift updates its rendered time/title without widening calendar access scope.
- Moving a shift changes its day/time visibly in the week view.
- Deleting a shift removes it from the current board.
- Guessing an unauthorized calendar id still shows the named denied surface from S01.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Recurrence rule parsing/serialization/expansion | `rrule` | Avoids fragile custom weekly/monthly recurrence math and gives deterministic rule text plus bounded occurrence expansion. |
| Full drag/drop calendar behavior (only if explicitly required) | FullCalendar | Already solves editable event moving/resizing and recurring event plumbing, but should be a fallback because the app would need heavy theming and a Svelte adapter layer to fit Caluno’s current UI. |

## Constraints

- S01 established a hard rule: protected calendar routes derive from trusted `(app)` layout scope and fail closed for malformed or unauthorized ids. S02 must preserve that.
- The web app currently uses **plain SvelteKit + app-local CSS**; there is no Tailwind layer, no shared UI kit in use, and no existing calendar/date library.
- The app has **no current browser-side data editing/store pattern** beyond server-rendered forms, so S02 is the first slice that introduces richer client-side interaction.
- `supabase/migrations` and `supabase/seed.sql` remain the schema/fixture authority.
- Future slices (offline local persistence, sync/realtime, conflict visibility) will depend on the schedule model chosen here, so the edit surface must stay deterministic and concrete.

## Common Pitfalls

- **Loading shifts in the parent app layout** — this would bloat the trusted shell and make every calendar navigation heavier. Keep schedule queries page-scoped and range-bounded.
- **Using day-only fields** — this recreates the exact MyDuty limitation Caluno is supposed to surpass. Persist timestamps and group by day only for rendering.
- **Making recurrence virtual-only in the first cut** — later offline/sync/conflict work will be harder if moves/deletes target synthetic events instead of concrete rows.
- **Breaking local seeded sign-in while touching `supabase/seed.sql`** — keep the known token-field normalization for SQL-seeded `auth.users`, or local GoTrue password login can regress.
- **Using ambiguous `ON CONFLICT (...)` inside `RETURNS TABLE` PL/pgSQL functions** — the project already found this can break. Use `ON CONFLICT ON CONSTRAINT ...` in new scheduling RPCs when output column names overlap table columns.
- **Dropping in a stock calendar UI unthemed** — it will clash with the current product language and likely hurt R007’s “stress-friendly” bar.

## Open Risks

- The planner should explicitly decide whether **drag-and-drop** is part of S02 acceptance or a follow-on UX enhancement. The milestone and competitive reference want it eventually, but the requirement text only mandates browser create/edit/move/delete flows.
- If recurring shifts need open-ended “forever” rules now, concrete-row materialization becomes more complex. Requiring `repeatUntil`/`count` in M001 is the lower-risk bound.
- If the slice mixes direct browser Supabase writes with server actions, failure surfaces and authorization reasoning will fragment quickly.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Frontend UI direction | `frontend-design` | installed |
| SvelteKit | `spences10/svelte-skills-kit@sveltekit-structure` | available — install with `npx skills add spences10/svelte-skills-kit@sveltekit-structure` |
| Supabase | `supabase/agent-skills@supabase` | available — install with `npx skills add supabase/agent-skills@supabase` |
| Playwright | `currents-dev/playwright-best-practices-skill@playwright-best-practices` | available — install with `npx skills add currents-dev/playwright-best-practices-skill@playwright-best-practices` |

## Sources

- FullCalendar supports editable events via `editable`, `eventDrop`, and `eventResize`, and can pair with RRULE-based recurring events if drag/drop becomes a hard requirement. (source: [FullCalendar docs](https://context7.com/fullcalendar/fullcalendar-docs/llms.txt))
- `rrule` supports RFC-style recurrence rules, bounded occurrence expansion, text serialization, and timezone-aware rules via `tzid`, which is enough for M001 recurring shift generation/preview. (source: [jkbrzt/rrule README](https://github.com/jkbrzt/rrule/blob/master/README.md))
