---
verdict: needs-attention
remediation_round: 1
---

# Milestone Validation: M001

## Success Criteria Checklist
- [x] Previously synced calendars reopen offline and queued local edits survive reload in isolated browser proof.
- [x] Reconnect drain returns to `0 pending / 0 retryable` in isolated browser proof.
- [x] Collaborator updates appear live in isolated browser proof and next-week scope guards remain fail-closed.
- [x] Missing S01-S04 assessment artifacts now exist.
- [ ] The clean local reset combined command for `calendar-offline.spec.ts` plus `calendar-sync.spec.ts` is green end-to-end. Current blocker: earlier preview-backed mutations still change the seeded baseline assumed by the later sync spec.

## Slice Delivery Audit
| Slice | Delivered output | Assessment status | Verdict |
|---|---|---|---|
| S01 | Trusted auth/session, memberships, permitted calendar access, fail-closed denied routes | S01-ASSESSMENT.md present | PASS |
| S02 | Concrete schedule rows, trusted route actions, calm multi-shift board | S02-ASSESSMENT.md present | PASS |
| S03 | Browser-local continuity, cached shell/snapshots, local-first queue | S03-ASSESSMENT.md present | PASS |
| S04 | Replay/rebase sync engine, reconnect drain, realtime-triggered trusted refresh | S04-ASSESSMENT.md present | PASS |
| S05 | Conflict visibility and milestone assembly evidence | Existing S05-ASSESSMENT.md present | PASS |
| S06 | Offline proof hardening, realtime startup repair, stronger sync helpers, assessment backfill | Slice execution evidence exists; combined browser proof still has one shared-state verification blocker | NEEDS-ATTENTION |

## Cross-Slice Integration
| Boundary | Expected | Current evidence | Verdict |
|---|---|---|---|
| S01 → S03/S04/S06 auth boundary | Trusted SSR auth scope remains the only authority for protected routes and browser session continuity must not widen scope. | Isolated S06 offline and sync proof still sign in through trusted routes, hydrate the browser client from trusted layout session data, and keep unauthorized/unsynced route handling fail-closed. | PASS |
| S02 → S03/S04/S06 schedule authority | Concrete shift rows and `/calendars/[calendarId]` actions remain the only write authority. | Offline reconnect drain still replays create/edit/move/delete through trusted actions; sync proof still treats visible board state plus route diagnostics as the authority. | PASS |
| S03 → S06 offline continuity | Previously synced calendars reopen offline and retain local-first queue/snapshot semantics. | `calendar-offline.spec.ts` now passes in isolation on a clean reset, proving cached reopen, reload continuity, unsynced-route denial, and reconnect drain. | PASS |
| S04 → S06 realtime proof | Collaborator refresh should use realtime as change detection plus trusted refresh, while out-of-scope next-week views stay unchanged. | Isolated `calendar-sync.spec.ts` now passes in isolation with collaborator refresh reaching `applied` and next-week scope guards remaining closed. | PASS |
| Combined S03+S04+S06 browser proof | Offline and sync proof should both pass in one clean-reset command without hidden state coupling. | The combined command still fails because earlier preview-backed mutations shift the seeded-week baseline assumed by later sync assertions. | NEEDS-ATTENTION |

## Requirement Coverage
| Requirement | Current evidence | Verdict |
|---|---|---|
| R001 | S01/S03 contracts still hold and S06 isolated offline proof confirms cached-session continuity for previously synced Alpha calendars. | NEEDS-ATTENTION — strong supporting evidence, but milestone validation remains tied to the combined browser proof gap. |
| R004 | Isolated S06 offline proof now passes for offline reopen, reload continuity, local edits, and reconnect drain. | NEEDS-ATTENTION — evidence is strong but not yet closed at assembled milestone level because the combined clean-reset browser command still fails. |
| R005 | Isolated S06 sync proof now passes for collaborator realtime refresh, trusted refresh application, and out-of-scope next-week guards. | NEEDS-ATTENTION — architecture and isolated proof look good, but the milestone still lacks a green combined browser run. |
| R006 | Conflict warnings remain visible through offline reload, reconnect, and collaborator refresh in isolated proof. | NEEDS-ATTENTION — conflict visibility is well evidenced, but final milestone validation still depends on the combined browser command. |
| R002 / R012 | Upstream auth/access and permitted-calendar boundaries remain intact and are reaffirmed by S06 reruns. | PASS |
| Out-of-scope requirements (R008+) | No new milestone evidence. | UNCHANGED |

## Verification Class Compliance
| Class | Evidence | Verdict |
|---|---|---|
| Contract | `pnpm --dir apps/web check` plus 40 passing unit tests across conflicts, board, offline queue, sync engine, and server actions. | PASS |
| Integration | Isolated `calendar-offline.spec.ts` and `calendar-sync.spec.ts` both pass on clean resets. | PASS |
| Operational | Combined clean-reset browser command still fails because spec-order state mutation changes the later sync baseline. | NEEDS-ATTENTION |
| UAT | Slice UAT can be written from the passing isolated flows plus the known combined-run blocker. | NEEDS-ATTENTION |


## Verdict Rationale
S06 materially improved milestone evidence: isolated offline and sync browser proof now pass, missing slice assessments exist, and requirements R005/R006 now point to current evidence. However, the milestone cannot be treated as fully validated yet because the required combined clean-reset browser command still fails due to shared-state verification drift between offline and sync specs.
