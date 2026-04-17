# M002: Shared free-time matching

## Vision
Turn the validated shared-calendar substrate into a real planning surface where a permitted member can search the next 30 days for shared availability, understand why suggested windows work, and carry a chosen window into the existing create flow without weakening trusted scope or offline safety.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | S01 | the current schedule model is calendar-scoped rather than member-scoped, so the first risk is shipping a believable find time route without inventing who is free or widening calendar authority. | — | ⬜ | A signed-in member opens /calendars/[calendarId]/find-time for a permitted calendar, searches a 30-day horizon for a duration, and sees a truthful browseable list of valid windows computed from named member availability; unauthorized and offline access stay explicit and fail closed. |
| S02 | Ranked suggestions and explanation quality | even with correct windows, the feature fails if obvious options are buried or the ui cannot truthfully explain why a candidate works and why nearby times do not. | S01 | ⬜ | The Find time route now highlights a shortlist of top picks ahead of the full browse list, and each candidate shows who is free plus nearby busy constraints that explain adjacent exclusions. |
| S03 | Suggestion-to-create handoff | the existing create experience is an inline calendar dialog with no prefill contract, so a suggestion can easily lose exact timing or feel disconnected from the planning flow. | S01, S02 | ⬜ | A member chooses a suggested window from Find time and lands in the existing calendar create experience with the exact time prefilled in the correct calendar/week context. |
