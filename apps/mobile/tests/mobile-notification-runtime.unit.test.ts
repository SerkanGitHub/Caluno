import { afterEach, describe, expect, it } from 'vitest';
import {
  createMobileOfflineRepository,
  type MobileOfflineStorage,
  type MobileOfflineRepository
} from '../src/lib/offline/repository';
import {
  createMobileNotificationRuntime,
  type MobileNotificationRuntime
} from '../src/lib/notifications/runtime';
import type {
  LocalNotificationCancelResult,
  LocalNotificationPendingResult,
  LocalNotificationPermissionResult,
  LocalNotificationScheduleResult,
  MobileLocalNotificationReminder,
  MobilePendingLocalNotification,
  MobileLocalNotificationsAdapter
} from '../src/lib/notifications/local-notifications';
import type {
  MobilePushNotificationsAdapter,
  PushPermissionResult,
  PushRegistrationResult
} from '../src/lib/notifications/push-notifications';
import type { NotificationPreferenceWriteResult, MobileNotificationTransport } from '../src/lib/notifications/transport';
import type {
  DeviceCalendarNotificationPreference,
  NotificationTransportSnapshot
} from '../src/lib/notifications/types';
import type { OfflineScheduleWeekSnapshot } from '@repo/caluno-core/offline/types';
import type { MobileNetworkAdapter, MobileNetworkStatus } from '../src/lib/offline/network';
import type { MobileAppLifecycleAdapter, MobileAppLifecycleEvent } from '../src/lib/offline/app-lifecycle';

const userId = 'user-mobile';
const installationId = '11111111-1111-4111-8111-111111111111';
const alphaCalendarId = 'aaaaaaaa-aaaa-4111-8111-111111111111';
const betaCalendarId = 'bbbbbbbb-bbbb-4222-8222-222222222222';

afterEach(async () => {
  // Per-test runtimes are explicitly destroyed.
});

function createAsyncStorage() {
  const values = new Map<string, string>();
  const storage: MobileOfflineStorage = {
    async get(key) {
      return values.get(key) ?? null;
    },
    async set(key, value) {
      values.set(key, value);
    },
    async remove(key) {
      values.delete(key);
    },
    async keys() {
      return Array.from(values.keys());
    }
  };

  return { storage, values };
}

class FakeLocalNotificationsAdapter implements MobileLocalNotificationsAdapter {
  pending = new Map<number, MobilePendingLocalNotification>();
  scheduleCalls: number[][] = [];
  cancelCalls: number[][] = [];

  constructor(
    public permissionResult: LocalNotificationPermissionResult,
    private failures: {
      pending?: LocalNotificationPendingResult;
      schedule?: LocalNotificationScheduleResult;
      cancel?: LocalNotificationCancelResult;
    } = {}
  ) {}

  async getPermissionState() {
    return this.permissionResult;
  }

  async listPending() {
    if (this.failures.pending) {
      return this.failures.pending;
    }

    return {
      ok: true,
      notifications: Array.from(this.pending.values()).sort((left, right) => left.id - right.id),
      malformedCount: 0
    } satisfies LocalNotificationPendingResult;
  }

  async scheduleReminders(reminders: MobileLocalNotificationReminder[]) {
    if (this.failures.schedule) {
      return this.failures.schedule;
    }

    if (reminders.length > 0) {
      this.scheduleCalls.push(reminders.map((reminder) => reminder.id));
    }

    for (const reminder of reminders) {
      this.pending.set(reminder.id, {
        id: reminder.id,
        calendarId: reminder.calendarId,
        shiftId: reminder.shiftId,
        scheduledAt: reminder.scheduledAt,
        targetPath: reminder.targetPath
      });
    }

    return {
      ok: true,
      scheduledIds: reminders.map((reminder) => reminder.id)
    } satisfies LocalNotificationScheduleResult;
  }

  async cancelNotifications(ids: number[]) {
    if (this.failures.cancel) {
      return this.failures.cancel;
    }

    if (ids.length > 0) {
      this.cancelCalls.push(ids);
    }

    for (const id of ids) {
      this.pending.delete(id);
    }

    return {
      ok: true,
      canceledIds: ids
    } satisfies LocalNotificationCancelResult;
  }

  async subscribeToActions() {
    return async () => {
      // no-op
    };
  }
}

class FakePushNotificationsAdapter implements MobilePushNotificationsAdapter {
  constructor(
    public permissionResult: PushPermissionResult,
    public registrationResult: PushRegistrationResult
  ) {}

  async getPermissionState() {
    return this.permissionResult;
  }

  async ensureRegistration() {
    return this.registrationResult;
  }

  async subscribeToActions() {
    return async () => {
      // no-op
    };
  }
}

class FakeTransport implements MobileNotificationTransport {
  writeHistory: Array<{
    calendarId: string;
    desiredEnabled: boolean;
    remoteSubscription: DeviceCalendarNotificationPreference['remoteSubscription'];
    remoteSubscriptionReason: DeviceCalendarNotificationPreference['remoteSubscriptionReason'];
  }> = [];

  constructor(public snapshot: NotificationTransportSnapshot) {}

  async loadPreferences() {
    return this.snapshot;
  }

  async updatePreference(params: {
    calendarId: string;
    desiredEnabled: boolean;
    remoteSubscription: DeviceCalendarNotificationPreference['remoteSubscription'];
    remoteSubscriptionReason?: DeviceCalendarNotificationPreference['remoteSubscriptionReason'];
    registration?: { pushToken?: string | null; pushProvider?: string | null; devicePlatform?: string | null };
    permittedCalendarIds?: string[] | null;
  }) {
    this.writeHistory.push({
      calendarId: params.calendarId,
      desiredEnabled: params.desiredEnabled,
      remoteSubscription: params.remoteSubscription,
      remoteSubscriptionReason: params.remoteSubscriptionReason ?? null
    });

    const nextPreference: DeviceCalendarNotificationPreference = {
      installationId,
      calendarId: params.calendarId,
      desiredEnabled: params.desiredEnabled,
      remoteSubscription: params.remoteSubscription,
      remoteSubscriptionReason: params.remoteSubscriptionReason ?? null,
      syncedAt: '2026-04-22T10:06:00.000Z',
      createdAt: '2026-04-22T10:06:00.000Z',
      updatedAt: '2026-04-22T10:06:00.000Z'
    };

    const preferences = this.snapshot.preferences.filter((preference) => preference.calendarId !== params.calendarId);
    preferences.push(nextPreference);
    preferences.sort((left, right) => left.calendarId.localeCompare(right.calendarId));
    this.snapshot = {
      ...this.snapshot,
      ok: true,
      phase: params.remoteSubscription === 'syncing' ? 'syncing-preference' : 'ready',
      reason: params.remoteSubscriptionReason ?? null,
      detail: 'Trusted per-device notification preference wrote successfully.',
      preferences
    } satisfies NotificationTransportSnapshot;

    return {
      ok: true,
      installationStatus: this.snapshot.installationStatus,
      phase: this.snapshot.phase,
      reason: this.snapshot.reason,
      detail: this.snapshot.detail,
      installation: this.snapshot.installation,
      preferences: this.snapshot.preferences,
      preference: nextPreference
    } satisfies Extract<NotificationPreferenceWriteResult, { ok: true }>;
  }
}

class FakeNetworkAdapter implements MobileNetworkAdapter {
  private listeners = new Set<(status: MobileNetworkStatus) => void | Promise<void>>();

  constructor(private current: MobileNetworkStatus) {}

  async getCurrentStatus() {
    return this.current;
  }

  async subscribe(listener: (status: MobileNetworkStatus) => void | Promise<void>) {
    this.listeners.add(listener);
    return async () => {
      this.listeners.delete(listener);
    };
  }

  async emit(status: MobileNetworkStatus) {
    this.current = status;
    await Promise.all(Array.from(this.listeners).map((listener) => listener(status)));
  }
}

class FakeLifecycleAdapter implements MobileAppLifecycleAdapter {
  private listeners = new Set<(event: MobileAppLifecycleEvent) => void | Promise<void>>();

  async subscribe(listener: (event: MobileAppLifecycleEvent) => void | Promise<void>) {
    this.listeners.add(listener);
    return async () => {
      this.listeners.delete(listener);
    };
  }

  async emit(event: MobileAppLifecycleEvent) {
    await Promise.all(Array.from(this.listeners).map((listener) => listener(event)));
  }
}

function createTransportSnapshot(
  preferences: Array<Partial<DeviceCalendarNotificationPreference> & Pick<DeviceCalendarNotificationPreference, 'calendarId'>>
): NotificationTransportSnapshot {
  return {
    ok: true,
    installationStatus: 'ready',
    phase: 'ready',
    reason: null,
    detail: 'Trusted per-device notification preferences loaded successfully.',
    installation: {
      installationId,
      pushProvider: 'apns',
      devicePlatform: 'ios',
      tokenLastRotatedAt: '2026-04-22T10:05:00.000Z',
      createdAt: '2026-04-22T10:00:00.000Z',
      updatedAt: '2026-04-22T10:05:00.000Z'
    },
    preferences: preferences.map((preference) => ({
      installationId,
      desiredEnabled: false,
      remoteSubscription: 'unsubscribed',
      remoteSubscriptionReason: null,
      syncedAt: '2026-04-22T10:06:00.000Z',
      createdAt: '2026-04-22T10:06:00.000Z',
      updatedAt: '2026-04-22T10:06:00.000Z',
      ...preference
    }))
  } satisfies NotificationTransportSnapshot;
}

function grantedLocalPermission(): LocalNotificationPermissionResult {
  return {
    ok: true,
    permission: 'granted',
    detail: 'Local notification permission read completed successfully.'
  };
}

function deniedLocalPermission(): LocalNotificationPermissionResult {
  return {
    ok: true,
    permission: 'denied',
    detail: 'Local notification permission read completed successfully.'
  };
}

function grantedPushPermission(): PushPermissionResult {
  return {
    ok: true,
    permission: 'granted',
    detail: 'Push notification permission read completed successfully.'
  };
}

function successfulPushRegistration(): PushRegistrationResult {
  return {
    ok: true,
    permission: 'granted',
    registration: {
      pushToken: 'token-1',
      pushProvider: 'apns',
      devicePlatform: 'ios'
    },
    detail: 'Push registration completed successfully.'
  };
}

function permissionDeniedPushRegistration(): PushRegistrationResult {
  return {
    ok: false,
    permission: 'denied',
    reason: 'permission-denied',
    detail: 'Push registration stayed disabled because the device denied notification permission.'
  };
}

function failedPushRegistration(): PushRegistrationResult {
  return {
    ok: false,
    permission: 'granted',
    reason: 'registration-failed',
    detail: 'APNS registration failed.'
  };
}

async function seedSnapshot(
  repository: MobileOfflineRepository,
  params: {
    calendarId: string;
    shiftId: string;
    startAt: string;
    weekStart?: string;
  }
) {
  const snapshot: OfflineScheduleWeekSnapshot = {
    scope: {
      userId,
      calendarId: params.calendarId,
      weekStart: params.weekStart ?? '2026-04-21'
    },
    visibleWeek: {
      start: params.weekStart ?? '2026-04-21',
      endExclusive: '2026-04-28',
      startAt: `${params.weekStart ?? '2026-04-21'}T00:00:00.000Z`,
      endAt: '2026-04-28T00:00:00.000Z',
      requestedStart: params.weekStart ?? '2026-04-21',
      source: 'query',
      reason: null,
      dayKeys: ['2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24', '2026-04-25', '2026-04-26', '2026-04-27']
    },
    shifts: [
      {
        id: params.shiftId,
        calendarId: params.calendarId,
        seriesId: null,
        title: 'Opening shift',
        startAt: params.startAt,
        endAt: '2026-04-22T10:00:00.000Z',
        occurrenceIndex: null,
        sourceKind: 'single'
      }
    ],
    cachedAt: '2026-04-22T10:05:00.000Z',
    origin: 'server-sync'
  };

  const result = await repository.putWeekSnapshot(snapshot);
  expect(result).toEqual({ ok: true });
}

async function createRuntime(params: {
  repository: MobileOfflineRepository;
  transport: FakeTransport;
  local: FakeLocalNotificationsAdapter;
  push: FakePushNotificationsAdapter;
  network?: FakeNetworkAdapter;
  lifecycle?: FakeLifecycleAdapter;
}): Promise<MobileNotificationRuntime> {
  const runtime = createMobileNotificationRuntime({
    scope: { userId },
    permittedCalendarIds: [alphaCalendarId, betaCalendarId],
    repository: params.repository,
    transport: params.transport,
    localNotifications: params.local,
    pushNotifications: params.push,
    network: params.network ?? new FakeNetworkAdapter({ connected: true, source: 'capacitor-network' }),
    lifecycle: params.lifecycle ?? new FakeLifecycleAdapter(),
    now: () => new Date('2026-04-22T08:00:00.000Z')
  });

  await runtime.initialize();
  return runtime;
}

describe('mobile notification runtime', () => {
  it('resyncs deterministic reminder ids on resume without duplicating scheduled notifications', async () => {
    const { storage } = createAsyncStorage();
    const repository = createMobileOfflineRepository({ storage });
    await seedSnapshot(repository, {
      calendarId: alphaCalendarId,
      shiftId: 'shift-alpha',
      startAt: '2026-04-22T09:00:00.000Z'
    });

    const local = new FakeLocalNotificationsAdapter(grantedLocalPermission());
    const push = new FakePushNotificationsAdapter(grantedPushPermission(), successfulPushRegistration());
    const transport = new FakeTransport(
      createTransportSnapshot([
        { calendarId: alphaCalendarId, desiredEnabled: true, remoteSubscription: 'subscribed' }
      ])
    );
    const lifecycle = new FakeLifecycleAdapter();

    const runtime = await createRuntime({ repository, transport, local, push, lifecycle });
    expect(local.scheduleCalls).toHaveLength(1);
    expect(local.pending.size).toBe(1);

    await lifecycle.emit('resume');

    expect(local.scheduleCalls).toHaveLength(1);
    expect(local.pending.size).toBe(1);
    expect(runtime.getState().calendars[alphaCalendarId]).toMatchObject({
      desiredEnabled: true,
      localReminders: 'ready',
      localReminderCount: 1,
      remoteSubscription: 'subscribed',
      phase: 'ready'
    });

    await runtime.destroy();
  });

  it('keeps desired intent explicit when permission is denied', async () => {
    const { storage } = createAsyncStorage();
    const repository = createMobileOfflineRepository({ storage });
    await seedSnapshot(repository, {
      calendarId: alphaCalendarId,
      shiftId: 'shift-alpha',
      startAt: '2026-04-22T09:00:00.000Z'
    });

    const local = new FakeLocalNotificationsAdapter(deniedLocalPermission());
    const push = new FakePushNotificationsAdapter(grantedPushPermission(), permissionDeniedPushRegistration());
    const transport = new FakeTransport(
      createTransportSnapshot([
        { calendarId: alphaCalendarId, desiredEnabled: true, remoteSubscription: 'syncing' }
      ])
    );

    const runtime = await createRuntime({ repository, transport, local, push });

    expect(runtime.getState().calendars[alphaCalendarId]).toMatchObject({
      desiredEnabled: true,
      permission: 'denied',
      localReminders: 'blocked',
      remoteSubscription: 'degraded',
      remoteReason: 'permission-denied',
      phase: 'degraded',
      reason: 'permission-denied'
    });
    expect(transport.writeHistory).toContainEqual({
      calendarId: alphaCalendarId,
      desiredEnabled: true,
      remoteSubscription: 'degraded',
      remoteSubscriptionReason: 'permission-denied'
    });

    await runtime.destroy();
  });

  it('preserves local reminder readiness when push registration fails', async () => {
    const { storage } = createAsyncStorage();
    const repository = createMobileOfflineRepository({ storage });
    await seedSnapshot(repository, {
      calendarId: alphaCalendarId,
      shiftId: 'shift-alpha',
      startAt: '2026-04-22T09:00:00.000Z'
    });

    const local = new FakeLocalNotificationsAdapter(grantedLocalPermission());
    const push = new FakePushNotificationsAdapter(grantedPushPermission(), failedPushRegistration());
    const transport = new FakeTransport(
      createTransportSnapshot([
        { calendarId: alphaCalendarId, desiredEnabled: true, remoteSubscription: 'syncing' }
      ])
    );

    const runtime = await createRuntime({ repository, transport, local, push });

    expect(runtime.getState().calendars[alphaCalendarId]).toMatchObject({
      desiredEnabled: true,
      localReminders: 'ready',
      localReminderCount: 1,
      remoteSubscription: 'degraded',
      remoteReason: 'registration-failed',
      phase: 'degraded'
    });

    await runtime.destroy();
  });

  it('disables one calendar without canceling sibling reminders', async () => {
    const { storage } = createAsyncStorage();
    const repository = createMobileOfflineRepository({ storage });
    await seedSnapshot(repository, {
      calendarId: alphaCalendarId,
      shiftId: 'shift-alpha',
      startAt: '2026-04-22T09:00:00.000Z'
    });
    await seedSnapshot(repository, {
      calendarId: betaCalendarId,
      shiftId: 'shift-beta',
      startAt: '2026-04-22T11:00:00.000Z'
    });

    const local = new FakeLocalNotificationsAdapter(grantedLocalPermission());
    const push = new FakePushNotificationsAdapter(grantedPushPermission(), successfulPushRegistration());
    const transport = new FakeTransport(
      createTransportSnapshot([
        { calendarId: alphaCalendarId, desiredEnabled: true, remoteSubscription: 'subscribed' },
        { calendarId: betaCalendarId, desiredEnabled: true, remoteSubscription: 'subscribed' }
      ])
    );

    const runtime = await createRuntime({ repository, transport, local, push });
    const alphaPendingIds = Array.from(local.pending.values())
      .filter((notification) => notification.calendarId === alphaCalendarId)
      .map((notification) => notification.id);
    const betaPendingIds = Array.from(local.pending.values())
      .filter((notification) => notification.calendarId === betaCalendarId)
      .map((notification) => notification.id);
    expect(alphaPendingIds).toHaveLength(1);
    expect(betaPendingIds).toHaveLength(1);

    await runtime.setCalendarEnabled({ calendarId: alphaCalendarId, desiredEnabled: false });

    expect(Array.from(local.pending.values()).map((notification) => notification.calendarId)).toEqual([betaCalendarId]);
    expect(local.cancelCalls.some((ids) => ids.includes(alphaPendingIds[0]))).toBe(true);
    expect(local.cancelCalls.some((ids) => ids.includes(betaPendingIds[0]))).toBe(false);
    expect(runtime.getState().calendars[alphaCalendarId]).toMatchObject({
      desiredEnabled: false,
      remoteSubscription: 'unsubscribed'
    });
    expect(runtime.getState().calendars[betaCalendarId]).toMatchObject({
      desiredEnabled: true,
      localReminderCount: 1
    });

    await runtime.destroy();
  });

  it('degrades explicitly when trusted week metadata is malformed', async () => {
    const { storage, values } = createAsyncStorage();
    values.set(
      `caluno.mobile.week-metadata.v1:${userId}:${alphaCalendarId}:2026-04-21`,
      JSON.stringify({
        userId,
        calendarId: alphaCalendarId,
        weekStart: '2026-04-21',
        syncedAt: '2026-04-22T10:05:00.000Z',
        source: 'server-sync'
      })
    );
    values.set(`caluno.mobile.week-snapshot.v1:${userId}:${alphaCalendarId}:2026-04-21`, '{bad json');
    const repository = createMobileOfflineRepository({ storage });

    const local = new FakeLocalNotificationsAdapter(grantedLocalPermission());
    const push = new FakePushNotificationsAdapter(grantedPushPermission(), successfulPushRegistration());
    const transport = new FakeTransport(
      createTransportSnapshot([
        { calendarId: alphaCalendarId, desiredEnabled: true, remoteSubscription: 'subscribed' }
      ])
    );

    const runtime = await createRuntime({ repository, transport, local, push });

    expect(runtime.getState().calendars[alphaCalendarId]).toMatchObject({
      desiredEnabled: true,
      localReminders: 'degraded',
      localReason: 'schedule-unavailable',
      localReminderCount: 0,
      phase: 'degraded'
    });
    expect(local.scheduleCalls).toHaveLength(0);
    expect(values.has(`caluno.mobile.week-metadata.v1:${userId}:${alphaCalendarId}:2026-04-21`)).toBe(false);

    await runtime.destroy();
  });
});


import { vi } from 'vitest';
import { createTrustedMobileScheduleTransport } from '../src/lib/offline/transport';
import type { ReconnectDrainActionRequest } from '@repo/caluno-core/offline/sync-engine';

const scheduleCalendarId = 'ffffffff-ffff-4111-8111-111111111111';
const scheduleShiftId = 'aaaaaaaa-1111-4111-8111-111111111111';
const scheduleUserId = 'bbbbbbbb-2222-4222-8222-222222222222';

function createScheduleFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set('shiftId', scheduleShiftId);
  fd.set('title', 'Morning shift');
  fd.set('startAt', '2026-04-22T08:00:00.000Z');
  fd.set('endAt', '2026-04-22T16:00:00.000Z');
  for (const [k, v] of Object.entries(overrides)) {
    fd.set(k, v);
  }
  return fd;
}

function createScheduleRequest(action: 'delete' | 'edit'): ReconnectDrainActionRequest {
  const formData = createScheduleFormData();
  return {
    entryId: `entry-${action}`,
    action,
    actionKey: action === 'delete' ? 'deleteShift' : 'editShift',
    url: `/calendars/${scheduleCalendarId}/shifts`,
    formData,
    visibleWeekStart: '2026-04-21',
    shiftId: scheduleShiftId,
    fields: Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [key, String(value)]))
  };
}

function buildSuccessShiftRow() {
  return [
    {
      id: scheduleShiftId,
      calendar_id: scheduleCalendarId,
      series_id: null,
      title: 'Morning shift',
      start_at: '2026-04-22T08:00:00.000Z',
      end_at: '2026-04-22T16:00:00.000Z',
      occurrence_index: null,
      source_kind: 'single' as const
    }
  ];
}

/**
 * Build a mock Supabase client for the mobile schedule transport.
 *
 * The transport uses these query chains:
 *   1. resolveCalendarWriteScope:
 *        .from('calendars').select(...).eq('id', calendarId)        → resolves
 *        .from('group_memberships').select(...).eq(...).eq(...)      → resolves
 *   2. resolveShiftWriteAuthority:
 *        .from('shifts').select(...).eq('id', shiftId)              → resolves
 *   3. delete/update write:
 *        .from('shifts').delete().eq().eq().select()                 → resolves
 *        .from('shifts').update({}).eq().eq().select()              → resolves
 */
function createTransportClient(options: {
  shiftRow: ReturnType<typeof buildSuccessShiftRow>;
  dispatchResult: { data: unknown; error: { message: string } | null } | 'throw';
  calendarFail?: boolean;
}) {
  const dispatchInvoke = vi.fn(async () => {
    if (options.dispatchResult === 'throw') {
      throw new Error('network unavailable');
    }
    return options.dispatchResult;
  });

  const calendarRow = [{ id: scheduleCalendarId, group_id: 'group-1', name: 'Cal', is_default: false }];
  const membershipRow = [{ group_id: 'group-1', role: 'owner' as const }];
  const shiftRow = options.shiftRow;

  function makeCalendarChain() {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: calendarRow, error: null })
    };
  }

  function makeMembershipChain() {
    // .select().eq('user_id',...).eq('group_id',...) → resolves on 2nd eq
    let eqCount = 0;
    const chain: { select: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn> } = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => {
        eqCount++;
        return eqCount >= 2 ? Promise.resolve({ data: membershipRow, error: null }) : chain;
      })
    };
    return chain;
  }

  function makeShiftsChain() {
    // This chain handles TWO patterns:
    // A) Read (resolveShiftWriteAuthority): .select(...).eq('id', shiftId)
    //    → second call resolves
    // B) Write (delete/update): .<op>().eq(...).eq(...).select(...)
    //    → select() at end resolves

    // We track "mode" based on whether delete/update was called first.
    let mode: 'read' | 'write' = 'read';
    let readEqCount = 0;

    const writeInner: { eq: ReturnType<typeof vi.fn>; select: ReturnType<typeof vi.fn> } = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: shiftRow, error: null })
    };
    // Make writeInner.eq return writeInner for chaining
    writeInner.eq.mockReturnValue(writeInner);

    const chain: {
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      order: ReturnType<typeof vi.fn>;
      lt: ReturnType<typeof vi.fn>;
      gt: ReturnType<typeof vi.fn>;
    } = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => {
        if (mode === 'read') {
          readEqCount++;
          return readEqCount >= 1 ? Promise.resolve({ data: shiftRow, error: null }) : chain;
        }
        // write mode eq chains back
        return writeInner;
      }),
      delete: vi.fn().mockImplementation(() => {
        mode = 'write';
        return writeInner;
      }),
      update: vi.fn().mockImplementation(() => {
        mode = 'write';
        return writeInner;
      }),
      order: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis()
    };

    return chain;
  }

  return {
    client: {
      auth: { getSession: vi.fn(), getUser: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn(), onAuthStateChange: vi.fn() },
      from: vi.fn((table: string) => {
        if (table === 'calendars') {
          if (options.calendarFail) {
            return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'forbidden' } }) };
          }
          return makeCalendarChain();
        }
        if (table === 'group_memberships') {
          return makeMembershipChain();
        }
        // shifts and everything else
        return makeShiftsChain();
      }),
      rpc: vi.fn(),
      functions: { invoke: dispatchInvoke }
    },
    dispatchInvoke
  };
}

describe('mobile schedule transport — dispatch wiring', () => {
  it('dispatch degrades without affecting a successful write outcome (degraded dispatch preserves canonical result)', async () => {
    const { client, dispatchInvoke } = createTransportClient({
      shiftRow: buildSuccessShiftRow(),
      dispatchResult: 'throw'
    });

    const transport = createTrustedMobileScheduleTransport({
      client: client as never,
      userId: scheduleUserId,
      calendarId: scheduleCalendarId,
      timeoutMs: 100
    });

    const outcome = await transport.submitAction(createScheduleRequest('delete'));

    // Canonical write outcome must be success even though dispatch threw
    expect(outcome.type).toBe('success');
    if (outcome.type === 'success') {
      expect(outcome.state.reason).toBe('SHIFT_DELETED');
    }

    // Allow dispatch promise to settle then verify it was attempted
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(dispatchInvoke).toHaveBeenCalledOnce();
  });

  it('failed mobile writes never dispatch', async () => {
    const { client, dispatchInvoke } = createTransportClient({
      shiftRow: buildSuccessShiftRow(),
      dispatchResult: { data: {}, error: null },
      calendarFail: true
    });

    const transport = createTrustedMobileScheduleTransport({
      client: client as never,
      userId: scheduleUserId,
      calendarId: scheduleCalendarId,
      timeoutMs: 100
    });

    const outcome = await transport.submitAction(createScheduleRequest('edit'));

    expect(outcome.type).toBe('failure');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(dispatchInvoke).not.toHaveBeenCalled();
  });

  it('reconnect-drained writes dispatch exactly once per canonical success path (replay-safe)', async () => {
    const { client, dispatchInvoke } = createTransportClient({
      shiftRow: buildSuccessShiftRow(),
      dispatchResult: { data: {}, error: null }
    });

    const transport = createTrustedMobileScheduleTransport({
      client: client as never,
      userId: scheduleUserId,
      calendarId: scheduleCalendarId,
      timeoutMs: 100
    });

    const makeRequest = (): ReconnectDrainActionRequest => createScheduleRequest('delete');

    const outcome1 = await transport.submitAction(makeRequest());
    const outcome2 = await transport.submitAction(makeRequest());

    expect(outcome1.type).toBe('success');
    expect(outcome2.type).toBe('success');

    await new Promise((resolve) => setTimeout(resolve, 20));

    // Each successful write dispatches exactly once — two writes = two dispatches
    expect(dispatchInvoke).toHaveBeenCalledTimes(2);
  });
});
