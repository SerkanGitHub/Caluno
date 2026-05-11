import {
  expect,
  openCalendar,
  readCreateShiftClashAdvisory,
  readCreateShiftRecurrenceSnapshot,
  seededCalendars,
  seededUsers,
  seededWeekStarts,
  signInThroughUi,
  test
} from './fixtures';

test.describe.configure({ mode: 'serial' });

const calendarId = seededCalendars.alphaShared;
const visibleWeekStart = seededWeekStarts.alphaWarm;
const morningIntakeShiftId = 'aaaaaaaa-6666-1111-1111-111111111111';

test('mobile create sheet exposes recurrence suggestion lifecycle and advisory-only clashes without clobbering draft timing', async ({ page }) => {
  await signInThroughUi(page, seededUsers.alphaMember);
  await openCalendar(page, {
    calendarId,
    weekStart: visibleWeekStart,
    expectedName: 'Alpha shared'
  });

  const routeState = page.getByTestId('calendar-route-state');
  await expect(routeState).toHaveAttribute('data-recurrence-suggestion-status', 'ready');
  await expect(routeState).toHaveAttribute('data-recurrence-suggestion-reason', 'none');
  const routeSuggestionMatchCount = Number.parseInt(
    (await routeState.getAttribute('data-recurrence-suggestion-match-count')) ?? '0',
    10
  );
  expect(routeSuggestionMatchCount).toBeGreaterThan(0);
  const recurrenceExemplarShiftId = (await routeState.getAttribute('data-recurrence-suggestion-exemplar-shift-id')) ?? 'none';
  expect(recurrenceExemplarShiftId).not.toBe('none');
  await expect(page.getByTestId(`shift-card-${morningIntakeShiftId}`)).toContainText('Morning intake');

  await page.getByTestId('create-shift-trigger-create-week').click();
  await expect(page.getByTestId('create-shift-editor')).toBeVisible();

  const initialSnapshot = await readCreateShiftRecurrenceSnapshot(page);
  expect(initialSnapshot.suggestionVisible).toBe(true);
  expect(initialSnapshot.suggestionCadence).toBe('weekly');
  expect(initialSnapshot.suggestionInterval).toBe('1');
  expect(initialSnapshot.suggestionWeekday).toBe(1);
  expect(initialSnapshot.suggestionMatchCount).toBe(routeSuggestionMatchCount);
  expect(initialSnapshot.acceptVisible).toBe(true);
  expect(initialSnapshot.dismissVisible).toBe(true);
  expect(initialSnapshot.selectedCadence).toBe('');
  expect(initialSnapshot.intervalValue).toBe('');
  expect(initialSnapshot.repeatCountValue).toBe('');
  expect(initialSnapshot.repeatUntilValue).toBe('');
  expect(initialSnapshot.fieldStateCadence).toBe('one-off');
  expect(initialSnapshot.fieldStateInterval).toBe('none');
  expect(initialSnapshot.fieldStateRepeatCount).toBe('none');
  expect(initialSnapshot.fieldStateRepeatUntil).toBe('none');
  expect(initialSnapshot.fieldSuggestionState).toBe('idle');
  await expect(page.getByTestId('recurrence-suggestion')).toHaveAttribute('data-exemplar-shift-id', recurrenceExemplarShiftId);

  await page.getByTestId('recurrence-suggestion-dismiss').dispatchEvent('click');

  const dismissedSnapshot = await readCreateShiftRecurrenceSnapshot(page);
  expect(dismissedSnapshot.suggestionVisible).toBe(false);
  expect(dismissedSnapshot.selectedCadence).toBe('');
  expect(dismissedSnapshot.intervalValue).toBe('');
  expect(dismissedSnapshot.repeatCountValue).toBe('');
  expect(dismissedSnapshot.repeatUntilValue).toBe('');
  expect(dismissedSnapshot.fieldStateCadence).toBe('one-off');
  expect(dismissedSnapshot.fieldStateInterval).toBe('none');
  expect(dismissedSnapshot.fieldStateRepeatCount).toBe('none');
  expect(dismissedSnapshot.fieldStateRepeatUntil).toBe('none');
  expect(dismissedSnapshot.fieldSuggestionState).toBe('dismissed');

  await page.getByTestId('create-dismiss-button').dispatchEvent('click');
  await expect(page.getByTestId('create-shift-editor')).toHaveCount(0);

  await page.getByTestId('create-shift-trigger-create-week').click();
  await expect(page.getByTestId('create-shift-editor')).toBeVisible();

  const reopenedSnapshot = await readCreateShiftRecurrenceSnapshot(page);
  expect(reopenedSnapshot.suggestionVisible).toBe(false);
  expect(reopenedSnapshot.selectedCadence).toBe('');
  expect(reopenedSnapshot.intervalValue).toBe('');
  expect(reopenedSnapshot.repeatCountValue).toBe('');
  expect(reopenedSnapshot.repeatUntilValue).toBe('');
  expect(reopenedSnapshot.fieldSuggestionState).toBe('dismissed');

  await page.reload();
  await expect(routeState).toHaveAttribute('data-recurrence-suggestion-status', 'ready');
  await expect
    .poll(async () => Number.parseInt((await routeState.getAttribute('data-recurrence-suggestion-match-count')) ?? '0', 10), {
      message: 'expected the recurrence suggestion route diagnostic to return with a positive match count after reload'
    })
    .toBeGreaterThan(0);

  await page.getByTestId('create-shift-trigger-create-week').click();
  await expect(page.getByTestId('create-shift-editor')).toBeVisible();

  const reloadedSnapshot = await readCreateShiftRecurrenceSnapshot(page);
  expect(reloadedSnapshot.suggestionVisible).toBe(true);
  expect(reloadedSnapshot.selectedCadence).toBe('');
  expect(reloadedSnapshot.intervalValue).toBe('');
  expect(reloadedSnapshot.repeatCountValue).toBe('');
  expect(reloadedSnapshot.repeatUntilValue).toBe('');
  expect(reloadedSnapshot.fieldSuggestionState).toBe('idle');

  const startBeforeAccept = await page.getByTestId('create-start-input').inputValue();
  const endBeforeAccept = await page.getByTestId('create-end-input').inputValue();

  await page.getByTestId('recurrence-suggestion-accept').dispatchEvent('click');

  const acceptedSnapshot = await readCreateShiftRecurrenceSnapshot(page);
  expect(acceptedSnapshot.suggestionVisible).toBe(false);
  expect(acceptedSnapshot.selectedCadence).toBe('weekly');
  expect(acceptedSnapshot.intervalValue).toBe('1');
  expect(acceptedSnapshot.repeatCountValue).toBe('');
  expect(acceptedSnapshot.repeatUntilValue).toBe('');
  expect(acceptedSnapshot.fieldStateCadence).toBe('weekly');
  expect(acceptedSnapshot.fieldStateInterval).toBe('1');
  expect(acceptedSnapshot.fieldStateRepeatCount).toBe('none');
  expect(acceptedSnapshot.fieldStateRepeatUntil).toBe('none');
  expect(acceptedSnapshot.fieldSuggestionState).toBe('accepted');
  await expect(page.getByTestId('create-start-input')).toHaveValue(startBeforeAccept);
  await expect(page.getByTestId('create-end-input')).toHaveValue(endBeforeAccept);

  await page.getByTestId('create-title-input').fill('Predictive overlap check');
  await page.getByTestId('create-start-input').fill('2026-04-15T10:30');
  await page.getByTestId('create-end-input').fill('2026-04-15T11:30');

  await expect
    .poll(async () => (await readCreateShiftClashAdvisory(page)).overlapCount, {
      message: 'expected the mobile clash advisory to expose a single overlap for the seeded Morning intake shift'
    })
    .toBe(1);

  const advisorySnapshot = await readCreateShiftClashAdvisory(page);
  expect(advisorySnapshot.visible).toBe(true);
  expect(advisorySnapshot.overlapCount).toBe(1);
  expect(advisorySnapshot.conflictingShiftIds).toEqual([morningIntakeShiftId]);
  expect(advisorySnapshot.label).toContain('1 overlap');
  expect(advisorySnapshot.detail).toContain('Save stays enabled');
  expect(advisorySnapshot.warningTone).toBe('Warning only');
  expect(advisorySnapshot.text).toContain('Morning intake');
  await expect(page.getByTestId('create-submit-button')).toBeEnabled();

  await page.getByTestId('create-start-input').fill('2026-04-15T11:30');
  await page.getByTestId('create-end-input').fill('2026-04-15T12:30');

  await expect
    .poll(async () => (await readCreateShiftClashAdvisory(page)).overlapCount, {
      message: 'expected the mobile clash advisory to clear once the draft no longer overlaps the seeded shift'
    })
    .toBe(null);

  const clearedAdvisorySnapshot = await readCreateShiftClashAdvisory(page);
  expect(clearedAdvisorySnapshot.visible).toBe(false);
  expect(clearedAdvisorySnapshot.conflictingShiftIds).toEqual([]);
  expect(clearedAdvisorySnapshot.items).toEqual([]);
  await expect(page.getByTestId('create-submit-button')).toBeEnabled();
});
