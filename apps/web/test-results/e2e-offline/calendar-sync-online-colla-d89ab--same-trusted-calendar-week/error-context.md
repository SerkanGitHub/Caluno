# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-sync.spec.ts >> online collaborators see shared shift changes propagate live within the same trusted calendar week
- Location: tests/e2e/calendar-sync.spec.ts:58:1

# Error details

```
Error: expected realtime diagnostics to reach remote refresh state applied

expect(received).toBe(expected) // Object.is equality

Expected: "applied"
Received: "idle"

Call Log:
- Timeout 20000ms exceeded while waiting on the predicate
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
          - paragraph [ref=e17]: The visible week is rendering from the trusted server snapshot, and offline continuity is cached on this browser.
          - code [ref=e18]: 0 pending / 0 retryable
        - article [ref=e19]:
          - generic [ref=e20]: Sync diagnostics
          - strong [ref=e21]: idle
          - paragraph [ref=e22]: Reconnect is idle. Trusted route actions already confirmed all drained work or nothing was pending.
          - code [ref=e23]: 2026-04-16T13:59:42.280Z
        - article [ref=e24]:
          - generic [ref=e25]: Realtime diagnostics
          - strong [ref=e26]: ready
          - paragraph [ref=e27]: Live change detection is connected for this calendar. Realtime signals trigger trusted refreshes instead of direct client writes.
          - code [ref=e28]: No shared shift signal received yet
          - paragraph [ref=e29]: Listening for shared shift changes on this calendar week.
        - article [ref=e30]:
          - generic [ref=e31]: Week scope
          - strong [ref=e32]: 2026-04-13
          - paragraph [ref=e33]: The requested visible week resolved successfully.
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
          - generic [ref=e44]: Default calendar
          - generic [ref=e45]: member access
          - generic [ref=e46]: 9 visible shifts
          - generic [ref=e47]: Trusted online
          - generic [ref=e48]: idle
          - generic [ref=e49]: realtime ready
      - generic [ref=e50]:
        - generic [ref=e51]:
          - generic [ref=e52]:
            - paragraph [ref=e53]: Protected week board
            - heading "Apr 13 — Apr 19, 2026" [level=2] [ref=e54]
            - paragraph [ref=e55]: Visible week chosen from the route query.
          - generic [ref=e56]:
            - generic [ref=e57]:
              - generic [ref=e58]: "Visible week start: 2026-04-13"
              - generic [ref=e59]: 9 shifts
              - generic [ref=e60]: UTC board
              - generic [ref=e61]: 3 overlap pairs in view
              - generic [ref=e62]: Server-synced board
              - generic [ref=e63]: Online
              - generic [ref=e64]: Sync idle
              - generic [ref=e65]: Sync attempt recorded
              - generic [ref=e66]: No pending local writes
            - navigation "Visible week navigation" [ref=e67]:
              - link "Previous week" [ref=e68] [cursor=pointer]:
                - /url: "?start=2026-04-06"
              - link "Next week" [ref=e69] [cursor=pointer]:
                - /url: "?start=2026-04-20"
        - generic [ref=e70]:
          - group [ref=e71]:
            - generic "Plan a shift" [ref=e72] [cursor=pointer]
            - generic [ref=e73]:
              - generic [ref=e74]:
                - generic [ref=e75]:
                  - paragraph [ref=e76]: Local-first create
                  - heading "Create a shift" [level=3] [ref=e77]
                - generic [ref=e78]: UTC times
              - generic [ref=e79]:
                - group [ref=e80]:
                  - generic [ref=e81]:
                    - generic [ref=e82]: Title
                    - textbox "Title" [ref=e83]:
                      - /placeholder: Opening shift
                      - text: Realtime overlap drill 0-1776347978605
                  - generic [ref=e84]:
                    - generic [ref=e85]:
                      - generic [ref=e86]: Start
                      - textbox "Start" [ref=e87]: 2026-04-16T13:30
                    - generic [ref=e88]:
                      - generic [ref=e89]: End
                      - textbox "End" [ref=e90]: 2026-04-16T14:30
                  - generic [ref=e91]:
                    - generic [ref=e92]:
                      - generic [ref=e93]:
                        - paragraph [ref=e94]: Bounded recurrence
                        - heading "Optional repeat rule" [level=3] [ref=e95]
                      - generic [ref=e96]: Count or until required
                    - generic [ref=e97]:
                      - group [ref=e98]:
                        - generic [ref=e99]: Cadence
                        - generic [ref=e100]:
                          - generic [ref=e101] [cursor=pointer]:
                            - radio "One-off No repeats" [checked] [ref=e102]
                            - strong [ref=e103]: One-off
                            - generic [ref=e104]: No repeats
                          - generic [ref=e105] [cursor=pointer]:
                            - radio "Daily Every day" [ref=e106]
                            - strong [ref=e107]: Daily
                            - generic [ref=e108]: Every day
                          - generic [ref=e109] [cursor=pointer]:
                            - radio "Weekly Weekly cadence" [ref=e110]
                            - strong [ref=e111]: Weekly
                            - generic [ref=e112]: Weekly cadence
                          - generic [ref=e113] [cursor=pointer]:
                            - radio "Monthly Monthly cadence" [ref=e114]
                            - strong [ref=e115]: Monthly
                            - generic [ref=e116]: Monthly cadence
                      - generic [ref=e117]:
                        - generic [ref=e118]: Interval
                        - spinbutton "Interval" [ref=e119]
                      - generic [ref=e120]:
                        - generic [ref=e121]: Repeat count
                        - spinbutton "Repeat count" [ref=e122]
                      - generic [ref=e123]:
                        - generic [ref=e124]: Repeat until
                        - textbox "Repeat until" [ref=e125]
                - generic [ref=e126]:
                  - button "Save shift" [ref=e127] [cursor=pointer]
                  - generic [ref=e128]: The board updates locally first, then waits for trusted server confirmation when online.
          - generic [ref=e129]:
            - paragraph [ref=e130]: Board rhythm
            - paragraph [ref=e131]: Local writes update the visible week immediately, stay queued when the server is unavailable, and keep the trusted server action as the confirmation path.
        - article [ref=e132]:
          - generic [ref=e133]: Visible-week conflict watch
          - strong [ref=e134]: 3 overlap pairs in view
          - paragraph [ref=e135]: Thu, Apr 16 contains 3 conflicting visible shifts.
        - article [ref=e136]:
          - generic [ref=e137]: Board sync diagnostics
          - strong [ref=e138]: Sync idle
          - paragraph [ref=e139]:
            - text: "Last reconnect attempt:"
            - code [ref=e140]: 2026-04-16T13:59:42.280Z
        - article [ref=e141]:
          - generic [ref=e142]: Board realtime diagnostics
          - strong [ref=e143]: ready
          - paragraph [ref=e144]: No shared shift signal has touched this visible week yet.
          - paragraph [ref=e145]: Listening for shared shift changes on this calendar week.
        - generic [ref=e146]:
          - generic [ref=e147]:
            - generic [ref=e148]:
              - generic [ref=e149]:
                - paragraph [ref=e150]: Monday
                - heading "Apr 13" [level=3] [ref=e151]
              - generic [ref=e153]: 1 shift
            - article [ref=e155]:
              - generic [ref=e156]:
                - generic [ref=e157]:
                  - paragraph [ref=e158]: Recurring series
                  - heading "Alpha opening sweep" [level=3] [ref=e159]
                - generic [ref=e160]:
                  - generic [ref=e161]: 08:30 → 09:00
                  - generic [ref=e162]: Occurrence 1
              - generic [ref=e163]:
                - generic [ref=e164]:
                  - text: Window
                  - strong [ref=e165]: 08:30 → 09:00
                - generic [ref=e166]:
                  - text: Duration
                  - strong [ref=e167]: 0.5h block
                - generic [ref=e168]:
                  - text: Shift id
                  - code [ref=e169]: aaaaaaaa-8888-1111-1111-111111111111
              - generic [ref=e170]:
                - group [ref=e171]:
                  - generic "Edit details" [ref=e172] [cursor=pointer]
                - group [ref=e173]:
                  - generic "Move timing" [ref=e174] [cursor=pointer]
                - button "Delete shift" [ref=e176] [cursor=pointer]
          - generic [ref=e177]:
            - generic [ref=e178]:
              - generic [ref=e179]:
                - paragraph [ref=e180]: Tuesday
                - heading "Apr 14" [level=3] [ref=e181]
              - generic [ref=e183]: 1 shift
            - article [ref=e185]:
              - generic [ref=e186]:
                - generic [ref=e187]:
                  - paragraph [ref=e188]: Recurring series
                  - heading "Alpha opening sweep" [level=3] [ref=e189]
                - generic [ref=e190]:
                  - generic [ref=e191]: 08:30 → 09:00
                  - generic [ref=e192]: Occurrence 2
              - generic [ref=e193]:
                - generic [ref=e194]:
                  - text: Window
                  - strong [ref=e195]: 08:30 → 09:00
                - generic [ref=e196]:
                  - text: Duration
                  - strong [ref=e197]: 0.5h block
                - generic [ref=e198]:
                  - text: Shift id
                  - code [ref=e199]: aaaaaaaa-8888-1111-1111-222222222222
              - generic [ref=e200]:
                - group [ref=e201]:
                  - generic "Edit details" [ref=e202] [cursor=pointer]
                - group [ref=e203]:
                  - generic "Move timing" [ref=e204] [cursor=pointer]
                - button "Delete shift" [ref=e206] [cursor=pointer]
          - generic [ref=e207]:
            - generic [ref=e208]:
              - generic [ref=e209]:
                - paragraph [ref=e210]: Wednesday
                - heading "Apr 15" [level=3] [ref=e211]
              - generic [ref=e213]: 3 shifts
            - generic [ref=e214]:
              - article [ref=e215]:
                - generic [ref=e216]:
                  - generic [ref=e217]:
                    - paragraph [ref=e218]: Recurring series
                    - heading "Alpha opening sweep" [level=3] [ref=e219]
                  - generic [ref=e220]:
                    - generic [ref=e221]: 08:30 → 09:00
                    - generic [ref=e222]: Occurrence 3
                - generic [ref=e223]:
                  - generic [ref=e224]:
                    - text: Window
                    - strong [ref=e225]: 08:30 → 09:00
                  - generic [ref=e226]:
                    - text: Duration
                    - strong [ref=e227]: 0.5h block
                  - generic [ref=e228]:
                    - text: Shift id
                    - code [ref=e229]: aaaaaaaa-8888-1111-1111-333333333333
                - generic [ref=e230]:
                  - group [ref=e231]:
                    - generic "Edit details" [ref=e232] [cursor=pointer]
                  - group [ref=e233]:
                    - generic "Move timing" [ref=e234] [cursor=pointer]
                  - button "Delete shift" [ref=e236] [cursor=pointer]
              - article [ref=e237]:
                - generic [ref=e238]:
                  - generic [ref=e239]:
                    - paragraph [ref=e240]: One-off shift
                    - heading "Morning intake" [level=3] [ref=e241]
                  - generic [ref=e243]: 09:00 → 11:00
                - generic [ref=e244]:
                  - generic [ref=e245]:
                    - text: Window
                    - strong [ref=e246]: 09:00 → 11:00
                  - generic [ref=e247]:
                    - text: Duration
                    - strong [ref=e248]: 2h block
                  - generic [ref=e249]:
                    - text: Shift id
                    - code [ref=e250]: aaaaaaaa-6666-1111-1111-111111111111
                - generic [ref=e251]:
                  - group [ref=e252]:
                    - generic "Edit details" [ref=e253] [cursor=pointer]
                  - group [ref=e254]:
                    - generic "Move timing" [ref=e255] [cursor=pointer]
                  - button "Delete shift" [ref=e257] [cursor=pointer]
              - article [ref=e258]:
                - generic [ref=e259]:
                  - generic [ref=e260]:
                    - paragraph [ref=e261]: One-off shift
                    - heading "Afternoon handoff" [level=3] [ref=e262]
                  - generic [ref=e264]: 13:00 → 15:00
                - generic [ref=e265]:
                  - generic [ref=e266]:
                    - text: Window
                    - strong [ref=e267]: 13:00 → 15:00
                  - generic [ref=e268]:
                    - text: Duration
                    - strong [ref=e269]: 2h block
                  - generic [ref=e270]:
                    - text: Shift id
                    - code [ref=e271]: aaaaaaaa-6666-1111-1111-222222222222
                - generic [ref=e272]:
                  - group [ref=e273]:
                    - generic "Edit details" [ref=e274] [cursor=pointer]
                  - group [ref=e275]:
                    - generic "Move timing" [ref=e276] [cursor=pointer]
                  - button "Delete shift" [ref=e278] [cursor=pointer]
          - generic [ref=e279]:
            - generic [ref=e280]:
              - generic:
                - paragraph: Thursday
                - heading "Apr 16" [level=3]
              - generic [ref=e281]:
                - generic [ref=e282]: Today
                - generic [ref=e283]: 3 overlap pairs
                - generic [ref=e284]: 4 shifts
            - generic [ref=e285]:
              - article [ref=e286]:
                - strong [ref=e287]: 3 overlap pairs
                - paragraph [ref=e288]: Kitchen prep (12:00 → 14:00) · Supplier call (13:00 → 15:00) +1 more
              - article [ref=e289]:
                - generic [ref=e290]:
                  - generic [ref=e291]:
                    - paragraph [ref=e292]: Recurring series
                    - heading "Alpha opening sweep" [level=3] [ref=e293]
                  - generic [ref=e294]:
                    - generic [ref=e295]: 08:30 → 09:00
                    - generic [ref=e296]: Occurrence 4
                - generic [ref=e297]:
                  - generic [ref=e298]:
                    - text: Window
                    - strong [ref=e299]: 08:30 → 09:00
                  - generic [ref=e300]:
                    - text: Duration
                    - strong [ref=e301]: 0.5h block
                  - generic [ref=e302]:
                    - text: Shift id
                    - code [ref=e303]: aaaaaaaa-8888-1111-1111-444444444444
                - generic [ref=e304]:
                  - group [ref=e305]:
                    - generic "Edit details" [ref=e306] [cursor=pointer]
                  - group [ref=e307]:
                    - generic "Move timing" [ref=e308] [cursor=pointer]
                  - button "Delete shift" [ref=e310] [cursor=pointer]
              - article [ref=e311]:
                - generic [ref=e312]:
                  - generic [ref=e313]:
                    - paragraph [ref=e314]: One-off shift
                    - heading "Kitchen prep" [level=3] [ref=e315]
                  - generic [ref=e316]:
                    - generic [ref=e317]: 12:00 → 14:00
                    - generic [ref=e318]: Overlaps 2 visible shifts
                - article [ref=e319]:
                  - strong [ref=e320]: Overlaps 2 visible shifts
                  - paragraph [ref=e321]: Supplier call (13:00 → 15:00) · Realtime overlap drill 0-1776347978605 (13:30 → 14:30)
                - generic [ref=e322]:
                  - generic [ref=e323]:
                    - text: Window
                    - strong [ref=e324]: 12:00 → 14:00
                  - generic [ref=e325]:
                    - text: Duration
                    - strong [ref=e326]: 2h block
                  - generic [ref=e327]:
                    - text: Shift id
                    - code [ref=e328]: aaaaaaaa-7777-1111-1111-111111111111
                - generic [ref=e329]:
                  - group [ref=e330]:
                    - generic "Edit details" [ref=e331] [cursor=pointer]
                  - group [ref=e332]:
                    - generic "Move timing" [ref=e333] [cursor=pointer]
                  - button "Delete shift" [ref=e335] [cursor=pointer]
              - article [ref=e336]:
                - generic [ref=e337]:
                  - generic [ref=e338]:
                    - paragraph [ref=e339]: One-off shift
                    - heading "Supplier call" [level=3] [ref=e340]
                  - generic [ref=e341]:
                    - generic [ref=e342]: 13:00 → 15:00
                    - generic [ref=e343]: Overlaps 2 visible shifts
                - article [ref=e344]:
                  - strong [ref=e345]: Overlaps 2 visible shifts
                  - paragraph [ref=e346]: Kitchen prep (12:00 → 14:00) · Realtime overlap drill 0-1776347978605 (13:30 → 14:30)
                - generic [ref=e347]:
                  - generic [ref=e348]:
                    - text: Window
                    - strong [ref=e349]: 13:00 → 15:00
                  - generic [ref=e350]:
                    - text: Duration
                    - strong [ref=e351]: 2h block
                  - generic [ref=e352]:
                    - text: Shift id
                    - code [ref=e353]: aaaaaaaa-7777-1111-1111-222222222222
                - generic [ref=e354]:
                  - group [ref=e355]:
                    - generic "Edit details" [ref=e356] [cursor=pointer]
                  - group [ref=e357]:
                    - generic "Move timing" [ref=e358] [cursor=pointer]
                  - button "Delete shift" [ref=e360] [cursor=pointer]
              - article [ref=e361]:
                - generic [ref=e362]:
                  - generic [ref=e363]:
                    - paragraph [ref=e364]: One-off shift
                    - heading "Realtime overlap drill 0-1776347978605" [level=3] [ref=e365]
                  - generic [ref=e366]:
                    - generic [ref=e367]: 13:30 → 14:30
                    - generic [ref=e368]: Overlaps 2 visible shifts
                - article [ref=e369]:
                  - strong [ref=e370]: Overlaps 2 visible shifts
                  - paragraph [ref=e371]: Kitchen prep (12:00 → 14:00) · Supplier call (13:00 → 15:00)
                - generic [ref=e372]:
                  - generic [ref=e373]:
                    - text: Window
                    - strong [ref=e374]: 13:30 → 14:30
                  - generic [ref=e375]:
                    - text: Duration
                    - strong [ref=e376]: 1h block
                  - generic [ref=e377]:
                    - text: Shift id
                    - code [ref=e378]: 2b265ef3-4281-4157-a48d-9b4c052bae75
                - generic [ref=e379]:
                  - group [ref=e380]:
                    - generic "Edit details" [ref=e381] [cursor=pointer]
                  - group [ref=e382]:
                    - generic "Move timing" [ref=e383] [cursor=pointer]
                  - button "Delete shift" [ref=e385] [cursor=pointer]
          - generic [ref=e386]:
            - generic [ref=e387]:
              - generic [ref=e388]:
                - paragraph [ref=e389]: Friday
                - heading "Apr 17" [level=3] [ref=e390]
              - generic [ref=e392]: 0 shifts
            - article [ref=e393]:
              - paragraph [ref=e394]: Open capacity
              - heading "Nothing scheduled." [level=3] [ref=e395]
              - paragraph [ref=e396]: This day stays visible so users can add or move a shift here without losing week context.
          - generic [ref=e397]:
            - generic [ref=e398]:
              - generic [ref=e399]:
                - paragraph [ref=e400]: Saturday
                - heading "Apr 18" [level=3] [ref=e401]
              - generic [ref=e403]: 0 shifts
            - article [ref=e404]:
              - paragraph [ref=e405]: Open capacity
              - heading "Nothing scheduled." [level=3] [ref=e406]
              - paragraph [ref=e407]: This day stays visible so users can add or move a shift here without losing week context.
          - generic [ref=e408]:
            - generic [ref=e409]:
              - generic [ref=e410]:
                - paragraph [ref=e411]: Sunday
                - heading "Apr 19" [level=3] [ref=e412]
              - generic [ref=e414]: 0 shifts
            - article [ref=e415]:
              - paragraph [ref=e416]: Open capacity
              - heading "Nothing scheduled." [level=3] [ref=e417]
              - paragraph [ref=e418]: This day stays visible so users can add or move a shift here without losing week context.
      - generic [ref=e419]:
        - generic [ref=e420]:
          - generic [ref=e421]:
            - paragraph [ref=e422]: Visible calendar inventory
            - heading "Only trusted calendars appear in navigation." [level=3] [ref=e423]
          - generic [ref=e424]: 2 visible
        - generic [ref=e425]:
          - link "Alpha shared Default calendar" [ref=e426] [cursor=pointer]:
            - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111
            - strong [ref=e427]: Alpha shared
            - generic [ref=e428]: Default calendar
          - link "Alpha backlog Secondary calendar" [ref=e429] [cursor=pointer]:
            - /url: /calendars/aaaaaaaa-aaaa-1111-1111-222222222222
            - strong [ref=e430]: Alpha backlog
            - generic [ref=e431]: Secondary calendar
  - generic [ref=e432]: Alpha shared • Caluno
```

# Test source

```ts
  998  |   await expect
  999  |     .poll(async () => await readStateText(page, 'calendar-local-state', 'code'), {
  1000 |       timeout,
  1001 |       message
  1002 |     })
  1003 |     .toBe(expectedSummary);
  1004 | }
  1005 | 
  1006 | export async function waitForLocalSnapshotStatus(page: Page, expectedStatus: 'ready' | 'failed' | 'idle', timeout = 20_000) {
  1007 |   await expect
  1008 |     .poll(async () => page.getByTestId('calendar-local-state').getAttribute('data-snapshot-status'), {
  1009 |       timeout,
  1010 |       message: `expected local snapshot status to become ${expectedStatus}`
  1011 |     })
  1012 |     .toBe(expectedStatus);
  1013 | }
  1014 | 
  1015 | export async function waitForSyncAttempt(page: Page, timeout = 20_000) {
  1016 |   await expect
  1017 |     .poll(async () => (await readStateText(page, 'calendar-sync-state', 'code')) ?? '', {
  1018 |       timeout,
  1019 |       message: 'expected reconnect diagnostics to record a last-attempt marker'
  1020 |     })
  1021 |     .not.toBe('No reconnect attempt yet');
  1022 | }
  1023 | 
  1024 | export async function waitForSyncPhase(page: Page, expectedPhase: string | RegExp, timeout = 20_000) {
  1025 |   const message = `expected sync phase to become ${String(expectedPhase)}`;
  1026 | 
  1027 |   if (expectedPhase instanceof RegExp) {
  1028 |     await expect
  1029 |       .poll(async () => (await readStateText(page, 'calendar-sync-state', 'strong')) ?? '', {
  1030 |         timeout,
  1031 |         message
  1032 |       })
  1033 |       .toMatch(expectedPhase);
  1034 |     return;
  1035 |   }
  1036 | 
  1037 |   await expect
  1038 |     .poll(async () => await readStateText(page, 'calendar-sync-state', 'strong'), {
  1039 |       timeout,
  1040 |       message
  1041 |     })
  1042 |     .toBe(expectedPhase);
  1043 | }
  1044 | 
  1045 | export type RealtimeDiagnosticsState = {
  1046 |   channelState: string | null;
  1047 |   remoteRefreshState: string | null;
  1048 |   signalSummary: string | null;
  1049 |   detail: string | null;
  1050 |   reason: string | null;
  1051 | };
  1052 | 
  1053 | export async function readRealtimeDiagnosticsState(page: Page): Promise<RealtimeDiagnosticsState> {
  1054 |   return {
  1055 |     channelState: await page.getByTestId('calendar-realtime-state').getAttribute('data-channel-state'),
  1056 |     remoteRefreshState: await page.getByTestId('calendar-realtime-state').getAttribute('data-remote-refresh-state'),
  1057 |     signalSummary: await readStateText(page, 'calendar-realtime-state', 'code'),
  1058 |     detail: await readStateText(page, 'calendar-realtime-state', 'p:last-of-type'),
  1059 |     reason: await readStateText(page, 'calendar-realtime-state', 'code:last-of-type')
  1060 |   };
  1061 | }
  1062 | 
  1063 | export async function waitForRealtimeChannelReady(page: Page, timeout = 20_000) {
  1064 |   await expect
  1065 |     .poll(async () => (await readRealtimeDiagnosticsState(page)).channelState, {
  1066 |       timeout,
  1067 |       message: 'expected the realtime channel state to reach ready'
  1068 |     })
  1069 |     .toBe('ready');
  1070 | }
  1071 | 
  1072 | export async function waitForRealtimeSignal(page: Page, expectedSignal: string | RegExp = /(INSERT|UPDATE|DELETE) at /, timeout = 20_000) {
  1073 |   const message = `expected realtime diagnostics to record a shared shift signal matching ${String(expectedSignal)}`;
  1074 | 
  1075 |   if (expectedSignal instanceof RegExp) {
  1076 |     await expect
  1077 |       .poll(async () => (await readRealtimeDiagnosticsState(page)).signalSummary ?? '', {
  1078 |         timeout,
  1079 |         message
  1080 |       })
  1081 |       .toMatch(expectedSignal);
  1082 |     return;
  1083 |   }
  1084 | 
  1085 |   await expect
  1086 |     .poll(async () => (await readRealtimeDiagnosticsState(page)).signalSummary, {
  1087 |       timeout,
  1088 |       message
  1089 |     })
  1090 |     .toBe(expectedSignal);
  1091 | }
  1092 | 
  1093 | export async function waitForRemoteRefreshState(
  1094 |   page: Page,
  1095 |   expectedState: 'idle' | 'refreshing' | 'applied' | 'failed',
  1096 |   timeout = 20_000
  1097 | ) {
> 1098 |   await expect
       |   ^ Error: expected realtime diagnostics to reach remote refresh state applied
  1099 |     .poll(async () => (await readRealtimeDiagnosticsState(page)).remoteRefreshState, {
  1100 |       timeout,
  1101 |       message: `expected realtime diagnostics to reach remote refresh state ${expectedState}`
  1102 |     })
  1103 |     .toBe(expectedState);
  1104 | }
  1105 | 
  1106 | export async function waitForRemoteRefreshApplied(page: Page, timeout = 20_000) {
  1107 |   await waitForRemoteRefreshState(page, 'applied', timeout);
  1108 | }
  1109 | 
  1110 | export async function createTrackedSession(params: {
  1111 |   browser: Browser;
  1112 |   testInfo: TestInfo;
  1113 |   attachmentName: string;
  1114 |   contextOptions?: BrowserContextOptions;
  1115 | }): Promise<{
  1116 |   context: BrowserContext;
  1117 |   page: Page;
  1118 |   flow: FlowDiagnostics;
  1119 |   close: () => Promise<void>;
  1120 | }> {
  1121 |   const configuredBaseURL = params.testInfo.project.use.baseURL;
  1122 |   const baseURL = typeof configuredBaseURL === 'string' ? configuredBaseURL : undefined;
  1123 |   const context = await params.browser.newContext({
  1124 |     baseURL,
  1125 |     ...(params.contextOptions ?? {})
  1126 |   });
  1127 |   const page = await context.newPage();
  1128 |   const flow = createFlowDiagnostics(page, params.testInfo, params.attachmentName);
  1129 |   flow.mark('session-start', params.attachmentName);
  1130 | 
  1131 |   let closed = false;
  1132 | 
  1133 |   return {
  1134 |     context,
  1135 |     page,
  1136 |     flow,
  1137 |     async close() {
  1138 |       if (closed) {
  1139 |         return;
  1140 |       }
  1141 | 
  1142 |       closed = true;
  1143 |       await flow.attach().catch(() => undefined);
  1144 |       await context.close();
  1145 |     }
  1146 |   };
  1147 | }
  1148 | 
  1149 | export async function openTrackedCalendarSession(params: {
  1150 |   browser: Browser;
  1151 |   testInfo: TestInfo;
  1152 |   attachmentName: string;
  1153 |   user: SeededUser;
  1154 |   calendarId: string;
  1155 |   visibleWeekStart?: string;
  1156 |   focusShiftIds?: string[];
  1157 |   contextOptions?: BrowserContextOptions;
  1158 | }): Promise<{
  1159 |   context: BrowserContext;
  1160 |   page: Page;
  1161 |   flow: FlowDiagnostics;
  1162 |   close: () => Promise<void>;
  1163 | }> {
  1164 |   const session = await createTrackedSession({
  1165 |     browser: params.browser,
  1166 |     testInfo: params.testInfo,
  1167 |     attachmentName: params.attachmentName,
  1168 |     contextOptions: params.contextOptions
  1169 |   });
  1170 | 
  1171 |   try {
  1172 |     session.flow.mark('login', params.user.email);
  1173 |     await signInThroughUi(session.page, params.user);
  1174 |     await openCalendarWeek({
  1175 |       page: session.page,
  1176 |       flow: session.flow,
  1177 |       calendarId: params.calendarId,
  1178 |       visibleWeekStart: params.visibleWeekStart,
  1179 |       focusShiftIds: params.focusShiftIds,
  1180 |       phase: 'open-calendar-session'
  1181 |     });
  1182 |     await syncCalendarFlowContext(session.page, session.flow, {
  1183 |       calendarId: params.calendarId,
  1184 |       visibleWeekStart: params.visibleWeekStart ?? seededSchedule.visibleWeek.start,
  1185 |       visibleWeekEndExclusive: seededSchedule.visibleWeek.endExclusive,
  1186 |       focusShiftIds: params.focusShiftIds ?? [],
  1187 |       note: `${params.attachmentName} opened a trusted calendar session`
  1188 |     });
  1189 | 
  1190 |     return session;
  1191 |   } catch (error) {
  1192 |     await session.close();
  1193 |     throw error;
  1194 |   }
  1195 | }
  1196 | 
  1197 | export async function submitShiftEditorForm(
  1198 |   editor: Locator,
```