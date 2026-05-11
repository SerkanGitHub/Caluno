# M005: Predictive Assistance and Release Hardening — Milestone Brief

## Overview

M005 delivers predictive scheduling assistance and hardens the product for launch. It builds directly on the complete cross-platform coordination loop from M001–M004: trusted shared calendars, offline continuity, find-time matching, and cross-surface notification delivery are all working. The goal now is to make the product smarter about anticipating scheduling needs and ready for real users at scale.

All predictive features are implemented as pure TypeScript over existing Supabase schedule data — no external ML service, no new backend infrastructure beyond what already exists. The existing `shifts`, `shift_series`, find-time matcher/ranking, and conflict detection substrate supply all the raw material needed.

**R011 ownership:** This milestone owns and must validate R011 (predictive scheduling assistance).

---

## Predictive Feature Set

Two features are in scope for M005:

### Feature 1: Smart Recurrence Suggestions

When a user opens the shift create dialog, the system analyzes their recent shift history (last 30 days, same calendar) and surfaces a suggestion if a recognizable pattern exists — e.g. "You usually work Tuesdays 09:00–17:00. Use this pattern?" The user can accept (pre-fills the recurrence fields) or dismiss.

**What exists today:** `shifts` rows with `startAt`/`endAt`/`title`/`seriesId`, recurrence metadata in `shift_series`, `normalizeShiftDraft` in `@repo/caluno-core`. Server-side schedule load already queries shifts by calendar+week.

**What's new:** A `detectRecurrencePattern(shifts: CalendarShift[])` helper in `@repo/caluno-core/schedule/` that groups shifts by day-of-week + time-of-day and returns a suggestion when ≥3 occurrences match. A loader hint surfaces the suggestion into the shift create form on web and mobile.

**Acceptance test:**
- Unit: `detectRecurrencePattern` returns a suggestion when ≥3 same-weekday-same-hour shifts exist within 30 days, and returns null when data is sparse or irregular.
- Browser: Opening the create dialog on a calendar with a known pattern surfaces a suggestion chip. Accepting pre-fills recurrence fields. Dismissing leaves the form blank.

---

### Feature 2: 7-Day Clash Preview

Before a user commits a new shift, the system checks for likely conflicts with existing shifts on the same calendar within ±7 days of the proposed time, using the same overlap logic already in `conflicts.ts`. Extends conflict *detection* (post-write warnings) into conflict *prediction* (pre-create advisories).

**What exists today:** `computeVisibleWeekConflicts` in `@repo/caluno-core/schedule/conflicts.ts`. Conflict badges already render in the board/day/shift UI.

**What's new:** A `previewShiftConflicts(draft: NormalizedScheduleShiftDraft, existingShifts: CalendarShift[])` pure helper. A non-blocking advisory in the shift editor (`data-testid="clash-advisory"`).

**Acceptance test:**
- Unit: `previewShiftConflicts` returns overlapping shifts when draft overlaps existing shifts; returns empty array when clear.
- Browser: Creating a shift that would overlap an existing one shows a non-blocking advisory before the user confirms. The user can still save.

---

### Feature 3: Quiet-Time Protection — DEFERRED

Requires longitudinal shift data per member. Deferred to a future milestone.

---

## Launch Criteria

M005 ships when all of the following are true:

### Feature Completeness
- `detectRecurrencePattern` helper in `@repo/caluno-core`, unit-tested, wired into web shift create dialog
- `previewShiftConflicts` helper in `@repo/caluno-core`, unit-tested, surfaces non-blocking advisory in web and mobile editors
- Both features degrade gracefully when data is insufficient
- R011 validated

### Test Coverage
- Unit tests for both helpers in `@repo/caluno-core`
- Browser E2E for recurrence suggestion acceptance flow (web)
- Browser E2E for clash preview advisory flow (web)
- Mobile Playwright smoke confirms both surfaces render

### Accessibility Baseline
- Suggestion chip and clash advisory keyboard-navigable with ARIA labels
- No new WCAG 2.1 AA violations (axe-core scan on create dialog)

### Observability
- Recurrence detection logs structured result to server console
- Clash advisory renders `data-testid="clash-advisory"`

### Deployment Readiness
- `pnpm build` passes for web and mobile with no new type errors
- No new migrations required (pure TypeScript additions)
- All existing E2E tests pass (no regressions)
- Two stale M004 test assertions fixed: `calendar-offline.spec.ts` route-mode expectation and `mobile-assembly.spec.ts` top-pick ordering

---

## Out of Scope

- Remote ML, embeddings, or external prediction services
- Quiet-time protection (deferred)
- Changes to auth, RLS, offline continuity, or notification delivery contracts from M001–M004
- New database migrations
- Real APNs/FCM provider wiring

---

## Open Questions

1. Does `ShiftEditorSheet` have enough vertical space for a suggestion chip without layout regression? Verify before building mobile surface.
2. Pattern threshold of 3 occurrences in 30 days is a named constant — tune based on real usage.