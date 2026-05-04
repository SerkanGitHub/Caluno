# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-offline.spec.ts >> preview proof surface exposes isolation headers and a live service worker before offline continuity begins
- Location: tests/e2e/calendar-offline.spec.ts:63:1

# Error details

```
Error: expected the service worker registration to reach an installable or ready state

expect(received).toMatch(expected)

Expected pattern: /installed|ready/
Received string:  "error"

Call Log:
- Timeout 15000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- main [ref=e4]:
  - generic [ref=e5]:
    - paragraph [ref=e6]: Trusted entrypoint
    - heading "Sign in to load only the groups and calendars you are allowed to open." [level=1] [ref=e7]
    - paragraph [ref=e8]: Caluno resolves membership and calendar access on the server first, then renders only the workspace scope your session can prove.
    - generic [ref=e9]:
      - article [ref=e10]:
        - generic [ref=e11]: Trusted auth state
        - strong [ref=e12]: ready
        - paragraph [ref=e13]: Server-side session verification runs before any group or calendar shell is opened.
      - article [ref=e14]:
        - generic [ref=e15]: Scope promise
        - strong [ref=e16]: No guessed calendars
        - paragraph [ref=e17]: After sign-in, the app shell loads only the memberships and calendars your trusted session can prove.
  - generic [ref=e18]:
    - generic [ref=e19]:
      - paragraph [ref=e20]: Email/password access
      - heading "Open your shared scheduling workspace." [level=2] [ref=e21]
      - paragraph [ref=e22]: Use the same Supabase credentials that back your group memberships. Callback and logout failures collapse into high-level reason codes here instead of leaking provider details.
    - generic [ref=e23]:
      - generic [ref=e24]:
        - generic [ref=e25]: Email
        - textbox "Email" [ref=e26]:
          - /placeholder: alice@example.com
      - generic [ref=e27]:
        - generic [ref=e28]: Password
        - textbox "Password" [ref=e29]:
          - /placeholder: ••••••••••••
      - button "Request trusted session" [ref=e30] [cursor=pointer]
    - generic [ref=e31]:
      - generic [ref=e32]: Protected routes redirect here automatically.
      - link "Return to the public entrypoint" [ref=e33] [cursor=pointer]:
        - /url: /
```

# Test source

```ts
  696 |   await passwordInput.fill(user.password);
  697 |   await expect(passwordInput).toHaveValue(user.password);
  698 |   await expect(emailInput).toHaveValue(user.email);
  699 | 
  700 |   await passwordInput.press('Enter');
  701 |   await expect(page).toHaveURL(/\/groups/);
  702 |   await expect(page.getByTestId('groups-shell')).toBeVisible();
  703 | }
  704 | 
  705 | export async function signOutThroughUi(page: Page) {
  706 |   await page.getByRole('link', { name: 'Sign out' }).click();
  707 |   await expect(page).toHaveURL(/\/signin\?flow=signed-out/);
  708 |   await expect(page.getByTestId('signed-out-entrypoint')).toBeVisible();
  709 | }
  710 | 
  711 | export async function expectProtectedRouteToRedirectToSignIn(page: Page, path: string) {
  712 |   await page.goto(path);
  713 |   await expect(page).toHaveURL(/\/signin\?/);
  714 |   await expect(page.getByTestId('signed-out-entrypoint')).toBeVisible();
  715 | }
  716 | 
  717 | export async function readVisibleWeekFromBoard(page: Page) {
  718 |   const board = page.getByTestId('calendar-week-board');
  719 |   await expect(board).toBeVisible();
  720 | 
  721 |   const visibleWeekStart = await board.getAttribute('data-visible-week-start');
  722 |   const visibleWeekEndExclusive = await board.getAttribute('data-visible-week-end');
  723 | 
  724 |   return {
  725 |     visibleWeekStart,
  726 |     visibleWeekEndExclusive
  727 |   };
  728 | }
  729 | 
  730 | export async function openCalendarWeek(params: {
  731 |   page: Page;
  732 |   flow: FlowDiagnostics;
  733 |   calendarId: string;
  734 |   visibleWeekStart?: string;
  735 |   focusShiftIds?: string[];
  736 |   phase?: string;
  737 | }) {
  738 |   const { page, flow, calendarId, visibleWeekStart = seededSchedule.visibleWeek.start, focusShiftIds = [], phase } = params;
  739 |   const expectedVisibleWeekEndExclusive = addUtcDays(visibleWeekStart, 7);
  740 |   const targetUrl = `/calendars/${calendarId}?start=${visibleWeekStart}`;
  741 | 
  742 |   flow.mark(phase ?? 'open-calendar', targetUrl);
  743 |   flow.setContext({
  744 |     calendarId,
  745 |     visibleWeekStart,
  746 |     visibleWeekEndExclusive: expectedVisibleWeekEndExclusive,
  747 |     focusShiftIds,
  748 |     note: `calendar route ${targetUrl}`
  749 |   });
  750 | 
  751 |   try {
  752 |     await page.goto(targetUrl);
  753 |   } catch (error) {
  754 |     const message = error instanceof Error ? error.message : String(error);
  755 |     if (!message.includes('net::ERR_ABORTED')) {
  756 |       throw error;
  757 |     }
  758 | 
  759 |     await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  760 |   }
  761 |   await expect(page.getByTestId('calendar-shell')).toBeVisible();
  762 |   await expect(page.getByTestId('calendar-week-board')).toBeVisible();
  763 | 
  764 |   const routeState = page.getByTestId('calendar-route-state');
  765 |   if ((await routeState.count()) > 0 && ((await routeState.textContent()) ?? '').includes('trusted-online')) {
  766 |     const localState = page.getByTestId('calendar-local-state');
  767 |     if ((await localState.count()) > 0) {
  768 |       await waitForLocalSnapshotStatus(page, 'ready');
  769 |     }
  770 |   }
  771 | 
  772 |   const boardWeek = await readVisibleWeekFromBoard(page);
  773 |   expect(boardWeek.visibleWeekStart).toBe(visibleWeekStart);
  774 |   expect(boardWeek.visibleWeekEndExclusive).toBe(expectedVisibleWeekEndExclusive);
  775 | 
  776 |   await syncCalendarFlowContext(page, flow, {
  777 |     calendarId,
  778 |     visibleWeekStart: boardWeek.visibleWeekStart,
  779 |     visibleWeekEndExclusive: boardWeek.visibleWeekEndExclusive,
  780 |     focusShiftIds,
  781 |     note: `calendar route ${targetUrl}`
  782 |   });
  783 | }
  784 | 
  785 | function addUtcDays(dayKey: string, days: number): string {
  786 |   const date = new Date(`${dayKey}T00:00:00.000Z`);
  787 |   date.setUTCDate(date.getUTCDate() + days);
  788 |   return date.toISOString().slice(0, 10);
  789 | }
  790 | 
  791 | export async function expectRuntimeSurfaceReady(page: Page) {
  792 |   const runtimeSurface = page.getByTestId('offline-runtime-surface');
  793 | 
  794 |   await expect(runtimeSurface).toBeVisible();
  795 |   await expect(runtimeSurface).toHaveAttribute('data-offline-proof-surface', 'service-worker-preview');
> 796 |   await expect
      |   ^ Error: expected the service worker registration to reach an installable or ready state
  797 |     .poll(
  798 |       async () => runtimeSurface.getAttribute('data-service-worker-status'),
  799 |       {
  800 |         timeout: 15_000,
  801 |         message: 'expected the service worker registration to reach an installable or ready state'
  802 |       }
  803 |     )
  804 |     .toMatch(/installed|ready/);
  805 | 
  806 |   return runtimeSurface;
  807 | }
  808 | 
  809 | export async function syncCalendarFlowContext(page: Page, flow: FlowDiagnostics, patch: Partial<FlowContext> = {}) {
  810 |   const snapshot = await readFlowSurfaceSnapshot(page);
  811 |   flow.setContext({
  812 |     ...snapshot,
  813 |     ...patch,
  814 |     boardMetaBadges: patch.boardMetaBadges ?? snapshot.boardMetaBadges,
  815 |     dayConflicts: patch.dayConflicts ?? snapshot.dayConflicts,
  816 |     shiftConflicts: patch.shiftConflicts ?? snapshot.shiftConflicts,
  817 |     actionReasons: patch.actionReasons ?? snapshot.actionReasons,
  818 |     actionSummaries: patch.actionSummaries ?? snapshot.actionSummaries
  819 |   });
  820 |   return snapshot;
  821 | }
  822 | 
  823 | export async function setBrowserOffline(page: Page, flow: FlowDiagnostics, offline: boolean, note?: string) {
  824 |   flow.mark(offline ? 'offline-transition' : 'online-transition', note);
  825 |   await page.context().setOffline(offline);
  826 |   await expect
  827 |     .poll(
  828 |       async () => page.evaluate(() => navigator.onLine),
  829 |       {
  830 |         timeout: 10_000,
  831 |         message: `expected navigator.onLine to become ${offline ? 'false' : 'true'}`
  832 |       }
  833 |     )
  834 |     .toBe(!offline);
  835 |   await syncCalendarFlowContext(page, flow, {
  836 |     note: note ?? (offline ? 'browser context forced offline' : 'browser context restored online')
  837 |   });
  838 | }
  839 | 
  840 | async function readStateText(page: Page, testId: string, selector: string) {
  841 |   const locator = page.getByTestId(testId).locator(selector).first();
  842 |   if ((await locator.count()) === 0) {
  843 |     return null;
  844 |   }
  845 | 
  846 |   return (await locator.textContent())?.trim() ?? null;
  847 | }
  848 | 
  849 | export type VisibleShiftCardIdentityKind = 'any' | 'local' | 'server';
  850 | 
  851 | export type VisibleShiftCardIdentity = {
  852 |   shiftId: string;
  853 |   testId: string;
  854 |   locator: Locator;
  855 | };
  856 | 
  857 | export function findVisibleShiftCards(params: {
  858 |   page: Page;
  859 |   title: string;
  860 |   dayKey?: string;
  861 |   windowLabel?: string;
  862 | }) {
  863 |   const scope = params.dayKey ? params.page.getByTestId(`day-column-${params.dayKey}`) : params.page.locator('main');
  864 |   let locator = scope.locator('[data-testid^="shift-card-"]').filter({ hasText: params.title });
  865 | 
  866 |   if (params.windowLabel) {
  867 |     locator = locator.filter({ hasText: params.windowLabel });
  868 |   }
  869 | 
  870 |   return locator;
  871 | }
  872 | 
  873 | function matchesVisibleShiftCardIdentityKind(shiftId: string, kind: VisibleShiftCardIdentityKind) {
  874 |   if (kind === 'any') {
  875 |     return true;
  876 |   }
  877 | 
  878 |   return kind === 'local' ? shiftId.startsWith('local-') : !shiftId.startsWith('local-');
  879 | }
  880 | 
  881 | export async function resolveVisibleShiftCardIdentity(params: {
  882 |   page: Page;
  883 |   title: string;
  884 |   dayKey?: string;
  885 |   windowLabel?: string;
  886 |   idKind?: VisibleShiftCardIdentityKind;
  887 |   timeout?: number;
  888 | }): Promise<VisibleShiftCardIdentity> {
  889 |   const timeout = params.timeout ?? 20_000;
  890 |   const idKind = params.idKind ?? 'any';
  891 |   const scope = params.dayKey ? params.page.getByTestId(`day-column-${params.dayKey}`) : params.page.locator('main');
  892 | 
  893 |   const startedAt = Date.now();
  894 |   while (Date.now() - startedAt <= timeout) {
  895 |     const candidates = scope.locator('[data-testid^="shift-card-"]');
  896 |     const candidateCount = await candidates.count();
```