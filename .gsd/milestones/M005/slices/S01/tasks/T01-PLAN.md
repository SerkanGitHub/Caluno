---
estimated_steps: 12
estimated_files: 4
skills_used: []
---

# T01: Validate M005-CONTEXT.md completeness and record slice artifact

M005-CONTEXT.md was produced during milestone planning and already contains the full predictive feature brief. This task verifies the file is complete and records any missing decisions or requirement mappings so S02–S06 can proceed without ambiguity.

Steps:
1. Confirm `.gsd/milestones/M005/M005-CONTEXT.md` exists and has ≥4 sections covering: predictive feature set, launch criteria, out-of-scope, and open questions.
2. Confirm D063 decision is recorded in `.gsd/DECISIONS.md` (build detectRecurrencePattern + previewShiftConflicts; defer quiet-time).
3. Confirm R011 is active in `.gsd/REQUIREMENTS.md` with M005/S01 as owner.
4. Confirm M005-ROADMAP.md lists slices S02–S06 with correct depends chains.
5. If any of the above are missing, add them. No source code changes are required — this is a documentation/planning slice only.

Must-haves:
- M005-CONTEXT.md non-empty, ≥4 sections
- D063 present in DECISIONS.md
- R011 active and owned by M005/S01
- S02–S06 present in roadmap with correct dependency order

## Inputs

- `.gsd/milestones/M005/M005-CONTEXT.md`
- `.gsd/DECISIONS.md`
- `.gsd/REQUIREMENTS.md`
- `.gsd/milestones/M005/M005-ROADMAP.md`

## Expected Output

- `.gsd/milestones/M005/M005-CONTEXT.md`
- `.gsd/DECISIONS.md`
- `.gsd/REQUIREMENTS.md`

## Verification

grep -c '^##' .gsd/milestones/M005/M005-CONTEXT.md | grep -E '^[4-9]|^[1-9][0-9]' && grep -q 'D063' .gsd/DECISIONS.md && grep -q 'R011' .gsd/REQUIREMENTS.md && grep -q 'S06' .gsd/milestones/M005/M005-ROADMAP.md
