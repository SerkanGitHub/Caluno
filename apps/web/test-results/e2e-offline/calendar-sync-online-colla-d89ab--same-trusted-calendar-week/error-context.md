# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-sync.spec.ts >> online collaborators see shared shift changes propagate live within the same trusted calendar week
- Location: tests/e2e/calendar-sync.spec.ts:58:1

# Error details

```
Error: expected the realtime channel state to reach ready

expect(received).toBe(expected) // Object.is equality

Expected: "ready"
Received: "subscribing"

Call Log:
- Timeout 20000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
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
        - paragraph [ref=e17]: The visible week is rendering from the trusted server snapshot while browser-local continuity finishes caching.
        - code [ref=e18]: 0 pending / 0 retryable
      - article [ref=e19]:
        - generic [ref=e20]: Sync diagnostics
        - strong [ref=e21]: idle
        - paragraph [ref=e22]: Reconnect is idle. Trusted route actions already confirmed all drained work or nothing was pending.
        - code [ref=e23]: No reconnect attempt yet
      - article [ref=e24]:
        - generic [ref=e25]: Realtime diagnostics
        - strong [ref=e26]: subscribing
        - paragraph [ref=e27]: The shared shift channel is connecting. The current board stays visible while live change detection becomes ready.
        - code [ref=e28]: No shared shift signal received yet
        - paragraph [ref=e29]: Connecting to shared shift change detection for this calendar week.
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
        - generic [ref=e46]: 8 visible shifts
        - generic [ref=e47]: Trusted online
        - generic [ref=e48]: idle
        - generic [ref=e49]: realtime subscribing
    - generic [ref=e50]:
      - generic [ref=e51]:
        - generic [ref=e52]:
          - paragraph [ref=e53]: Protected week board
          - heading "Apr 13 — Apr 19, 2026" [level=2] [ref=e54]
          - paragraph [ref=e55]: Visible week chosen from the route query.
        - generic [ref=e56]:
          - generic [ref=e57]:
            - generic [ref=e58]: "Visible week start: 2026-04-13"
            - generic [ref=e59]: 8 shifts
            - generic [ref=e60]: UTC board
            - generic [ref=e61]: 1 overlap pair in view
            - generic [ref=e62]: Server-synced board
            - generic [ref=e63]: Online
            - generic [ref=e64]: Sync idle
            - generic [ref=e65]: No pending local writes
          - navigation "Visible week navigation" [ref=e66]:
            - link "Previous week" [ref=e67] [cursor=pointer]:
              - /url: "?start=2026-04-06"
            - link "Next week" [ref=e68] [cursor=pointer]:
              - /url: "?start=2026-04-20"
      - generic [ref=e69]:
        - group [ref=e70]:
          - generic "Plan a shift" [ref=e71] [cursor=pointer]
        - generic [ref=e72]:
          - paragraph [ref=e73]: Board rhythm
          - paragraph [ref=e74]: Local writes update the visible week immediately, stay queued when the server is unavailable, and keep the trusted server action as the confirmation path.
      - article [ref=e75]:
        - generic [ref=e76]: Visible-week conflict watch
        - strong [ref=e77]: 1 overlap pair in view
        - paragraph [ref=e78]: Thu, Apr 16 contains 2 conflicting visible shifts.
      - article [ref=e79]:
        - generic [ref=e80]: Board sync diagnostics
        - strong [ref=e81]: Sync idle
        - paragraph [ref=e82]: No reconnect attempt has been recorded on this route yet.
      - article [ref=e83]:
        - generic [ref=e84]: Board realtime diagnostics
        - strong [ref=e85]: subscribing
        - paragraph [ref=e86]: No shared shift signal has touched this visible week yet.
        - paragraph [ref=e87]: Connecting to shared shift change detection for this calendar week.
      - generic [ref=e88]:
        - generic [ref=e89]:
          - generic [ref=e90]:
            - generic [ref=e91]:
              - paragraph [ref=e92]: Monday
              - heading "Apr 13" [level=3] [ref=e93]
            - generic [ref=e95]: 1 shift
          - article [ref=e97]:
            - generic [ref=e98]:
              - generic [ref=e99]:
                - paragraph [ref=e100]: Recurring series
                - heading "Alpha opening sweep" [level=3] [ref=e101]
              - generic [ref=e102]:
                - generic [ref=e103]: 08:30 → 09:00
                - generic [ref=e104]: Occurrence 1
            - generic [ref=e105]:
              - generic [ref=e106]:
                - text: Window
                - strong [ref=e107]: 08:30 → 09:00
              - generic [ref=e108]:
                - text: Duration
                - strong [ref=e109]: 0.5h block
              - generic [ref=e110]:
                - text: Shift id
                - code [ref=e111]: aaaaaaaa-8888-1111-1111-111111111111
            - generic [ref=e112]:
              - group [ref=e113]:
                - generic "Edit details" [ref=e114] [cursor=pointer]
              - group [ref=e115]:
                - generic "Move timing" [ref=e116] [cursor=pointer]
              - button "Delete shift" [ref=e118] [cursor=pointer]
        - generic [ref=e119]:
          - generic [ref=e120]:
            - generic [ref=e121]:
              - paragraph [ref=e122]: Tuesday
              - heading "Apr 14" [level=3] [ref=e123]
            - generic [ref=e125]: 1 shift
          - article [ref=e127]:
            - generic [ref=e128]:
              - generic [ref=e129]:
                - paragraph [ref=e130]: Recurring series
                - heading "Alpha opening sweep" [level=3] [ref=e131]
              - generic [ref=e132]:
                - generic [ref=e133]: 08:30 → 09:00
                - generic [ref=e134]: Occurrence 2
            - generic [ref=e135]:
              - generic [ref=e136]:
                - text: Window
                - strong [ref=e137]: 08:30 → 09:00
              - generic [ref=e138]:
                - text: Duration
                - strong [ref=e139]: 0.5h block
              - generic [ref=e140]:
                - text: Shift id
                - code [ref=e141]: aaaaaaaa-8888-1111-1111-222222222222
            - generic [ref=e142]:
              - group [ref=e143]:
                - generic "Edit details" [ref=e144] [cursor=pointer]
              - group [ref=e145]:
                - generic "Move timing" [ref=e146] [cursor=pointer]
              - button "Delete shift" [ref=e148] [cursor=pointer]
        - generic [ref=e149]:
          - generic [ref=e150]:
            - generic [ref=e151]:
              - paragraph [ref=e152]: Wednesday
              - heading "Apr 15" [level=3] [ref=e153]
            - generic [ref=e155]: 3 shifts
          - generic [ref=e156]:
            - article [ref=e157]:
              - generic [ref=e158]:
                - generic [ref=e159]:
                  - paragraph [ref=e160]: Recurring series
                  - heading "Alpha opening sweep" [level=3] [ref=e161]
                - generic [ref=e162]:
                  - generic [ref=e163]: 08:30 → 09:00
                  - generic [ref=e164]: Occurrence 3
              - generic [ref=e165]:
                - generic [ref=e166]:
                  - text: Window
                  - strong [ref=e167]: 08:30 → 09:00
                - generic [ref=e168]:
                  - text: Duration
                  - strong [ref=e169]: 0.5h block
                - generic [ref=e170]:
                  - text: Shift id
                  - code [ref=e171]: aaaaaaaa-8888-1111-1111-333333333333
              - generic [ref=e172]:
                - group [ref=e173]:
                  - generic "Edit details" [ref=e174] [cursor=pointer]
                - group [ref=e175]:
                  - generic "Move timing" [ref=e176] [cursor=pointer]
                - button "Delete shift" [ref=e178] [cursor=pointer]
            - article [ref=e179]:
              - generic [ref=e180]:
                - generic [ref=e181]:
                  - paragraph [ref=e182]: One-off shift
                  - heading "Morning intake" [level=3] [ref=e183]
                - generic [ref=e185]: 09:00 → 11:00
              - generic [ref=e186]:
                - generic [ref=e187]:
                  - text: Window
                  - strong [ref=e188]: 09:00 → 11:00
                - generic [ref=e189]:
                  - text: Duration
                  - strong [ref=e190]: 2h block
                - generic [ref=e191]:
                  - text: Shift id
                  - code [ref=e192]: aaaaaaaa-6666-1111-1111-111111111111
              - generic [ref=e193]:
                - group [ref=e194]:
                  - generic "Edit details" [ref=e195] [cursor=pointer]
                - group [ref=e196]:
                  - generic "Move timing" [ref=e197] [cursor=pointer]
                - button "Delete shift" [ref=e199] [cursor=pointer]
            - article [ref=e200]:
              - generic [ref=e201]:
                - generic [ref=e202]:
                  - paragraph [ref=e203]: One-off shift
                  - heading "Afternoon handoff" [level=3] [ref=e204]
                - generic [ref=e206]: 13:00 → 15:00
              - generic [ref=e207]:
                - generic [ref=e208]:
                  - text: Window
                  - strong [ref=e209]: 13:00 → 15:00
                - generic [ref=e210]:
                  - text: Duration
                  - strong [ref=e211]: 2h block
                - generic [ref=e212]:
                  - text: Shift id
                  - code [ref=e213]: aaaaaaaa-6666-1111-1111-222222222222
              - generic [ref=e214]:
                - group [ref=e215]:
                  - generic "Edit details" [ref=e216] [cursor=pointer]
                - group [ref=e217]:
                  - generic "Move timing" [ref=e218] [cursor=pointer]
                - button "Delete shift" [ref=e220] [cursor=pointer]
        - generic [ref=e221]:
          - generic [ref=e222]:
            - generic:
              - paragraph: Thursday
              - heading "Apr 16" [level=3]
            - generic [ref=e223]:
              - generic [ref=e224]: Today
              - generic [ref=e225]: 1 overlap pair
              - generic [ref=e226]: 3 shifts
          - generic [ref=e227]:
            - article [ref=e228]:
              - strong [ref=e229]: 1 overlap pair
              - paragraph [ref=e230]: Kitchen prep (12:00 → 14:00) · Supplier call (13:00 → 15:00)
            - article [ref=e231]:
              - generic [ref=e232]:
                - generic [ref=e233]:
                  - paragraph [ref=e234]: Recurring series
                  - heading "Alpha opening sweep" [level=3] [ref=e235]
                - generic [ref=e236]:
                  - generic [ref=e237]: 08:30 → 09:00
                  - generic [ref=e238]: Occurrence 4
              - generic [ref=e239]:
                - generic [ref=e240]:
                  - text: Window
                  - strong [ref=e241]: 08:30 → 09:00
                - generic [ref=e242]:
                  - text: Duration
                  - strong [ref=e243]: 0.5h block
                - generic [ref=e244]:
                  - text: Shift id
                  - code [ref=e245]: aaaaaaaa-8888-1111-1111-444444444444
              - generic [ref=e246]:
                - group [ref=e247]:
                  - generic "Edit details" [ref=e248] [cursor=pointer]
                - group [ref=e249]:
                  - generic "Move timing" [ref=e250] [cursor=pointer]
                - button "Delete shift" [ref=e252] [cursor=pointer]
            - article [ref=e253]:
              - generic [ref=e254]:
                - generic [ref=e255]:
                  - paragraph [ref=e256]: One-off shift
                  - heading "Kitchen prep" [level=3] [ref=e257]
                - generic [ref=e258]:
                  - generic [ref=e259]: 12:00 → 14:00
                  - generic [ref=e260]: Overlaps 1 visible shift
              - article [ref=e261]:
                - strong [ref=e262]: Overlaps 1 visible shift
                - paragraph [ref=e263]: Supplier call (13:00 → 15:00)
              - generic [ref=e264]:
                - generic [ref=e265]:
                  - text: Window
                  - strong [ref=e266]: 12:00 → 14:00
                - generic [ref=e267]:
                  - text: Duration
                  - strong [ref=e268]: 2h block
                - generic [ref=e269]:
                  - text: Shift id
                  - code [ref=e270]: aaaaaaaa-7777-1111-1111-111111111111
              - generic [ref=e271]:
                - group [ref=e272]:
                  - generic "Edit details" [ref=e273] [cursor=pointer]
                - group [ref=e274]:
                  - generic "Move timing" [ref=e275] [cursor=pointer]
                - button "Delete shift" [ref=e277] [cursor=pointer]
            - article [ref=e278]:
              - generic [ref=e279]:
                - generic [ref=e280]:
                  - paragraph [ref=e281]: One-off shift
                  - heading "Supplier call" [level=3] [ref=e282]
                - generic [ref=e283]:
                  - generic [ref=e284]: 13:00 → 15:00
                  - generic [ref=e285]: Overlaps 1 visible shift
              - article [ref=e286]:
                - strong [ref=e287]: Overlaps 1 visible shift
                - paragraph [ref=e288]: Kitchen prep (12:00 → 14:00)
              - generic [ref=e289]:
                - generic [ref=e290]:
                  - text: Window
                  - strong [ref=e291]: 13:00 → 15:00
                - generic [ref=e292]:
                  - text: Duration
                  - strong [ref=e293]: 2h block
                - generic [ref=e294]:
                  - text: Shift id
                  - code [ref=e295]: aaaaaaaa-7777-1111-1111-222222222222
              - generic [ref=e296]:
                - group [ref=e297]:
                  - generic "Edit details" [ref=e298] [cursor=pointer]
                - group [ref=e299]:
                  - generic "Move timing" [ref=e300] [cursor=pointer]
                - button "Delete shift" [ref=e302] [cursor=pointer]
        - generic [ref=e303]:
          - generic [ref=e304]:
            - generic [ref=e305]:
              - paragraph [ref=e306]: Friday
              - heading "Apr 17" [level=3] [ref=e307]
            - generic [ref=e309]: 0 shifts
          - article [ref=e310]:
            - paragraph [ref=e311]: Open capacity
            - heading "Nothing scheduled." [level=3] [ref=e312]
            - paragraph [ref=e313]: This day stays visible so users can add or move a shift here without losing week context.
        - generic [ref=e314]:
          - generic [ref=e315]:
            - generic [ref=e316]:
              - paragraph [ref=e317]: Saturday
              - heading "Apr 18" [level=3] [ref=e318]
            - generic [ref=e320]: 0 shifts
          - article [ref=e321]:
            - paragraph [ref=e322]: Open capacity
            - heading "Nothing scheduled." [level=3] [ref=e323]
            - paragraph [ref=e324]: This day stays visible so users can add or move a shift here without losing week context.
        - generic [ref=e325]:
          - generic [ref=e326]:
            - generic [ref=e327]:
              - paragraph [ref=e328]: Sunday
              - heading "Apr 19" [level=3] [ref=e329]
            - generic [ref=e331]: 0 shifts
          - article [ref=e332]:
            - paragraph [ref=e333]: Open capacity
            - heading "Nothing scheduled." [level=3] [ref=e334]
            - paragraph [ref=e335]: This day stays visible so users can add or move a shift here without losing week context.
    - generic [ref=e336]:
      - generic [ref=e337]:
        - generic [ref=e338]:
          - paragraph [ref=e339]: Visible calendar inventory
          - heading "Only trusted calendars appear in navigation." [level=3] [ref=e340]
        - generic [ref=e341]: 2 visible
      - generic [ref=e342]:
        - link "Alpha shared Default calendar" [ref=e343] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111
          - strong [ref=e344]: Alpha shared
          - generic [ref=e345]: Default calendar
        - link "Alpha backlog Secondary calendar" [ref=e346] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-222222222222
          - strong [ref=e347]: Alpha backlog
          - generic [ref=e348]: Secondary calendar
```

# Test source

```ts
  964  |       timeout,
  965  |       message:
  966  |         expectedPairCount === null
  967  |           ? `expected day ${dayKey} to stay conflict-free`
  968  |           : `expected day ${dayKey} to show ${expectedPairCount} overlap pair(s)`
  969  |     })
  970  |     .toBe(expectedPairCount);
  971  | }
  972  | 
  973  | export async function waitForShiftConflictOverlaps(page: Page, shiftId: string, expectedOverlapCount: number | null, timeout = 20_000) {
  974  |   await expect
  975  |     .poll(async () => (await readShiftConflictSummary(page, shiftId)).overlapCount, {
  976  |       timeout,
  977  |       message:
  978  |         expectedOverlapCount === null
  979  |           ? `expected shift ${shiftId} to stay conflict-free`
  980  |           : `expected shift ${shiftId} to show ${expectedOverlapCount} visible overlap(s)`
  981  |     })
  982  |     .toBe(expectedOverlapCount);
  983  | }
  984  | 
  985  | export async function waitForQueueSummary(page: Page, expectedSummary: string | RegExp, timeout = 20_000) {
  986  |   const message = `expected queue summary to become ${String(expectedSummary)}`;
  987  | 
  988  |   if (expectedSummary instanceof RegExp) {
  989  |     await expect
  990  |       .poll(async () => (await readStateText(page, 'calendar-local-state', 'code')) ?? '', {
  991  |         timeout,
  992  |         message
  993  |       })
  994  |       .toMatch(expectedSummary);
  995  |     return;
  996  |   }
  997  | 
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
> 1064 |   await expect
       |   ^ Error: expected the realtime channel state to reach ready
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
  1098 |   await expect
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
```