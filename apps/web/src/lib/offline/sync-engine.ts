import type { ActionResult } from '@sveltejs/kit';
import {
  getSupabaseBrowserClient,
  readSupabaseBrowserSessionWithRetry,
  waitForSupabaseBrowserSessionHydration
} from '$lib/supabase/client';
import type { ScheduleActionState } from '@repo/caluno-core/schedule/types';
import {
  mergeRealtimeDiagnosticsForScopeReload,
  shouldRefreshTrustedWeekFromShiftRealtimeEvent,
  type CalendarControllerServerOutcome,
  type CalendarRealtimeDiagnostics,
  type CalendarRealtimeChannelState,
  type CalendarRemoteRefreshState,
  type ShiftRealtimePayload,
  type ShiftRealtimeSignal
} from '@repo/caluno-core/offline/sync-engine';

export * from '@repo/caluno-core/offline/sync-engine';

export type TrustedRemoteRefreshResult =
  | {
      status: 'applied';
      boardSource: 'server-sync' | 'cached-local';
      replayedQueueLength: number;
      detail: string;
    }
  | {
      status: 'failed';
      reason: string;
      detail: string;
    };

type ShiftRealtimeSessionLike = {
  access_token?: string | null;
};

type ShiftRealtimeAuthSubscriptionLike = {
  unsubscribe: () => void;
};

type ShiftRealtimeChannelLike = {
  on: (
    type: 'postgres_changes',
    filter: {
      event: '*';
      schema: 'public';
      table: 'shifts';
      filter: string;
    },
    callback: (payload: ShiftRealtimePayload) => void
  ) => ShiftRealtimeChannelLike;
  subscribe: (callback?: (status: string, error?: Error) => void) => ShiftRealtimeChannelLike;
};

type ShiftRealtimeClientLike = {
  channel: (name: string) => ShiftRealtimeChannelLike;
  removeChannel: (channel: ShiftRealtimeChannelLike) => Promise<unknown> | unknown;
  auth?: {
    getSession?: () => Promise<{
      data: {
        session: ShiftRealtimeSessionLike | null;
      };
    }>;
    onAuthStateChange?: (
      callback: (event: string, session: ShiftRealtimeSessionLike | null) => void
    ) =>
      | {
          data?: {
            subscription?: ShiftRealtimeAuthSubscriptionLike;
          };
        }
      | ShiftRealtimeAuthSubscriptionLike
      | void;
  };
  realtime?: {
    setAuth?: (token?: string) => Promise<unknown> | unknown;
  };
};

export type CalendarShiftRealtimeSubscription = {
  getDiagnostics: () => CalendarRealtimeDiagnostics;
  close: () => Promise<void>;
};

function readShiftRealtimeAuthSubscription(
  result:
    | {
        data?: {
          subscription?: ShiftRealtimeAuthSubscriptionLike;
        };
      }
    | ShiftRealtimeAuthSubscriptionLike
    | void
): ShiftRealtimeAuthSubscriptionLike | null {
  if (!result) {
    return null;
  }

  const directSubscription = result as ShiftRealtimeAuthSubscriptionLike;
  if (typeof directSubscription.unsubscribe === 'function') {
    return directSubscription;
  }

  const wrappedSubscription = result as {
    data?: {
      subscription?: ShiftRealtimeAuthSubscriptionLike;
    };
  };
  return wrappedSubscription.data?.subscription ?? null;
}

export function normalizeScheduleActionResult(
  result: ActionResult,
  actionKey: 'createShift' | 'editShift' | 'moveShift' | 'deleteShift'
): CalendarControllerServerOutcome {
  if ((result.type === 'success' || result.type === 'failure') && isPlainObject(result.data)) {
    const candidate = result.data[actionKey];
    if (isScheduleActionState(candidate)) {
      return {
        type: result.type,
        state: candidate
      };
    }
  }

  return {
    type: 'malformed-response',
    reason: 'SCHEDULE_ACTION_RESULT_INVALID',
    detail: 'The trusted server action returned an unexpected result shape, so the local change stayed pending.'
  };
}

export function createCalendarShiftRealtimeSubscription(params: {
  calendarId: string;
  visibleWeek: { start: string; startAt: string; endAt: string };
  requestTrustedRefresh: (signal: ShiftRealtimeSignal) => Promise<TrustedRemoteRefreshResult>;
  onDiagnostics?: (diagnostics: CalendarRealtimeDiagnostics) => void;
  client?: ShiftRealtimeClientLike;
  now?: () => Date;
  debounceMs?: number;
  retryDelayMs?: number;
  subscribeTimeoutMs?: number;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}): CalendarShiftRealtimeSubscription {
  const client = params.client ?? ((getSupabaseBrowserClient as unknown as () => ShiftRealtimeClientLike)());
  const now = params.now ?? (() => new Date());
  const debounceMs = params.debounceMs ?? 250;
  const retryDelayMs = params.retryDelayMs ?? 1_000;
  const subscribeTimeoutMs = params.subscribeTimeoutMs ?? 10_000;
  const setTimeoutFn = params.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = params.clearTimeoutFn ?? clearTimeout;

  let disposed = false;
  let channel: ShiftRealtimeChannelLike | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let subscribeTimer: ReturnType<typeof setTimeout> | null = null;
  let refreshInFlight = false;
  let queuedSignal: ShiftRealtimeSignal | null = null;
  let ignoreClosedStatus = false;
  let authSubscription: ShiftRealtimeAuthSubscriptionLike | null = null;
  let lastRealtimeAccessToken: string | null = null;
  let lastRealtimeAuthFailureDetail: string | null = null;

  let diagnostics: CalendarRealtimeDiagnostics = {
    channelState: 'subscribing',
    channelReason: null,
    channelDetail: 'Connecting to shared shift change detection for this calendar week.',
    lastSignalAt: null,
    lastSignalEvent: null,
    lastSignalDetail: null,
    remoteRefreshState: 'idle',
    lastRemoteRefreshAt: null,
    lastRemoteRefreshReason: null,
    lastRemoteRefreshDetail: null
  };

  const emitDiagnostics = () => {
    params.onDiagnostics?.({ ...diagnostics });
  };

  const setChannelState = (state: CalendarRealtimeChannelState, reason: string | null, detail: string | null) => {
    diagnostics = {
      ...diagnostics,
      channelState: state,
      channelReason: reason,
      channelDetail: detail
    };
    emitDiagnostics();
  };

  const setRemoteRefreshState = (state: CalendarRemoteRefreshState, reason: string | null, detail: string | null) => {
    diagnostics = {
      ...diagnostics,
      remoteRefreshState: state,
      lastRemoteRefreshAt: state === 'idle' ? diagnostics.lastRemoteRefreshAt : now().toISOString(),
      lastRemoteRefreshReason: reason,
      lastRemoteRefreshDetail: detail
    };
    emitDiagnostics();
  };

  const clearTimers = () => {
    if (refreshTimer) {
      clearTimeoutFn(refreshTimer);
      refreshTimer = null;
    }

    if (retryTimer) {
      clearTimeoutFn(retryTimer);
      retryTimer = null;
    }

    if (subscribeTimer) {
      clearTimeoutFn(subscribeTimer);
      subscribeTimer = null;
    }
  };

  const removeActiveChannel = async () => {
    if (!channel) {
      return;
    }

    const activeChannel = channel;
    channel = null;
    ignoreClosedStatus = true;
    try {
      await client.removeChannel(activeChannel);
    } finally {
      ignoreClosedStatus = false;
    }
  };

  const hasRealtimeAuthHooks = () => {
    const getSession = client.auth?.getSession;
    const setAuth = client.realtime?.setAuth;
    return typeof getSession === 'function' && typeof setAuth === 'function';
  };

  const applyRealtimeAuth = async (sessionOverride?: ShiftRealtimeSessionLike | null) => {
    const getSession = client.auth?.getSession;
    if (typeof getSession !== 'function' || typeof client.realtime?.setAuth !== 'function') {
      return 'unsupported' as const;
    }

    try {
      const session = sessionOverride ?? (await readSupabaseBrowserSessionWithRetry(client as unknown as never));
      const accessToken = session?.access_token?.trim();
      if (!accessToken) {
        lastRealtimeAuthFailureDetail = null;
        return 'missing-token' as const;
      }

      if (lastRealtimeAccessToken === accessToken) {
        lastRealtimeAuthFailureDetail = null;
        return 'ready' as const;
      }

      await client.realtime.setAuth(accessToken);
      lastRealtimeAccessToken = accessToken;
      lastRealtimeAuthFailureDetail = null;
      return 'ready' as const;
    } catch (error) {
      lastRealtimeAuthFailureDetail = error instanceof Error ? error.message : String(error);
      return 'failed' as const;
    }
  };

  const flushRefreshQueue = async () => {
    if (disposed || refreshInFlight || !queuedSignal) {
      return;
    }

    refreshInFlight = true;

    while (!disposed && queuedSignal) {
      const nextSignal = queuedSignal;
      queuedSignal = null;
      setRemoteRefreshState('refreshing', null, 'Reloading the trusted week after a shared shift change signal.');

      const outcome = await params.requestTrustedRefresh(nextSignal).catch((error) => ({
        status: 'failed' as const,
        reason: 'REMOTE_REFRESH_FAILED',
        detail: error instanceof Error ? error.message : 'The trusted week refresh failed before it could confirm shared changes.'
      }));

      if (outcome.status === 'applied') {
        setRemoteRefreshState(
          'applied',
          null,
          outcome.replayedQueueLength > 0
            ? `Trusted refresh applied after ${nextSignal.eventType.toLowerCase()} signal with ${outcome.replayedQueueLength} pending local ${outcome.replayedQueueLength === 1 ? 'write' : 'writes'} replayed.`
            : `Trusted refresh applied after ${nextSignal.eventType.toLowerCase()} signal with no pending local writes to replay.`
        );
      } else {
        setRemoteRefreshState('failed', outcome.reason, outcome.detail);
      }
    }

    refreshInFlight = false;
  };

  const queueRefresh = (signal: ShiftRealtimeSignal) => {
    diagnostics = {
      ...diagnostics,
      lastSignalAt: now().toISOString(),
      lastSignalEvent: signal.eventType,
      lastSignalDetail: signal.detail
    };
    emitDiagnostics();

    queuedSignal = signal;
    if (refreshTimer) {
      return;
    }

    refreshTimer = setTimeoutFn(() => {
      refreshTimer = null;
      void flushRefreshQueue();
    }, debounceMs);
  };

  const scheduleRestart = (reason: string, detail: string) => {
    if (disposed || retryTimer) {
      return;
    }

    clearTimers();
    setChannelState('retrying', reason, detail);
    retryTimer = setTimeoutFn(() => {
      retryTimer = null;
      void startChannel();
    }, retryDelayMs);
  };

  const handlePayload = (payload: ShiftRealtimePayload) => {
    const decision = shouldRefreshTrustedWeekFromShiftRealtimeEvent({
      calendarId: params.calendarId,
      visibleWeek: params.visibleWeek,
      payload
    });

    if (!decision.shouldRefresh) {
      return;
    }

    queueRefresh(decision.signal);
  };

  const handleSubscribeStatus = (status: string, error?: Error) => {
    if (disposed) {
      return;
    }

    if (status === 'SUBSCRIBED') {
      if (subscribeTimer) {
        clearTimeoutFn(subscribeTimer);
        subscribeTimer = null;
      }

      setChannelState('ready', null, 'Listening for shared shift changes on this calendar week.');
      return;
    }

    if (status === 'TIMED_OUT') {
      scheduleRestart(
        'REALTIME_SUBSCRIBE_TIMEOUT',
        'The shared shift channel did not confirm readiness in time, so it is being recreated without changing the current board.'
      );
      return;
    }

    if (status === 'CHANNEL_ERROR') {
      scheduleRestart(
        'REALTIME_CHANNEL_ERROR',
        error?.message?.trim() || 'The shared shift channel reported an error, so it is being recreated while the current board stays visible.'
      );
      return;
    }

    if (status === 'CLOSED') {
      if (ignoreClosedStatus) {
        return;
      }

      scheduleRestart(
        'REALTIME_CHANNEL_CLOSED',
        'The shared shift channel closed unexpectedly, so it is being recreated while the current board stays visible.'
      );
    }
  };

  const launchChannel = () => {
    if (disposed) {
      return;
    }

    if (subscribeTimer) {
      clearTimeoutFn(subscribeTimer);
      subscribeTimer = null;
    }

    setChannelState('subscribing', null, 'Connecting to shared shift change detection for this calendar week.');

    try {
      const nextChannel = client
        .channel(`calendar-shifts:${params.calendarId}:${params.visibleWeek.start}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'shifts',
            filter: `calendar_id=eq.${params.calendarId}`
          },
          handlePayload
        )
        .subscribe(handleSubscribeStatus);

      channel = nextChannel;
      subscribeTimer = setTimeoutFn(() => {
        subscribeTimer = null;
        handleSubscribeStatus('TIMED_OUT');
      }, subscribeTimeoutMs);
    } catch (error) {
      scheduleRestart(
        'REALTIME_CHANNEL_CREATE_FAILED',
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'The shared shift channel could not be created, so it is being recreated while the current board stays visible.'
      );
    }
  };

  const startChannel = async (sessionOverride?: ShiftRealtimeSessionLike | null) => {
    if (disposed) {
      return;
    }

    const startFreshChannel = async () => {
      if (hasRealtimeAuthHooks()) {
        await waitForSupabaseBrowserSessionHydration();
        if (disposed) {
          return;
        }

        const authStatus = await applyRealtimeAuth(sessionOverride);
        if (disposed) {
          return;
        }

        if (authStatus === 'missing-token') {
          setChannelState(
            'subscribing',
            'REALTIME_AUTH_SESSION_PENDING',
            'Waiting for the browser auth session before opening shared shift change detection for this calendar week.'
          );
          return;
        }

        if (authStatus === 'failed') {
          scheduleRestart(
            'REALTIME_AUTH_APPLY_FAILED',
            lastRealtimeAuthFailureDetail?.trim()
              ? `The browser session could not be applied to shared shift change detection yet, so the channel will retry without widening the current board scope. ${lastRealtimeAuthFailureDetail.trim()}`
              : 'The browser session could not be applied to shared shift change detection yet, so the channel will retry without widening the current board scope.'
          );
          return;
        }
      }

      launchChannel();
    };

    if (!channel) {
      await startFreshChannel();
      return;
    }

    await removeActiveChannel();
    if (disposed) {
      return;
    }

    await startFreshChannel();
  };

  const handleAuthSessionUpdate = (session: ShiftRealtimeSessionLike | null) => {
    void (async () => {
      const authStatus = await applyRealtimeAuth(session);
      if (disposed) {
        return;
      }

      if (authStatus === 'missing-token') {
        if (!channel) {
          setChannelState(
            'subscribing',
            'REALTIME_AUTH_SESSION_PENDING',
            'Waiting for the browser auth session before opening shared shift change detection for this calendar week.'
          );
        }
        return;
      }

      if (authStatus === 'failed') {
        scheduleRestart(
          'REALTIME_AUTH_APPLY_FAILED',
          lastRealtimeAuthFailureDetail?.trim()
            ? `The browser session could not be applied to shared shift change detection yet, so the channel will retry without widening the current board scope. ${lastRealtimeAuthFailureDetail.trim()}`
            : 'The browser session could not be applied to shared shift change detection yet, so the channel will retry without widening the current board scope.'
        );
        return;
      }

      const shouldRestartChannel =
        !channel ||
        diagnostics.channelState === 'closed' ||
        diagnostics.channelState === 'retrying' ||
        diagnostics.channelReason === 'REALTIME_AUTH_SESSION_PENDING';

      if (shouldRestartChannel) {
        await startChannel(session);
      }
    })();
  };

  authSubscription = readShiftRealtimeAuthSubscription(
    client.auth?.onAuthStateChange?.((event, session) => {
      if (disposed) {
        return;
      }

      if (event === 'SIGNED_OUT') {
        lastRealtimeAccessToken = null;
        queuedSignal = null;
        setRemoteRefreshState('idle', null, diagnostics.lastRemoteRefreshDetail);
        clearTimers();
        void removeActiveChannel();
        setChannelState('closed', 'REALTIME_SIGNED_OUT', 'Shared shift change detection paused because the browser session signed out.');
        return;
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        handleAuthSessionUpdate(session);
      }
    })
  );

  startChannel();
  emitDiagnostics();

  return {
    getDiagnostics() {
      return { ...diagnostics };
    },

    async close() {
      disposed = true;
      clearTimers();
      authSubscription?.unsubscribe();
      authSubscription = null;
      await removeActiveChannel();
      setChannelState('closed', null, 'Shared shift change detection stopped for this calendar route.');
    }
  };
}

function isScheduleActionState(value: unknown): value is ScheduleActionState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ScheduleActionState>;
  return (
    (candidate.action === 'create' ||
      candidate.action === 'edit' ||
      candidate.action === 'move' ||
      candidate.action === 'delete') &&
    typeof candidate.reason === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.visibleWeekStart === 'string' &&
    (candidate.shiftId === null || typeof candidate.shiftId === 'string') &&
    (candidate.seriesId === null || typeof candidate.seriesId === 'string') &&
    Array.isArray(candidate.affectedShiftIds) &&
    isPlainObject(candidate.fields) &&
    (candidate.status === 'success' ||
      candidate.status === 'validation-error' ||
      candidate.status === 'forbidden' ||
      candidate.status === 'write-error' ||
      candidate.status === 'timeout' ||
      candidate.status === 'malformed-response')
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
