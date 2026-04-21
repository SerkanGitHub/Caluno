# M003 Parallel Research Handoff

## Summary

Parallel research for milestone M003 confirmed that the remaining mobile work should preserve the already-proven web trust and continuity contracts while shipping phone-first flows.

## Findings advanced into downstream slice research

- Shared pure contracts for mobile/web reuse belong in `@repo/caluno-core`, not under `apps/web/src`.
- Mobile Find time must stay live and fail closed offline instead of replaying cached answers.
- Mobile should add a compact, contextual Find time route from the calendar surface rather than a new global tab.
- Chosen Find time suggestions should hand off into the existing mobile create sheet through the strict timing-only prefill contract, then strip one-shot query params after arrival.
- Notification work should build on the truthful mobile route, continuity, and diagnostics substrate already established in S01/S02.

## Output

These findings were expanded into slice-specific research such as `M003/S03` and should be treated as the planning baseline for the remaining M003 mobile slices.
