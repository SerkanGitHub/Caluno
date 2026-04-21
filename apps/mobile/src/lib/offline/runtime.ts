import { createOfflineMutationQueue } from '@repo/caluno-core/offline/mutation-queue';
import { drainReconnectQueue, type CalendarControllerServerOutcome, type ReconnectDrainResult } from '@repo/caluno-core/offline/sync-engine';
import type { OfflineScheduleRepository, OfflineScheduleScope } from '@repo/caluno-core/offline/types';
import type { CalendarScheduleView } from '@repo/caluno-core/schedule/types';
import {
  createMobileCalendarController,
  type MobileCalendarController,
  type MobileCalendarControllerState,
  type MobileOfflineRouteMode
} from './controller';
import { getMobileNetworkAdapter, type MobileNetworkAdapter } from './network';
import { getMobileAppLifecycleAdapter, type MobileAppLifecycleAdapter } from './app-lifecycle';
import type { MobileTrustedScheduleTransport } from './transport';

export type MobileOfflineRuntime = {
  key: string;
  initialize: () => Promise<void>;
  subscribe: (listener: (state: MobileCalendarControllerState) => void) => () => void;
  getState: () => MobileCalendarControllerState;
  getController: () => MobileCalendarController;
  submitMutation: (params: {
    action: 'create' | 'edit' | 'move' | 'delete';
    formId: string;
    formData: FormData;
  }) => Promise<{
    operationId: string | null;
    submittedOnline: boolean;
    outcome: CalendarControllerServerOutcome | null;
  }>;
  refreshTrustedSchedule: () => Promise<void>;
  retryDrain: () => Promise<ReconnectDrainResult | null>;
  destroy: () => Promise<void>;
};

const runtimeRegistry = new Map<string, MobileOfflineRuntime>();

export function createMobileOfflineRuntime(options: {
  scope: OfflineScheduleScope;
  initialSchedule: CalendarScheduleView;
  routeMode: MobileOfflineRouteMode;
  repository: OfflineScheduleRepository;
  transport: MobileTrustedScheduleTransport;
  network?: MobileNetworkAdapter;
  lifecycle?: MobileAppLifecycleAdapter;
  now?: () => Date;
  onDestroy?: (key: string) => void;
}): MobileOfflineRuntime {
  const key = scopeKey(options.scope);
  const network = options.network ?? getMobileNetworkAdapter();
  const lifecycle = options.lifecycle ?? getMobileAppLifecycleAdapter();
  const queue = createOfflineMutationQueue({ repository: options.repository });

  let online = true;
  let initialized = false;
  let destroyed = false;
  let drainInFlight: Promise<ReconnectDrainResult | null> | null = null;
  let removeNetworkListener: (() => Promise<void>) | null = null;
  let removeLifecycleListener: (() => Promise<void>) | null = null;

  const controller = createMobileCalendarController({
    scope: options.scope,
    initialSchedule: options.initialSchedule,
    routeMode: options.routeMode,
    repository: options.repository,
    queue,
    isOnline: () => online,
    now: options.now
  });

  async function refreshTrustedSchedule() {
    if (destroyed || !initialized || !online) {
      return;
    }

    const schedule = await options.transport.loadWeek({
      calendarId: options.scope.calendarId,
      visibleWeekStart: options.scope.weekStart
    });
    await controller.ingestTrustedSchedule(schedule);
  }

  async function runDrain(): Promise<ReconnectDrainResult | null> {
    if (destroyed || !initialized || !online) {
      return null;
    }

    const inspection = controller.inspectQueue();
    if (inspection.queueState !== 'ready' || inspection.entries.length === 0) {
      return null;
    }

    const drainStart = controller.beginReconnectDrain();
    const result = await drainReconnectQueue({
      entries: drainStart.entries,
      visibleWeekStart: options.scope.weekStart,
      submitAction: (request) => options.transport.submitAction(request),
      onOutcome: async (entry, outcome) => {
        await controller.finalizeMutation(entry.id, outcome);
      }
    });

    controller.completeReconnectDrain({
      ...result,
      attemptedAt: drainStart.attemptedAt
    });

    return result;
  }

  async function ensureSingleDrain(): Promise<ReconnectDrainResult | null> {
    if (drainInFlight) {
      return drainInFlight;
    }

    drainInFlight = runDrain().finally(() => {
      drainInFlight = null;
    });

    return drainInFlight;
  }

  return {
    key,

    async initialize() {
      if (initialized || destroyed) {
        return;
      }

      const currentNetwork = await network.getCurrentStatus();
      online = currentNetwork.connected;
      await controller.initialize();
      controller.setNetwork(online);

      removeNetworkListener = await network.subscribe(async (status) => {
        if (destroyed) {
          return;
        }

        const previousOnline = online;
        online = status.connected;
        controller.setNetwork(online);

        if (!previousOnline && online) {
          await ensureSingleDrain();
        }
      });

      removeLifecycleListener = await lifecycle.subscribe(async (event) => {
        if (destroyed || event !== 'resume') {
          return;
        }

        await refreshTrustedSchedule();
        if (online) {
          await ensureSingleDrain();
        }
      });

      initialized = true;
      if (online) {
        await ensureSingleDrain();
      }
    },

    subscribe(listener) {
      return controller.subscribe(listener);
    },

    getState() {
      return controller.getState();
    },

    getController() {
      return controller;
    },

    async submitMutation(params) {
      const started = await controller.beginMutation(params);
      if (!started.operationId || !started.submitOnline) {
        return {
          operationId: started.operationId,
          submittedOnline: false,
          outcome: null
        };
      }

      const requestResult = controller.createImmediateSubmitRequest(started.operationId);
      let outcome: CalendarControllerServerOutcome;

      if (!requestResult.ok) {
        outcome = {
          type: 'malformed-response',
          reason: requestResult.reason,
          detail: requestResult.detail
        };
      } else {
        outcome = await options.transport.submitAction(requestResult.request);
      }

      await controller.finalizeMutation(started.operationId, outcome);
      return {
        operationId: started.operationId,
        submittedOnline: true,
        outcome
      };
    },

    async refreshTrustedSchedule() {
      await refreshTrustedSchedule();
    },

    async retryDrain() {
      return ensureSingleDrain();
    },

    async destroy() {
      if (destroyed) {
        return;
      }

      destroyed = true;
      await removeNetworkListener?.();
      await removeLifecycleListener?.();
      await controller.destroy();
      options.onDestroy?.(key);
    }
  };
}

export function getOrCreateMobileOfflineRuntime(options: {
  scope: OfflineScheduleScope;
  initialSchedule: CalendarScheduleView;
  routeMode: MobileOfflineRouteMode;
  repository: OfflineScheduleRepository;
  transport: MobileTrustedScheduleTransport;
  network?: MobileNetworkAdapter;
  lifecycle?: MobileAppLifecycleAdapter;
  now?: () => Date;
}): MobileOfflineRuntime {
  const key = scopeKey(options.scope);
  const existing = runtimeRegistry.get(key);
  if (existing) {
    return existing;
  }

  const runtime = createMobileOfflineRuntime({
    ...options,
    onDestroy: (runtimeKey) => {
      runtimeRegistry.delete(runtimeKey);
    }
  });

  runtimeRegistry.set(key, runtime);
  return runtime;
}

export async function resetMobileOfflineRuntimeRegistryForTests() {
  const runtimes = Array.from(runtimeRegistry.values());
  runtimeRegistry.clear();
  await Promise.all(runtimes.map((runtime) => runtime.destroy()));
}

function scopeKey(scope: OfflineScheduleScope) {
  return `${scope.userId}:${scope.calendarId}:${scope.weekStart}`;
}
