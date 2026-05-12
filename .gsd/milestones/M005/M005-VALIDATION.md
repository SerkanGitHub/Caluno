---
verdict: needs-attention
remediation_round: 0
---

# Milestone Validation: M005

## Success Criteria Checklist
- [x] **Predictive or anticipatory scheduling features are live and covered by unit and E2E tests** — S02 delivered deterministic `detectRecurrencePattern` and `previewShiftConflicts` helper contracts with passing unit coverage; S03/S04 proved the web recurrence-suggestion and clash-advisory flows in Playwright; S05 proved mobile predictive parity; S06 re-ran predictive web/mobile/browser/build proof.
- [x] **R011 (predictive scheduling assistance) is validated** — S01 scoped R011, S02–S05 advanced it, and S06 marked `R011` validated in `.gsd/REQUIREMENTS.md` with fresh clean-reset web/mobile/build evidence.
- [ ] **Launch hardening: reliability, onboarding, performance, accessibility, observability, and deployment readiness are addressed** — accessibility/observability/build readiness are evidenced by S03–S06, but fresh full-regression web E2E verification (`npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e`) failed 3 existing specs (`auth-groups-access`, `calendar-shifts` touching-boundary advisory-free flow, and `find-time` ranked-window inventory), so hardening is not yet cleanly proven milestone-wide.
- [x] **UX is refined for calmness, polish, and fit/finish** — S03 and S04 describe calm, warning-only predictive surfaces; S05 carries the same behavior to mobile; code evidence shows semantic accept/dismiss buttons plus live-region clash advisories in `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` and `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte`.
- [ ] **All trust, privacy, and authorization constraints from prior milestones are maintained** — M005 summaries consistently preserve authorized-calendar/same-scope boundaries, but the fresh full web E2E regression includes a failure in `tests/e2e/auth-groups-access.spec.ts`, so milestone-closeout evidence does not yet re-prove the broader launch-hardening trust/authorization surface cleanly.
- [x] **Explicit UI and diagnostics exist for predictive features and hardening outcomes** — S03–S06 provide `data-testid="recurrence-suggestion"`, `recurrence-suggestion-accept`, `recurrence-suggestion-dismiss`, `data-testid="clash-advisory"`, and typed `calendar-route-state[data-route-mode][data-route-reason]` diagnostics, plus the scoped predictive create-editor axe seam in S06.

## Slice Delivery Audit
| Slice | Claimed output | Delivered evidence | Audit |
|---|---|---|---|
| S01 | Predictive feature brief, launch criteria, and downstream slice roadmap are fixed and internally consistent. | `S01-SUMMARY.md` + `S01-UAT.md` present; summary records context/decision/requirement/roadmap cross-checks; milestone status shows S01 complete. | Delivered, but no `S01-ASSESSMENT.md` artifact was present under `.gsd/milestones/M005`. |
| S02 | Shared recurrence and conflict-preview helpers with unit/regression proof. | `S02-SUMMARY.md` + `S02-UAT.md` present; summary records passing Vitest on recurrence/conflicts plus board/server-action regressions; milestone status shows S02 complete. | Delivered, but no `S02-ASSESSMENT.md` artifact was present. |
| S03 | Web recurrence suggestion chip wired, accept/dismiss behavior proven, loader bounded to authorized scope. | `S03-SUMMARY.md` + `S03-UAT.md` present; summary records browser proof for suggestion visible/accept/dismiss/reload flows; milestone status shows S03 complete. | Delivered, but no `S03-ASSESSMENT.md` artifact was present. |
| S04 | Web non-blocking clash advisory before save with browser proof. | `S04-SUMMARY.md` + `S04-UAT.md` present; summary records passing `svelte-check`, conflict-unit coverage, and Playwright overlap/clear create flows; milestone status shows S04 complete. | Delivered, but no `S04-ASSESSMENT.md` artifact was present. |
| S05 | Mobile predictive parity for recurrence suggestion and clash advisory with shared advisory helper and smoke coverage. | `S05-SUMMARY.md` + `S05-UAT.md` present; summary records passing mobile/web unit checks plus mobile predictive/assembly Playwright smoke; milestone status shows S05 complete. | Delivered, but no `S05-ASSESSMENT.md` artifact was present. |
| S06 | Final hardening, scoped accessibility proof, build readiness, and R011 validation. | `S06-SUMMARY.md` + `S06-UAT.md` present; summary records clean-reset offline/sync/calendar-shifts/mobile predictive/mobile assembly/build reruns and `R011` validation; milestone status shows S06 complete. | Delivered, but no `S06-ASSESSMENT.md` artifact was present. |

All six roadmap slices have SUMMARY/UAT artifacts and complete status in `gsd_milestone_status`, but no slice-level `*-ASSESSMENT.md` artifacts were found via `find .gsd/milestones/M005 -name '*-ASSESSMENT.md'`.

## Cross-Slice Integration
| Boundary | Producer Summary | Consumer Summary | Status |
|---|---|---|---|
| Roadmap boundary map | `M005-ROADMAP.md` ends with **“Boundary Map — Not provided.”** | No authoritative produces/consumes contract is recorded in the roadmap. | **GAP** |
| S02 → S03: `detectRecurrencePattern()` shared recurrence contract into web loader/dialog | `S02-SUMMARY.md` provides a deterministic recurrence-suggestion contract in `@repo/caluno-core`. | `S03-SUMMARY.md` wires the bounded recurrence suggestion into the protected web route and create dialog with browser proof. | **Honored** |
| S02 → S04: `previewShiftConflicts()` overlap contract into web advisory | `S02-SUMMARY.md` provides shared `previewShiftConflicts()` overlap semantics. | `S04-SUMMARY.md` explicitly builds the web clash advisory on top of the shared overlap contract and proves overlap/clear create flows. | **Honored** |
| S03 → S05: bounded recurrence-suggestion semantics into mobile parity | `S03-SUMMARY.md` provides the bounded recurrence suggestion contract and predictive web diagnostics. | `S05-SUMMARY.md` explicitly requires S03 semantics and threads recurrence suggestions through the mobile route→board→sheet flow. | **Honored** |
| S04 → S05: non-blocking clash-advisory rule into mobile parity | `S04-SUMMARY.md` provides truthful same-calendar advisory semantics and `data-testid="clash-advisory"`. | `S05-SUMMARY.md` explicitly requires S04’s warning-only clash rule and reuses the shared helper on mobile. | **Honored** |
| S02–S05 → S06: predictive surfaces into final hardening/validation | S02–S05 summaries establish shared helper contracts plus web/mobile predictive surfaces and diagnostics. | `S06-SUMMARY.md` re-runs predictive web/mobile/browser/build verification and validates `R011` against those shipped surfaces. | **Honored** |

Cross-slice composition is evidenced end-to-end for both recurrence suggestions and clash advisories, but the roadmap still lacks the authoritative boundary map requested by MV03.

## Requirement Coverage
| Requirement | Milestone Scope Status | Evidence |
|---|---|---|
| R011 | Fully covered | `S01-SUMMARY.md` scopes R011 as the M005 predictive-assistance requirement; `S02-SUMMARY.md`, `S03-SUMMARY.md`, `S04-SUMMARY.md`, and `S05-SUMMARY.md` each advance only R011 through shared helper contracts, web recurrence suggestions, web clash advisories, and mobile predictive parity while recording no newly surfaced, invalidated, or re-scoped requirements; `S06-SUMMARY.md` advances and validates R011 with fresh clean-reset web/mobile/build verification and `.gsd/REQUIREMENTS.md` renders `R011` as `validated`.

Milestone-scope requirement coverage passes: the inlined milestone context lists only R011 as advanced/validated, and no slice introduced additional requirement deltas that remain unaccounted for.

## Verification Class Compliance
## Verification Classes

No inlined milestone verification classes were planned in `.gsd/milestones/M005/M005-CONTEXT.md` or `.gsd/milestones/M005/M005-ROADMAP.md`, so there is no milestone-level `Contract` / `Integration` / `Operational` / `UAT` table to score.


## Verdict Rationale
M005 successfully delivered and validated the predictive-assistance scope it owns: R011 is fully covered across S01–S06, the shared helper contracts compose into web and mobile surfaces, and scoped accessibility/build proof exists. The milestone cannot receive a clean pass yet because milestone-level validation still has documentation/process gaps (missing roadmap boundary map and missing slice assessment artifacts) and a fresh full web E2E regression surfaced three failing existing specs, so launch-hardening evidence is incomplete even though the predictive feature itself is in good shape.
