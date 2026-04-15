import {
  expect,
  seededCalendars,
  seededJoinCodes,
  seededUsers,
  signInThroughUi,
  signOutThroughUi,
  test,
  expectProtectedRouteToRedirectToSignIn
} from './fixtures';

test.describe.configure({ mode: 'serial' });

test('seeded member can open a permitted calendar and gets an explicit denial for an unauthorized calendar', async ({
  page,
  flow
}) => {
  await test.step('phase: sign in as the seeded Alpha member', async () => {
    flow.mark('login', seededUsers.alphaMember.email);
    await signInThroughUi(page, seededUsers.alphaMember);
    await expect(page.getByTestId('groups-shell')).toContainText('trusted-online');
    await expect(page.getByRole('heading', { name: seededUsers.alphaMember.expectedGroups[0] })).toBeVisible();
  });

  await test.step('phase: open the permitted Alpha shared calendar', async () => {
    flow.mark('permitted-calendar', seededCalendars.alphaShared);
    await page.getByRole('link', { name: 'Alpha shared Default calendar' }).click();
    await expect(page).toHaveURL(new RegExp(`/calendars/${seededCalendars.alphaShared}`));
    await expect(page.getByTestId('calendar-shell')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
  });

  await test.step('phase: verify the existing Beta calendar is denied outside membership scope', async () => {
    flow.mark('access-denied', seededCalendars.betaShared);
    await page.goto(`/calendars/${seededCalendars.betaShared}`);

    const deniedState = page.getByTestId('access-denied-state');
    await expect(deniedState).toBeVisible();
    await expect(deniedState).toContainText('calendar-missing');
    await expect(deniedState).toContainText('calendar-lookup');
    await expect(deniedState).toContainText(seededCalendars.betaShared);
  });
});

test('join onboarding surfaces invalid codes, admits a valid redemption, survives reload, and loses access after sign-out', async ({
  page,
  flow
}) => {
  await test.step('phase: sign in as the seeded user with no memberships', async () => {
    flow.mark('login', seededUsers.noMembership.email);
    await signInThroughUi(page, seededUsers.noMembership);
    await expect(page.getByTestId('groups-shell')).toContainText('onboarding-empty');
    await expect(page.getByTestId('onboarding-empty-state')).toBeVisible();
  });

  await test.step('phase: submit an invalid join code and expose the typed join failure state', async () => {
    flow.mark('join-invalid', seededJoinCodes.invalid);
    await page.getByLabel('Join code').fill(seededJoinCodes.invalid);
    await page.getByRole('button', { name: 'Redeem join code' }).click();

    const joinErrorState = page.getByTestId('join-error-state');
    await expect(joinErrorState).toBeVisible();
    await expect(joinErrorState).toContainText('JOIN_CODE_INVALID');
    await expect(joinErrorState).toContainText('not recognized');
  });

  await test.step('phase: redeem the seeded Alpha join code into the default calendar shell', async () => {
    flow.mark('join-valid', seededJoinCodes.activeAlpha);
    await page.getByLabel('Join code').fill(seededJoinCodes.activeAlpha);
    await page.getByRole('button', { name: 'Redeem join code' }).click();

    await expect(page).toHaveURL(new RegExp(`/calendars/${seededCalendars.alphaShared}\\?welcome=group-joined`));
    await expect(page.getByTestId('calendar-shell')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
  });

  await test.step('phase: reload the calendar and confirm the cached browser session still resolves through the server', async () => {
    flow.mark('reload-session', seededCalendars.alphaShared);
    await page.reload();
    await expect(page.getByTestId('calendar-shell')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
  });

  await test.step('phase: sign out and confirm protected routes redirect back to sign-in', async () => {
    flow.mark('logout');
    await signOutThroughUi(page);
    await expectProtectedRouteToRedirectToSignIn(page, `/calendars/${seededCalendars.alphaShared}`);
    await expect(page.getByTestId('signed-out-entrypoint')).toContainText('AUTH_REQUIRED');
  });
});
