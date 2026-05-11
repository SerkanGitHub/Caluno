# S04: S04 — UAT

**Milestone:** M005
**Written:** 2026-05-11T13:56:15.764Z

# UAT: Web clash advisory for shift creation

## Preconditions
- Web app is running with the seeded calendar test data used by `apps/web/tests/e2e/calendar-shifts.spec.ts`.
- User is signed in as a member who can edit the target calendar.
- The calendar week view is open on a week that already contains visible shifts in the same calendar.

## UAT Type
Manual browser acceptance of the pre-submit clash advisory in the shared web shift editor.

## Steps
1. Open the protected calendar week view for an editable shared calendar.
2. Start creating a new shift in a time window that overlaps an existing visible-week shift in the same calendar.
3. Observe the editor before submitting.
4. Confirm the warning surface with `data-testid="clash-advisory"` appears and describes the overlap calmly.
5. Verify the primary save/confirm action remains enabled while the advisory is visible.
6. Submit the overlapping shift anyway.
7. Confirm the new shift saves successfully and appears on the board.
8. Start creating another shift in a time range that does not overlap any visible-week same-calendar shift, including a touching-boundary case if available.
9. Observe the editor before submitting.
10. Confirm no clash advisory is shown for the clear draft, then save the shift successfully.
11. Reopen the dialog after save or cancel to confirm the previous advisory state is not stale or carried forward.

## Expected Outcomes
- Overlapping drafts show a visible warning-only clash advisory before submit.
- The advisory does not block save; the user can still create the overlapping shift.
- Clear drafts and touching-boundary drafts do not show the advisory.
- The advisory reflects only the currently visible same-calendar week context.
- Closing or successfully submitting the dialog clears prior advisory state.

## Edge Cases
- Editing or moving an existing shift should not warn against the shift being edited itself.
- Invalid or incomplete draft times should suppress the advisory instead of showing misleading warnings.
- If the route is not in a ready schedule state, the editor should fall back safely without widening data access.

## Not Proven By This UAT
- Mobile advisory rendering and recurrence suggestion parity (covered by later slice S05).
- Launch-hardening, accessibility sweep, and R011 milestone validation work reserved for S06.
- Any server-side blocking policy for overlaps; this slice proves advisory-only client behavior, not authoritative write rejection.
