# S02: Multi-shift calendar model and browser editing flows — UAT

**Milestone:** M001
**Written:** 2026-04-15T07:29:44.300Z

# UAT: S02 — Multi-shift calendar model and browser editing flows

## Preconditions
- Local Supabase stack is reset with `npx --yes supabase db reset --local --yes` so the deterministic Alpha/Beta schedule fixtures exist.
- Web app is running through the standard Playwright/Vite local harness.
- Test user: `bob@example.com` / `password123`.
- Target visible week: `2026-04-13` through `2026-04-20` on the seeded Alpha shared calendar `aaaaaaaa-aaaa-1111-1111-111111111111`.

## Test Case 1 — Open the seeded Alpha week and verify same-day multi-shift density
1. Sign in as `bob@example.com`.
   - Expected: The groups shell loads and shows `Alpha Team`.
2. Open `/calendars/aaaaaaaa-aaaa-1111-1111-111111111111?start=2026-04-13`.
   - Expected: The protected calendar route renders `Alpha shared`, the calendar shell is visible, and no schedule load error state remains.
3. Inspect Wednesday `2026-04-15`.
   - Expected: Three visible cards appear: `Alpha opening sweep`, `Morning intake`, and `Afternoon handoff`.
4. Inspect Thursday `2026-04-16`.
   - Expected: Three visible cards appear: `Alpha opening sweep`, `Kitchen prep`, and `Supplier call`.
5. Confirm the board metadata.
   - Expected: The visible week matches `2026-04-13` to `2026-04-20` and the board reports the seeded visible-shift count for that week.

## Test Case 2 — Validate recurring-create guardrails before allowing bounded recurrence
1. Open the create-shift editor on the Alpha board.
2. Enter title `Recurring coverage drill`, start `2026-04-17T10:00`, end `2026-04-17T11:30`, and cadence `daily`.
3. Leave both recurrence bounds empty and submit.
   - Expected: The create-state surface becomes visible with the named failure reason `RECURRENCE_BOUND_REQUIRED`.
4. Enter repeat count `3` and submit again.
   - Expected: The action strip reports `SHIFT_CREATED`.
5. Inspect Friday, Saturday, and Sunday (`2026-04-17`, `2026-04-18`, `2026-04-19`).
   - Expected: Each day now contains a `Recurring coverage drill` shift card, proving concrete visible occurrences were created.

## Test Case 3 — Edit a seeded shift in place
1. On Wednesday `2026-04-15`, open edit details for seeded shift `Morning intake`.
2. Change the title to `Morning intake revised`.
3. Change timing to `09:30` → `11:30` and save.
   - Expected: The action strip reports `SHIFT_UPDATED`.
   - Expected: The Wednesday card updates in place to `Morning intake revised` with time `09:30 → 11:30`.

## Test Case 4 — Move a seeded shift into a different day
1. Open move timing for the seeded Thursday `Supplier call` shift.
2. Change timing to `2026-04-17 15:00` → `17:00` and save.
   - Expected: The action strip reports `SHIFT_MOVED`.
   - Expected: The Thursday card disappears.
   - Expected: A `Supplier call` card appears on Friday `2026-04-17` with time `15:00 → 17:00`.

## Test Case 5 — Delete a seeded shift
1. Delete the seeded Wednesday `Afternoon handoff` shift.
   - Expected: The action strip reports `SHIFT_DELETED`.
   - Expected: The shift card disappears immediately and no longer appears in the Wednesday column.

## Test Case 6 — Reload continuity after create/edit/move/delete
1. Reload the Alpha calendar route without changing the visible-week query.
   - Expected: The calendar shell and week board rerender successfully.
2. Reinspect the edited, moved, deleted, and recurring states.
   - Expected: `Morning intake revised` still appears on Wednesday with `09:30 → 11:30`.
   - Expected: `Supplier call` still appears on Friday with `15:00 → 17:00`.
   - Expected: `Afternoon handoff` remains absent.
   - Expected: Three `Recurring coverage drill` cards remain visible on Fri/Sat/Sun.

## Test Case 7 — Unauthorized calendar access stays denied
1. While still signed in as the Alpha member, navigate directly to `/calendars/bbbbbbbb-bbbb-2222-2222-222222222222?start=2026-04-13`.
   - Expected: The explicit denied surface renders instead of calendar data.
   - Expected: The page shows reason code `calendar-missing`, failure phase `calendar-lookup`, the attempted Beta calendar id, and a `Return to permitted groups` link.

## Edge Cases / Notes
- Move is intentionally exercised through explicit date/time controls, not drag-and-drop.
- Conflict warnings are not expected yet in S02 even though overlapping fixtures exist; that proof belongs to S05.
- Offline use and realtime cross-user propagation are out of scope for this slice and should not be treated as failures here.
