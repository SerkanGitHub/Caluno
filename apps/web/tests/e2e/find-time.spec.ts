import {
  expect,
  expectedCreateShiftPrefillValues,
  openCalendarWeek,
  openFindTimeRoute,
  readCreateShiftPrefillSnapshot,
  readFindTimeBrowseWindowCtaSnapshot,
  readFindTimeBrowseWindowSnapshot,
  readFindTimeTopPickCtaSnapshot,
  readFindTimeTopPickSnapshot,
  readVisibleWeekFromBoard,
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
    await expect(page.getByTestId('find-time-summary')).toContainText(`${seededFindTime.alphaWindowCount} truthful windows`);
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

    const focusedBrowseCard = page
      .locator(
        `[data-testid^="find-time-browse-window-"][data-start-at="${seededFindTime.focusedBrowseWindow.startAt}"][data-end-at="${seededFindTime.focusedBrowseWindow.endAt}"]`
      )
      .first();
    await expect(focusedBrowseCard).toBeVisible();
    const focusedBrowseTestId = await focusedBrowseCard.getAttribute('data-testid');
    const focusedBrowseIndex = Number.parseInt(
      (focusedBrowseTestId ?? '').replace('find-time-browse-window-', ''),
      10
    );

    expect(Number.isFinite(focusedBrowseIndex), 'expected the focused browse window to expose its deterministic data-testid').toBe(true);

    await expect(await readFindTimeTopPickCtaSnapshot(page, 0)).toMatchObject({
      source: 'find-time',
      targetWeekStart: '2026-04-13',
      startAt: seededFindTime.topPicks[0].startAt,
      endAt: seededFindTime.topPicks[0].endAt,
      label: 'Create from this slot'
    });
    await expect(await readFindTimeBrowseWindowCtaSnapshot(page, focusedBrowseIndex)).toMatchObject({
      source: 'find-time',
      targetWeekStart: '2026-04-13',
      startAt: seededFindTime.focusedBrowseWindow.startAt,
      endAt: seededFindTime.focusedBrowseWindow.endAt,
      label: 'Create from this slot'
    });

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

    const focusedBrowseSnapshot = await readFindTimeBrowseWindowSnapshot(page, focusedBrowseIndex);
    expect(focusedBrowseSnapshot.startAt).toBe(seededFindTime.focusedBrowseWindow.startAt);
    expect(focusedBrowseSnapshot.endAt).toBe(seededFindTime.focusedBrowseWindow.endAt);
    await expect(page.getByTestId(`find-time-browse-window-${focusedBrowseIndex}-cta`)).toBeVisible();
  });
});

test('suggestion handoff lands on the chosen slot week, opens the prefilled create dialog, and strips one-shot URL state on arrival', async ({
  page,
  flow
}) => {
  const earlierAnchorStart = '2026-04-01';
  const earlierAnchorWeekStart = '2026-03-30';

  await test.step('phase: sign in and open truthful find-time results from the permitted Alpha calendar', async () => {
    flow.mark('login', seededUsers.alphaMember.email);
    await signInThroughUi(page, seededUsers.alphaMember);
    await openFindTimeRoute({
      page,
      flow,
      calendarId: seededCalendars.alphaShared,
      durationMinutes: seededFindTime.durationMinutes,
      start: earlierAnchorStart,
      phase: 'find-time-handoff-source'
    });

    await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'ready');
    await expect(page.getByTestId('find-time-results')).toBeVisible();
  });

  let chosenSuggestion: Awaited<ReturnType<typeof readFindTimeTopPickCtaSnapshot>> | undefined;

  await test.step('phase: confirm the chosen top-pick CTA targets the slot week instead of the earlier search anchor week', async () => {
    chosenSuggestion = await readFindTimeTopPickCtaSnapshot(page, 0);

    expect(chosenSuggestion.targetWeekStart).toBe('2026-04-13');
    expect(chosenSuggestion.targetWeekStart).not.toBe(earlierAnchorWeekStart);
    expect(chosenSuggestion.href).toContain(`/calendars/${seededCalendars.alphaShared}?create=1`);
    expect(chosenSuggestion.startAt).toBe(seededFindTime.topPicks[0].startAt);
  });

  await test.step('phase: follow the real handoff and verify the board week, prefill values, and cleaned destination URL', async () => {
    if (!chosenSuggestion?.href || !chosenSuggestion.targetWeekStart) {
      throw new Error('Expected a deterministic top-pick suggestion href before clicking the handoff CTA.');
    }

    flow.mark('follow-suggestion-handoff', chosenSuggestion.href);
    await page.getByTestId('find-time-top-pick-0-cta').click();

    const visibleWeek = await readVisibleWeekFromBoard(page);
    expect(visibleWeek.visibleWeekStart).toBe(chosenSuggestion.targetWeekStart);
    expect(visibleWeek.visibleWeekStart).not.toBe(earlierAnchorWeekStart);

    const prefill = await readCreateShiftPrefillSnapshot(page);
    const expectedPrefillValues = expectedCreateShiftPrefillValues(chosenSuggestion);

    expect(prefill.open).toBe(true);
    expect(prefill.openOnArrival).toBe('true');
    expect(prefill.createSource).toBe('find-time');
    expect(prefill.prefillSource).toBe('find-time');
    expect(prefill.prefillStart).toBe(chosenSuggestion.startAt);
    expect(prefill.prefillEnd).toBe(chosenSuggestion.endAt);
    expect(prefill.startValue).toBe(expectedPrefillValues.startValue);
    expect(prefill.endValue).toBe(expectedPrefillValues.endValue);

    await expect
      .poll(() => page.url(), {
        message: 'expected the calendar route to strip one-shot handoff params after the arrival render'
      })
      .toBe(`http://127.0.0.1:4174/calendars/${seededCalendars.alphaShared}?start=${chosenSuggestion.targetWeekStart}`);
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
