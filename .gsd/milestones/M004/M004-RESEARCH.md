# M004 — Research: Predictive Assistance and Release Hardening

**Date:** 2025-01-31

## Summary

M004 builds on a solidly-structured, fully-tested cross-platform codebase. The core scheduling and availability infrastructure is mature: `@repo/caluno-core` exports pure-function modules for matching, ranking, recurrence, conflicts, and board derivation; trusted server compositions in `apps/web/src/lib/server/` handle scope, availability loading, and find-time search; mobile mirrors the same contracts through transport/view-state split helpers. The existing `rankFindTimeWindows` function already scores windows by shared member count, span slack, nearby-edge pressure, and start time — a foundation that predictive features can extend without replacing.

The two key open questions for M004 are: (1) what "predictive" means precisely in Caluno's calm, privacy-respecting framing, and (2) which hardening work is load-bearing for launch. Both need to be scoped carefully. The strongest predictive feature that respects existing trust boundaries is **recurring-pattern suggestions** — detecting common shift patterns from the trusted `shifts` + `shift_series` tables for the current user's own calendar and surfacing them as smart presets when creating a shift. This delivers clear value, stays offline-friendly, and requires no new authorization surface. Secondary options include smarter Find time defaults (suggest the last-used duration, remember the last range start) and a "you often work this day" hint on the conflict badge. Full ML/AI ranking is out of scope given the calm product framing and the absence of an inference backend.

On the hardening side, the two deferred test assertions (`calendar-offline.spec.ts` route-mode expectation and `mobile-assembly.spec.ts` top-pick ordering sensitivity) must be fixed as table-stakes before any launch claim. Onboarding UX, accessibility (keyboard nav, ARIA), performance (TTFB, LCP), and deployment readiness (health endpoint, Docker compose, environment variable checklist) are the remaining hardening pillars.

## Recommendation

Execute M004 in three sequential slice groups:
1. **Fix the two stale E2E assertions** first — these are blockers to honest "all tests pass" launch claims.
2. **Recurring-pattern suggestion** as the primary predictive feature — pure client-side derivation from already-trusted shift data, surfaced in the shift editor as a pre-fill shortcut. This can ship on both web and mobile.
3. **Release hardening** — accessibility, onboarding polish, performance observability, deployment checklist, and a health/readiness endpoint.

Avoid introducing new backend ML, new database tables for predictions, or any form of AI inference. The codebase's strength is the principled trust model; the predictive feature should extend it, not leak around it.

## Implementation Landscape

### Key Files

**Predictive assistance (recurring-pattern suggestions)**
- `packages/caluno-core/src/find-time/ranking.ts` — `rankFindTimeWindows` scoring: `sharedMemberCount`, `spanSlackMinutes`, `nearbyEdgePressureMinutes`, `earlierStartAt`. Predictive ranking extensions should live here.
- `packages/caluno-core/src/schedule/types.ts` — `CalendarShift`, `CalendarShiftDay`, `ScheduleShiftDraftInput` — the input types any pattern-detection function will consume.
- `packages/caluno-core/src/schedule/recurrence.ts` — recurrence normalization and expansion; pattern detection could reuse expansion helpers.
- `packages/caluno-core/src/schedule/create-prefill.ts` — `buildCreatePrefillHref` / `deriveCreatePrefillWeekStart` — the existing pre-fill contract the editor accepts; predictive presets should integrate through this seam.
- `packages/caluno-core/src/index.ts` — re-exports; new predictive helpers should be added here.
- `apps/web/src/lib/server/schedule.ts` — `loadCalendarScheduleView`, all four CRUD actions; loading recent shifts for pattern detection happens here.
- `apps/web/src/lib/server/find-time.ts` — `loadFindTimeSearchView`, `loadCalendarMemberAvailability`; Find time smart-defaults (last used duration, remembered range start) would extend `loadFindTimeSearchView` params.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` — calendar page load; pattern suggestions could be computed here from recent shifts.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — shift board UI; the surface for surfacing "create again" / pattern shortcut buttons.
- `apps/mobile/src/lib/find-time/view.ts` — mobile find-time view-state shaper; smart defaults would touch this.
- `apps/mobile/src/lib/schedule/create-prefill-arrival.ts` — mobile create-prefill arrival; pattern suggestions on mobile land here.
- `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte` — the shift create/edit sheet on mobile; the insertion point for predictive presets.

**Stale E2E test fixes**
- `apps/web/tests/e2e/calendar-offline.spec.ts` — `route-mode` expectation needs updating (production behavior is correct, assertion is stale).
- `apps/mobile/tests/e2e/mobile-assembly.spec.ts` — `top-pick ordering sensitivity` assertion needs updating.

**Release hardening**
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — accessibility: ARIA roles, keyboard navigation on shift cards.
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte` — accessibility and onboarding messaging.
- `apps/web/src/routes/(app)/groups/+page.svelte` — onboarding empty state UX refinement.
- `apps/mobile/src/routes/+layout.svelte` — mobile shell accessibility.
- `supabase/functions/notify-calendar-change/index.ts` — edge function; needs health check / observable failure modes.
- `docker-compose.yml` — deployment readiness; check for health endpoint wiring.
- `apps/web/src/service-worker.ts` — service worker; verify cache strategies for launch.

### Build Order

1. **Stale test fixes** (unblocks honest "tests pass" signal for everything downstream).
2. **Pattern detection pure module** in `@repo/caluno-core` — pure function `detectShiftPatterns(shifts: CalendarShift[])` → `ShiftPattern[]`. No DB queries, no auth. Fully unit-testable.
3. **Pattern suggestions on web** — load recent shifts in calendar page server load, pass patterns to the `ShiftEditorDialog`, surface as "Use pattern" buttons that call `buildCreatePrefillHref`.
4. **Find time smart defaults** — remember last-used duration and range start per-calendar in `sessionStorage` (web) and `AsyncStorage` (mobile); inject into `loadFindTimeSearchView`.
5. **Pattern suggestions on mobile** — same pattern detection module, rendered in `ShiftEditorSheet`.
6. **Accessibility pass** — keyboard nav, ARIA, color contrast, focus management across both apps.
7. **Onboarding polish** — refine empty states, add contextual help text.
8. **Deployment hardening** — health endpoint, environment checklist, Docker compose review.
9. **Final E2E coverage** — write/update tests for all predictive features.

### Verification Approach

- **Pattern detection**: unit tests in `@repo/caluno-core` covering detection from single shifts, series, sparse data, and empty input.
- **Web pattern suggestions**: Playwright E2E — open calendar with known shift history, verify suggestions appear in editor, verify pre-fill values are correct, verify "no patterns" degrades cleanly.
- **Find time smart defaults**: E2E — use find-time once, navigate away, return, verify duration and start are pre-populated.
- **Mobile**: Playwright mobile tests mirroring web assertions through `ShiftEditorSheet`.
- **Stale fixes**: `pnpm test:e2e` passes with zero skips or workarounds.
- **Accessibility**: `axe` scan on key routes; keyboard-only navigation walkthrough.
- **Deployment**: `docker compose up` reaches health endpoint; environment variable checklist is complete.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Recurrence expansion | `packages/caluno-core/src/schedule/recurrence.ts` (rrule) | Already handles daily/weekly/monthly correctly |
| Pre-fill URL construction | `buildCreatePrefillHref` in `caluno-core` | Shared contract already consumed by both apps |
| Find time window ranking | `rankFindTimeWindows` in `caluno-core` | Don't duplicate scoring; extend with new factors |
| Accessibility audit | axe-core / @axe-core/playwright | Available in the Playwright ecosystem, no custom audit needed |

## Constraints

- Pattern detection must operate only on shifts the current user can already access through existing RLS — no new database grants.
- Predictive features must degrade cleanly offline; they must not block the calendar from loading when patterns cannot be loaded.
- No new inference backends, ML models, or external AI APIs — all prediction must be deterministic and explainable from real shift data.
- Mobile pre-fill integration must reuse `ShiftEditorSheet` rather than introducing a second create surface (M003 decision).
- The calm, focused UX tone must be preserved — predictive surfaces should be subtle suggestions, not persistent notifications or dashboards.

## Common Pitfalls

- **Patterns from series vs. singles** — Detecting patterns from `shift_series` is straightforward (explicit recurrence); detecting patterns from densely-repeated single shifts requires careful deduplication to avoid false positives. Process series-backed patterns first; only surface single-shift patterns when confidence is high.
- **Find time defaults polluting the trust model** — Smart defaults must remain advisory UI state; they must never bypass the `normalizeFindTimeDuration` / `normalizeFindTimeSearchRange` validation chain. Store them in browser/device storage only, not in the URL or server state.
- **Accessibility regressions from pattern UI** — New suggestion buttons must be keyboard-accessible and have explicit ARIA labels. Verify with axe after each component addition.
- **Stale test assertions** — The two known stale assertions in `calendar-offline.spec.ts` and `mobile-assembly.spec.ts` must be addressed in the first slice, before hardening work, so the test signal is trustworthy throughout M004.

## Open Risks

- Pattern detection quality depends on how much shift history exists per calendar — for new users or sparse calendars, patterns may be empty. The empty state must degrade gracefully without showing a misleading "no patterns yet" prompt that confuses onboarding.
- Real APNs/FCM delivery on provisioned devices is still deferred from M003. If M004 ships to real users, this gap must be addressed, but it may be out of scope depending on launch target.
- The two stale E2E assertions have not been reproduced in a fresh environment — they may be simple assertion string updates, or they may reveal a deeper behavior difference. Treat them as a risk until fixed.

## Candidate Requirements (Advisory)

The following observations from codebase research are surfaced as candidates, not auto-bound:

- **R-CANDIDATE-01**: Shift pattern suggestions should degrade gracefully when no pattern is detectable (< 2 matching shifts), showing no suggestions rather than an empty state.
- **R-CANDIDATE-02**: Find time should remember the last-used duration and range start per calendar as a UX convenience (advisory, not a trust contract).
- **R-CANDIDATE-03**: A production health/readiness endpoint should exist before launch to allow deployment monitoring.
- **R-CANDIDATE-04**: All interactive elements on the calendar board and shift editor must be keyboard-navigable with visible focus indicators (accessibility table stakes for launch).

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| SvelteKit | None specific found in available_skills | — |
| Supabase | None specific found in available_skills | — |
| Accessibility audit | `accessibility` | installed (available_skills) |
| Frontend design polish | `frontend-design`, `make-interfaces-feel-better` | installed (available_skills) |
| React/component best practices | `react-best-practices`, `userinterface-wiki` | installed (available_skills) |
