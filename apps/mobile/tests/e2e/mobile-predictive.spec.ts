import { expect, openCalendar, seededCalendars, seededUsers, seededWeekStarts, signInThroughUi, test } from './fixtures';

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
  await expect(routeState).toHaveAttribute('data-recurrence-suggestion-match-count', '3');
  const recurrenceExemplarShiftId = await routeState.getAttribute('data-recurrence-suggestion-exemplar-shift-id');
  expect(recurrenceExemplarShiftId).toBeTruthy();
  expect(recurrenceExemplarShiftId).not.toBe('none');
  await expect(page.getByTestId(`shift-card-${morningIntakeShiftId}`)).toContainText('Morning intake');

  await page.getByTestId('create-shift-trigger-create-week').click();
  await expect(page.getByTestId('create-shift-editor')).toBeVisible();
  await expect(page.getByTestId('recurrence-field-state')).toHaveAttribute('data-suggestion-state', 'idle');
  await expect(page.getByTestId('recurrence-suggestion')).toHaveAttribute('data-match-count', '3');
  await expect(page.getByTestId('recurrence-suggestion')).toHaveAttribute('data-exemplar-shift-id', recurrenceExemplarShiftId);

  await page.getByTestId('recurrence-suggestion-dismiss').evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
  await expect(page.getByTestId('recurrence-field-state')).toHaveAttribute('data-suggestion-state', 'dismissed');
  await expect(page.getByTestId('recurrence-suggestion')).toHaveCount(0);

  await page.getByTestId('create-dismiss-button').evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
  await expect(page.getByTestId('create-shift-editor')).toHaveCount(0);

  await page.getByTestId('create-shift-trigger-create-week').click();
  await expect(page.getByTestId('create-shift-editor')).toBeVisible();
  await expect(page.getByTestId('recurrence-field-state')).toHaveAttribute('data-suggestion-state', 'dismissed');
  await expect(page.getByTestId('recurrence-suggestion')).toHaveCount(0);

  await page.reload();
  await expect(routeState).toHaveAttribute('data-recurrence-suggestion-status', 'ready');
  await expect(routeState).toHaveAttribute('data-recurrence-suggestion-match-count', '3');

  await page.getByTestId('create-shift-trigger-create-week').click();
  await expect(page.getByTestId('create-shift-editor')).toBeVisible();
  await expect(page.getByTestId('recurrence-field-state')).toHaveAttribute('data-suggestion-state', 'idle');
  await expect(page.getByTestId('recurrence-suggestion')).toBeVisible();

  const startBeforeAccept = await page.getByTestId('create-start-input').inputValue();
  const endBeforeAccept = await page.getByTestId('create-end-input').inputValue();

  await page.getByTestId('recurrence-suggestion-accept').evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
  await expect(page.getByTestId('recurrence-field-state')).toHaveAttribute('data-suggestion-state', 'accepted');
  await expect(page.getByTestId('recurrence-field-state')).toHaveAttribute('data-cadence', 'weekly');
  await expect(page.getByTestId('recurrence-field-state')).toHaveAttribute('data-interval', '1');
  await expect(page.getByTestId('recurrence-suggestion')).toHaveCount(0);
  await expect(page.getByTestId('create-start-input')).toHaveValue(startBeforeAccept);
  await expect(page.getByTestId('create-end-input')).toHaveValue(endBeforeAccept);

  await page.getByTestId('create-title-input').fill('Predictive overlap check');
  await page.getByTestId('create-start-input').fill('2026-04-15T10:30');
  await page.getByTestId('create-end-input').fill('2026-04-15T11:30');

  await expect(page.getByTestId('clash-advisory')).toBeVisible();
  await expect(page.getByTestId('clash-advisory')).toHaveAttribute('data-overlap-count', '1');
  await expect(page.getByTestId('clash-advisory')).toHaveAttribute('data-conflicting-shift-ids', morningIntakeShiftId);
  await expect(page.getByTestId('clash-advisory')).toContainText('Save stays enabled');
  await expect(page.getByTestId('create-submit-button')).toBeEnabled();
});
