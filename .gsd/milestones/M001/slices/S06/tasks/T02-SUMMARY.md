---
id: T02
parent: S06
milestone: M001
key_files:
  - apps/web/src/lib/offline/sync-engine.ts
  - apps/web/tests/schedule/sync-engine.unit.test.ts
  - apps/web/tests/e2e/calendar-sync.spec.ts
  - .gsd/KNOWLEDGE.md
key_decisions:
  - Applied realtime auth before opening the shared shift channel and locked that ordering with a unit test instead of assuming the browser client would authenticate the socket in time.
  - Changed the collaborator proof to target `data-remote-refresh-state="applied"` rather than the transient `INSERT at ...` label, because the task contract called for calmer board/queue/realtime diagnostics.
  - Escalated this task as a blocker when the collaborator still never received a refresh signal after the stronger proof surface and the minimal auth-order runtime fix, since the remaining fault now points outside the planned seam.
duration: 
verification_result: mixed
completed_at: 2026-04-16T14:03:12.424Z
blocker_discovered: true
---

# T02: Hardened the sync proof around remote-refresh diagnostics, added realtime auth ordering coverage, and captured a blocker: collaborator sessions still never receive the shared shift refresh signal in preview proof.

**Hardened the sync proof around remote-refresh diagnostics, added realtime auth ordering coverage, and captured a blocker: collaborator sessions still never receive the shared shift refresh signal in preview proof.**

## What Happened

I started by reproducing the clean-db failure exactly as planned and confirmed the first red assertion had moved from the old action-strip timing concern to the collaborator still never observing a shared shift realtime event. I then read the full proof helpers, sync spec, realtime subscription code, and calendar route runtime before changing anything, and extracted the retained Playwright trace attachments to compare the primary and collaborator states directly.

The strongest evidence stayed consistent across reruns: the primary session successfully created the overlapping Thursday shift and rendered the 3-pair conflict board, while the collaborator session remained on the seeded 1-pair baseline with `data-channel-state="ready"`, `data-remote-refresh-state="idle"`, and no recorded shared shift signal. That ruled out the create path and isolated the failure to realtime delivery / refresh triggering rather than the original assertion text.

I patched the smallest runtime seam I could justify from the evidence in `apps/web/src/lib/offline/sync-engine.ts`: the subscription now applies realtime auth before opening the shared shift channel, and I added a unit test that locks in that ordering. I also updated `apps/web/tests/e2e/calendar-sync.spec.ts` to stop depending on the transient `INSERT at ...` label and instead wait for the collaborator page to reach `remote-refresh-state="applied"` after being brought to the front, which is the calmer proof surface the task plan asked for.

Those changes improved the proof contract, but the isolated browser rerun stayed red in the same substantive way: the collaborator still never leaves `remote-refresh-state="idle"`. The retained trace shows the collaborator page stuck at the original 1-pair conflict baseline while the writer page shows the created overlap, which means the remaining issue is not just Playwright timing drift. I also recorded the investigation pattern in `.gsd/KNOWLEDGE.md` so future agents inspect the paired flow attachments before weakening assertions again.

Because the slice plan expected this task to be closed by stronger assertions plus, at most, a small `sync-engine.ts` / `+page.svelte` seam, but the real evidence now points to a deeper Supabase realtime collaborator-delivery contract problem in the preview-backed environment, I am marking this task as blocker-discovered for replan.

## Verification

I reran the task-level unit regression and the isolated preview-backed sync proof after the runtime and test changes. The Vitest regression passed, including the new auth-before-channel coverage for the realtime subscription and the existing board/sync-engine tests. The isolated Playwright sync proof still failed: the collaborator page never reached `data-remote-refresh-state="applied"` and stayed on the original seeded conflict baseline, while the writer still created and rendered the new overlapping shift successfully. I also inspected the retained trace attachments and confirmed the collaborator flow remained `ready + idle` with no shared shift signal recorded, which is the evidence behind the blocker call.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web exec vitest run tests/schedule/sync-engine.unit.test.ts tests/schedule/board.unit.test.ts` | 0 | ✅ pass | 405ms |
| 2 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-sync.spec.ts` | 1 | ❌ fail | 33530ms |

## Deviations

Expanded slightly beyond the original test-hardening-first plan by making a minimal runtime change in `apps/web/src/lib/offline/sync-engine.ts` and adding a focused unit test for realtime auth ordering before reopening the isolated browser proof. I did not touch `+page.svelte` because the retained evidence still points to collaborator signal delivery never happening, not to route invalidation bookkeeping after a delivered signal.

## Known Issues

The isolated preview-backed collaborator proof is still red. In the retained Playwright trace, the writer creates the new overlapping shift and renders the 3-pair Thursday board, but the collaborator remains on the original 1-pair baseline with `data-channel-state="ready"`, `data-remote-refresh-state="idle"`, and no recorded shared shift signal. A direct app-external Supabase client probe also exposed an unresolved mismatch where authenticated direct inserts against `public.shifts` hit RLS even though the trusted route action succeeds, which reinforces that the remaining problem likely lives in the backend/realtime contract rather than in the Playwright assertion text alone.

## Files Created/Modified

- `apps/web/src/lib/offline/sync-engine.ts`
- `apps/web/tests/schedule/sync-engine.unit.test.ts`
- `apps/web/tests/e2e/calendar-sync.spec.ts`
- `.gsd/KNOWLEDGE.md`
