---
id: T01
parent: S03
milestone: M002
key_files:
  - apps/web/src/lib/schedule/create-prefill.ts
  - apps/web/tests/schedule/create-prefill.unit.test.ts
key_decisions:
  - Require the explicit handoff shape `create=1`, `start`, `prefillStartAt`, `prefillEndAt`, and `source=find-time` so malformed or partial URLs fail closed instead of being interpreted heuristically.
  - Canonicalize accepted ISO instants to UTC and reject any handoff whose supplied `start` week does not match the Monday-derived week from `prefillStartAt`.
duration: 
verification_result: passed
completed_at: 2026-04-18T20:12:22.378Z
blocker_discovered: false
---

# T01: Added a shared create-prefill contract that derives slot-based calendar weeks and rejects malformed handoff params.

**Added a shared create-prefill contract that derives slot-based calendar weeks and rejects malformed handoff params.**

## What Happened

I added `apps/web/src/lib/schedule/create-prefill.ts` as the single pure contract owner for suggestion-to-calendar handoff generation and destination parsing. The helper now builds timing-only calendar hrefs with `create=1`, `start`, `prefillStartAt`, `prefillEndAt`, and `source=find-time`, derives the visible week from the selected slot’s `startAt` using Monday-bounded UTC math, normalizes accepted ISO instants to canonical UTC strings, and fails closed for partial, malformed, zero-length, end-before-start, or mismatched week payloads. I also created `apps/web/tests/schedule/create-prefill.unit.test.ts` to name the accepted contract shape explicitly and to cover valid generation, valid parsing, Monday week derivation, later-horizon boundary cases, and invalid-input rejection. No broader route or UI wiring was changed in this task; this work retires the pure-contract risk for the next slice tasks.

## Verification

Verified the contract with `pnpm --dir apps/web exec vitest run tests/schedule/create-prefill.unit.test.ts`, which passed all five new unit cases, and with `pnpm --dir apps/web check`, which completed with zero Svelte or TypeScript diagnostics. I also attempted an LSP diagnostics pass, but no language server is configured in this workspace, so the shell verification commands are the authoritative proof for this task.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web exec vitest run tests/schedule/create-prefill.unit.test.ts` | 0 | ✅ pass | 1286ms |
| 2 | `pnpm --dir apps/web check` | 0 | ✅ pass | 3006ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/lib/schedule/create-prefill.ts`
- `apps/web/tests/schedule/create-prefill.unit.test.ts`
