---
id: M004
title: "M003 test-hygiene close-out"
status: complete
completed_at: 2026-05-06T16:34:17.303Z
key_decisions:
  - M004 rescoped to test-hygiene close-out from M003/S05
  - R011 deferred to a future milestone
key_files:
  - apps/mobile/tests/e2e/calendar-offline.spec.ts
  - .gsd/milestones/M004/M004-ROADMAP.md
  - .gsd/REQUIREMENTS.md
lessons_learned:
  - (none)
---

# M004: M003 test-hygiene close-out

**Fixed the stale trusted-online→trusted-offline E2E assertion from M003/S05 and formally deferred predictive scheduling (R011) to a future milestone.**

## What Happened

M004 was originally scoped as predictive assistance and release hardening, but in practice it contained only one slice: fixing the stale route-mode assertion in apps/mobile/tests/e2e/calendar-offline.spec.ts that was flagged as a known gap in M003/S05. The milestone was validated, found to have an empty roadmap and unaddressed R011, then remediated by rescoping to match the actual delivered work. S01 corrected the test assertion (trusted-online → trusted-offline at line 41) and verified it with Playwright. S02 updated the M004 roadmap with honest vision/success criteria and formally deferred R011 to a future milestone. Validation re-ran and passed at remediation round 1.

## Success Criteria Results

- ✅ Stale `trusted-online` assertion corrected — Playwright passes (exit 0, 1 passed in 6.8s)\n- ✅ No production code changed — test-code-only fix confirmed\n- ✅ R011 formally deferred — REQUIREMENTS.md updated

## Definition of Done Results

All slices complete (S01, S02). Validation passed at round 1. No outstanding follow-ups or known limitations.

## Requirement Outcomes

- R011 (predictive scheduling): deferred to future milestone. Not abandoned — explicitly planned for M005+.

## Deviations

M004 was originally titled 'Predictive assistance and release hardening' but was rescoped during validation remediation to reflect actual delivered work.

## Follow-ups

R011 (predictive scheduling assistance) is deferred and ready to become the primary goal of M005.
