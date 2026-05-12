# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-groups-access.spec.ts >> join onboarding surfaces invalid codes, admits a valid redemption, survives reload, and loses access after sign-out
- Location: tests/e2e/auth-groups-access.spec.ts:45:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('groups-shell')
Expected substring: "onboarding-empty"
Received string:    "Shell state trusted-online Protected navigation and calendar scope came from the trusted server load. "
Timeout: 10000ms

Call log:
  - Expect "toContainText" with timeout 10000ms
  - waiting for getByTestId('groups-shell')
    14 × locator resolved to <article data-testid="groups-shell" class="status-card tone-neutral">…</article>
       - unexpected value "Shell state trusted-online Protected navigation and calendar scope came from the trusted server load. "

```

# Page snapshot

```yaml
- main [ref=e4]:
  - complementary [ref=e5]:
    - paragraph [ref=e6]: Protected shell
    - heading "Erin Outsider" [level=1] [ref=e7]
    - paragraph [ref=e8]: Group membership, join codes, and calendar scope were resolved on the server before this shell rendered.
    - generic [ref=e9]:
      - article [ref=e10]:
        - generic [ref=e11]: Shell state
        - strong [ref=e12]: trusted-online
        - paragraph [ref=e13]: Protected navigation and calendar scope came from the trusted server load.
      - article [ref=e14]:
        - generic [ref=e15]: Onboarding state
        - strong [ref=e16]: onboarding-empty
        - paragraph [ref=e17]: This user does not belong to any groups yet, so the app stays on the onboarding shell.
    - navigation [ref=e18]:
      - link "Sign out" [ref=e19] [cursor=pointer]:
        - /url: /logout
  - generic [ref=e20]:
    - generic [ref=e21]:
      - paragraph [ref=e22]: Membership console
      - heading "Build or join the calendars your session can actually prove." [level=2] [ref=e23]
      - paragraph [ref=e24]: Create a new group when you are starting fresh, or redeem a join code when another member has already established the workspace boundary.
    - generic [ref=e25]:
      - generic [ref=e26]: No memberships loaded
      - paragraph [ref=e27]: This account has not joined any groups yet. Create one or redeem a join code to open the protected app shell.
    - generic [ref=e28]:
      - article [ref=e29]:
        - generic [ref=e30]:
          - paragraph [ref=e31]: Create a workspace
          - heading "Launch a new shared calendar boundary." [level=3] [ref=e32]
          - paragraph [ref=e33]: Creating a group also provisions a default calendar and an owner-visible join code on the server.
        - generic [ref=e34]:
          - generic [ref=e35]:
            - generic [ref=e36]: Group name
            - textbox "Group name" [ref=e37]:
              - /placeholder: Night clinic rota
          - generic [ref=e38]:
            - generic [ref=e39]: Default calendar name
            - textbox "Default calendar name" [ref=e40]:
              - /placeholder: Shared calendar
          - button "Create protected group" [ref=e41] [cursor=pointer]
      - article [ref=e42]:
        - generic [ref=e43]:
          - paragraph [ref=e44]: Join existing group
          - heading "Redeem an invite without widening scope." [level=3] [ref=e45]
          - paragraph [ref=e46]: Join codes are normalized and validated server-side, then resolve to the group’s default calendar.
        - generic [ref=e47]:
          - generic [ref=e48]:
            - generic [ref=e49]: Join code
            - textbox "Join code" [ref=e50]:
              - /placeholder: ALPHA123
          - button "Redeem join code" [ref=e51] [cursor=pointer]
    - article [ref=e53]:
      - paragraph [ref=e54]: Awaiting first membership
      - heading "No permitted groups yet." [level=3] [ref=e55]
      - paragraph [ref=e56]: Once a membership exists, the protected layout will render the trusted group and calendar inventory here.
```

# Test source

```ts
  1  | import {
  2  |   expect,
  3  |   seededCalendars,
  4  |   seededJoinCodes,
  5  |   seededUsers,
  6  |   signInThroughUi,
  7  |   signOutThroughUi,
  8  |   test,
  9  |   expectProtectedRouteToRedirectToSignIn
  10 | } from './fixtures';
  11 | 
  12 | test.describe.configure({ mode: 'serial' });
  13 | 
  14 | test('seeded member can open a permitted calendar and gets an explicit denial for an unauthorized calendar', async ({
  15 |   page,
  16 |   flow
  17 | }) => {
  18 |   await test.step('phase: sign in as the seeded Alpha member', async () => {
  19 |     flow.mark('login', seededUsers.alphaMember.email);
  20 |     await signInThroughUi(page, seededUsers.alphaMember);
  21 |     await expect(page.getByTestId('groups-shell')).toContainText('trusted-online');
  22 |     await expect(page.getByRole('heading', { name: seededUsers.alphaMember.expectedGroups[0] })).toBeVisible();
  23 |   });
  24 | 
  25 |   await test.step('phase: open the permitted Alpha shared calendar', async () => {
  26 |     flow.mark('permitted-calendar', seededCalendars.alphaShared);
  27 |     await page.getByRole('link', { name: 'Alpha shared Default calendar' }).click();
  28 |     await expect(page).toHaveURL(new RegExp(`/calendars/${seededCalendars.alphaShared}`));
  29 |     await expect(page.getByTestId('calendar-shell')).toBeVisible();
  30 |     await expect(page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
  31 |   });
  32 | 
  33 |   await test.step('phase: verify the existing Beta calendar is denied outside membership scope', async () => {
  34 |     flow.mark('access-denied', seededCalendars.betaShared);
  35 |     await page.goto(`/calendars/${seededCalendars.betaShared}`);
  36 | 
  37 |     const deniedState = page.getByTestId('access-denied-state');
  38 |     await expect(deniedState).toBeVisible();
  39 |     await expect(deniedState).toContainText('calendar-missing');
  40 |     await expect(deniedState).toContainText('calendar-lookup');
  41 |     await expect(deniedState).toContainText(seededCalendars.betaShared);
  42 |   });
  43 | });
  44 | 
  45 | test('join onboarding surfaces invalid codes, admits a valid redemption, survives reload, and loses access after sign-out', async ({
  46 |   page,
  47 |   flow
  48 | }) => {
  49 |   await test.step('phase: sign in as the seeded user with no memberships', async () => {
  50 |     flow.mark('login', seededUsers.noMembership.email);
  51 |     await signInThroughUi(page, seededUsers.noMembership);
> 52 |     await expect(page.getByTestId('groups-shell')).toContainText('onboarding-empty');
     |                                                    ^ Error: expect(locator).toContainText(expected) failed
  53 |     await expect(page.getByTestId('onboarding-empty-state')).toBeVisible();
  54 |   });
  55 | 
  56 |   await test.step('phase: submit an invalid join code and expose the typed join failure state', async () => {
  57 |     flow.mark('join-invalid', seededJoinCodes.invalid);
  58 |     await page.getByLabel('Join code').fill(seededJoinCodes.invalid);
  59 |     await page.getByRole('button', { name: 'Redeem join code' }).click();
  60 | 
  61 |     const joinErrorState = page.getByTestId('join-error-state');
  62 |     await expect(joinErrorState).toBeVisible();
  63 |     await expect(joinErrorState).toContainText('JOIN_CODE_INVALID');
  64 |     await expect(joinErrorState).toContainText('not recognized');
  65 |   });
  66 | 
  67 |   await test.step('phase: redeem the seeded Alpha join code into the default calendar shell', async () => {
  68 |     flow.mark('join-valid', seededJoinCodes.activeAlpha);
  69 |     await page.getByLabel('Join code').fill(seededJoinCodes.activeAlpha);
  70 |     await page.getByRole('button', { name: 'Redeem join code' }).click();
  71 | 
  72 |     await expect(page).toHaveURL(new RegExp(`/calendars/${seededCalendars.alphaShared}\\?welcome=group-joined`));
  73 |     await expect(page.getByTestId('calendar-shell')).toBeVisible();
  74 |     await expect(page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
  75 |   });
  76 | 
  77 |   await test.step('phase: reload the calendar and confirm the cached browser session still resolves through the server', async () => {
  78 |     flow.mark('reload-session', seededCalendars.alphaShared);
  79 |     await page.reload();
  80 |     await expect(page.getByTestId('calendar-shell')).toBeVisible();
  81 |     await expect(page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
  82 |   });
  83 | 
  84 |   await test.step('phase: sign out and confirm protected routes redirect back to sign-in', async () => {
  85 |     flow.mark('logout');
  86 |     await signOutThroughUi(page);
  87 |     await expectProtectedRouteToRedirectToSignIn(page, `/calendars/${seededCalendars.alphaShared}`);
  88 |     await expect(page.getByTestId('signed-out-entrypoint')).toContainText('AUTH_REQUIRED');
  89 |   });
  90 | });
  91 | 
```