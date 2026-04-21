import { describe, expect, it } from 'vitest';
import {
  readCachedAppShellSnapshot,
  writeCachedAppShellSnapshot,
  type StorageLike
} from '@repo/caluno-core/offline/app-shell-cache';
import { rebaseTrustedScheduleWithLocalQueue } from '@repo/caluno-core/offline/sync-engine';
import type { CalendarScheduleView, CalendarShift } from '@repo/caluno-core/schedule/types';
import type { OfflineMutationQueueEntry } from '@repo/caluno-core/offline/mutation-queue';
import type { OfflineScheduleScope } from '@repo/caluno-core/offline/types';

function createStorage(): StorageLike {
  const values = new Map<string, string>();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

function createScope(): OfflineScheduleScope {
  return {
    userId: 'user-mobile',
    calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
    weekStart: '2026-04-20'
  };
}

function createShift(params: {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
}): CalendarShift {
  return {
    id: params.id,
    calendarId: createScope().calendarId,
    seriesId: null,
    title: params.title,
    startAt: params.startAt,
    endAt: params.endAt,
    occurrenceIndex: null,
    sourceKind: 'single'
  };
}

function createSchedule(shifts: CalendarShift[]): CalendarScheduleView {
  const visibleWeek = {
    start: '2026-04-20',
    endExclusive: '2026-04-27',
    startAt: '2026-04-20T00:00:00.000Z',
    endAt: '2026-04-27T00:00:00.000Z',
    requestedStart: '2026-04-20',
    source: 'query' as const,
    reason: null,
    dayKeys: ['2026-04-20', '2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24', '2026-04-25', '2026-04-26']
  };

  return {
    status: 'ready',
    reason: null,
    message: 'Trusted week loaded.',
    visibleWeek,
    days: visibleWeek.dayKeys.map((dayKey) => ({
      dayKey,
      label: dayKey,
      shifts: shifts.filter((shift) => shift.startAt.slice(0, 10) === dayKey)
    })),
    totalShifts: shifts.length,
    shiftIds: shifts.map((shift) => shift.id)
  };
}

function writeTrustedShell(storage: StorageLike) {
  writeCachedAppShellSnapshot(
    {
      viewer: {
        id: 'user-mobile',
        email: 'mobile@example.com',
        displayName: 'Mobile Member'
      },
      session: {
        userId: 'user-mobile',
        email: 'mobile@example.com',
        displayName: 'Mobile Member',
        expiresAtMs: new Date('2026-04-21T12:00:00.000Z').getTime(),
        refreshedAt: '2026-04-21T10:00:00.000Z'
      },
      groups: [
        {
          id: 'group-alpha',
          name: 'Alpha Group',
          role: 'owner',
          calendars: [
            {
              id: createScope().calendarId,
              groupId: 'group-alpha',
              name: 'Alpha shared',
              isDefault: true
            }
          ],
          joinCode: null,
          joinCodeStatus: 'unavailable'
        }
      ],
      calendars: [
        {
          id: createScope().calendarId,
          groupId: 'group-alpha',
          name: 'Alpha shared',
          isDefault: true
        }
      ],
      primaryCalendar: {
        id: createScope().calendarId,
        groupId: 'group-alpha',
        name: 'Alpha shared',
        isDefault: true
      },
      onboardingState: 'ready',
      now: new Date('2026-04-21T10:00:00.000Z')
    },
    storage
  );
}

describe('mobile continuity contract', () => {
  it('fails closed for stale sessions, user mismatch, and unsynced calendar ids', () => {
    const storage = createStorage();
    writeTrustedShell(storage);

    expect(
      readCachedAppShellSnapshot({
        storage,
        expectedUserId: 'user-mobile',
        now: new Date('2026-04-21T12:00:01.000Z')
      })
    ).toEqual({
      status: 'unavailable',
      reason: 'session-stale',
      detail: 'The cached continuity session expired, so offline continuity failed closed.'
    });

    expect(
      readCachedAppShellSnapshot({
        storage,
        expectedUserId: 'other-user',
        now: new Date('2026-04-21T11:00:00.000Z')
      })
    ).toEqual({
      status: 'unavailable',
      reason: 'session-user-mismatch',
      detail: 'The cached continuity session belongs to a different user, so the cached shell was not trusted.'
    });

    expect(
      readCachedAppShellSnapshot({
        storage,
        expectedUserId: 'user-mobile',
        calendarId: 'bbbbbbbb-bbbb-1111-1111-111111111111',
        now: new Date('2026-04-21T11:00:00.000Z')
      })
    ).toEqual({
      status: 'unavailable',
      reason: 'calendar-not-synced',
      detail:
        'That calendar id was never synced into the trusted browser-local scope, so offline continuity failed closed.'
    });
  });

  it('replays queued mutations in created-at order and keeps the board cached-local when local work exists', () => {
    const trustedSchedule = createSchedule([
      createShift({
        id: 'shift-alpha',
        title: 'Alpha opening sweep',
        startAt: '2026-04-20T08:30:00.000Z',
        endAt: '2026-04-20T09:00:00.000Z'
      })
    ]);

    const localCreated = createShift({
      id: 'local-1',
      title: 'Offline prep',
      startAt: '2026-04-21T09:00:00.000Z',
      endAt: '2026-04-21T11:00:00.000Z'
    });

    const result = rebaseTrustedScheduleWithLocalQueue({
      trustedSchedule,
      queueEntries: [
        {
          id: 'queue-edit',
          scope: createScope(),
          action: 'edit',
          shiftId: 'local-1',
          createdAt: '2026-04-21T10:01:00.000Z',
          syncState: 'pending-server',
          errorReason: null,
          errorDetail: null,
          payload: {
            kind: 'edit',
            fields: {
              shiftId: 'local-1',
              title: 'Offline prep revised',
              startAt: '2026-04-21T09:30',
              endAt: '2026-04-21T11:30'
            },
            previousShift: localCreated,
            nextShift: {
              ...localCreated,
              title: 'Offline prep revised',
              startAt: '2026-04-21T09:30:00.000Z',
              endAt: '2026-04-21T11:30:00.000Z'
            }
          }
        },
        {
          id: 'queue-create',
          scope: createScope(),
          action: 'create',
          shiftId: null,
          createdAt: '2026-04-21T10:00:00.000Z',
          syncState: 'pending-server',
          errorReason: null,
          errorDetail: null,
          payload: {
            kind: 'create',
            fields: {
              title: 'Offline prep',
              startAt: '2026-04-21T09:00',
              endAt: '2026-04-21T11:00'
            },
            createdShifts: [localCreated]
          }
        }
      ] satisfies OfflineMutationQueueEntry[]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.boardSource).toBe('cached-local');
    expect(result.snapshotOrigin).toBe('local-write');
    expect(result.replayedQueueLength).toBe(2);
    expect(result.schedule.shiftIds).toEqual(['shift-alpha', 'local-1']);

    const localShift = result.schedule.days.find((day) => day.dayKey === '2026-04-21')?.shifts[0];
    expect(localShift).toMatchObject({
      id: 'local-1',
      title: 'Offline prep revised',
      startAt: '2026-04-21T09:30:00.000Z',
      endAt: '2026-04-21T11:30:00.000Z'
    });
  });

  it('fails closed on malformed queue payloads and missing replay targets', () => {
    const trustedSchedule = createSchedule([
      createShift({
        id: 'shift-alpha',
        title: 'Alpha opening sweep',
        startAt: '2026-04-20T08:30:00.000Z',
        endAt: '2026-04-20T09:00:00.000Z'
      })
    ]);

    const malformed = rebaseTrustedScheduleWithLocalQueue({
      trustedSchedule,
      queueEntries: [
        {
          id: 'queue-malformed',
          scope: createScope(),
          action: 'create',
          shiftId: null,
          createdAt: '2026-04-21T10:00:00.000Z',
          syncState: 'pending-server',
          errorReason: null,
          errorDetail: null,
          payload: {
            kind: 'create',
            fields: {
              title: 'Broken',
              startAt: '2026-04-21T09:00',
              endAt: '2026-04-21T11:00'
            },
            createdShifts: [{ id: 'broken' }]
          } as unknown as OfflineMutationQueueEntry['payload']
        }
      ]
    });

    expect(malformed).toEqual({
      ok: false,
      reason: 'QUEUE_ENTRY_INVALID',
      detail: 'A queued local create payload was malformed, so trusted replay failed closed.'
    });

    const missingTarget = rebaseTrustedScheduleWithLocalQueue({
      trustedSchedule,
      queueEntries: [
        {
          id: 'queue-move',
          scope: createScope(),
          action: 'move',
          shiftId: 'missing-shift',
          createdAt: '2026-04-21T10:00:00.000Z',
          syncState: 'pending-server',
          errorReason: null,
          errorDetail: null,
          payload: {
            kind: 'move',
            fields: {
              shiftId: 'missing-shift',
              title: 'Moved title',
              startAt: '2026-04-20T10:00',
              endAt: '2026-04-20T11:00'
            },
            previousShift: createShift({
              id: 'missing-shift',
              title: 'Before move',
              startAt: '2026-04-20T08:30:00.000Z',
              endAt: '2026-04-20T09:00:00.000Z'
            }),
            nextShift: createShift({
              id: 'missing-shift',
              title: 'Moved title',
              startAt: '2026-04-20T10:00:00.000Z',
              endAt: '2026-04-20T11:00:00.000Z'
            })
          }
        }
      ]
    });

    expect(missingTarget).toEqual({
      ok: false,
      reason: 'REPLAY_MOVE_TARGET_MISSING',
      detail:
        'The trusted refreshed week no longer contained a shift needed for a queued local move, so the existing local board stayed authoritative.'
    });
  });
});
