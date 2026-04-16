---
estimated_steps: 1
estimated_files: 8
skills_used: []
---

# T03: Root-cause and fix collaborator realtime delivery in preview proof

Use the installed `debug-like-expert` skill before coding. Reproduce the clean-db `tests/e2e/calendar-sync.spec.ts` failure and confirm, with retained diagnostics plus direct probes, whether the missing collaborator refresh is caused by Supabase realtime publication/RLS visibility, server-action write-path metadata, browser subscription filtering, or trusted refresh application after signal receipt. Add the smallest diagnostics needed so future flow attachments make it explicit whether a shared-shift change was emitted, received, filtered, or rejected. Patch the narrowest seam that fixes the real collaborator-delivery contract — this may include `apps/web/src/lib/offline/sync-engine.ts`, the calendar route refresh path, focused test helpers, or the local Supabase migration/config surface if the preview-backed environment is suppressing in-scope shift events. Lock the root cause with unit/integration coverage and keep the out-of-scope next-week guard fail-closed.

## Inputs

- `.gsd/milestones/M001/slices/S06/tasks/T02-SUMMARY.md`
- `apps/web/test-results/e2e-offline/calendar-sync-online-colla-d89ab--same-trusted-calendar-week/error-context.md`
- `apps/web/src/lib/offline/sync-engine.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/tests/e2e/calendar-sync.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`
- `supabase/migrations/20260415_000002_schedule_shifts.sql`
- `supabase/migrations/20260416_000001_schedule_realtime.sql`

## Expected Output

- `Collaborator proof reaches `data-remote-refresh-state="applied"` on the in-scope week and still stays unchanged on the next-week guard.`
- `Retained diagnostics clearly state whether shared-shift signals were emitted/received/applied or why they were rejected.`
- `The isolated sync Playwright proof and focused runtime regressions pass on a clean local Supabase reset.`

## Verification

npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-sync.spec.ts && pnpm --dir apps/web exec vitest run tests/schedule/sync-engine.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/server-actions.unit.test.ts

## Observability Impact

Makes collaborator realtime proof failures explicit by distinguishing emit/receive/filter/apply stages in retained diagnostics and by proving the in-scope refresh path separately from the next-week guard.
