import {
  corruptPersistedSession,
  expect,
  expectProtectedRouteToRedirectToSignIn,
  seededCalendars,
  seededUsers,
  signInThroughUi,
  test
} from './fixtures';

test.describe.configure({ mode: 'serial' });

test('seeded member can sign in, open the permitted Alpha calendar, and see explicit denied states for invalid or out-of-scope ids', async ({
  page
}) => {
  await signInThroughUi(page, seededUsers.alphaMember);

  await page.goto('/groups');
  await expect(page.getByTestId('groups-shell')).toHaveAttribute('data-shell-bootstrap', 'ready');
  await expect(page.getByTestId('mobile-group-card')).toContainText(seededUsers.alphaMember.expectedGroups[0]);

  await page.getByTestId('mobile-primary-calendar-link').click();
  await expect(page).toHaveURL(new RegExp(`/calendars/${seededCalendars.alphaShared}$`));
  await expect(page.getByTestId('calendar-shell')).toBeVisible();
  await expect(page.getByTestId('calendar-shell').getByRole('heading', { name: 'Alpha shared', exact: true })).toBeVisible();
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-denied-reason', 'none');

  await page.goto(`/calendars/${seededCalendars.betaShared}`);
  await expect(page.getByTestId('access-denied-state')).toBeVisible();
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-denied-reason', 'calendar-missing');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-failure-phase', 'calendar-lookup');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute(
    'data-attempted-calendar-id',
    seededCalendars.betaShared
  );

  await page.goto('/calendars/not-a-uuid');
  await expect(page.getByTestId('access-denied-state')).toBeVisible();
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-denied-reason', 'calendar-id-invalid');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-failure-phase', 'calendar-param');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-attempted-calendar-id', 'not-a-uuid');
});

test('reload keeps a valid trusted session working and sign-out closes protected routes again', async ({ page }) => {
  await signInThroughUi(page, seededUsers.alphaMember);

  await page.goto(`/calendars/${seededCalendars.alphaShared}`);
  await expect(page.getByTestId('calendar-shell')).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/calendars/${seededCalendars.alphaShared}$`));
  await expect(page.getByTestId('calendar-shell')).toBeVisible();
  await expect(page.getByTestId('calendar-shell').getByRole('heading', { name: 'Alpha shared', exact: true })).toBeVisible();

  await page.getByTestId('mobile-shell-signout').click();
  await expect(page).toHaveURL(/\/signin\?flow=signed-out/);
  await expect(page.getByTestId('mobile-signin-entrypoint')).toHaveAttribute('data-signin-flow', 'signed-out');
  await expect(page.getByTestId('mobile-auth-state')).toHaveAttribute('data-auth-phase', 'signed-out');

  await expectProtectedRouteToRedirectToSignIn(page, `/calendars/${seededCalendars.alphaShared}`);
  await expect(page.getByTestId('mobile-auth-state')).toHaveAttribute('data-auth-reason', 'AUTH_REQUIRED');
});

test('malformed persisted session data fails closed and routes back to sign-in with an invalid-session reason', async ({ page }) => {
  await signInThroughUi(page, seededUsers.alphaMember);
  await page.goto(`/calendars/${seededCalendars.alphaShared}`);
  await expect(page.getByTestId('calendar-shell')).toBeVisible();

  await corruptPersistedSession(page);
  await expectProtectedRouteToRedirectToSignIn(page, `/calendars/${seededCalendars.alphaShared}`, 'invalid-session');
  await expect(page.getByTestId('mobile-auth-state')).toHaveAttribute('data-auth-surface-state', 'invalid-session');
  await expect(page.getByTestId('mobile-auth-state')).toHaveAttribute('data-auth-reason', 'INVALID_SESSION');
});
