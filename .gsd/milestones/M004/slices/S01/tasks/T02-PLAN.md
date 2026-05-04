---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T02: Fix mobile-assembly.spec.ts phase-3 top-pick order sensitivity

In apps/mobile/tests/e2e/mobile-assembly.spec.ts, the phase-3 top-pick assertion is order-sensitive when find-time-handoff.spec.ts runs first (shared DB state pollution). Per M003 follow-up: either change the assertion to check slot count rather than exact rank, or add a per-spec beforeAll Supabase DB reset in both find-time-handoff.spec.ts and mobile-assembly.spec.ts so they are independently seeded. Prefer the slot-count approach if it is sufficient; use DB reset only if slot-count assertion cannot distinguish correctness.

## Inputs

- `apps/mobile/tests/e2e/mobile-assembly.spec.ts`
- `apps/mobile/tests/e2e/find-time-handoff.spec.ts`
- `.gsd/milestones/M003/slices/S05/S05-SUMMARY.md`

## Expected Output

- `apps/mobile/tests/e2e/mobile-assembly.spec.ts (updated assertion or beforeAll reset)`
- `apps/mobile/tests/e2e/find-time-handoff.spec.ts (beforeAll reset if chosen)`

## Verification

pnpm --filter @repo/mobile test:e2e exits 0 when all mobile specs run together in default order
