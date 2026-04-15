import { describe, expect, it } from 'vitest';
import {
  APP_SHELL_CACHE_STORAGE_KEY,
  readCachedAppShellSnapshot,
  writeCachedAppShellSnapshot,
  type StorageLike
} from '../../src/lib/offline/app-shell-cache';
import {
  OFFLINE_REPOSITORY_MEMORY_STORAGE_KEY,
  createMemoryScheduleRepository,
  type OfflineScheduleMutationRecord,
  type OfflineScheduleWeekSnapshot
} from '../../src/lib/offline/repository';

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

function createWeekSnapshot(): OfflineScheduleWeekSnapshot {
  return {
    scope: {
      userId: 'user-1',
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      weekStart: '2026-04-20'
    },
    visibleWeek: {
      start: '2026-04-20',
      endExclusive: '2026-04-27',
      startAt: '2026-04-20T00:00:00.000Z',
      endAt: '2026-04-27T00:00:00.000Z',
      requestedStart: '2026-04-20',
      source: 'query',
      reason: null,
      dayKeys: ['2026-04-20', '2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24', '2026-04-25', '2026-04-26']
    },
    shifts: [
      {
        id: 'shift-alpha',
        calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
        seriesId: null,
        title: 'Alpha opening sweep',
        startAt: '2026-04-20T08:30:00.000Z',
        endAt: '2026-04-20T09:00:00.000Z',
        occurrenceIndex: null,
        sourceKind: 'single'
      }
    ],
    cachedAt: '2026-04-15T10:05:00.000Z',
    origin: 'server-sync'
  };
}

function createLocalMutation(): OfflineScheduleMutationRecord {
  return {
    id: 'mutation-1',
    scope: {
      userId: 'user-1',
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      weekStart: '2026-04-20'
    },
    action: 'move',
    shiftId: 'shift-alpha',
    payload: {
      startAt: '2026-04-20T09:30:00.000Z',
      endAt: '2026-04-20T10:00:00.000Z'
    },
    createdAt: '2026-04-15T10:06:00.000Z'
  };
}

describe('offline schedule repository', () => {
  it('persists a week snapshot and local mutations across repository reopen for one user/calendar/week scope', async () => {
    const storage = createStorage();
    const snapshot = createWeekSnapshot();
    const mutation = createLocalMutation();

    const firstRepository = createMemoryScheduleRepository({ storage });
    expect(await firstRepository.initialize()).toEqual({
      status: 'ready',
      engine: 'memory',
      persistence: 'shared-memory',
      database: OFFLINE_REPOSITORY_MEMORY_STORAGE_KEY,
      sqliteVersion: null
    });

    expect(await firstRepository.putWeekSnapshot(snapshot)).toEqual({ ok: true });
    expect(await firstRepository.putLocalMutation(mutation)).toEqual({ ok: true });
    await firstRepository.close();

    const reopenedRepository = createMemoryScheduleRepository({ storage });
    expect(await reopenedRepository.initialize()).toEqual({
      status: 'ready',
      engine: 'memory',
      persistence: 'shared-memory',
      database: OFFLINE_REPOSITORY_MEMORY_STORAGE_KEY,
      sqliteVersion: null
    });

    expect(await reopenedRepository.getWeekSnapshot(snapshot.scope)).toEqual({
      status: 'available',
      snapshot
    });
    expect(await reopenedRepository.listLocalMutations(snapshot.scope)).toEqual({
      status: 'available',
      mutations: [mutation]
    });
  });

  it('fails closed when a stored snapshot row is malformed', async () => {
    const storage = createStorage();
    const scope = createWeekSnapshot().scope;

    storage.setItem(
      OFFLINE_REPOSITORY_MEMORY_STORAGE_KEY,
      JSON.stringify({
        weekSnapshots: {
          'user-1::aaaaaaaa-aaaa-1111-1111-111111111111::2026-04-20': '{"scope":{"userId":"user-1"}}'
        },
        localMutations: {}
      })
    );

    const repository = createMemoryScheduleRepository({ storage });

    expect(await repository.getWeekSnapshot(scope)).toEqual({
      status: 'malformed',
      reason: 'snapshot-invalid',
      detail:
        'The stored week snapshot failed validation, so the repository refused to rehydrate guessed schedule data.'
    });
  });
});

describe('cached app-shell scope', () => {
  it('fails closed for calendar ids that were never synced into the trusted browser-local scope', () => {
    const storage = createStorage();

    writeCachedAppShellSnapshot(
      {
        viewer: {
          id: 'user-1',
          email: 'user@example.com',
          displayName: 'User One'
        },
        session: {
          userId: 'user-1',
          email: 'user@example.com',
          displayName: 'User One',
          expiresAtMs: new Date('2026-04-15T12:00:00.000Z').getTime(),
          refreshedAt: '2026-04-15T10:00:00.000Z'
        },
        groups: [
          {
            id: 'group-a',
            name: 'Alpha Group',
            role: 'owner',
            calendars: [
              {
                id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
                groupId: 'group-a',
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
            id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
            groupId: 'group-a',
            name: 'Alpha shared',
            isDefault: true
          }
        ],
        primaryCalendar: {
          id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
          groupId: 'group-a',
          name: 'Alpha shared',
          isDefault: true
        },
        onboardingState: 'ready',
        now: new Date('2026-04-15T10:00:00.000Z')
      },
      storage
    );

    expect(
      readCachedAppShellSnapshot({
        storage,
        expectedUserId: 'user-1',
        calendarId: 'bbbbbbbb-bbbb-1111-1111-111111111111',
        now: new Date('2026-04-15T10:30:00.000Z')
      })
    ).toEqual({
      status: 'unavailable',
      reason: 'calendar-not-synced',
      detail:
        'That calendar id was never synced into the trusted browser-local scope, so offline continuity failed closed.'
    });
  });

  it('clears malformed cached scope instead of trusting guessed calendar inventory', () => {
    const storage = createStorage();

    storage.setItem(APP_SHELL_CACHE_STORAGE_KEY, '{"version":1,"viewer":{"id":"user-1"}}');

    expect(readCachedAppShellSnapshot({ storage })).toEqual({
      status: 'unavailable',
      reason: 'cache-contract-invalid',
      detail:
        'The cached app-shell snapshot failed contract validation and was cleared instead of widening offline scope.'
    });
    expect(storage.getItem(APP_SHELL_CACHE_STORAGE_KEY)).toBeNull();
  });
});
