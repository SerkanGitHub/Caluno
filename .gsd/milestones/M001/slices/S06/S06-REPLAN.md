# S06 Replan

**Milestone:** M001
**Slice:** S06
**Blocker Task:** T02
**Created:** 2026-04-16T14:06:27.917Z

## Blocker Description

The isolated preview-backed sync proof still fails after stronger assertions and a minimal realtime auth-order fix: the writer session creates and renders the overlapping shift, but the collaborator session stays at data-channel-state="ready" with data-remote-refresh-state="idle" and never records a shared-shift signal. The remaining fault now points to a deeper backend/realtime delivery contract problem (likely publication/RLS/realtime payload visibility or trusted refresh triggering), so the old artifact-closure task cannot proceed until collaborator delivery is root-caused and fixed.

## What Changed

Replaced the old closeout-only remaining task with a root-cause remediation task that investigates and fixes collaborator realtime delivery across the preview-backed stack before any validation artifacts are promoted. Added a follow-up closure task that reruns the isolated and combined browser proof, then updates assessments, requirements, and milestone validation only after the repaired collaborator path is green.
