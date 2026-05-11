# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-shifts.spec.ts >> weekly recurrence suggestion accept path pre-fills weekly cadence truthfully and resets after a successful create
- Location: tests/e2e/calendar-shifts.spec.ts:223:1

# Error details

```
Error: expected the create dialog recurrence cadence to reset after the trusted create succeeded

expect(received).toBe(expected) // Object.is equality

Expected: ""
Received: "weekly"

Call Log:
- Timeout 10000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - main [ref=e4]:
    - complementary [ref=e5]:
      - paragraph [ref=e6]: Trusted calendar scope
      - heading "Bob Member" [level=1] [ref=e7]
      - paragraph [ref=e8]: This route rendered from the trusted server contract, so calendar authority was revalidated before the week loaded.
      - generic [ref=e9]:
        - article [ref=e10]:
          - generic [ref=e11]: Route state
          - strong [ref=e12]: trusted-online
          - paragraph [ref=e13]: Week data and calendar scope came from the trusted server route.
        - article [ref=e14]:
          - generic [ref=e15]: Local-first state
          - strong [ref=e16]: online
          - paragraph [ref=e17]: The visible week is rendering from browser-local data.
          - code [ref=e18]: 0 pending / 1 retryable
        - article [ref=e19]:
          - generic [ref=e20]: Sync diagnostics
          - strong [ref=e21]: idle
          - paragraph [ref=e22]: Reconnect is idle. Trusted route actions already confirmed all drained work or nothing was pending.
          - code [ref=e23]: 2026-05-11T10:16:45.297Z
        - article [ref=e24]:
          - generic [ref=e25]: Realtime diagnostics
          - strong [ref=e26]: ready
          - paragraph [ref=e27]: Live change detection is connected for this calendar. Realtime signals trigger trusted refreshes instead of direct client writes.
          - code [ref=e28]: INSERT at 2026-05-11T10:16:45.057Z
          - paragraph [ref=e29]: Listening for shared shift changes on this calendar week.
        - article [ref=e30]:
          - generic [ref=e31]: Week scope
          - strong [ref=e32]: 2026-04-13
          - paragraph [ref=e33]: Showing trusted week data with pending browser-local changes replayed in deterministic queue order.
          - code [ref=e34]: server-sync
      - navigation [ref=e35]:
        - link "Back to groups" [ref=e36] [cursor=pointer]:
          - /url: /groups
        - link "Sign out" [ref=e37] [cursor=pointer]:
          - /url: /logout
    - generic [ref=e38]:
      - generic [ref=e39]:
        - paragraph [ref=e40]: Alpha Team
        - heading "Alpha shared" [level=2] [ref=e41]
        - paragraph [ref=e42]: "A calm week board for multi-shift days: local writes render immediately, while trusted server actions stay authoritative for confirmation."
        - generic [ref=e43]:
          - link "Browse truthful find-time" [ref=e44] [cursor=pointer]:
            - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=60&start=2026-04-13
          - generic [ref=e45]: Server-shaped availability
        - generic [ref=e46]:
          - generic [ref=e47]: Default calendar
          - generic [ref=e48]: member access
          - generic [ref=e49]: 10 visible shifts
          - generic [ref=e50]: Cached local
          - generic [ref=e51]: idle
          - generic [ref=e52]: realtime ready
      - generic [ref=e53]:
        - generic [ref=e54]:
          - generic [ref=e55]:
            - paragraph [ref=e56]: Protected week board
            - heading "Apr 13 — Apr 19, 2026" [level=2] [ref=e57]
            - paragraph [ref=e58]: Visible week chosen from the route query and reopened from browser-local continuity.
          - generic [ref=e59]:
            - generic [ref=e60]:
              - generic [ref=e61]: "Visible week start: 2026-04-13"
              - generic [ref=e62]: 10 shifts
              - generic [ref=e63]: UTC board
              - generic [ref=e64]: 4 overlap pairs in view
              - generic [ref=e65]: Cached local board
              - generic [ref=e66]: Online
              - generic [ref=e67]: Sync idle
              - generic [ref=e68]: Sync attempt recorded
              - generic [ref=e69]: 1 retryable local write
            - navigation "Visible week navigation" [ref=e70]:
              - link "Previous week" [ref=e71] [cursor=pointer]:
                - /url: "?start=2026-04-06"
              - link "Next week" [ref=e72] [cursor=pointer]:
                - /url: "?start=2026-04-20"
        - generic [ref=e73]:
          - group [ref=e74]:
            - generic "Plan a shift" [ref=e75] [cursor=pointer]
            - generic [ref=e76]:
              - generic [ref=e77]:
                - generic [ref=e78]:
                  - paragraph [ref=e79]: Local-first create
                  - heading "Create a shift" [level=3] [ref=e80]
                - generic [ref=e81]: UTC times
              - generic [ref=e82]:
                - group [ref=e83]:
                  - generic [ref=e84]:
                    - generic [ref=e85]: Title
                    - textbox "Title" [ref=e86]:
                      - /placeholder: Opening shift
                      - text: Recurrence suggestion accept proof
                  - generic [ref=e87]:
                    - generic [ref=e88]:
                      - generic [ref=e89]: Start
                      - textbox "Start" [ref=e90]: 2026-04-13T09:00
                    - generic [ref=e91]:
                      - generic [ref=e92]: End
                      - textbox "End" [ref=e93]: 2026-04-13T13:00
                  - generic [ref=e94]:
                    - generic [ref=e95]:
                      - generic [ref=e96]:
                        - paragraph [ref=e97]: Bounded recurrence
                        - heading "Optional repeat rule" [level=3] [ref=e98]
                      - generic [ref=e99]: Count or until required
                    - generic [ref=e100]:
                      - strong [ref=e101]: weekly recurrence
                      - paragraph [ref=e102]: Repeats every week. Repeat bounds stay blank until you choose one.
                    - generic [ref=e103]:
                      - group [ref=e104]:
                        - generic [ref=e105]: Cadence
                        - generic [ref=e106]:
                          - generic [ref=e107] [cursor=pointer]:
                            - radio "One-off No repeats" [ref=e108]
                            - strong [ref=e109]: One-off
                            - generic [ref=e110]: No repeats
                          - generic [ref=e111] [cursor=pointer]:
                            - radio "Daily Every day" [ref=e112]
                            - strong [ref=e113]: Daily
                            - generic [ref=e114]: Every day
                          - generic [ref=e115] [cursor=pointer]:
                            - radio "Weekly Weekly cadence" [checked] [ref=e116]
                            - strong [ref=e117]: Weekly
                            - generic [ref=e118]: Weekly cadence
                          - generic [ref=e119] [cursor=pointer]:
                            - radio "Monthly Monthly cadence" [ref=e120]
                            - strong [ref=e121]: Monthly
                            - generic [ref=e122]: Monthly cadence
                      - generic [ref=e123]:
                        - generic [ref=e124]: Interval
                        - spinbutton "Interval" [ref=e125]: "1"
                      - generic [ref=e126]:
                        - generic [ref=e127]: Repeat count
                        - spinbutton "Repeat count" [ref=e128]: "2"
                      - generic [ref=e129]:
                        - generic [ref=e130]: Repeat until
                        - textbox "Repeat until" [ref=e131]
                - generic [ref=e132]:
                  - button "Save shift" [ref=e133] [cursor=pointer]
                  - generic [ref=e134]: The board updates locally first, then waits for trusted server confirmation when online.
          - generic [ref=e135]:
            - paragraph [ref=e136]: Board rhythm
            - paragraph [ref=e137]: Local writes update the visible week immediately, stay queued when the server is unavailable, and keep the trusted server action as the confirmation path.
        - article [ref=e138]:
          - generic [ref=e139]: Local-first failure
          - strong [ref=e140]: SCHEDULE_RESPONSE_INVALID
          - paragraph [ref=e141]: The server acknowledged the write, but the returned action payload could not reconcile the local board safely.
        - article [ref=e142]:
          - generic [ref=e143]: Visible-week conflict watch
          - strong [ref=e144]: 4 overlap pairs in view
          - paragraph [ref=e145]: "3 visible days contain 7 conflicting shifts: Mon, Apr 13, Wed, Apr 15, and Thu, Apr 16."
        - article [ref=e146]:
          - generic [ref=e147]: Board sync diagnostics
          - strong [ref=e148]: Sync idle
          - paragraph [ref=e149]:
            - text: "Last reconnect attempt:"
            - code [ref=e150]: 2026-05-11T10:16:45.297Z
        - article [ref=e151]:
          - generic [ref=e152]: Board realtime diagnostics
          - strong [ref=e153]: ready
          - paragraph [ref=e154]:
            - text: "Last signal: INSERT at"
            - code [ref=e155]: 2026-05-11T10:16:45.057Z
          - paragraph [ref=e156]: Listening for shared shift changes on this calendar week.
        - article [ref=e158]:
          - generic [ref=e159]: Create shift
          - strong [ref=e160]: malformed-response
          - paragraph [ref=e161]: The server response could not reconcile the local-first board, so the change stayed pending locally.
          - code [ref=e162]: SCHEDULE_RESPONSE_INVALID
        - generic [ref=e163]:
          - generic [ref=e164]:
            - generic [ref=e165]:
              - generic:
                - paragraph: Monday
                - heading "Apr 13" [level=3]
              - generic [ref=e166]:
                - generic [ref=e167]: 1 overlap pair
                - generic [ref=e168]: 3 shifts
            - generic [ref=e169]:
              - article [ref=e170]:
                - strong [ref=e171]: 1 overlap pair
                - paragraph [ref=e172]: Recurrence suggestion accept proof (09:00 → 13:00) · Recurrence suggestion accept proof (09:00 → 13:00)
              - article [ref=e173]:
                - generic [ref=e174]:
                  - generic [ref=e175]:
                    - paragraph [ref=e176]: Recurring series
                    - heading "Alpha opening sweep" [level=3] [ref=e177]
                  - generic [ref=e178]:
                    - generic [ref=e179]: 08:30 → 09:00
                    - generic [ref=e180]: Occurrence 4
                - generic [ref=e181]:
                  - generic [ref=e182]:
                    - text: Window
                    - strong [ref=e183]: 08:30 → 09:00
                  - generic [ref=e184]:
                    - text: Duration
                    - strong [ref=e185]: 0.5h block
                  - generic [ref=e186]:
                    - text: Shift id
                    - code [ref=e187]: aaaaaaaa-8888-1111-1111-666666666666
                - generic [ref=e188]:
                  - group [ref=e189]:
                    - generic "Edit details" [ref=e190] [cursor=pointer]
                  - group [ref=e191]:
                    - generic "Move timing" [ref=e192] [cursor=pointer]
                  - button "Delete shift" [ref=e194] [cursor=pointer]
              - article [ref=e195]:
                - generic [ref=e196]:
                  - generic [ref=e197]:
                    - paragraph [ref=e198]: Recurring series
                    - heading "Recurrence suggestion accept proof" [level=3] [ref=e199]
                  - generic [ref=e200]:
                    - generic [ref=e201]: 09:00 → 13:00
                    - generic [ref=e202]: Occurrence 1
                    - generic [ref=e203]: Overlaps 1 visible shift
                    - generic [ref=e204]: Local only
                    - generic [ref=e205]: Retry needed
                - article [ref=e206]:
                  - strong [ref=e207]: Overlaps 1 visible shift
                  - paragraph [ref=e208]: Recurrence suggestion accept proof (09:00 → 13:00)
                - generic [ref=e209]:
                  - generic [ref=e210]:
                    - text: Window
                    - strong [ref=e211]: 09:00 → 13:00
                  - generic [ref=e212]:
                    - text: Duration
                    - strong [ref=e213]: 4h block
                  - generic [ref=e214]:
                    - text: Shift id
                    - code [ref=e215]: local-c6ab099b-d884-4733-afe3-5c8fef70c5b1-1
                - generic [ref=e216]:
                  - group [ref=e217]:
                    - generic "Edit details" [ref=e218] [cursor=pointer]
                  - group [ref=e219]:
                    - generic "Move timing" [ref=e220] [cursor=pointer]
                  - button "Delete shift" [ref=e222] [cursor=pointer]
              - article [ref=e223]:
                - generic [ref=e224]:
                  - generic [ref=e225]:
                    - paragraph [ref=e226]: Recurring series
                    - heading "Recurrence suggestion accept proof" [level=3] [ref=e227]
                  - generic [ref=e228]:
                    - generic [ref=e229]: 09:00 → 13:00
                    - generic [ref=e230]: Occurrence 1
                    - generic [ref=e231]: Overlaps 1 visible shift
                - article [ref=e232]:
                  - strong [ref=e233]: Overlaps 1 visible shift
                  - paragraph [ref=e234]: Recurrence suggestion accept proof (09:00 → 13:00)
                - generic [ref=e235]:
                  - generic [ref=e236]:
                    - text: Window
                    - strong [ref=e237]: 09:00 → 13:00
                  - generic [ref=e238]:
                    - text: Duration
                    - strong [ref=e239]: 4h block
                  - generic [ref=e240]:
                    - text: Shift id
                    - code [ref=e241]: 81e17b50-a0a0-4907-80fb-a5a9dee82d30
                - generic [ref=e242]:
                  - group [ref=e243]:
                    - generic "Edit details" [ref=e244] [cursor=pointer]
                  - group [ref=e245]:
                    - generic "Move timing" [ref=e246] [cursor=pointer]
                  - button "Delete shift" [ref=e248] [cursor=pointer]
          - generic [ref=e249]:
            - generic [ref=e250]:
              - generic [ref=e251]:
                - paragraph [ref=e252]: Tuesday
                - heading "Apr 14" [level=3] [ref=e253]
              - generic [ref=e255]: 0 shifts
            - article [ref=e256]:
              - paragraph [ref=e257]: Open capacity
              - heading "Nothing scheduled." [level=3] [ref=e258]
              - paragraph [ref=e259]: This day stays visible so users can add or move a shift here without losing week context.
          - generic [ref=e260]:
            - generic [ref=e261]:
              - generic:
                - paragraph: Wednesday
                - heading "Apr 15" [level=3]
              - generic [ref=e262]:
                - generic [ref=e263]: 2 overlap pairs
                - generic [ref=e264]: 4 shifts
            - generic [ref=e265]:
              - article [ref=e266]:
                - strong [ref=e267]: 2 overlap pairs
                - paragraph [ref=e268]: Alpha opening sweep (08:30 → 09:00) · Find time browse handoff (08:30 → 09:30) +1 more
              - article [ref=e269]:
                - generic [ref=e270]:
                  - generic [ref=e271]:
                    - paragraph [ref=e272]: One-off shift
                    - heading "Alpha opening sweep" [level=3] [ref=e273]
                  - generic [ref=e274]:
                    - generic [ref=e275]: 08:30 → 09:00
                    - generic [ref=e276]: Overlaps 1 visible shift
                - article [ref=e277]:
                  - strong [ref=e278]: Overlaps 1 visible shift
                  - paragraph [ref=e279]: Find time browse handoff (08:30 → 09:30)
                - generic [ref=e280]:
                  - generic [ref=e281]:
                    - text: Window
                    - strong [ref=e282]: 08:30 → 09:00
                  - generic [ref=e283]:
                    - text: Duration
                    - strong [ref=e284]: 0.5h block
                  - generic [ref=e285]:
                    - text: Shift id
                    - code [ref=e286]: aaaaaaaa-8888-1111-1111-333333333333
                - generic [ref=e287]:
                  - group [ref=e288]:
                    - generic "Edit details" [ref=e289] [cursor=pointer]
                  - group [ref=e290]:
                    - generic "Move timing" [ref=e291] [cursor=pointer]
                  - button "Delete shift" [ref=e293] [cursor=pointer]
              - article [ref=e294]:
                - generic [ref=e295]:
                  - generic [ref=e296]:
                    - paragraph [ref=e297]: One-off shift
                    - heading "Find time browse handoff" [level=3] [ref=e298]
                  - generic [ref=e299]:
                    - generic [ref=e300]: 08:30 → 09:30
                    - generic [ref=e301]: Overlaps 2 visible shifts
                - article [ref=e302]:
                  - strong [ref=e303]: Overlaps 2 visible shifts
                  - paragraph [ref=e304]: Alpha opening sweep (08:30 → 09:00) · Morning intake (09:00 → 11:00)
                - generic [ref=e305]:
                  - generic [ref=e306]:
                    - text: Window
                    - strong [ref=e307]: 08:30 → 09:30
                  - generic [ref=e308]:
                    - text: Duration
                    - strong [ref=e309]: 1h block
                  - generic [ref=e310]:
                    - text: Shift id
                    - code [ref=e311]: f55c4dd0-29f8-40ef-acb9-eb27720ce187
                - generic [ref=e312]:
                  - group [ref=e313]:
                    - generic "Edit details" [ref=e314] [cursor=pointer]
                  - group [ref=e315]:
                    - generic "Move timing" [ref=e316] [cursor=pointer]
                  - button "Delete shift" [ref=e318] [cursor=pointer]
              - article [ref=e319]:
                - generic [ref=e320]:
                  - generic [ref=e321]:
                    - paragraph [ref=e322]: One-off shift
                    - heading "Morning intake" [level=3] [ref=e323]
                  - generic [ref=e324]:
                    - generic [ref=e325]: 09:00 → 11:00
                    - generic [ref=e326]: Overlaps 1 visible shift
                - article [ref=e327]:
                  - strong [ref=e328]: Overlaps 1 visible shift
                  - paragraph [ref=e329]: Find time browse handoff (08:30 → 09:30)
                - generic [ref=e330]:
                  - generic [ref=e331]:
                    - text: Window
                    - strong [ref=e332]: 09:00 → 11:00
                  - generic [ref=e333]:
                    - text: Duration
                    - strong [ref=e334]: 2h block
                  - generic [ref=e335]:
                    - text: Shift id
                    - code [ref=e336]: aaaaaaaa-6666-1111-1111-111111111111
                - generic [ref=e337]:
                  - group [ref=e338]:
                    - generic "Edit details" [ref=e339] [cursor=pointer]
                  - group [ref=e340]:
                    - generic "Move timing" [ref=e341] [cursor=pointer]
                  - button "Delete shift" [ref=e343] [cursor=pointer]
              - article [ref=e344]:
                - generic [ref=e345]:
                  - generic [ref=e346]:
                    - paragraph [ref=e347]: One-off shift
                    - heading "Afternoon handoff" [level=3] [ref=e348]
                  - generic [ref=e350]: 13:00 → 15:00
                - generic [ref=e351]:
                  - generic [ref=e352]:
                    - text: Window
                    - strong [ref=e353]: 13:00 → 15:00
                  - generic [ref=e354]:
                    - text: Duration
                    - strong [ref=e355]: 2h block
                  - generic [ref=e356]:
                    - text: Shift id
                    - code [ref=e357]: aaaaaaaa-6666-1111-1111-222222222222
                - generic [ref=e358]:
                  - group [ref=e359]:
                    - generic "Edit details" [ref=e360] [cursor=pointer]
                  - group [ref=e361]:
                    - generic "Move timing" [ref=e362] [cursor=pointer]
                  - button "Delete shift" [ref=e364] [cursor=pointer]
          - generic [ref=e365]:
            - generic [ref=e366]:
              - generic:
                - paragraph: Thursday
                - heading "Apr 16" [level=3]
              - generic [ref=e367]:
                - generic [ref=e368]: 1 overlap pair
                - generic [ref=e369]: 3 shifts
            - generic [ref=e370]:
              - article [ref=e371]:
                - strong [ref=e372]: 1 overlap pair
                - paragraph [ref=e373]: Kitchen prep (12:00 → 14:00) · Supplier call (13:00 → 15:00)
              - article [ref=e374]:
                - generic [ref=e375]:
                  - generic [ref=e376]:
                    - paragraph [ref=e377]: One-off shift
                    - heading "Alpha opening sweep" [level=3] [ref=e378]
                  - generic [ref=e380]: 08:30 → 09:00
                - generic [ref=e381]:
                  - generic [ref=e382]:
                    - text: Window
                    - strong [ref=e383]: 08:30 → 09:00
                  - generic [ref=e384]:
                    - text: Duration
                    - strong [ref=e385]: 0.5h block
                  - generic [ref=e386]:
                    - text: Shift id
                    - code [ref=e387]: aaaaaaaa-8888-1111-1111-444444444444
                - generic [ref=e388]:
                  - group [ref=e389]:
                    - generic "Edit details" [ref=e390] [cursor=pointer]
                  - group [ref=e391]:
                    - generic "Move timing" [ref=e392] [cursor=pointer]
                  - button "Delete shift" [ref=e394] [cursor=pointer]
              - article [ref=e395]:
                - generic [ref=e396]:
                  - generic [ref=e397]:
                    - paragraph [ref=e398]: One-off shift
                    - heading "Kitchen prep" [level=3] [ref=e399]
                  - generic [ref=e400]:
                    - generic [ref=e401]: 12:00 → 14:00
                    - generic [ref=e402]: Overlaps 1 visible shift
                - article [ref=e403]:
                  - strong [ref=e404]: Overlaps 1 visible shift
                  - paragraph [ref=e405]: Supplier call (13:00 → 15:00)
                - generic [ref=e406]:
                  - generic [ref=e407]:
                    - text: Window
                    - strong [ref=e408]: 12:00 → 14:00
                  - generic [ref=e409]:
                    - text: Duration
                    - strong [ref=e410]: 2h block
                  - generic [ref=e411]:
                    - text: Shift id
                    - code [ref=e412]: aaaaaaaa-7777-1111-1111-111111111111
                - generic [ref=e413]:
                  - group [ref=e414]:
                    - generic "Edit details" [ref=e415] [cursor=pointer]
                  - group [ref=e416]:
                    - generic "Move timing" [ref=e417] [cursor=pointer]
                  - button "Delete shift" [ref=e419] [cursor=pointer]
              - article [ref=e420]:
                - generic [ref=e421]:
                  - generic [ref=e422]:
                    - paragraph [ref=e423]: One-off shift
                    - heading "Supplier call" [level=3] [ref=e424]
                  - generic [ref=e425]:
                    - generic [ref=e426]: 13:00 → 15:00
                    - generic [ref=e427]: Overlaps 1 visible shift
                - article [ref=e428]:
                  - strong [ref=e429]: Overlaps 1 visible shift
                  - paragraph [ref=e430]: Kitchen prep (12:00 → 14:00)
                - generic [ref=e431]:
                  - generic [ref=e432]:
                    - text: Window
                    - strong [ref=e433]: 13:00 → 15:00
                  - generic [ref=e434]:
                    - text: Duration
                    - strong [ref=e435]: 2h block
                  - generic [ref=e436]:
                    - text: Shift id
                    - code [ref=e437]: aaaaaaaa-7777-1111-1111-222222222222
                - generic [ref=e438]:
                  - group [ref=e439]:
                    - generic "Edit details" [ref=e440] [cursor=pointer]
                  - group [ref=e441]:
                    - generic "Move timing" [ref=e442] [cursor=pointer]
                  - button "Delete shift" [ref=e444] [cursor=pointer]
          - generic [ref=e445]:
            - generic [ref=e446]:
              - generic [ref=e447]:
                - paragraph [ref=e448]: Friday
                - heading "Apr 17" [level=3] [ref=e449]
              - generic [ref=e451]: 0 shifts
            - article [ref=e452]:
              - paragraph [ref=e453]: Open capacity
              - heading "Nothing scheduled." [level=3] [ref=e454]
              - paragraph [ref=e455]: This day stays visible so users can add or move a shift here without losing week context.
          - generic [ref=e456]:
            - generic [ref=e457]:
              - generic [ref=e458]:
                - paragraph [ref=e459]: Saturday
                - heading "Apr 18" [level=3] [ref=e460]
              - generic [ref=e462]: 0 shifts
            - article [ref=e463]:
              - paragraph [ref=e464]: Open capacity
              - heading "Nothing scheduled." [level=3] [ref=e465]
              - paragraph [ref=e466]: This day stays visible so users can add or move a shift here without losing week context.
          - generic [ref=e467]:
            - generic [ref=e468]:
              - generic [ref=e469]:
                - paragraph [ref=e470]: Sunday
                - heading "Apr 19" [level=3] [ref=e471]
              - generic [ref=e473]: 0 shifts
            - article [ref=e474]:
              - paragraph [ref=e475]: Open capacity
              - heading "Nothing scheduled." [level=3] [ref=e476]
              - paragraph [ref=e477]: This day stays visible so users can add or move a shift here without losing week context.
      - generic [ref=e478]:
        - generic [ref=e479]:
          - generic [ref=e480]:
            - paragraph [ref=e481]: Visible calendar inventory
            - heading "Only trusted calendars appear in navigation." [level=3] [ref=e482]
          - generic [ref=e483]: 2 visible
        - generic [ref=e484]:
          - link "Alpha shared Default calendar" [ref=e485] [cursor=pointer]:
            - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111
            - strong [ref=e486]: Alpha shared
            - generic [ref=e487]: Default calendar
          - link "Alpha backlog Secondary calendar" [ref=e488] [cursor=pointer]:
            - /url: /calendars/aaaaaaaa-aaaa-1111-1111-222222222222
            - strong [ref=e489]: Alpha backlog
            - generic [ref=e490]: Secondary calendar
  - generic [ref=e491]: Alpha shared • Caluno
```

# Test source

```ts
  183 |         message: 'expected the calendar destination URL to stay clean after the browse suggestion handoff'
  184 |       })
  185 |       .toBe(`http://127.0.0.1:4174/calendars/${seededCalendars.alphaShared}?start=${browseSuggestion.targetWeekStart}`);
  186 |   });
  187 | 
  188 |   await test.step('phase: submit the existing create dialog and verify the new shift is visible on the chosen board day', async () => {
  189 |     if (!browseSuggestion) {
  190 |       throw new Error('Expected the browse suggestion handoff snapshot before submitting the create dialog.');
  191 |     }
  192 | 
  193 |     const editor = page.getByTestId('create-shift-editor');
  194 |     await submitShiftEditorForm(editor, { title: createdTitle });
  195 | 
  196 |     const targetDayKey = (browseSuggestion.startAt ?? '').slice(0, 10);
  197 |     const targetDayColumn = page.getByTestId(`day-column-${targetDayKey}`);
  198 | 
  199 |     await expect(targetDayColumn).toContainText(createdTitle);
  200 |     await expect(page.locator('[data-testid^="shift-card-"]').filter({ hasText: createdTitle }).first()).toBeVisible();
  201 |   });
  202 | 
  203 |   await test.step('phase: reload the board and prove the created shift remains visible without reopening the handoff', async () => {
  204 |     if (!browseSuggestion) {
  205 |       throw new Error('Expected the browse suggestion handoff snapshot before verifying reload behavior.');
  206 |     }
  207 | 
  208 |     await page.reload();
  209 | 
  210 |     await expect(page.getByTestId('calendar-shell')).toBeVisible();
  211 |     await expect(page.getByTestId('create-shift-editor')).toHaveAttribute('data-open-on-arrival', 'false');
  212 |     await expect(page.getByTestId('create-prefill-source')).toHaveCount(0);
  213 |     await expect(page.locator('[data-testid^="shift-card-"]').filter({ hasText: createdTitle }).first()).toBeVisible();
  214 | 
  215 |     await expect
  216 |       .poll(() => page.url(), {
  217 |         message: 'expected reload to keep the cleaned calendar URL instead of restoring one-shot handoff params'
  218 |       })
  219 |       .toBe(`http://127.0.0.1:4174/calendars/${seededCalendars.alphaShared}?start=${browseSuggestion.targetWeekStart}`);
  220 |   });
  221 | });
  222 | 
  223 | test('weekly recurrence suggestion accept path pre-fills weekly cadence truthfully and resets after a successful create', async ({
  224 |   page,
  225 |   flow
  226 | }) => {
  227 |   const createdTitle = 'Recurrence suggestion accept proof';
  228 | 
  229 |   await test.step('phase: sign in and open the Alpha week with the seeded recurrence pattern', async () => {
  230 |     flow.mark('login', seededUsers.alphaMember.email);
  231 |     await signInThroughUi(page, seededUsers.alphaMember);
  232 | 
  233 |     await openCalendarWeek({
  234 |       page,
  235 |       flow,
  236 |       calendarId: seededCalendars.alphaShared,
  237 |       visibleWeekStart: seededSchedule.visibleWeek.start,
  238 |       focusShiftIds: seededSchedule.recurrenceSuggestion.matchingShiftIds,
  239 |       phase: 'recurrence-suggestion-accept'
  240 |     });
  241 | 
  242 |     await expect(page.getByTestId('calendar-shell')).toBeVisible();
  243 |   });
  244 | 
  245 |   await test.step('phase: accept the calm recurrence suggestion and verify only weekly plus interval one are prefilled', async () => {
  246 |     const editor = await openCreateShiftEditor(page);
  247 |     const initialSnapshot = await readCreateShiftRecurrenceSnapshot(page);
  248 |     expect(initialSnapshot.suggestionVisible).toBe(true);
  249 |     expect(initialSnapshot.suggestionCadence).toBe(seededSchedule.recurrenceSuggestion.cadence);
  250 |     expect(initialSnapshot.suggestionInterval).toBe('1');
  251 |     expect(initialSnapshot.suggestionWeekday).toBe(seededSchedule.recurrenceSuggestion.weekday);
  252 |     expect(initialSnapshot.suggestionMatchCount).toBe(seededSchedule.recurrenceSuggestion.matchingShiftIds.length);
  253 |     expect(initialSnapshot.selectedCadence).toBe('');
  254 |     expect(initialSnapshot.intervalValue).toBe('');
  255 |     expect(initialSnapshot.repeatCountValue).toBe('');
  256 |     expect(initialSnapshot.repeatUntilValue).toBe('');
  257 |     expect(initialSnapshot.fieldSuggestionState).toBe('idle');
  258 | 
  259 |     await editor.getByTestId('recurrence-suggestion-accept').dispatchEvent('click');
  260 | 
  261 |     const acceptedSnapshot = await readCreateShiftRecurrenceSnapshot(page);
  262 |     expect(acceptedSnapshot.suggestionVisible).toBe(false);
  263 |     expect(acceptedSnapshot.selectedCadence).toBe('weekly');
  264 |     expect(acceptedSnapshot.intervalValue).toBe('1');
  265 |     expect(acceptedSnapshot.repeatCountValue).toBe('');
  266 |     expect(acceptedSnapshot.repeatUntilValue).toBe('');
  267 |     expect(acceptedSnapshot.fieldStateCadence).toBe('weekly');
  268 |     expect(acceptedSnapshot.fieldStateInterval).toBe('1');
  269 |     expect(acceptedSnapshot.fieldStateRepeatCount).toBe('');
  270 |     expect(acceptedSnapshot.fieldStateRepeatUntil).toBe('');
  271 |     expect(acceptedSnapshot.fieldSuggestionState).toBe('accepted');
  272 |   });
  273 | 
  274 |   await test.step('phase: submit a truthful bounded create, then prove success reset restores blank fields and a fresh suggestion surface', async () => {
  275 |     const editor = page.getByTestId('create-shift-editor');
  276 |     await submitShiftEditorForm(editor, {
  277 |       title: createdTitle,
  278 |       repeatCount: '2'
  279 |     });
  280 | 
  281 |     await expect(page.locator('[data-testid^="shift-card-"]').filter({ hasText: createdTitle }).first()).toBeVisible();
  282 | 
> 283 |     await expect
      |     ^ Error: expected the create dialog recurrence cadence to reset after the trusted create succeeded
  284 |       .poll(async () => (await readCreateShiftRecurrenceSnapshot(page)).selectedCadence, {
  285 |         message: 'expected the create dialog recurrence cadence to reset after the trusted create succeeded'
  286 |       })
  287 |       .toBe('');
  288 | 
  289 |     const resetSnapshot = await readCreateShiftRecurrenceSnapshot(page);
  290 |     expect(resetSnapshot.selectedCadence).toBe('');
  291 |     expect(resetSnapshot.intervalValue).toBe('');
  292 |     expect(resetSnapshot.repeatCountValue).toBe('');
  293 |     expect(resetSnapshot.repeatUntilValue).toBe('');
  294 |     expect(['idle', 'absent']).toContain(resetSnapshot.fieldSuggestionState);
  295 | 
  296 |     await page.reload();
  297 |     await expect(page.getByTestId('calendar-shell')).toBeVisible();
  298 | 
  299 |     const reloadedSnapshot = await readCreateShiftRecurrenceSnapshot(page);
  300 |     expect(reloadedSnapshot.suggestionVisible).toBe(true);
  301 |     expect(reloadedSnapshot.selectedCadence).toBe('');
  302 |     expect(reloadedSnapshot.intervalValue).toBe('');
  303 |     expect(reloadedSnapshot.repeatCountValue).toBe('');
  304 |     expect(reloadedSnapshot.repeatUntilValue).toBe('');
  305 |     expect(reloadedSnapshot.fieldSuggestionState).toBe('idle');
  306 |   });
  307 | });
  308 | 
  309 | test('weekly recurrence suggestion dismiss path keeps the form blank, stays hidden for the current instance, and returns after reload', async ({
  310 |   page,
  311 |   flow
  312 | }) => {
  313 |   await test.step('phase: sign in and open the Alpha week with the seeded recurrence pattern', async () => {
  314 |     flow.mark('login', seededUsers.alphaMember.email);
  315 |     await signInThroughUi(page, seededUsers.alphaMember);
  316 | 
  317 |     await openCalendarWeek({
  318 |       page,
  319 |       flow,
  320 |       calendarId: seededCalendars.alphaShared,
  321 |       visibleWeekStart: seededSchedule.visibleWeek.start,
  322 |       focusShiftIds: seededSchedule.recurrenceSuggestion.matchingShiftIds,
  323 |       phase: 'recurrence-suggestion-dismiss'
  324 |     });
  325 | 
  326 |     await expect(page.getByTestId('calendar-shell')).toBeVisible();
  327 |   });
  328 | 
  329 |   await test.step('phase: dismiss the suggestion and prove recurrence fields stay blank while remaining editable', async () => {
  330 |     const editor = await openCreateShiftEditor(page);
  331 |     const initialSnapshot = await readCreateShiftRecurrenceSnapshot(page);
  332 |     expect(initialSnapshot.suggestionVisible).toBe(true);
  333 |     expect(initialSnapshot.selectedCadence).toBe('');
  334 | 
  335 |     await editor.getByTestId('recurrence-suggestion-dismiss').dispatchEvent('click');
  336 | 
  337 |     const dismissedSnapshot = await readCreateShiftRecurrenceSnapshot(page);
  338 |     expect(dismissedSnapshot.suggestionVisible).toBe(false);
  339 |     expect(dismissedSnapshot.selectedCadence).toBe('');
  340 |     expect(dismissedSnapshot.intervalValue).toBe('');
  341 |     expect(dismissedSnapshot.repeatCountValue).toBe('');
  342 |     expect(dismissedSnapshot.repeatUntilValue).toBe('');
  343 |     expect(dismissedSnapshot.fieldStateCadence).toBe('one-off');
  344 |     expect(dismissedSnapshot.fieldStateInterval).toBe('');
  345 |     expect(dismissedSnapshot.fieldStateRepeatCount).toBe('');
  346 |     expect(dismissedSnapshot.fieldStateRepeatUntil).toBe('');
  347 |     expect(dismissedSnapshot.fieldSuggestionState).toBe('dismissed');
  348 | 
  349 |     const form = editor.locator('form');
  350 |     await form.evaluate((formElement) => {
  351 |       if (!(formElement instanceof HTMLFormElement)) {
  352 |         throw new Error('Shift editor form element not found.');
  353 |       }
  354 | 
  355 |       const setTextInput = (selector: string, value: string) => {
  356 |         const input = formElement.querySelector(selector);
  357 |         if (!(input instanceof HTMLInputElement)) {
  358 |           throw new Error(`Missing input for selector: ${selector}`);
  359 |         }
  360 | 
  361 |         input.value = value;
  362 |         input.dispatchEvent(new Event('input', { bubbles: true }));
  363 |         input.dispatchEvent(new Event('change', { bubbles: true }));
  364 |       };
  365 | 
  366 |       const radios = Array.from(formElement.querySelectorAll('input[name="recurrenceCadence"]')).filter(
  367 |         (candidate): candidate is HTMLInputElement => candidate instanceof HTMLInputElement
  368 |       );
  369 |       for (const candidate of radios) {
  370 |         candidate.checked = candidate.value === 'weekly';
  371 |       }
  372 | 
  373 |       const weeklyRadio = radios.find((candidate) => candidate.value === 'weekly');
  374 |       weeklyRadio?.dispatchEvent(new Event('input', { bubbles: true }));
  375 |       weeklyRadio?.dispatchEvent(new Event('change', { bubbles: true }));
  376 | 
  377 |       setTextInput('input[name="recurrenceInterval"]', '2');
  378 |       setTextInput('input[name="repeatCount"]', '2');
  379 |     });
  380 | 
  381 |     const manualEditSnapshot = await readCreateShiftRecurrenceSnapshot(page);
  382 |     expect(manualEditSnapshot.suggestionVisible).toBe(false);
  383 |     expect(manualEditSnapshot.selectedCadence).toBe('weekly');
```