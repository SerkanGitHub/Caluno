import { describe, expect, it } from 'vitest';
import {
  buildMobileFindTimeEntrypointHref,
  MOBILE_FIND_TIME_DEFAULT_DURATION_MINUTES,
  resolveMobileCreatePrefillArrival
} from '../src/lib/schedule/create-prefill-arrival';

describe('mobile create-prefill arrival helper', () => {
  it('builds the calendar-board entrypoint for the current visible week', () => {
    expect(
      buildMobileFindTimeEntrypointHref({
        calendarId: 'calendar-alpha',
        visibleWeekStart: '2026-04-13'
      })
    ).toBe(`/calendars/calendar-alpha/find-time?duration=${MOBILE_FIND_TIME_DEFAULT_DURATION_MINUTES}&start=2026-04-13`);

    expect(
      buildMobileFindTimeEntrypointHref({
        calendarId: 'calendar-alpha',
        visibleWeekStart: '2026-04-20',
        durationMinutes: 90
      })
    ).toBe('/calendars/calendar-alpha/find-time?duration=90&start=2026-04-20');
  });

  it('accepts a valid find-time arrival and keeps the exact slot payload while stripping one-shot params', () => {
    const arrival = resolveMobileCreatePrefillArrival(
      new URLSearchParams(
        'create=1&start=2026-04-13&prefillStartAt=2026-04-16T13:30:00.000Z&prefillEndAt=2026-04-16T15:00:00.000Z&source=find-time&welcome=back'
      )
    );

    expect(arrival).toMatchObject({
      status: 'accepted',
      shouldStripParams: true,
      createPrefill: {
        source: 'find-time',
        visibleWeekStart: '2026-04-13',
        startAt: '2026-04-16T13:30:00.000Z',
        endAt: '2026-04-16T15:00:00.000Z',
        startAtLocal: '2026-04-16T13:30',
        endAtLocal: '2026-04-16T15:00'
      }
    });
    expect(arrival.cleanedSearchParams.toString()).toBe('start=2026-04-13&welcome=back');
  });

  it('rejects malformed arrival params but still strips sticky handoff state while preserving the requested week', () => {
    const arrival = resolveMobileCreatePrefillArrival(
      new URLSearchParams(
        'create=1&start=2026-04-13&prefillStartAt=not-an-iso&prefillEndAt=2026-04-16T15:00:00.000Z&source=find-time&welcome=back'
      )
    );

    expect(arrival.status).toBe('rejected');
    expect(arrival.createPrefill).toBeNull();
    expect(arrival.shouldStripParams).toBe(true);
    expect(arrival.cleanedSearchParams.toString()).toBe('start=2026-04-13&welcome=back');
  });

  it('stays neutral on clean calendar queries so manual create behavior is unchanged after cleanup or direct opens', () => {
    const cleanedArrival = resolveMobileCreatePrefillArrival(new URLSearchParams('start=2026-04-13&welcome=back'));

    expect(cleanedArrival.status).toBe('none');
    expect(cleanedArrival.createPrefill).toBeNull();
    expect(cleanedArrival.shouldStripParams).toBe(false);
    expect(cleanedArrival.cleanedSearchParams.toString()).toBe('start=2026-04-13&welcome=back');
  });
});
