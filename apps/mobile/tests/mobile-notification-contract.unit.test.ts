import { describe, expect, it, vi } from 'vitest';
import {
  getOrCreateNotificationInstallation,
  materializeStoredNotificationInstallation,
  type DeviceInstallationStorage
} from '../src/lib/notifications/device-installation';
import {
  createMobileNotificationTransport,
  loadDeviceNotificationPreferences,
  updateDeviceNotificationPreference
} from '../src/lib/notifications/transport';
import { shapeCalendarNotificationCollection } from '../src/lib/notifications/state';
import type { NotificationReasonCode } from '../src/lib/notifications/types';

const installationId = '11111111-1111-4111-8111-111111111111';
const rotatedInstallationId = '22222222-2222-4222-8222-222222222222';
const alphaCalendarId = 'aaaaaaaa-aaaa-4111-8111-111111111111';
const betaCalendarId = 'bbbbbbbb-bbbb-4222-8222-222222222222';
const rogueCalendarId = 'cccccccc-cccc-4333-8333-333333333333';

type RpcResponse = {
  data: unknown;
  error: { message: string } | null;
};

function createAsyncStorage() {
  const values = new Map<string, string>();
  const storage: DeviceInstallationStorage = {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    remove: vi.fn(async (key: string) => {
      values.delete(key);
    })
  };

  return { storage, values };
}

function createFailingStorage(message: string): DeviceInstallationStorage {
  return {
    get: vi.fn(async () => {
      throw new Error(message);
    }),
    set: vi.fn(async () => {
      throw new Error(message);
    })
  };
}

function createRpcClient(responses: Record<string, RpcResponse>) {
  return {
    rpc(fn: string, args: Record<string, unknown>) {
      const key = `${fn}|${JSON.stringify(args)}`;
      return Promise.resolve((responses[key] ?? responses[fn] ?? { data: null, error: null }) as RpcResponse);
    }
  };
}

function installationRow(id = installationId) {
  return [
    {
      installation_id: id,
      push_provider: 'expo',
      device_platform: 'ios',
      token_last_rotated_at: '2026-04-22T10:05:00.000Z',
      created_at: '2026-04-22T10:00:00.000Z',
      updated_at: '2026-04-22T10:05:00.000Z'
    }
  ];
}

function preferenceRow(params: {
  calendarId: string;
  desiredEnabled: boolean;
  remoteSubscriptionStatus: string;
  remoteSubscriptionReason?: NotificationReasonCode | null;
}) {
  return {
    installation_id: installationId,
    calendar_id: params.calendarId,
    desired_enabled: params.desiredEnabled,
    remote_subscription_status: params.remoteSubscriptionStatus,
    remote_subscription_reason: params.remoteSubscriptionReason ?? null,
    synced_at: '2026-04-22T10:06:00.000Z',
    created_at: '2026-04-22T10:06:00.000Z',
    updated_at: '2026-04-22T10:06:00.000Z'
  };
}

async function seedInstallation(storage: DeviceInstallationStorage) {
  const result = await getOrCreateNotificationInstallation({
    storage,
    now: new Date('2026-04-22T10:00:00.000Z'),
    generateInstallationId: () => installationId
  });

  expect(result).toMatchObject({
    ok: true,
    installation: {
      installationId
    }
  });
}

describe('mobile notification contract', () => {
  it('persists one installation id across reloads and rotates the push token on the same installation', async () => {
    const { storage } = createAsyncStorage();

    const first = await getOrCreateNotificationInstallation({
      storage,
      now: new Date('2026-04-22T10:00:00.000Z'),
      generateInstallationId: () => installationId,
      registration: {
        pushToken: 'ExponentPushToken[first]',
        pushProvider: 'expo',
        devicePlatform: 'ios'
      }
    });

    expect(first).toMatchObject({
      ok: true,
      created: true,
      repaired: false,
      installation: {
        installationId,
        pushProvider: 'expo',
        devicePlatform: 'ios'
      },
      registration: {
        pushToken: 'ExponentPushToken[first]'
      }
    });

    const second = await getOrCreateNotificationInstallation({
      storage,
      now: new Date('2026-04-22T10:30:00.000Z'),
      generateInstallationId: () => rotatedInstallationId,
      registration: {
        pushToken: 'ExponentPushToken[rotated]',
        pushProvider: 'expo',
        devicePlatform: 'ios'
      }
    });

    expect(second).toMatchObject({
      ok: true,
      created: false,
      tokenRotated: true,
      installation: {
        installationId,
        tokenLastRotatedAt: '2026-04-22T10:30:00.000Z'
      },
      registration: {
        pushToken: 'ExponentPushToken[rotated]'
      }
    });

    const third = await getOrCreateNotificationInstallation({
      storage,
      now: new Date('2026-04-22T11:00:00.000Z'),
      generateInstallationId: () => rotatedInstallationId
    });

    expect(third).toMatchObject({
      ok: true,
      created: false,
      installation: {
        installationId
      },
      registration: {
        pushToken: 'ExponentPushToken[rotated]'
      }
    });
  });

  it('repairs malformed stored installation ids only through the typed helper', async () => {
    const { storage, values } = createAsyncStorage();
    values.set(
      'caluno.mobile.notification-installation.v1',
      JSON.stringify({
        installationId: 'not-a-uuid',
        pushToken: null,
        pushProvider: null,
        devicePlatform: 'ios',
        tokenLastRotatedAt: null,
        createdAt: '2026-04-22T10:00:00.000Z',
        updatedAt: '2026-04-22T10:00:00.000Z'
      })
    );

    const repaired = await getOrCreateNotificationInstallation({
      storage,
      now: new Date('2026-04-22T10:10:00.000Z'),
      generateInstallationId: () => installationId
    });

    expect(repaired).toMatchObject({
      ok: true,
      created: true,
      repaired: true,
      installation: {
        installationId
      }
    });

    const materialized = materializeStoredNotificationInstallation(values.get('caluno.mobile.notification-installation.v1') ?? null);
    expect(materialized).toMatchObject({
      ok: true,
      record: {
        installationId
      }
    });
  });

  it('fails closed for storage failures and incomplete registration payloads', async () => {
    await expect(
      getOrCreateNotificationInstallation({
        storage: createFailingStorage('Preferences unavailable')
      })
    ).resolves.toMatchObject({
      ok: false,
      reason: 'storage-unavailable'
    });

    await expect(
      getOrCreateNotificationInstallation({
        storage: createAsyncStorage().storage,
        registration: {
          pushProvider: 'expo'
        }
      })
    ).resolves.toMatchObject({
      ok: false,
      reason: 'installation-registration-invalid'
    });
  });

  it('loads trusted preferences and rejects duplicate or out-of-scope rows fail closed', async () => {
    const { storage } = createAsyncStorage();
    await seedInstallation(storage);
    const registrationArgs = {
      p_installation_id: installationId,
      p_push_token: null,
      p_push_provider: null,
      p_device_platform: null
    };
    const client = createRpcClient({
      [`register_notification_installation|${JSON.stringify(registrationArgs)}`]: {
        data: installationRow(),
        error: null
      },
      [`list_device_calendar_notification_preferences|${JSON.stringify({
        p_installation_id: installationId,
        p_calendar_ids: [alphaCalendarId, betaCalendarId]
      })}`]: {
        data: [
          preferenceRow({ calendarId: alphaCalendarId, desiredEnabled: true, remoteSubscriptionStatus: 'subscribed' }),
          preferenceRow({ calendarId: betaCalendarId, desiredEnabled: false, remoteSubscriptionStatus: 'unsubscribed' })
        ],
        error: null
      }
    });

    const loaded = await loadDeviceNotificationPreferences({
      client: client as never,
      permittedCalendarIds: [alphaCalendarId, betaCalendarId],
      installationStorage: storage,
      timeoutMs: 50,
      registration: {}
    });

    expect(loaded).toMatchObject({
      ok: true,
      installationStatus: 'ready',
      preferences: [
        { calendarId: alphaCalendarId, desiredEnabled: true, remoteSubscription: 'subscribed' },
        { calendarId: betaCalendarId, desiredEnabled: false, remoteSubscription: 'unsubscribed' }
      ]
    });

    const duplicateClient = createRpcClient({
      register_notification_installation: {
        data: installationRow(),
        error: null
      },
      list_device_calendar_notification_preferences: {
        data: [
          preferenceRow({ calendarId: alphaCalendarId, desiredEnabled: true, remoteSubscriptionStatus: 'subscribed' }),
          preferenceRow({ calendarId: alphaCalendarId, desiredEnabled: false, remoteSubscriptionStatus: 'degraded', remoteSubscriptionReason: 'sync-failed' })
        ],
        error: null
      }
    });

    await expect(
      loadDeviceNotificationPreferences({
        client: duplicateClient as never,
        installationStorage: storage,
        permittedCalendarIds: [alphaCalendarId, betaCalendarId],
        timeoutMs: 50
      })
    ).resolves.toMatchObject({
      ok: false,
      reason: 'duplicate-preference-rows'
    });

    const rogueClient = createRpcClient({
      register_notification_installation: {
        data: installationRow(),
        error: null
      },
      list_device_calendar_notification_preferences: {
        data: [preferenceRow({ calendarId: rogueCalendarId, desiredEnabled: true, remoteSubscriptionStatus: 'subscribed' })],
        error: null
      }
    });

    await expect(
      loadDeviceNotificationPreferences({
        client: rogueClient as never,
        installationStorage: storage,
        permittedCalendarIds: [alphaCalendarId, betaCalendarId],
        timeoutMs: 50
      })
    ).resolves.toMatchObject({
      ok: false,
      reason: 'calendar-out-of-scope'
    });
  });

  it('rejects out-of-scope writes, surfaces persistence denials and timeouts, and keeps malformed writes closed', async () => {
    const { storage } = createAsyncStorage();
    await seedInstallation(storage);
    const baseResponses = {
      register_notification_installation: {
        data: installationRow(),
        error: null
      }
    };

    await expect(
      updateDeviceNotificationPreference({
        client: createRpcClient(baseResponses) as never,
        installationStorage: storage,
        permittedCalendarIds: [alphaCalendarId],
        calendarId: '',
        desiredEnabled: true,
        remoteSubscription: 'syncing',
        timeoutMs: 50
      })
    ).resolves.toMatchObject({
      ok: false,
      reason: 'calendar-id-invalid'
    });

    await expect(
      updateDeviceNotificationPreference({
        client: createRpcClient(baseResponses) as never,
        installationStorage: storage,
        permittedCalendarIds: [alphaCalendarId],
        calendarId: betaCalendarId,
        desiredEnabled: true,
        remoteSubscription: 'syncing',
        timeoutMs: 50
      })
    ).resolves.toMatchObject({
      ok: false,
      reason: 'calendar-out-of-scope'
    });

    const deniedClient = createRpcClient({
      ...baseResponses,
      set_device_calendar_notification_preference: {
        data: null,
        error: { message: 'RLS denied notification preference write' }
      }
    });

    await expect(
      updateDeviceNotificationPreference({
        client: deniedClient as never,
        installationStorage: storage,
        permittedCalendarIds: [alphaCalendarId],
        calendarId: alphaCalendarId,
        desiredEnabled: true,
        remoteSubscription: 'syncing',
        timeoutMs: 50
      })
    ).resolves.toMatchObject({
      ok: false,
      reason: 'persistence-denied'
    });

    const timeoutClient = {
      rpc(fn: string) {
        if (fn === 'register_notification_installation') {
          return Promise.resolve({ data: installationRow(), error: null });
        }

        return new Promise<RpcResponse>((resolve) => {
          setTimeout(() => resolve({ data: null, error: null }), 20);
        });
      }
    };

    await expect(
      updateDeviceNotificationPreference({
        client: timeoutClient as never,
        installationStorage: storage,
        permittedCalendarIds: [alphaCalendarId],
        calendarId: alphaCalendarId,
        desiredEnabled: true,
        remoteSubscription: 'syncing',
        timeoutMs: 5
      })
    ).resolves.toMatchObject({
      ok: false,
      reason: 'timeout'
    });

    const malformedWriteClient = createRpcClient({
      ...baseResponses,
      set_device_calendar_notification_preference: {
        data: [
          {
            installation_id: installationId,
            calendar_id: alphaCalendarId,
            desired_enabled: true,
            remote_subscription_status: 'nonsense',
            remote_subscription_reason: null,
            synced_at: '2026-04-22T10:06:00.000Z',
            created_at: '2026-04-22T10:06:00.000Z',
            updated_at: '2026-04-22T10:06:00.000Z'
          }
        ],
        error: null
      }
    });

    await expect(
      updateDeviceNotificationPreference({
        client: malformedWriteClient as never,
        installationStorage: storage,
        permittedCalendarIds: [alphaCalendarId],
        calendarId: alphaCalendarId,
        desiredEnabled: true,
        remoteSubscription: 'syncing',
        timeoutMs: 50
      })
    ).resolves.toMatchObject({
      ok: false,
      reason: 'malformed-response'
    });
  });

  it('shapes combined state without collapsing desired intent, permission, local reminders, and remote subscription', async () => {
    const states = shapeCalendarNotificationCollection({
      calendarIds: [alphaCalendarId, betaCalendarId],
      transport: {
        ok: true,
        installationStatus: 'ready',
        phase: 'ready',
        reason: null,
        detail: 'ready',
        installation: {
          installationId,
          pushProvider: 'expo',
          devicePlatform: 'ios',
          tokenLastRotatedAt: '2026-04-22T10:05:00.000Z',
          createdAt: '2026-04-22T10:00:00.000Z',
          updatedAt: '2026-04-22T10:05:00.000Z'
        },
        preferences: [
          {
            installationId,
            calendarId: alphaCalendarId,
            desiredEnabled: true,
            remoteSubscription: 'subscribed',
            remoteSubscriptionReason: null,
            syncedAt: '2026-04-22T10:06:00.000Z',
            createdAt: '2026-04-22T10:06:00.000Z',
            updatedAt: '2026-04-22T10:06:00.000Z'
          }
        ]
      },
      localStates: {
        [alphaCalendarId]: {
          permission: 'denied',
          localReminders: 'blocked',
          localReason: 'permission-denied'
        },
        [betaCalendarId]: {
          permission: 'granted',
          localReminders: 'ready',
          localReason: null
        }
      }
    });

    expect(states[alphaCalendarId]).toMatchObject({
      desiredEnabled: true,
      permission: 'denied',
      localReminders: 'blocked',
      remoteSubscription: 'subscribed',
      phase: 'degraded',
      reason: 'permission-denied'
    });

    expect(states[betaCalendarId]).toMatchObject({
      desiredEnabled: false,
      permission: 'granted',
      localReminders: 'ready',
      remoteSubscription: 'unsubscribed',
      phase: 'ready',
      reason: null
    });

    const providerIssue = shapeCalendarNotificationCollection({
      calendarIds: [alphaCalendarId],
      transport: {
        ok: true,
        installationStatus: 'ready',
        phase: 'ready',
        reason: null,
        detail: 'provider missing',
        installation: null,
        preferences: [
          {
            installationId,
            calendarId: alphaCalendarId,
            desiredEnabled: true,
            remoteSubscription: 'provider-unconfigured',
            remoteSubscriptionReason: 'provider-unconfigured',
            syncedAt: '2026-04-22T10:06:00.000Z',
            createdAt: '2026-04-22T10:06:00.000Z',
            updatedAt: '2026-04-22T10:06:00.000Z'
          }
        ]
      }
    });

    expect(providerIssue[alphaCalendarId]).toMatchObject({
      desiredEnabled: true,
      remoteSubscription: 'provider-unconfigured',
      phase: 'degraded',
      reason: 'provider-unconfigured'
    });
  });

  it('supports the higher-level transport factory with the same scoped contract', async () => {
    const { storage } = createAsyncStorage();
    await seedInstallation(storage);
    const transport = createMobileNotificationTransport({
      client: createRpcClient({
        register_notification_installation: {
          data: installationRow(),
          error: null
        },
        list_device_calendar_notification_preferences: {
          data: [preferenceRow({ calendarId: alphaCalendarId, desiredEnabled: true, remoteSubscriptionStatus: 'syncing' })],
          error: null
        },
        set_device_calendar_notification_preference: {
          data: [preferenceRow({ calendarId: alphaCalendarId, desiredEnabled: true, remoteSubscriptionStatus: 'syncing' })],
          error: null
        }
      }) as never,
      permittedCalendarIds: [alphaCalendarId],
      installationStorage: storage,
      timeoutMs: 50
    });

    await expect(transport.loadPreferences()).resolves.toMatchObject({
      ok: true,
      preferences: [{ calendarId: alphaCalendarId, remoteSubscription: 'syncing' }]
    });

    await expect(
      transport.updatePreference({
        calendarId: alphaCalendarId,
        desiredEnabled: true,
        remoteSubscription: 'syncing'
      })
    ).resolves.toMatchObject({
      ok: true,
      phase: 'syncing-preference',
      preference: { calendarId: alphaCalendarId }
    });
  });
});
