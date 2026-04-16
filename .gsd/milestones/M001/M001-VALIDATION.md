---
verdict: needs-remediation
remediation_round: 0
---

# Milestone Validation: M001

## Success Criteria Checklist
## Reviewer C — Acceptance Criteria

_No slice `*-ASSESSMENT.md` files were present under `.gsd/milestones/M001/slices/`; evidence below comes from slice `*-SUMMARY.md` and `*-UAT.md` artifacts._

- [x] Users can sign in, create or join groups, and open only the shared calendars they are allowed to access in the browser | `S01-SUMMARY.md` shows passing type/unit/browser proof for sign-in, join-code flows, permitted calendar access, and explicit denial for unauthorized calendar URLs; `S01-UAT.md` covers the same paths.
- [x] Users can create, edit, move, and delete multiple shifts per day through browser calendar views | `S02-SUMMARY.md` records passing browser proof (`calendar-shifts.spec.ts`) for same-day density plus create/edit/move/delete; `S02-UAT.md` enumerates those flows and expected outcomes.
- [ ] Previously synced calendars remain readable and editable offline with a cached session | `S03-SUMMARY.md` says the offline substrate landed, but also says the full browser proof was “not completely green”; `S05-SUMMARY.md` still records cached reopen failing with `offline-denied` / `snapshot-missing` in preview-backed Playwright.
- [ ] Local edits reconcile deterministically after reconnect | `S04-SUMMARY.md` proves replay/rebase and reconnect drain at unit/build level, but the preview-backed browser proof for offline/reconnect remains blocked; `S05-SUMMARY.md` still treats this as milestone validation follow-up.
- [ ] Live shared updates between group members are proven in real browser flows | `S04-SUMMARY.md` and `S05-SUMMARY.md` both record realtime/collaborator browser proof gaps: channel readiness without reliable remote refresh application in Playwright.
- [x] Baseline conflicts such as overlapping shifts or double-booking are visible and do not silently corrupt schedule meaning | `S05-SUMMARY.md` records delivered board/day/shift conflict warnings, passing unit/type/trusted-online proof, correct seeded overlap visibility, and clean touch-boundary exclusion; summary evidence is clear even though broader offline/realtime milestone proof is still incomplete.
- [x] The browser scheduling experience remains clear, low-clutter, and fit for everyday coordination work | `S02-SUMMARY.md` explicitly validates `R007` with the calm custom week board and browser proof; `S05-SUMMARY.md` says conflict warnings remain visually separate from sync/realtime transport diagnostics.

## Slice Delivery Audit
## MV02 — Slice Delivery Audit

| Slice | SUMMARY.md | ASSESSMENT.md | Status | Notes |
|---|---|---|---|---|
| S01 | Present (`.gsd/milestones/M001/slices/S01/S01-SUMMARY.md`) | Missing | Needs attention | Summary passes and documents auth/access proof, but no slice assessment artifact is present. |
| S02 | Present (`.gsd/milestones/M001/slices/S02/S02-SUMMARY.md`) | Missing | Needs attention | Summary passes and documents schedule CRUD/browser proof, but no slice assessment artifact is present. |
| S03 | Present (`.gsd/milestones/M001/slices/S03/S03-SUMMARY.md`) | Missing | Needs attention | Summary exists, but browser proof is explicitly incomplete and no assessment artifact is present. |
| S04 | Present (`.gsd/milestones/M001/slices/S04/S04-SUMMARY.md`) | Missing | Needs attention | Summary exists, but realtime/reconnect browser proof remains blocked and no assessment artifact is present. |
| S05 | Present (`.gsd/milestones/M001/slices/S05/S05-SUMMARY.md`) | Missing | Needs attention | Summary exists, but milestone validation follow-up is still called out and no assessment artifact is present. |

All roadmap slices have SUMMARY artifacts and are marked complete in `gsd_milestone_status`, but no slice-level ASSESSMENT artifacts were found. Because MV02 requires a passing assessment (or justified omission) for each slice, this audit remains open.

## Cross-Slice Integration
## Reviewer B — Cross-Slice Integration

No boundary map / produces-consumes contract block is present in `.gsd/milestones/M001/M001-ROADMAP.md`, so the boundaries below are derived from each slice SUMMARY `requires` / `provides` fields.

| Boundary | Producer Summary | Consumer Summary | Status |
|---|---|---|---|
| S01 → S02: trusted SSR auth state, membership-derived calendar scope, denied-route behavior | `S01-SUMMARY.md` says downstream slices inherit “a working authenticated shell, stable local fixtures, and a concrete authorization contract,” and its `provides` includes trusted session/membership/permitted-calendar data plus explicit denied handling. | `S02-SUMMARY.md` says it “re-verified the S01 trust boundary,” preserved the “explicit denied branch,” and re-proved cross-calendar denial and server-side authority checks. | Honored |
| S01 → S03: trusted auth/session validation, protected shell scope, fail-closed permitted routing | `S01-SUMMARY.md` documents the trusted auth boundary, protected shell loading, and fail-closed calendar access as downstream substrate. | `S03-SUMMARY.md` says it turned the shell into an offline continuity surface “without weakening the S01/S02 trust boundary,” and that offline reopen only works for “previously synced permitted calendars” while unauthorized ids still “fail closed.” | Honored |
| S02 → S03: concrete schedule rows, trusted CRUD actions, week-board editing surface | `S02-SUMMARY.md` says downstream slices can treat “concrete `shifts` rows, deterministic ids, typed schedule action states, and route-scoped visible-week loading” as inherited substrate. | `S03-SUMMARY.md` says online mode still trusts “server-validated scope and schedule data as before,” and the calendar page moved to a local-first controller on top of that schedule surface. | Honored |
| S02 → S04: trusted `/calendars/[calendarId]` actions and schedule authority model | `S02-SUMMARY.md` states every create/edit/move/delete mutation re-derives authority on the server and that downstream slices inherit deterministic ids plus typed mutation outcomes. | `S04-SUMMARY.md` says reconnect drains queued work “through the existing trusted `/calendars/[calendarId]` route actions,” and explicitly notes S02 server authority/access checks remain “the only write authority.” | Honored |
| S03 → S04: browser-local repository, cached week snapshots, persistent mutation queue | `S03-SUMMARY.md` says downstream slices inherit “a real offline continuity substrate,” including cached shell, browser-local schedule state, and explicit pending local work. | `S04-SUMMARY.md` says trusted refreshes no longer overwrite same-scope `local-write` snapshots while queue entries exist, and reconnect logic extends the controller/queue substrate from S03. | Honored |
| S04 → S05: local-first controller, reconnect drain, realtime change-detection substrate | `S04-SUMMARY.md` says it established deterministic replay, reconnect drain, and Realtime-triggered trusted refresh, with queue/sync/realtime diagnostics exposed on the board and route. | `S05-SUMMARY.md` says conflict warnings remain separate from “local-first, reconnect, and realtime transport diagnostics,” and that proof now inspects route mode, queue counts, sync phase, snapshot state, and realtime state together. | Honored |
| S03 → S05: browser-local offline continuity and cached protected-route scope | `S03-SUMMARY.md` provides cached shell reopen, browser-local week persistence, and offline protected-route fallback states. | `S05-SUMMARY.md` says the preview runtime was hardened by surfacing local snapshot state and adding browser-storage shadow persistence, and its remaining blocker is specifically cached-offline reopen showing `offline-denied` / `snapshot-missing`. | Honored |
| S02 → S05: trusted week board, shift CRUD actions, seeded multi-shift fixtures for conflict derivation | `S02-SUMMARY.md` says it delivered the custom week board, trusted schedule CRUD, and deterministic same-day/overlapping fixtures; it also notes S05 inherits same-day/overlap fixtures and the week board. | `S05-SUMMARY.md` says the board now computes overlaps from the effective visible week, and that the “seeded Thursday overlap plus clean Wednesday touch boundary now render correctly.” | Honored |

**PASS** — all derived cross-slice boundaries have matching producer and consumer confirmation in the slice summaries.

## Requirement Coverage
## Reviewer A — Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| R001 — Users can create an account, sign in, and continue using previously synced calendars offline with a cached session. | PARTIAL | S01 proves sign-in/session reload and protected access; S03 says cached-offline continuity was added, but its browser proof was only partially proven; S05 still records cached-offline reopen failing with `offline-denied` / `snapshot-missing`. |
| R002 — Users can create groups, assign roles, and share calendars so only permitted members can access shared schedule data. | PARTIAL | S01 says it implemented group creation/join, memberships, permitted calendar listing, and membership-derived access; the same summary also says role assignment is only modeled in SQL and not yet exposed as richer management UI. |
| R003 — Users can create, edit, move, and delete multiple shifts per day, including recurring patterns, through browser calendar views. | COVERED | S02 explicitly says it delivered the primary proof for R003, with unit coverage plus Playwright proof for same-day multi-shift rendering, bounded recurring create, edit, move, delete, and reload continuity. |
| R004 — Previously synced schedule data can be read and edited locally in the browser while offline. | PARTIAL | S03 says browser-local week snapshots, local mutation persistence, and offline local-first editing were added, but its final browser proof remained unstable; S04/S05 still record preview-backed offline proof failures. |
| R005 — Local-first schedule changes sync back to the backend deterministically, and live shared updates propagate to other group members when online. | PARTIAL | S04 says it implemented deterministic replay/rebase, reconnect drain through trusted actions, and Realtime-triggered refresh, but preview-backed offline/realtime Playwright proof was blocked; S05 still reports collaborator realtime refresh not consistently applying. |
| R006 — The system warns users about baseline schedule conflicts such as overlapping shifts, double-booking, or conflicting edits that would silently change schedule meaning. | PARTIAL | S05 says it added derived board/day/shift conflict warnings, with unit and trusted-online proof for seeded overlap/touch-boundary behavior; the same summary states R006 was advanced but not validated at slice close. |
| R007 — The browser scheduling experience is stress-friendly, clear, fast, and accessible enough for everyday coordination work. | COVERED | S02 explicitly says it delivered the primary proof for R007, with `pnpm --dir apps/web check`, unit coverage, and Playwright proof for the calm custom week board, explicit controls, visible denied state, and schedule diagnostics. |
| R008 — Caluno computes shared free-time windows across two or more users and explains why a suggested window works. | MISSING | No evidence in S01-S05 summaries; the milestone summaries focus auth, shared calendars, scheduling, offline persistence, sync/realtime, and conflict warnings. |
| R009 — The product remains coherent across web and mobile surfaces, with mobile added on top of the same scheduling substrate and domain model. | MISSING | No evidence in S01-S05 summaries of mobile delivery or cross-surface coherence proof. |
| R010 — Users receive reminders and change notifications for important schedule updates without undermining the calmness of the product. | MISSING | No evidence in S01-S05 summaries of reminder delivery or user-facing notification features. |
| R011 — Caluno provides predictive scheduling assistance that helps users anticipate better coordination options from their real schedule data. | MISSING | No evidence in S01-S05 summaries of predictive assistance or recommendation behavior. |
| R012 — Authentication, row-level policies, and sharing rules prevent cross-group data leakage and limit each user to calendars they are permitted to access. | COVERED | S01 says it proved row-level, membership-derived access control with explicit denied handling for unauthorized calendar URLs; S02 says cross-calendar denial and server-side mutation authority checks were re-proven during schedule editing work. |
| R013 — Caluno can suggest optional activities or plans based on matched time windows. | MISSING | No evidence in S01-S05 summaries. |
| R014 — Users can trade or hand off shifts inside a team workflow. | MISSING | No evidence in S01-S05 summaries. |
| R015 — Caluno can produce summary views such as monthly best days to meet. | MISSING | No evidence in S01-S05 summaries. |
| R016 — Caluno can generate AI-assisted shift plans or scheduling proposals. | MISSING | No evidence in S01-S05 summaries. |
| R017 — Caluno does not include chat or messaging features. | MISSING | No explicit evidence in S01-S05 summaries demonstrating or asserting this anti-feature. |
| R018 — Caluno does not become a social network product. | MISSING | No explicit evidence in S01-S05 summaries demonstrating or asserting this anti-feature. |
| R019 — Caluno does not expand into enterprise workforce management in the current vision. | MISSING | No explicit evidence in S01-S05 summaries demonstrating or asserting this constraint. |
| R020 — Caluno does not include complex analytics dashboards. | MISSING | No explicit evidence in S01-S05 summaries demonstrating or asserting this anti-feature. |
| R021 — Caluno does not target medical-grade documentation or clinical recordkeeping. | MISSING | No explicit evidence in S01-S05 summaries demonstrating or asserting this constraint. |

FAIL

## Verification Class Compliance
## Verification Classes

| Class | Planned Check | Evidence | Verdict |
|---|---|---|---|
| Contract | `M001-CONTEXT.md`: scheduling domain rules, local persistence boundaries, sync decisions, and conflict detection are covered by unit and integration tests plus substantive artifact checks. | Strong summary evidence across slices: `S01-SUMMARY.md` auth/access contract tests passed; `S02-SUMMARY.md` recurrence/server-actions/board tests passed; `S03-SUMMARY.md` offline-store/offline-queue tests passed; `S04-SUMMARY.md` sync-engine/offline-queue tests passed; `S05-SUMMARY.md` conflict unit tests passed. | PASS |
| Integration | `M001-CONTEXT.md`: the browser app, local store, Supabase auth, shared calendar access rules, realtime updates, and reconnect sync all work together across real subsystem boundaries. | Partial only. `S01-SUMMARY.md` and `S02-SUMMARY.md` prove auth/access and browser CRUD integration. But `S04-SUMMARY.md` records blocked preview-backed offline/realtime verification, and `S05-SUMMARY.md` still records failing cached reopen and collaborator refresh behavior. | NEEDS-ATTENTION |
| Operational | `M001-CONTEXT.md`: offline continuity, reconnect behavior, and cached-session access to previously synced calendars work under real browser lifecycle conditions. | Not closed. `S03-SUMMARY.md` says offline continuity substrate is delivered but browser proof still needed hardening; `S04-SUMMARY.md` records `repository-unavailable` / closed realtime channel issues in preview mode; `S05-SUMMARY.md` still shows cached reopen failing with `snapshot-missing`. | NEEDS-ATTENTION |
| UAT | `M001-CONTEXT.md` testing/final acceptance requires browser-level proof that explicitly exercises online editing, offline continuity, reconnect sync, and live shared updates between group members. | Browser UAT exists per slice (`S01-UAT.md` through `S05-UAT.md`), and online auth/access/editing flows have passing summary evidence (`S01-SUMMARY.md`, `S02-SUMMARY.md`). But the assembled offline/reconnect/realtime browser proof remains incomplete per `S04-SUMMARY.md` and `S05-SUMMARY.md`. | NEEDS-ATTENTION |


## Verdict Rationale
Parallel review found that cross-slice contracts compose correctly, but milestone validation cannot pass because acceptance criteria for offline reopen, reconnect sync, and live realtime collaboration remain only partially proven, slice ASSESSMENT artifacts are missing, and the requirements audit reports unresolved partial/missing coverage. Under the required aggregation rule, Reviewer A's FAIL result forces a needs-remediation verdict.

## Remediation Plan
1. Execute remediation slice S06 to harden the preview-backed offline/reconnect/realtime proof loop until cached offline reopen, reconnect drain, and collaborator refresh all pass in browser evidence. 2. Add explicit slice ASSESSMENT artifacts or justified omissions for S01-S05 so MV02 can be closed cleanly. 3. Reconcile milestone requirement mapping so touched requirements R001-R006/R012 have explicit validation evidence and out-of-scope requirements are clearly separated from M001 proof scope before rerunning validation.
