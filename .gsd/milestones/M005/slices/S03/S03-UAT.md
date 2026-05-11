# S03: Wire recurrence suggestion into web shift create dialog — UAT

**Milestone:** M005
**Written:** 2026-05-11T10:28:29.844Z

# UAT — S03 recurrence suggestion in web create dialog

## UAT Type
Browser flow using the protected web calendar with seeded local Supabase data.

## Preconditions
- Local Supabase has been reset with project seed data.
- The web app is running against the local stack.
- Sign in as the seeded Alpha member.
- Use the Alpha shared calendar week starting `2026-04-20`.

## Steps
1. Open the Alpha shared calendar for the seeded visible week and open the create-shift dialog.
2. Confirm the calm suggestion chip is visible before changing any recurrence fields.
3. Verify the recurrence fields start blank: cadence unset, interval blank, repeat count blank, repeat-until blank.
4. Click **Use weekly suggestion**.
5. Verify the suggestion chip hides and the form is truthfully pre-filled with cadence `weekly` and interval `1`, while repeat count and repeat-until stay blank.
6. Enter a title, set repeat count to `2`, and save the shift.
7. Verify the new shift appears on the board and the create dialog resets to blank recurrence fields after the successful create.
8. Reload the page, reopen the create dialog, and verify the suggestion chip appears again with blank recurrence fields.
9. Dismiss the suggestion.
10. Verify the suggestion chip hides, recurrence fields remain blank/editable, and the user can still manually switch cadence and enter custom recurrence values.
11. Close and reopen the dialog on the same page instance.
12. Verify the dismissed suggestion stays hidden for that page instance and all recurrence fields reopen blank.
13. Reload the page once more and reopen the create dialog.
14. Verify the suggestion returns after reload and the recurrence fields are blank again.

## Expected Outcomes
- The suggestion appears only when the seeded same-calendar weekly pattern exists inside the bounded trailing 30-day window.
- Accepting the suggestion pre-fills only weekly cadence plus interval `1`.
- Dismissing the suggestion does not pre-fill recurrence data and does not block manual recurrence editing.
- Successful recurring create resets the dialog state instead of leaving a retryable malformed-response error.
- Unauthorized calendar navigation still shows the explicit denied state rather than exposing suggestion/history data.

## Edge Cases
- If the bounded history query errors, times out, or returns malformed rows, no suggestion is shown.
- If the user dismisses the suggestion, it remains hidden only for the current page instance and returns after fresh loader data on reload.
- If the server returns extra recurring occurrence ids beyond the visible week, the visible board still reconciles successfully without polluting local state with off-screen ids.

## Not Proven By This UAT
- Conflict advisory behavior for overlapping shifts (covered by later slice S04).
- Mobile recurrence suggestion or clash advisory surfaces (covered by S05).
- Launch hardening, accessibility audit closure, and full R011 validation (covered by S06).
