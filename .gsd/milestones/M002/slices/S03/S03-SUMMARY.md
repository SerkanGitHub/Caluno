---
id: S03
parent: M002
milestone: M002
provides:
  - An end-to-end suggestion-to-create handoff from `/find-time` into the existing calendar create flow.
  - A reusable strict prefill helper for future timing-only handoff surfaces.
  - Verified one-shot URL cleanup semantics that prevent stale query state from leaking into later create/edit/move/delete actions.
requires:
  - slice: S01
    provides: Truthful exact-slot free-time candidates, authorized roster scope, and fail-closed `/find-time` route behavior.
  - slice: S02
    provides: Ranked Top picks/browse surfaces plus stable recommendation hooks and explanation contracts that feed the final CTA layer.
affects:
  - M002 milestone validation and closeout
key_files:
  - apps/web/src/lib/schedule/create-prefill.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte
  - apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte
  - apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte
  - apps/web/tests/schedule/create-prefill.unit.test.ts
  - apps/web/tests/routes/protected-routes.unit.test.ts
  - apps/web/tests/e2e/find-time.spec.ts
  - apps/web/tests/e2e/calendar-shifts.spec.ts
  - apps/web/tests/e2e/fixtures.ts
key_decisions:
  - Use one shared timing-only URL handoff contract (`create=1`, `start`, `prefillStartAt`, `prefillEndAt`, `source=find-time`) and reject malformed or partial payloads fail closed.
  - Consume one-shot handoff state in both server action search-param handling and browser arrival cleanup so reloads and later writes cannot reopen stale suggestion state.
  - Expose only source, target week, start, and end as deterministic CTA/dialog diagnostics for browser proof; keep member/explanation details out of the handoff contract.
patterns_established:
  - Transient route-to-route prefills should be represented as narrow query contracts validated entirely at the destination inside trusted scope.
  - One-shot query-driven UI state should be consumed in both client and server paths when follow-on form posts preserve search params.
  - Browser proof for mutable seeded data should assert stable contract surfaces (hrefs, timestamps, week targeting, cleanup) instead of pristine inventory snapshots.
observability_surfaces:
  - Top-pick and browse CTAs expose deterministic `data-testid` hooks plus timing-only `data-handoff-*` attributes.
  - The create dialog exposes `data-create-source`, `data-open-on-arrival`, and `create-prefill-source` metadata with exact prefill timestamps.
  - The board continues to expose visible-week metadata so tests can verify slot-derived week targeting after handoff.
  - Protected-route/unit and Playwright coverage exercise destination URL cleanup directly rather than inferring it from prose.
drill_down_paths:
  - .gsd/milestones/M002/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M002/slices/S03/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-18T21:13:30.320Z
blocker_discovered: false
---

# S03: Suggestion-to-create handoff

**Completed the find-time suggestion handoff into the existing calendar create flow with exact slot prefills, correct week targeting, and one-shot URL cleanup that does not reopen on reload or later writes.**

## What Happened

S03 closed the final M002 loop between truthful free-time discovery and the existing schedule creation surface. The slice introduced one shared timing-only handoff contract in `apps/web/src/lib/schedule/create-prefill.ts` that builds calendar URLs from exact suggestion windows, derives the visible week from the selected slot, canonicalizes accepted timestamps, and rejects malformed, partial, mismatched, zero-length, or end-before-start payloads fail closed.

The protected calendar route now parses that contract server-side in `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`, exposes valid prefill state only inside an already authorized calendar context, and strips one-shot handoff params out of follow-on action search params so create/edit/move/delete submissions cannot accidentally replay stale suggestion state. On arrival, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` preserves the slot-derived `start=` week while replacing the browser URL to remove `create`, `prefillStartAt`, `prefillEndAt`, and `source`, which keeps reload and later invalidations from reopening the same handoff.

UI assembly landed in the existing board/dialog surfaces rather than inventing a parallel create flow. `CalendarWeekBoard.svelte` threads optional prefill state only into the create entry point, and `ShiftEditorDialog.svelte` auto-opens once for valid create prefills, shows a visible `From Find time` cue, and prepopulates exact `datetime-local` start/end values without affecting manual create, edit, or move behavior. On the source side, both Top picks and browse cards in `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte` now use the shared helper to emit deterministic CTA hrefs plus timing-only inspection attributes (`source`, target week, start, end). If a candidate cannot produce a valid exact-slot contract, the card fails closed instead of rendering a misleading action.

End-to-end browser proof confirmed the assembled flow rather than just the helper pieces: a member can click a real top-pick or browse suggestion, land in the same authorized calendar on the correct slot-derived week, see the existing create dialog already open with the exact handoff values and visible source cue, submit the form to create a real shift on the intended day, and reload without re-opening the handoff. Denied-calendar and offline `/find-time` behavior remained explicit and fail closed, so the new handoff did not widen calendar or roster authority.

This slice established the pattern for transient route-to-route UI handoffs in Caluno: keep the contract timing-only, validate entirely inside trusted destination scope, expose small deterministic diagnostics for browser proof, and consume query-driven prefill state in both server and client paths so it is observable on arrival but not sticky afterward.

## Verification

All slice-plan verification passed.

- `pnpm --dir apps/web exec vitest run tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts` — passed 26 tests covering exact contract generation/parsing, Monday week derivation, malformed/end-before-start rejection, and protected-route/action cleanup behavior.
- `pnpm --dir apps/web check` — passed with 0 Svelte/TypeScript errors or warnings.
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts tests/e2e/calendar-shifts.spec.ts` — passed 7 browser tests proving top-pick and browse CTA observability, slot-derived destination week targeting, visible `From Find time` cue, exact create-dialog prefill values, created-shift visibility, cleaned destination URL after arrival, non-sticky reload behavior, explicit denied routes, and fail-closed offline `/find-time` entry.

Observability/diagnostic surfaces from the slice plan were confirmed through runtime/test proof: CTA `data-testid` plus timing attributes on both suggestion surfaces, create-dialog source and prefill attributes, board visible-week metadata, and destination URL cleanup were all exercised directly in the unit and Playwright assertions.

## Requirements Advanced

- R002 — Kept the create handoff inside the already authorized calendar boundary so suggestion-driven creation does not widen sharing or calendar authority.
- R007 — Extended the existing calm create flow with an explicit `From Find time` cue and exact prefills instead of a disconnected secondary create surface.
- R008 — Completed the free-time feature loop by letting truthful suggested windows flow directly into real schedule creation with exact slot preservation.
- R012 — Re-proved fail-closed malformed, unauthorized, and offline paths for the new handoff contract and calendar destination route.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

The handoff contract is intentionally timing-only and same-calendar only; it does not carry member lists, explanation text, or any cross-calendar state. Offline `/find-time` continues to fail closed by design rather than replaying cached suggestions.

## Follow-ups

None for the core M002 flow. The milestone can move to validation/closeout rather than more implementation slices.

## Files Created/Modified

- `apps/web/src/lib/schedule/create-prefill.ts` — Added strict timing-only handoff generation, validation, week derivation, and one-shot search-param cleanup helpers.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` — Parsed create prefills inside trusted calendar scope and stripped one-shot params from follow-on action search state.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — Cleaned prefill params from the browser URL after arrival while preserving the visible week context.
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte` — Threaded optional prefill state only into the create-dialog path.
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` — Auto-opened the create dialog for valid handoffs, exposed a visible source cue, and prefilled exact datetime-local values.
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte` — Wired Top-pick and browse CTAs to the shared handoff helper and exposed timing-only inspection attributes.
- `apps/web/tests/schedule/create-prefill.unit.test.ts` — Proved valid contract generation/parsing, Monday week derivation, invalid rejection, and cleanup behavior.
- `apps/web/tests/routes/protected-routes.unit.test.ts` — Covered calendar-route prefill threading and server-side action search-param cleanup.
- `apps/web/tests/e2e/find-time.spec.ts` — Proved top-pick CTA observability, slot-derived week targeting, prefilled dialog arrival, denial, and offline fail-closed behavior.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — Proved browse CTA create submission, created-shift visibility, and non-sticky reload behavior.
- `apps/web/tests/e2e/fixtures.ts` — Added helpers to inspect CTA targets and create-prefill state directly from the DOM for stable browser proof.
