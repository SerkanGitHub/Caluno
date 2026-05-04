---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T03: Verify full pnpm test:e2e baseline is green

Run the full E2E suite across both web and mobile to confirm no regressions. Log the full output. If any spec other than the two targeted ones fails, treat it as a blocker and raise it before proceeding to M004/S02.

## Inputs

- `apps/web/tests/e2e/`
- `apps/mobile/tests/e2e/`

## Expected Output

- `gsd_exec stdout log showing pnpm test:e2e exit 0`

## Verification

pnpm test:e2e exits 0; output saved to gsd_exec for evidence
