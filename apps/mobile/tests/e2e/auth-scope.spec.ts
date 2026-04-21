import {
  corruptPersistedSession,
  expect,
  openCalendar,
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

  await openCalendar(page, {
    calendarId: seededCalendars.alphaShared,
    expectedName: 'Alpha shared'
  });
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

  await openCalendar(page, {
    calendarId: seededCalendars.alphaShared,
    expectedName: 'Alpha shared'
  });

  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/calendars/${seededCalendars.alphaShared}$`));
  await expect(page.getByTestId('calendar-shell')).toBeVisible();
  await expect(page.getByTestId('calendar-shell').locator('h1').filter({ hasText: 'Alpha shared' })).toBeVisible();

  await page.getByTestId('mobile-shell-signout').click();
  await expect(page).toHaveURL(/\/signin\?flow=signed-out/);
  await expect(page.getByTestId('mobile-signin-entrypoint')).toHaveAttribute('data-signin-flow', 'signed-out');
  await expect(page.getByTestId('mobile-auth-state')).toHaveAttribute('data-auth-phase', 'signed-out');

  await page.goto(`/calendars/${seededCalendars.alphaShared}`);
  await expect(page.getByTestId('mobile-continuity-denied')).toBeVisible();
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-denied-reason', 'cache-missing');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-failure-phase', 'continuity');
});

test('malformed persisted session data fails closed and routes back to sign-in with an invalid-session reason', async ({ page }) => {
  await signInThroughUi(page, seededUsers.alphaMember);
  await openCalendar(page, {
    calendarId: seededCalendars.alphaShared,
    expectedName: 'Alpha shared'
  });

  await corruptPersistedSession(page);
  await page.goto(`/calendars/${seededCalendars.alphaShared}`);
  await expect(page.getByTestId('mobile-continuity-denied')).toBeVisible();
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-denied-reason', 'INVALID_SESSION');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-failure-phase', 'continuity');
  await expect(page.getByRole('link', { name: 'Sign in again' })).toHaveAttribute('href', /flow=invalid-session/);
});
