import { describe, expect, it, vi } from 'vitest';
import { presentCalendarNotificationState } from '../src/lib/notifications/presentation';
import {
  createIdleNotificationRouteDiagnostics,
  resolveNotificationOpenTarget,
  routeNotificationOpen
} from '../src/lib/notifications/router';

const alphaCalendarId = 'aaaaaaaa-aaaa-4111-8111-111111111111';
const betaCalendarId = 'bbbbbbbb-bbbb-4222-8222-222222222222';
const rogueCalendarId = 'cccccccc-cccc-4333-8333-333333333333';

describe('mobile notification router', () => {
  it('accepts normalized protected targets inside trusted calendar scope', () => {
    expect(
      resolveNotificationOpenTarget({
        targetPath: `/calendars/${alphaCalendarId}`,
        permittedCalendarIds: [alphaCalendarId, betaCalendarId]
      })
    ).toEqual({
      ok: true,
      normalizedPath: `/calendars/${alphaCalendarId}`,
      requestedCalendarId: alphaCalendarId
    });

    expect(
      resolveNotificationOpenTarget({
        targetPath: '/groups',
        permittedCalendarIds: [alphaCalendarId]
      })
    ).toEqual({
      ok: true,
      normalizedPath: '/groups',
      requestedCalendarId: null
    });
  });

  it('rejects malformed, external, and stale calendar targets explicitly', () => {
    expect(resolveNotificationOpenTarget({ targetPath: 'https://example.com' })).toMatchObject({
      ok: false,
      reason: 'path-rejected'
    });
    expect(resolveNotificationOpenTarget({ targetPath: '//evil.test/path' })).toMatchObject({
      ok: false,
      reason: 'path-rejected'
    });
    expect(resolveNotificationOpenTarget({ targetPath: '/signin' })).toMatchObject({
      ok: false,
      reason: 'path-rejected'
    });
    expect(
      resolveNotificationOpenTarget({
        targetPath: `/calendars/${rogueCalendarId}`,
        permittedCalendarIds: [alphaCalendarId, betaCalendarId]
      })
    ).toMatchObject({ ok: false, reason: 'path-rejected' });
  });

  it('records explicit routing diagnostics for navigated and timed-out taps', async () => {
    const navigate = vi.fn(async () => undefined);
    const navigated = await routeNotificationOpen({
      source: 'push',
      targetPath: `/calendars/${alphaCalendarId}`,
      permittedCalendarIds: [alphaCalendarId],
      navigate,
      now: () => new Date('2026-05-04T10:00:00.000Z')
    });

    expect(navigate).toHaveBeenCalledWith(`/calendars/${alphaCalendarId}`);
    expect(navigated).toMatchObject({
      code: 'navigated',
      source: 'push',
      normalizedPath: `/calendars/${alphaCalendarId}`,
      requestedCalendarId: alphaCalendarId,
      reason: null
    });

    const timedOut = await routeNotificationOpen({
      source: 'local',
      targetPath: '/groups',
      permittedCalendarIds: [alphaCalendarId],
      navigate: () => new Promise<void>(() => undefined),
      timeoutMs: 5,
      now: () => new Date('2026-05-04T10:01:00.000Z')
    });

    expect(timedOut).toMatchObject({
      code: 'navigation-timeout',
      source: 'local',
      normalizedPath: '/groups',
      reason: 'timeout'
    });
  });

  it('preserves explicit degraded notification state without collapsing it to off', () => {
    const presented = presentCalendarNotificationState({
      calendarId: alphaCalendarId,
      interactive: true,
      state: {
        calendarId: alphaCalendarId,
        desiredEnabled: true,
        permission: 'denied',
        localReminders: 'blocked',
        localReason: 'permission-denied',
        installationStatus: 'ready',
        remoteSubscription: 'degraded',
        remoteReason: 'permission-denied',
        phase: 'degraded',
        reason: 'permission-denied',
        detail: 'Permission stayed denied.',
        localSyncPhase: 'ready',
        localReminderCount: 0,
        lastReminderResyncAt: null,
        remoteRegistration: 'denied'
      }
    });

    expect(presented).toMatchObject({
      desiredEnabled: true,
      permission: 'denied',
      localReminders: 'blocked',
      remoteSubscription: 'degraded',
      phase: 'degraded',
      reason: 'permission-denied',
      readOnly: false
    });
  });

  it('forces malformed runtime state into explicit degraded read-only mode', () => {
    const malformed = presentCalendarNotificationState({
      calendarId: alphaCalendarId,
      interactive: true,
      state: {
        calendarId: alphaCalendarId,
        desiredEnabled: true,
        remoteSubscription: 'subscribed',
        phase: 'ready',
        reason: 'not-a-real-reason' as never,
        detail: 'bad state'
      }
    });

    expect(malformed).toMatchObject({
      permission: 'unknown',
      localReminders: 'degraded',
      phase: 'degraded',
      reason: 'malformed-response',
      malformed: true,
      readOnly: true
    });
  });

  it('starts from an idle diagnostic snapshot', () => {
    expect(createIdleNotificationRouteDiagnostics()).toEqual({
      code: 'idle',
      source: null,
      targetPath: null,
      normalizedPath: null,
      requestedCalendarId: null,
      reason: null,
      detail: 'No notification tap has been routed in this session yet.',
      handledAt: null
    });
  });
});
