---
estimated_steps: 4
estimated_files: 2
skills_used:
  - debug-like-expert
---

# T01: Build the create-prefill contract and fail-closed validation proof

**Slice:** S03 — Suggestion-to-create handoff
**Milestone:** M002

## Description

Retire the contract risk before touching route or UI state. Add one pure helper that owns the suggestion handoff URL and the calendar-route prefill parser so every downstream path uses the same week-derivation and fail-closed validation rules.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Query-param inputs from the selected suggestion URL | Reject the handoff and return no prefill payload instead of guessing times or week scope. | Not applicable for pure parsing; keep the helper synchronous and deterministic. | Treat partial, invalid, or end-before-start timestamps as invalid and produce no prefill. |
| Existing week math and datetime-local conversion helpers | Keep the helper output contract explicit in tests so week-start regressions fail fast. | Not applicable for pure helper composition. | Prefer empty/invalid results over coercing malformed dates into a different week. |

## Load Profile

- **Shared resources**: none beyond pure in-process date parsing and string normalization.
- **Per-operation cost**: trivial; a few date parses and URLSearchParams reads per suggestion.
- **10x breakpoint**: correctness fails before performance if validation is too permissive or week math is duplicated.

## Negative Tests

- **Malformed inputs**: missing `prefillStartAt`, missing `prefillEndAt`, invalid ISO timestamps, invalid `start`, and empty strings.
- **Error paths**: end-before-start, zero-length windows, and mismatched derived-vs-supplied week context.
- **Boundary conditions**: slots later in the 30-day horizon, Monday-bounded week derivation, and exact-slot values that must round-trip into `datetime-local` strings.

## Steps

1. Add `apps/web/src/lib/schedule/create-prefill.ts` with helpers to build the suggestion-to-calendar href and to parse incoming prefill params.
2. Derive the destination `start=` week from the selected slot’s `startAt` value instead of the current find-time search anchor.
3. Fail closed for malformed, partial, or end-before-start payloads instead of coercing or inventing values.
4. Add unit coverage for valid generation, valid parsing, Monday week derivation, and invalid-input rejection.

## Must-Haves

- [ ] One helper owns both handoff href generation and calendar-route prefill parsing.
- [ ] Valid suggestions always derive the destination week from `window.startAt`.
- [ ] Malformed or partial inputs return no trusted prefill payload.
- [ ] Unit tests name the exact accepted and rejected contract shapes.

## Verification

- `pnpm --dir apps/web exec vitest run tests/schedule/create-prefill.unit.test.ts`
- `pnpm --dir apps/web check`

## Inputs

- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte` — current suggestion card data and existing route query patterns.
- `apps/web/src/lib/schedule/board.ts` — existing datetime-local formatting helpers used by the create flow.
- `.gsd/milestones/M002/slices/S03/S03-RESEARCH.md` — confirmed handoff constraints, especially week derivation and sticky-param risk.

## Expected Output

- `apps/web/src/lib/schedule/create-prefill.ts` — shared timing-only handoff builder and parser.
- `apps/web/tests/schedule/create-prefill.unit.test.ts` — pure contract coverage for valid and fail-closed cases.
