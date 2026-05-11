# S05: Mobile surfaces for recurrence suggestion and clash advisory — UAT

**Milestone:** M005
**Written:** 2026-05-11T16:19:37.272Z

# UAT — Mobile predictive scheduling surfaces

## Preconditions
- Local Supabase stack is reset and seeded with the Alpha shared calendar fixtures.
- Mobile Playwright environment is available.
- User is signed into a member account permitted to view the Alpha calendar.

## UAT Type
Scripted mobile smoke on the calendar route.

## Steps
1. Open the mobile calendar route for the Alpha shared calendar on a week that includes the seeded recurring Tuesday shift pattern.
2. Confirm the route diagnostics expose a ready recurrence-suggestion state before opening the create sheet.
3. Open the create shift sheet from an empty slot in that week.
4. Observe the recurrence suggestion chip and dismiss it.
5. Close the sheet, reopen create on the same page instance, and verify the dismissed suggestion does not reappear.
6. Reload the page, reopen the create sheet, and verify the suggestion returns from fresh loader data.
7. Enter a draft start/end time that matches the suggested weekday/hour pattern, accept the suggestion, and inspect the recurrence fields.
8. Verify cadence is set to weekly with interval 1 while the typed start/end times remain unchanged.
9. Change the draft so it overlaps an existing visible-week shift and inspect the clash advisory.
10. Verify the advisory appears as non-blocking guidance and the submit action remains enabled.
11. Change the draft to a clear time range and verify the clash advisory disappears.
12. Repeat from an edit or move entrypoint on an existing shift to confirm self-overlap is excluded and only real clashes appear.

## Expected Outcomes
- The route exposes explicit predictive state rather than requiring inference from missing UI.
- Dismissal persists across close/reopen on the same page instance.
- A full page reload with fresh loader data restores the truthful suggestion when history supports it.
- Accepting the suggestion only fills recurrence cadence/interval and never clobbers create-prefill timing.
- Overlaps in the visible week show `clash-advisory`; clear drafts do not.
- Clash guidance is advisory only and does not block saving.
- Edit/move flows exclude the current shift from conflict preview.

## Edge Cases
- No 30-day same-calendar pattern: no suggestion chip appears and route diagnostics show empty/fail-closed state.
- Timeout/query/malformed loader response: no suggestion chip appears, diagnostics remain explicit, and the sheet stays usable.
- Inverted or invalid draft times: clash advisory stays suppressed rather than throwing or showing stale overlap data.

## Not Proven By This UAT
- Milestone-wide accessibility, build, and deployment readiness checks for S06.
- Formal R011 validation status update.
- Cross-calendar authorization changes beyond the already-permitted shared calendar fixtures.
