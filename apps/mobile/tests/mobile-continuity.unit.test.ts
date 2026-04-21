import { describe, expect, it, vi } from 'vitest';
import { APP_SHELL_CACHE_STORAGE_KEY } from '@repo/caluno-core/offline/app-shell-cache';
import {
  loadCachedMobileAppShell,
  loadMobileAppShell,
  resolveMobileCalendarRoute,
  resolveMobileProtectedEntryState,
  resetMobileAppShellCache,
  type MobileShellLoadResult
} from '../src/lib/shell/load-app-shell';
import {
  writeMobileCachedAppShellSnapshot,
  type MobileContinuityStorage
} from '../src/lib/continuity/mobile-app-shell-cache';
import {
  rememberSyncedCalendarWeek,
  type MobileOfflineStorage
} from '../src/lib/offline/repository';

const alphaCalendarId = 'aaaaaaaa-aaaa-1111-1111-111111111111';

type QueryResponse = {
  data: unknown;
  error: { message: string } | null;
};

function createAsyncStorage() {
  const values = new Map<string, string>();
  const get = vi.fn(async (key: string) => values.get(key) ?? null);
  const set = vi.fn(async (key: string, value: string) => {
    values.set(key, value);
  });
  const remove = vi.fn(async (key: string) => {
    values.delete(key);
  });
  const keys = vi.fn(async () => Array.from(values.keys()));

  const storage: MobileContinuityStorage & MobileOfflineStorage = {
    get,
    set,
    remove,
    keys
  };

  return {
    storage,
    values,
    get,
    set,
    remove,
    keys
  };
}

function createQueryClient(responses: Record<string, QueryResponse>) {
  return {
    from(table: string) {
      return createBuilder(table, responses);
    }
  };
}

function createBuilder(table: string, responses: Record<string, QueryResponse>) {
  const state = {
    filters: [] as string[],
    orders: [] as string[]
  };

  const builder = {
    select(_columns: string) {
      return builder;
    },
    eq(column: string, value: string) {
      state.filters.push(`eq:${column}:${value}`);
      return builder;
    },
    in(column: string, values: string[]) {
      state.filters.push(`in:${column}:${values.join(',')}`);
      return builder;
    },
    order(column: string, options?: { ascending?: boolean }) {
      state.orders.push(`order:${column}:${options?.ascending === false ? 'desc' : 'asc'}`);
      return builder;
    },
    returns<T>() {
      const lookupKey = [table, ...state.filters, ...state.orders].join('|');
      const response = responses[lookupKey] ?? responses[table];
      return Promise.resolve((response ?? { data: [], error: null }) as { data: T; error: { message: string } | null });
    }
  };

  return builder;
}

function expectShellSuccess(result: MobileShellLoadResult) {
  expect(result.ok).toBe(true);
  return result.ok ? result : null;
}

async function seedTrustedSnapshot(storage: MobileContinuityStorage) {
  const result = await writeMobileCachedAppShellSnapshot({
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
            id: alphaCalendarId,
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
        id: alphaCalendarId,
        groupId: 'group-alpha',
        name: 'Alpha shared',
        isDefault: true
      }
    ],
    primaryCalendar: {
      id: alphaCalendarId,
      groupId: 'group-alpha',
      name: 'Alpha shared',
      isDefault: true
    },
    onboardingState: 'ready',
    now: new Date('2026-04-21T10:00:00.000Z'),
    storage
  });

  expect(result.ok).toBe(true);
}

describe('mobile continuity runtime', () => {
  it('persists trusted shell continuity on online loads and deduplicates repeat writes', async () => {
    resetMobileAppShellCache();
    const { storage, set, values } = createAsyncStorage();

    const result = await loadMobileAppShell(
      {
        id: 'user-mobile',
        email: 'mobile@example.com',
        user_metadata: { display_name: 'Mobile Member' }
      },
      {
        client: createQueryClient({
          'group_memberships|eq:user_id:user-mobile': {
            data: [{ group_id: 'group-alpha', role: 'owner' }],
            error: null
          },
          'groups|in:id:group-alpha': {
            data: [{ id: 'group-alpha', name: 'Alpha Group' }],
            error: null
          },
          'calendars|in:group_id:group-alpha|order:is_default:desc|order:name:asc': {
            data: [{ id: alphaCalendarId, group_id: 'group-alpha', name: 'Alpha shared', is_default: true }],
            error: null
          },
          'group_join_codes|in:group_id:group-alpha|order:created_at:desc': {
            data: [],
            error: null
          }
        }) as never,
        continuityStorage: storage,
        session: {
          expires_at: Math.floor(new Date('2026-04-21T12:00:00.000Z').getTime() / 1000),
          expires_in: 7200
        },
        now: () => new Date('2026-04-21T10:00:00.000Z')
      }
    );

    const success = expectShellSuccess(result);
    expect(success).toMatchObject({
      routeMode: 'trusted-online',
      snapshotOrigin: 'trusted-online',
      continuity: {
        availability: 'ready',
        lastTrustedRefreshAt: '2026-04-21T10:00:00.000Z'
      }
    });
    expect(values.has(APP_SHELL_CACHE_STORAGE_KEY)).toBe(true);
    expect(set).toHaveBeenCalledTimes(1);

    await loadMobileAppShell(
      {
        id: 'user-mobile',
        email: 'mobile@example.com',
        user_metadata: { display_name: 'Mobile Member' }
      },
      {
        force: true,
        client: createQueryClient({
          'group_memberships|eq:user_id:user-mobile': {
            data: [{ group_id: 'group-alpha', role: 'owner' }],
            error: null
          },
          'groups|in:id:group-alpha': {
            data: [{ id: 'group-alpha', name: 'Alpha Group' }],
            error: null
          },
          'calendars|in:group_id:group-alpha|order:is_default:desc|order:name:asc': {
            data: [{ id: alphaCalendarId, group_id: 'group-alpha', name: 'Alpha shared', is_default: true }],
            error: null
          },
          'group_join_codes|in:group_id:group-alpha|order:created_at:desc': {
            data: [],
            error: null
          }
        }) as never,
        continuityStorage: storage,
        session: {
          expires_at: Math.floor(new Date('2026-04-21T12:00:00.000Z').getTime() / 1000),
          expires_in: 7200
        },
        now: () => new Date('2026-04-21T10:00:00.000Z')
      }
    );

    expect(set).toHaveBeenCalledTimes(1);
  });

  it('reopens cached-offline only for a previously synced permitted calendar', async () => {
    resetMobileAppShellCache();
    const { storage } = createAsyncStorage();
    await seedTrustedSnapshot(storage);
    await rememberSyncedCalendarWeek(
      {
        userId: 'user-mobile',
        calendarId: alphaCalendarId,
        weekStart: '2026-04-20',
        syncedAt: '2026-04-21T10:05:00.000Z',
        source: 'trusted-online'
      },
      { storage }
    );

    const entry = await resolveMobileProtectedEntryState({
      pathname: `/calendars/${alphaCalendarId}`,
      authPhase: 'signed-out',
      now: new Date('2026-04-21T11:00:00.000Z'),
      continuityStorage: storage,
      offlineStorage: storage
    });

    expect(entry).toMatchObject({
      routeMode: 'cached-offline',
      snapshotOrigin: 'cached-offline',
      continuityReason: null,
      lastTrustedRefreshAt: '2026-04-21T10:00:00.000Z'
    });
    expect(entry.cachedSnapshot).not.toBeNull();

    const shell = loadCachedMobileAppShell(entry.cachedSnapshot!);
    const route = resolveMobileCalendarRoute({
      appShell: shell.appShell,
      calendarId: alphaCalendarId,
      userId: entry.cachedSnapshot?.viewer.id
    });

    expect(shell.routeMode).toBe('cached-offline');
    expect(route).toMatchObject({
      kind: 'calendar',
      state: {
        calendar: {
          id: alphaCalendarId
        }
      }
    });
  });

  it('fails closed for stale, corrupt, invalid-session, and no-synced-week continuity states', async () => {
    resetMobileAppShellCache();
    const first = createAsyncStorage();
    await seedTrustedSnapshot(first.storage);

    await expect(
      resolveMobileProtectedEntryState({
        pathname: `/calendars/${alphaCalendarId}`,
        authPhase: 'signed-out',
        now: new Date('2026-04-21T12:00:01.000Z'),
        continuityStorage: first.storage,
        offlineStorage: first.storage
      })
    ).resolves.toMatchObject({
      routeMode: 'denied',
      continuityReason: 'session-stale'
    });

    const corrupt = createAsyncStorage();
    corrupt.values.set(APP_SHELL_CACHE_STORAGE_KEY, '{bad json');
    await expect(
      resolveMobileProtectedEntryState({
        pathname: '/groups',
        authPhase: 'signed-out',
        now: new Date('2026-04-21T11:00:00.000Z'),
        continuityStorage: corrupt.storage,
        offlineStorage: corrupt.storage
      })
    ).resolves.toMatchObject({
      routeMode: 'denied',
      continuityReason: 'cache-parse-failed'
    });
    expect(corrupt.values.has(APP_SHELL_CACHE_STORAGE_KEY)).toBe(false);

    const noWeek = createAsyncStorage();
    await seedTrustedSnapshot(noWeek.storage);
    await expect(
      resolveMobileProtectedEntryState({
        pathname: `/calendars/${alphaCalendarId}`,
        authPhase: 'signed-out',
        now: new Date('2026-04-21T11:00:00.000Z'),
        continuityStorage: noWeek.storage,
        offlineStorage: noWeek.storage
      })
    ).resolves.toMatchObject({
      routeMode: 'denied',
      continuityReason: 'calendar-not-synced',
      continuityDetail: 'No previously synced week metadata exists for that calendar on this device, so cached continuity failed closed.'
    });

    await expect(
      resolveMobileProtectedEntryState({
        pathname: `/calendars/${alphaCalendarId}`,
        authPhase: 'invalid-session',
        authReasonCode: 'INVALID_SESSION',
        now: new Date('2026-04-21T11:00:00.000Z'),
        continuityStorage: noWeek.storage,
        offlineStorage: noWeek.storage
      })
    ).resolves.toMatchObject({
      routeMode: 'denied',
      denialReasonCode: 'INVALID_SESSION',
      continuityReason: null
    });
  });
});
