import {
  expect,
  openCalendarWeek,
  openFindTimeRoute,
  readFindTimeWindowSnapshot,
  seededCalendars,
  seededFindTime,
  seededUsers,
  signInThroughUi,
  test
} from './fixtures';

test.describe.configure({ mode: 'serial' });

test('permitted member can enter find-time from the calendar board and browse truthful named windows', async ({
  page,
  flow
}) => {
  await test.step('phase: sign in as the seeded Alpha member and open the permitted calendar board', async () => {
    flow.mark('login', seededUsers.alphaMember.email);
    await signInThroughUi(page, seededUsers.alphaMember);
    await openCalendarWeek({
      page,
      flow,
      calendarId: seededCalendars.alphaShared,
      visibleWeekStart: seededScheduleStart(),
      phase: 'open-alpha-calendar'
    });
    await expect(page.getByTestId('find-time-entrypoint')).toBeVisible();
  });

  await test.step('phase: follow the real calendar entrypoint into the find-time route', async () => {
    flow.mark('calendar-entrypoint', seededCalendars.alphaShared);
    await page.getByTestId('find-time-entrypoint').click();

    await expect(page).toHaveURL(new RegExp(`/calendars/${seededCalendars.alphaShared}/find-time`));
    await expect(page.getByTestId('find-time-shell')).toBeVisible();
    await expect(page.getByTestId('find-time-duration-input')).toHaveValue('60');
  });

  await test.step('phase: search the seeded day range and verify exact server-shaped windows', async () => {
    await openFindTimeRoute({
      page,
      flow,
      calendarId: seededCalendars.alphaShared,
      durationMinutes: seededFindTime.durationMinutes,
      start: seededFindTime.start,
      phase: 'find-time-search'
    });

    await expect(page).toHaveURL(
      new RegExp(`/calendars/${seededCalendars.alphaShared}/find-time\\?duration=${seededFindTime.durationMinutes}&start=${seededFindTime.start}`)
    );
    await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'ready');
    await expect(page.getByTestId('find-time-search-state')).toHaveAttribute('data-status', 'ready');
    await expect(page.getByTestId('find-time-summary')).toContainText('9 truthful windows');
    await expect(page.getByTestId('find-time-results')).toHaveAttribute('data-window-count', String(seededFindTime.alphaWindowCount));

    await expect(page.getByTestId('find-time-window-0')).toContainText('Alice Owner');
    await expect(page.getByTestId('find-time-window-1')).toContainText('Bob Member');
    await expect(page.getByTestId('find-time-window-1')).toContainText('Dana Multi-Group');
    await expect(page.getByTestId('find-time-window-8')).toContainText('Alice Owner');

    await expect(await readFindTimeWindowSnapshot(page, 0)).toEqual(seededFindTime.firstWindow);
    await expect(await readFindTimeWindowSnapshot(page, 1)).toEqual(seededFindTime.focusedWindow);
    await expect(await readFindTimeWindowSnapshot(page, 8)).toEqual(seededFindTime.lastWindow);
  });
});

test('unauthorized member gets an explicit denial on another group\'s find-time route', async ({ page, flow }) => {
  await test.step('phase: sign in as the seeded Alpha-only member', async () => {
    flow.mark('login', seededUsers.alphaMember.email);
    await signInThroughUi(page, seededUsers.alphaMember);
  });

  await test.step('phase: open the seeded Beta find-time route and verify denial surfaces', async () => {
    await openFindTimeRoute({
      page,
      flow,
      calendarId: seededCalendars.betaShared,
      durationMinutes: seededFindTime.durationMinutes,
      start: seededFindTime.start,
      phase: 'unauthorized-find-time'
    });

    const deniedState = page.getByTestId('find-time-denied-state');
    await expect(deniedState).toBeVisible();
    await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'denied');
    await expect(deniedState).toContainText('calendar-missing');
    await expect(deniedState).toContainText('calendar-lookup');
    await expect(deniedState).toContainText(seededCalendars.betaShared);
  });
});

test('offline entry from the calendar board fails closed on the find-time route', async ({ page, flow }) => {
  let warmedFindTimeUrl = '';

  await test.step('phase: sign in and capture the calendar board entrypoint while online', async () => {
    flow.mark('login', seededUsers.alphaMember.email);
    await signInThroughUi(page, seededUsers.alphaMember);
    await openCalendarWeek({
      page,
      flow,
      calendarId: seededCalendars.alphaShared,
      visibleWeekStart: seededScheduleStart(),
      phase: 'open-alpha-calendar'
    });
    await expect(page.getByTestId('offline-runtime-surface')).toBeVisible();
    warmedFindTimeUrl = (await page.getByTestId('find-time-entrypoint').getAttribute('href')) ?? '';
    expect(warmedFindTimeUrl).toContain(`/calendars/${seededCalendars.alphaShared}/find-time`);
  });

  await test.step('phase: force browser-offline semantics and verify the client load denies the entrypoint URL', async () => {
    await page.context().addInitScript(() => {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        get: () => false
      });
    });

    flow.mark('forced-offline-find-time', warmedFindTimeUrl);
    await page.goto(warmedFindTimeUrl);

    await expect(page).toHaveURL(new RegExp(`/calendars/${seededCalendars.alphaShared}/find-time`));
    await expect(page.getByTestId('find-time-shell-state')).toContainText('cached-offline');
    await expect(page.getByTestId('find-time-offline-state')).toBeVisible();
    await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'offline-unavailable');
    await expect(page.getByTestId('find-time-offline-state')).toContainText('fail-closed');
    await expect(page.getByTestId('find-time-offline-state')).toContainText('FIND_TIME_OFFLINE_UNAVAILABLE');
    await expect(page.getByTestId('find-time-results')).toHaveCount(0);
  });
});

function seededScheduleStart() {
  return '2026-04-13';
}
