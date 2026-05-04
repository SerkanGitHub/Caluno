import type { OfflineScheduleScope } from '@repo/caluno-core/offline/types';
import {
  type MobileOfflineRepository,
  type MobileTrustedWeekSnapshotsResult
} from '$lib/offline/repository';
import { getMobileAppLifecycleAdapter, type MobileAppLifecycleAdapter } from '$lib/offline/app-lifecycle';
import { getMobileNetworkAdapter, type MobileNetworkAdapter } from '$lib/offline/network';
import {
  getMobileLocalNotificationsAdapter,
  type MobileLocalNotificationsAdapter,
  type MobilePendingLocalNotification
} from '$lib/notifications/local-notifications';
import { getMobilePushNotificationsAdapter, type MobilePushNotificationsAdapter } from '$lib/notifications/push-notifications';
import { buildReminderSchedule, diffReminderSchedule } from '$lib/notifications/scheduler';
import { shapeCalendarNotificationCollection } from '$lib/notifications/state';
import type {
  CalendarNotificationState,
  DeviceCalendarNotificationPreference,
  NotificationLocalStateInput,
  NotificationReasonCode,
  NotificationTransportSnapshot
} from '$lib/notifications/types';
import type {
  MobileNotificationTransport,
  NotificationPreferenceWriteResult
} from '$lib/notifications/transport';

export type NotificationRuntimeLocalSyncPhase = 'idle' | 'syncing' | 'ready' | 'degraded';
export type NotificationRuntimeRemoteRegistrationState = 'unknown' | 'registered' | 'denied' | 'failed' | 'unsupported';

export type MobileNotificationRuntimeCalendarState = CalendarNotificationState & {
  localSyncPhase: NotificationRuntimeLocalSyncPhase;
  localReminderCount: number;
  lastReminderResyncAt: string | null;
  remoteRegistration: NotificationRuntimeRemoteRegistrationState;
};

export type MobileNotificationRuntimeState = {
  initialized: boolean;
  syncInFlight: boolean;
  transport: NotificationTransportSnapshot;
  calendars: Record<string, MobileNotificationRuntimeCalendarState>;
  detail: string;
};

export type MobileNotificationRuntime = {
  key: string;
  initialize: () => Promise<void>;
  refresh: (params?: { requestPermissions?: boolean }) => Promise<void>;
  setCalendarEnabled: (params: { calendarId: string; desiredEnabled: boolean }) => Promise<MobileNotificationRuntimeCalendarState | null>;
  subscribe: (listener: (state: MobileNotificationRuntimeState) => void) => () => void;
  getState: () => MobileNotificationRuntimeState;
  destroy: () => Promise<void>;
};

export function createMobileNotificationRuntime(options: {
  scope: Pick<OfflineScheduleScope, 'userId'>;
  permittedCalendarIds: string[];
  repository: MobileOfflineRepository;
  transport: MobileNotificationTransport;
  localNotifications?: MobileLocalNotificationsAdapter;
  pushNotifications?: MobilePushNotificationsAdapter;
  network?: MobileNetworkAdapter;
  lifecycle?: MobileAppLifecycleAdapter;
  now?: () => Date;
}): MobileNotificationRuntime {
  const localNotifications = options.localNotifications ?? getMobileLocalNotificationsAdapter();
  const pushNotifications = options.pushNotifications ?? getMobilePushNotificationsAdapter();
  const network = options.network ?? getMobileNetworkAdapter();
  const lifecycle = options.lifecycle ?? getMobileAppLifecycleAdapter();
  const now = options.now ?? (() => new Date());
  const key = `${options.scope.userId}:${options.permittedCalendarIds.slice().sort().join(',')}`;

  let destroyed = false;
  let initialized = false;
  let online = true;
  let syncInFlight: Promise<void> | null = null;
  let removeNetworkListener: (() => Promise<void>) | null = null;
  let removeLifecycleListener: (() => Promise<void>) | null = null;
  let cachedTransport: NotificationTransportSnapshot | null = null;
  const listeners = new Set<(state: MobileNotificationRuntimeState) => void>();

  let state: MobileNotificationRuntimeState = {
    initialized: false,
    syncInFlight: false,
    transport: emptyTransportSnapshot(),
    calendars: shapeRuntimeCalendars(emptyTransportSnapshot(), options.permittedCalendarIds, {}, {}, {}),
    detail: 'Mobile notification runtime has not been initialized yet.'
  };

  function emit() {
    for (const listener of listeners) {
      listener(state);
    }
  }

  function setState(next: MobileNotificationRuntimeState) {
    state = next;
    emit();
  }

  async function writePreference(params: {
    calendarId: string;
    desiredEnabled: boolean;
    remoteSubscription: DeviceCalendarNotificationPreference['remoteSubscription'];
    remoteSubscriptionReason: NotificationReasonCode | null;
  }): Promise<NotificationPreferenceWriteResult> {
    return options.transport.updatePreference({
      calendarId: params.calendarId,
      desiredEnabled: params.desiredEnabled,
      remoteSubscription: params.remoteSubscription,
      remoteSubscriptionReason: params.remoteSubscriptionReason,
      permittedCalendarIds: options.permittedCalendarIds
    });
  }

  async function runSync(params: { requestPermissions?: boolean; transportOverride?: NotificationTransportSnapshot | null } = {}) {
    if (destroyed) {
      return;
    }

    state = {
      ...state,
      syncInFlight: true,
      detail: 'Refreshing truthful mobile notification runtime state.'
    };
    emit();

    let transportSnapshot = params.transportOverride ?? cachedTransport;
    let transportDetail = 'Trusted mobile notification runtime state refreshed.';
    let transportFailure: { reason: NotificationReasonCode; detail: string } | null = null;

    if (online || !transportSnapshot) {
      const loaded = await options.transport.loadPreferences({ permittedCalendarIds: options.permittedCalendarIds });
      if (loaded.ok) {
        transportSnapshot = loaded;
        cachedTransport = loaded;
      } else if (transportSnapshot) {
        transportFailure = {
          reason: loaded.reason ?? 'sync-failed',
          detail: loaded.detail
        };
        transportDetail = `Using cached notification state because the latest transport refresh failed: ${loaded.detail}`;
      } else {
        const failedTransport = loaded;
        setState({
          initialized: true,
          syncInFlight: false,
          transport: failedTransport,
          calendars: shapeRuntimeCalendars(failedTransport, options.permittedCalendarIds, {}, {}, {}),
          detail: failedTransport.detail
        });
        return;
      }
    }

    if (!transportSnapshot) {
      const empty = emptyTransportSnapshot();
      setState({
        initialized: true,
        syncInFlight: false,
        transport: empty,
        calendars: shapeRuntimeCalendars(empty, options.permittedCalendarIds, {}, {}, {}),
        detail: 'Notification transport state was unavailable, so runtime sync failed closed.'
      });
      return;
    }

    const permissionResult = await localNotifications.getPermissionState({
      requestIfNeeded: params.requestPermissions ?? false
    });
    const pendingResult = await localNotifications.listPending();
    const enabledCalendarIds = options.permittedCalendarIds.filter((calendarId) => {
      const preference = findPreference(transportSnapshot, calendarId);
      return preference?.desiredEnabled ?? false;
    });
    const pushResult = enabledCalendarIds.length > 0 && online
      ? await pushNotifications.ensureRegistration({ requestIfNeeded: params.requestPermissions ?? false })
      : null;

    const localStates: Record<string, NotificationLocalStateInput> = {};
    const localDiagnostics: Record<string, Omit<MobileNotificationRuntimeCalendarState, keyof CalendarNotificationState>> = {};
    const calendarOverrides: Record<string, Partial<CalendarNotificationState>> = {};
    let effectiveTransport = transportSnapshot;

    for (const calendarId of options.permittedCalendarIds) {
      const preference = findPreference(effectiveTransport, calendarId);
      const desiredEnabled = preference?.desiredEnabled ?? false;

      if (!pendingResult.ok) {
        localStates[calendarId] = {
          permission: permissionResult.ok ? permissionResult.permission : permissionResult.permission,
          localReminders: desiredEnabled ? 'degraded' : 'unknown',
          localReason: pendingResult.reason
        };
        localDiagnostics[calendarId] = {
          localSyncPhase: desiredEnabled ? 'degraded' : 'idle',
          localReminderCount: 0,
          lastReminderResyncAt: null,
          remoteRegistration: resolveRemoteRegistrationState(pushResult)
        };
        continue;
      }

      if (!desiredEnabled) {
        const idsToCancel = uniqueIdsForCalendar(pendingResult.notifications, calendarId);
        const cancelResult = await localNotifications.cancelNotifications(idsToCancel);
        localStates[calendarId] = {
          permission: permissionResult.ok ? permissionResult.permission : permissionResult.permission,
          localReminders: cancelResult.ok ? resolveReadyLocalState(permissionResult) : 'degraded',
          localReason: cancelResult.ok ? null : cancelResult.reason
        };
        localDiagnostics[calendarId] = {
          localSyncPhase: cancelResult.ok ? 'ready' : 'degraded',
          localReminderCount: 0,
          lastReminderResyncAt: cancelResult.ok ? now().toISOString() : null,
          remoteRegistration: resolveRemoteRegistrationState(pushResult)
        };
        continue;
      }

      if (!permissionResult.ok) {
        localStates[calendarId] = {
          permission: permissionResult.permission,
          localReminders: 'degraded',
          localReason: permissionResult.reason
        };
        localDiagnostics[calendarId] = {
          localSyncPhase: 'degraded',
          localReminderCount: 0,
          lastReminderResyncAt: null,
          remoteRegistration: resolveRemoteRegistrationState(pushResult)
        };
      } else if (permissionResult.permission !== 'granted') {
        localStates[calendarId] = {
          permission: permissionResult.permission,
          localReminders: permissionResult.permission === 'denied' ? 'blocked' : 'degraded',
          localReason: permissionResult.permission === 'denied' ? 'permission-denied' : 'schedule-unavailable'
        };
        localDiagnostics[calendarId] = {
          localSyncPhase: permissionResult.permission === 'denied' ? 'ready' : 'degraded',
          localReminderCount: 0,
          lastReminderResyncAt: null,
          remoteRegistration: resolveRemoteRegistrationState(pushResult)
        };
      } else {
        const trustedWeeks = await options.repository.listTrustedWeekSnapshots({
          userId: options.scope.userId,
          calendarId
        });
        const scheduled = await syncTrustedLocalReminders({
          installationId: effectiveTransport.installation?.installationId ?? 'missing-installation',
          calendarId,
          trustedWeeks,
          pendingNotifications: pendingResult.notifications,
          localNotifications,
          now: now()
        });

        localStates[calendarId] = {
          permission: 'granted',
          localReminders: scheduled.localReminders,
          localReason: scheduled.localReason
        };
        localDiagnostics[calendarId] = {
          localSyncPhase: scheduled.localReminders === 'ready' ? 'ready' : 'degraded',
          localReminderCount: scheduled.localReminderCount,
          lastReminderResyncAt: scheduled.lastReminderResyncAt,
          remoteRegistration: resolveRemoteRegistrationState(pushResult)
        };
      }

      if (!online) {
        continue;
      }

      const desiredRemote = resolveDesiredRemoteSubscription(pushResult);
      if (!needsRemoteUpdate(preference, desiredRemote)) {
        continue;
      }

      const writeResult = await writePreference({
        calendarId,
        desiredEnabled: true,
        remoteSubscription: desiredRemote.remoteSubscription,
        remoteSubscriptionReason: desiredRemote.remoteReason
      });

      if (writeResult.ok) {
        effectiveTransport = applyPreferenceWrite(effectiveTransport, writeResult);
        cachedTransport = effectiveTransport;
      } else {
        calendarOverrides[calendarId] = {
          remoteSubscription: desiredRemote.remoteSubscription,
          remoteReason: desiredRemote.remoteReason ?? writeResult.reason ?? 'sync-failed',
          phase: 'degraded',
          reason: writeResult.reason ?? 'sync-failed',
          detail: writeResult.detail
        };
      }
    }

    const detail = transportFailure ? transportDetail : transportDetail;
    const calendars = shapeRuntimeCalendars(
      effectiveTransport,
      options.permittedCalendarIds,
      localStates,
      localDiagnostics,
      calendarOverrides
    );

    setState({
      initialized: true,
      syncInFlight: false,
      transport: effectiveTransport,
      calendars,
      detail: transportFailure ? `${detail} (${transportFailure.reason})` : detail
    });
  }

  async function ensureSingleSync(params: { requestPermissions?: boolean; transportOverride?: NotificationTransportSnapshot | null } = {}) {
    if (syncInFlight) {
      return syncInFlight;
    }

    syncInFlight = runSync(params).finally(() => {
      syncInFlight = null;
    });

    return syncInFlight;
  }

  return {
    key,
    async initialize() {
      if (initialized || destroyed) {
        return;
      }

      const currentNetwork = await network.getCurrentStatus();
      online = currentNetwork.connected;

      removeNetworkListener = await network.subscribe(async (status) => {
        if (destroyed) {
          return;
        }

        const previousOnline = online;
        online = status.connected;
        if (!previousOnline && online) {
          await ensureSingleSync();
        }
      });

      removeLifecycleListener = await lifecycle.subscribe(async (event) => {
        if (destroyed || event !== 'resume') {
          return;
        }

        await ensureSingleSync();
      });

      initialized = true;
      await ensureSingleSync();
    },

    async refresh(params = {}) {
      await ensureSingleSync({ requestPermissions: params.requestPermissions ?? false });
    },

    async setCalendarEnabled(params) {
      if (!options.permittedCalendarIds.includes(params.calendarId)) {
        return null;
      }

      const bootstrapWrite = await writePreference({
        calendarId: params.calendarId,
        desiredEnabled: params.desiredEnabled,
        remoteSubscription: params.desiredEnabled ? 'syncing' : 'unsubscribed',
        remoteSubscriptionReason: null
      });

      if (bootstrapWrite.ok) {
        cachedTransport = applyPreferenceWrite(cachedTransport ?? emptyTransportSnapshot(), bootstrapWrite);
      }

      await ensureSingleSync({
        requestPermissions: params.desiredEnabled,
        transportOverride: cachedTransport
      });

      return state.calendars[params.calendarId] ?? null;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getState() {
      return state;
    },

    async destroy() {
      if (destroyed) {
        return;
      }

      destroyed = true;
      await removeNetworkListener?.();
      await removeLifecycleListener?.();
    }
  };
}

async function syncTrustedLocalReminders(params: {
  installationId: string;
  calendarId: string;
  trustedWeeks: MobileTrustedWeekSnapshotsResult;
  pendingNotifications: MobilePendingLocalNotification[];
  localNotifications: MobileLocalNotificationsAdapter;
  now: Date;
}): Promise<{
  localReminders: NotificationLocalStateInput['localReminders'];
  localReason: NotificationReasonCode | null;
  localReminderCount: number;
  lastReminderResyncAt: string | null;
}> {
  if (params.trustedWeeks.status !== 'available') {
    return {
      localReminders: 'degraded',
      localReason: 'schedule-unavailable',
      localReminderCount: 0,
      lastReminderResyncAt: null
    };
  }

  if (params.trustedWeeks.discardedWeekCount > 0) {
    return {
      localReminders: 'degraded',
      localReason: 'schedule-unavailable',
      localReminderCount: 0,
      lastReminderResyncAt: null
    };
  }

  const schedule = buildReminderSchedule({
    installationId: params.installationId,
    calendarId: params.calendarId,
    snapshots: params.trustedWeeks.snapshots,
    now: params.now
  });
  const diff = diffReminderSchedule({
    calendarId: params.calendarId,
    desiredReminders: schedule.reminders,
    pendingNotifications: params.pendingNotifications
  });

  const cancelResult = await params.localNotifications.cancelNotifications(diff.idsToCancel);
  if (!cancelResult.ok) {
    return {
      localReminders: 'degraded',
      localReason: cancelResult.reason,
      localReminderCount: schedule.reminders.length,
      lastReminderResyncAt: null
    };
  }

  const scheduleResult = await params.localNotifications.scheduleReminders(diff.remindersToSchedule);
  if (!scheduleResult.ok) {
    return {
      localReminders: 'degraded',
      localReason: scheduleResult.reason,
      localReminderCount: schedule.reminders.length,
      lastReminderResyncAt: null
    };
  }

  return {
    localReminders: schedule.invalidShiftCount > 0 ? 'degraded' : 'ready',
    localReason: schedule.invalidShiftCount > 0 ? 'schedule-unavailable' : null,
    localReminderCount: schedule.reminders.length,
    lastReminderResyncAt: params.now.toISOString()
  };
}

function resolveReadyLocalState(permissionResult: {
  ok: boolean;
  permission: NotificationLocalStateInput['permission'];
}) {
  return permissionResult.ok && permissionResult.permission === 'granted' ? 'ready' : 'unknown';
}

function resolveDesiredRemoteSubscription(pushResult: Awaited<ReturnType<MobilePushNotificationsAdapter['ensureRegistration']>> | null): {
  remoteSubscription: DeviceCalendarNotificationPreference['remoteSubscription'];
  remoteReason: NotificationReasonCode | null;
} {
  if (!pushResult) {
    return {
      remoteSubscription: 'degraded',
      remoteReason: 'registration-failed'
    };
  }

  if (pushResult.ok) {
    return {
      remoteSubscription: 'subscribed',
      remoteReason: null
    };
  }

  if (pushResult.reason === 'permission-denied') {
    return {
      remoteSubscription: 'degraded',
      remoteReason: 'permission-denied'
    };
  }

  return {
    remoteSubscription: 'degraded',
    remoteReason: pushResult.reason
  };
}

function resolveRemoteRegistrationState(
  pushResult: Awaited<ReturnType<MobilePushNotificationsAdapter['ensureRegistration']>> | null
): NotificationRuntimeRemoteRegistrationState {
  if (!pushResult) {
    return 'unknown';
  }

  if (pushResult.ok) {
    return 'registered';
  }

  if (pushResult.reason === 'permission-denied') {
    return 'denied';
  }

  if (pushResult.permission === 'unsupported') {
    return 'unsupported';
  }

  return 'failed';
}

function needsRemoteUpdate(
  preference: DeviceCalendarNotificationPreference | null,
  desiredRemote: { remoteSubscription: DeviceCalendarNotificationPreference['remoteSubscription']; remoteReason: NotificationReasonCode | null }
) {
  return (
    !preference ||
    preference.remoteSubscription !== desiredRemote.remoteSubscription ||
    preference.remoteSubscriptionReason !== desiredRemote.remoteReason
  );
}

function applyPreferenceWrite(
  current: NotificationTransportSnapshot,
  result: Extract<NotificationPreferenceWriteResult, { ok: true }>
): NotificationTransportSnapshot {
  const nextPreference = result.preference;
  const preferences = current.preferences.filter((preference) => preference.calendarId !== nextPreference.calendarId);
  preferences.push(nextPreference);
  preferences.sort((left, right) => left.calendarId.localeCompare(right.calendarId));

  return {
    ok: true,
    installationStatus: result.installationStatus,
    phase: result.phase,
    reason: result.reason,
    detail: result.detail,
    installation: result.installation,
    preferences
  } satisfies NotificationTransportSnapshot;
}

function findPreference(transport: NotificationTransportSnapshot, calendarId: string) {
  return transport.preferences.find((preference) => preference.calendarId === calendarId) ?? null;
}

function uniqueIdsForCalendar(pendingNotifications: MobilePendingLocalNotification[], calendarId: string) {
  return Array.from(
    new Set(
      pendingNotifications
        .filter((notification) => notification.calendarId === calendarId)
        .map((notification) => notification.id)
    )
  ).sort((left, right) => left - right);
}

function emptyTransportSnapshot(): NotificationTransportSnapshot {
  return {
    ok: false,
    installationStatus: 'unavailable',
    phase: 'idle',
    reason: 'installation-unavailable',
    detail: 'Notification transport has not loaded yet.',
    installation: null,
    preferences: []
  } satisfies NotificationTransportSnapshot;
}

function shapeRuntimeCalendars(
  transport: NotificationTransportSnapshot,
  calendarIds: string[],
  localStates: Record<string, NotificationLocalStateInput>,
  diagnostics: Record<string, Omit<MobileNotificationRuntimeCalendarState, keyof CalendarNotificationState>>,
  overrides: Record<string, Partial<CalendarNotificationState>>
): Record<string, MobileNotificationRuntimeCalendarState> {
  const baseStates = shapeCalendarNotificationCollection({
    calendarIds,
    transport,
    localStates
  });

  return Object.fromEntries(
    calendarIds.map((calendarId) => {
      const base = baseStates[calendarId];
      const override = overrides[calendarId] ?? {};
      const mergedBase = {
        ...base,
        ...override
      } satisfies CalendarNotificationState;
      const extra = diagnostics[calendarId] ?? {
        localSyncPhase: mergedBase.localReminders === 'ready' ? 'ready' : mergedBase.localReminders === 'degraded' ? 'degraded' : 'idle',
        localReminderCount: 0,
        lastReminderResyncAt: null,
        remoteRegistration: 'unknown'
      };

      return [
        calendarId,
        {
          ...mergedBase,
          ...extra
        } satisfies MobileNotificationRuntimeCalendarState
      ];
    })
  );
}
