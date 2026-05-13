---
phase: M005
phase_name: Predictive assistance and release hardening
project: Caluno
generated: 2026-05-14T00:00:00Z
counts:
  decisions: 4
  lessons: 5
  patterns: 5
  surprises: 3
missing_artifacts:
  - S01-ASSESSMENT.md
  - S02-ASSESSMENT.md
  - S03-ASSESSMENT.md
  - S04-ASSESSMENT.md
  - S05-ASSESSMENT.md
  - S06-ASSESSMENT.md
  - M005-ROADMAP.md boundary map
---

# M005 Learnings

## Decisions

- **Predictive helper determinism over wall-clock time**: All predictive helpers (`detectRecurrencePattern`, `previewShiftConflicts`) anchor their evidence window to the latest valid shift in the provided dataset rather than `Date.now()`, and filter malformed/inverted/duplicate rows fail-closed before applying thresholds.
  Source: S02-SUMMARY.md/Key decisions

- **Advisory-only conflict previews with no blocking write policy**: Conflict previews return overlapping same-calendar `CalendarShift[]` rows without adding any blocking write gate, keeping the user in control and maintaining parity with the existing visible-week conflict semantics in the board.
  Source: S02-SUMMARY.md/Key decisions

- **Bounded predictive loader scoped to authorized calendar + fixed trailing 30-day window**: The recurrence suggestion loader is scoped to the authorized calendar id and a fixed trailing 30-day window ending at the visible week's exclusive end; it fails closed to null on query errors or malformed rows, never widening scope.
  Source: S03-SUMMARY.md/Key decisions

- **Accessibility verification stays slice-scoped (axe on predictive subtree only)**: Accessibility hardening late in a milestone was delivered by running `@axe-core/playwright` only on the seeded predictive create editor subtree (`[data-testid="create-shift-editor"]`), not a whole-app scan, to keep the proof anchored to the shipped surface without surfacing pre-existing issues outside scope.
  Source: S06-SUMMARY.md/Key decisions

## Lessons

- **Parallel Supabase reset contention on local containers**: Running multiple `supabase db reset --local` calls in parallel causes container teardown contention; retrying reruns serially resolves the flakiness without any product code changes.
  Source: S06-SUMMARY.md/Deviations

- **Recurring create reconciliation must tolerate extra trusted server ids for off-screen occurrences**: When a recurring create is accepted and submitted, the server response may return more occurrence ids than the visible board has staged locally (for off-screen slots). The reconciliation logic must map visible staged shifts to the leading trusted server ids and ignore extras rather than requiring exact cardinality.
  Source: S03-SUMMARY.md/Deviations

- **Full web E2E regression suites have pre-existing flakiness not caused by M005**: The `auth-groups-access.spec.ts:45` failure is a shell-diagnostic rendering order issue (groups-shell now shows both trusted-online and onboarding-empty as separate articles); the `find-time.spec.ts:21` failure is seeded-data drift (10 vs 11 truthful windows). Neither is caused by M005 changes. Scoped per-slice suites are the reliable verification method; full regressions require baseline stabilization first.
  Source: M005-VALIDATION.md/Verdict Rationale

- **Slice-ASSESSMENT.md artifacts were not produced**: None of the six slices produced a `*-ASSESSMENT.md` artifact. The validation audit identified this as a process gap. Future milestones should enforce assessment artifact production before slice completion.
  Source: M005-VALIDATION.md/Slice Delivery Audit

- **Route-state diagnostics should use typed attributes, not prose, for browser E2E proof surfaces**: Coupling Playwright assertions to user-facing copy (e.g., "trusted-online" text inside a paragraph) makes tests brittle to wording changes. Typed attributes like `data-route-mode` and `data-route-reason` on `calendar-route-state` decouple proofs from copy changes and make assertions stable.
  Source: S06-SUMMARY.md/What Happened

## Patterns

- **Predictive UI surfaces should be calm, nullable hints, not authoritative defaults**: Suggestions are surfaced as dismissable chips with semantic accept/dismiss buttons, announced via ARIA live regions for accessibility, and instrumented with stable `data-testid` hooks (recurrence-suggestion, recurrence-suggestion-accept, recurrence-suggestion-dismiss, clash-advisory) for browser proof without brittle selector coupling.
  Source: S03-SUMMARY.md/Patterns established; S04-SUMMARY.md/Patterns established

- **Mobile predictive behavior splits cleanly between route-owned diagnostics and sheet-local helper**: The calendar route owns recurrence-suggestion diagnostics for the visible week; `ShiftEditorSheet` plus `shift-editor-predictive.ts` own accept/dismiss lifecycle and clash-advisory rendering. Keeping route data truth separate from sheet UI state lets close/reopen preserve dismissals while resetting cleanly on fresh payloads.
  Source: S05-SUMMARY.md/Patterns established

- **Structured DOM diagnostics enable deterministic Playwright proofs across web and mobile**: Using typed `data-*` attributes (e.g., `data-route-mode`, `data-route-reason`, `data-testid="recurrence-suggestion"`) rather than prose assertions makes E2E proofs copywriting-agnostic and cross-platform comparable.
  Source: S06-SUMMARY.md/Patterns established; S03-SUMMARY.md/Patterns established

- **Re-run clean-reset web, mobile, and build proofs before requirement validation**: Requirement state should reflect fresh runtime evidence — running `supabase db reset --local` before each proof suite ensures seeded data is clean and results are not contaminated by prior test mutations.
  Source: S06-SUMMARY.md/Patterns established

- **Documentation-only slices should verify the planning contract by cross-checking artifacts**: For slices that produce planning artifacts rather than code, closeout verification should cross-check context, decisions, requirements, and roadmap artifacts for internal consistency instead of forcing redundant rewrites.
  Source: S01-SUMMARY.md/Patterns established

## Surprises

- **Full web E2E regressions failed on tests not related to M005 scope**: Running the complete `tests/e2e/` suite post-M005 surfaced failures in `auth-groups-access.spec.ts` and `find-time.spec.ts` that trace to pre-existing test brittleness (shell diagnostic layout) and seeded-data drift (window count mismatch), not M005 changes. This was unexpected given S06's clean targeted reruns.
  Source: M005-VALIDATION.md/Verdict Rationale

- **Boundary map was never written into M005-ROADMAP.md**: Despite being a required section per the roadmap template, the boundary map remained "Not provided." throughout the milestone. The cross-slice integration was proven via slice summaries but not formally documented in the roadmap.
  Source: M005-VALIDATION.md/Cross-Slice Integration

- **Touching-boundary advisory-free flow previously failing now passes**: The `calendar-shifts` touching-boundary advisory-free case, which had been a failure in earlier regression runs, passed cleanly in M005 verification reruns. This suggests the earlier failure was environmental/ordering-sensitive rather than a real regression.
  Source: M005-SUMMARY.md/Blockers (prior session notes)
