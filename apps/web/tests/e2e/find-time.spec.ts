import {
  expect,
  openCalendarWeek,
  openFindTimeRoute,
  readFindTimeBrowseWindowSnapshot,
  readFindTimeTopPickSnapshot,
  seededCalendars,
  seededFindTime,
  seededUsers,
  signInThroughUi,
  test
} from './fixtures';

test.describe.configure({ mode: 'serial' });

test('permitted member sees ranked top picks before the lighter browse inventory on the real find-time route', async ({
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

  await test.step('phase: search the seeded day range and verify shortlist order plus explanation density', async () => {
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
    await expect(page.getByTestId('find-time-results')).toHaveAttribute('data-top-pick-count', String(seededFindTime.topPickCount));
    await expect(page.getByTestId('find-time-results')).toHaveAttribute('data-browse-count', String(seededFindTime.browseCount));

    await expect(
      page.evaluate(() => {
        const topPicks = document.querySelector('[data-testid="find-time-top-picks"]');
        const browse = document.querySelector('[data-testid="find-time-browse-results"]');

        if (!topPicks || !browse) {
          return false;
        }

        return Boolean(topPicks.compareDocumentPosition(browse) & Node.DOCUMENT_POSITION_FOLLOWING);
      })
    ).resolves.toBe(true);

    await expect(page.getByTestId('find-time-top-picks')).toBeVisible();
    await expect(page.getByTestId('find-time-browse-results')).toBeVisible();

    await expect(await readFindTimeTopPickSnapshot(page, 0)).toEqual(seededFindTime.topPicks[0]);
    await expect(await readFindTimeTopPickSnapshot(page, 1)).toEqual(seededFindTime.topPicks[1]);
    await expect(await readFindTimeTopPickSnapshot(page, 2)).toEqual(seededFindTime.topPicks[2]);

    await expect(page.getByTestId('find-time-top-pick-0-free-members')).toContainText('Alice Owner');
    await expect(page.getByTestId('find-time-top-pick-0-free-members')).toContainText('Bob Member');
    await expect(page.getByTestId('find-time-top-pick-0-free-members')).toContainText('Dana Multi-Group');
    await expect(page.getByTestId('find-time-top-pick-0-blocked-members')).toContainText(
      'All named members stay free across this exact slot.'
    );
    await expect(page.getByTestId('find-time-top-pick-0-nearby-leading')).toContainText(
      'No trusted busy interval pushes into the start edge for this shortlist slot.'
    );
    await expect(page.getByTestId('find-time-top-pick-0-nearby-trailing')).toContainText(
      'No trusted busy interval pushes into the trailing edge for this shortlist slot.'
    );

    await expect(page.getByTestId('find-time-browse-window-0')).not.toContainText('Who is blocked');
    await expect(page.getByTestId('find-time-browse-window-0')).not.toContainText('Why earlier times fail');

    await expect(await readFindTimeBrowseWindowSnapshot(page, 2)).toEqual(seededFindTime.focusedBrowseWindow);
    await expect(page.getByTestId('find-time-browse-window-2-free-members')).toContainText('Bob Member · Dana Multi-Group');
    await expect(page.getByTestId('find-time-browse-window-2-nearby-summary')).toContainText(
      'Before: Alpha opening sweep (Alice Owner)'
    );
    await expect(page.getByTestId('find-time-browse-window-2-nearby-summary')).toContainText(
      'After: Morning intake (Alice Owner)'
    );
  });
});

test("unauthorized member gets an explicit denial on another group's find-time route", async ({ page, flow }) => {
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
    await expect(page.getByTestId('find-time-top-picks')).toHaveCount(0);
    await expect(page.getByTestId('find-time-browse-results')).toHaveCount(0);
  });
});

function seededScheduleStart() {
  return '2026-04-13';
}
