<script lang="ts">
  import { deserialize } from '$app/forms';
  import { browser } from '$app/environment';
  import { invalidateAll } from '$app/navigation';
  import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
  import { untrack } from 'svelte';
  import CalendarWeekBoard from '$lib/components/calendar/CalendarWeekBoard.svelte';
  import {
    createCalendarController,
    createInitialCalendarControllerState,
    type CalendarController,
    type CalendarControllerState
  } from '$lib/offline/calendar-controller';
  import { createOfflineMutationQueue } from '$lib/offline/mutation-queue';
  import { buildCalendarWeekBoard } from '$lib/schedule/board';
  import {
    createCalendarShiftRealtimeSubscription,
    createReconnectTransportFailureOutcome,
    decideTrustedRefreshSnapshotWrite,
    drainReconnectQueue,
    normalizeScheduleActionResult,
    type CalendarControllerServerOutcome,
    type CalendarRealtimeDiagnostics,
    type CalendarShiftRealtimeSubscription,
    type ReconnectDrainActionRequest,
    type ShiftRealtimeSignal,
    type TrustedRemoteRefreshResult
  } from '$lib/offline/sync-engine';
  import type { CalendarScheduleView } from '$lib/server/schedule';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let pendingActionKey = $state<string | null>(null);
  let controllerState = $state<CalendarControllerState | null>(null);
  let controller = $state<CalendarController | null>(null);
  let reconnectDrainPromise: Promise<void> | null = null;
  let realtimeSubscription: CalendarShiftRealtimeSubscription | null = null;
  let realtimeDiagnostics = $state<CalendarRealtimeDiagnostics>(createInitialRealtimeDiagnostics());

  const shellState = $derived(data.protectedShellState);
  const calendarState = $derived(data.protectedCalendarState);
  const appShell = $derived(data.appShell ?? null);
  const calendarView = $derived(data.calendarView ?? null);
  const readyView = $derived(calendarView?.kind === 'calendar' ? calendarView : null);
  const deniedView = $derived(calendarView?.kind === 'denied' ? calendarView : null);
  const readyCalendarId = $derived(readyView?.calendar.id ?? null);
  const readyWeekStart = $derived(readyView?.schedule.visibleWeek.start ?? null);
  const controllerScopeKey = $derived(
    browser && appShell && readyCalendarId && readyWeekStart
      ? `${appShell.viewer.id}:${readyCalendarId}:${readyWeekStart}:${calendarState.mode}`
      : null
  );
  const trustedSnapshotSeedKey = $derived(
    browser &&
      calendarState.mode === 'trusted-online' &&
      appShell &&
      readyView &&
      readyView.schedule.status === 'ready'
      ? `${appShell.viewer.id}:${readyView.calendar.id}:${readyView.schedule.visibleWeek.start}:${buildTrustedScheduleKey(readyView.schedule)}`
      : null
  );
  const realtimeScopeKey = $derived(
    browser && calendarState.mode === 'trusted-online' && readyCalendarId && readyWeekStart
      ? `${readyCalendarId}:${readyWeekStart}`
      : null
  );
  const relatedCalendars = $derived.by(() => readyView?.group?.calendars ?? appShell?.calendars ?? []);
  const effectiveSchedule = $derived(controllerState?.schedule ?? readyView?.schedule ?? null);
  const board = $derived.by(() =>
    effectiveSchedule
      ? buildCalendarWeekBoard(effectiveSchedule, {
          now: new Date(),
          runtime: controllerState
            ? {
                boardSource: controllerState.boardSource,
                network: controllerState.network,
                queueLength: controllerState.queueLength,
                pendingQueueLength: controllerState.pendingQueueLength,
                retryableQueueLength: controllerState.retryableQueueLength,
                syncPhase: controllerState.syncPhase,
                lastSyncAttemptAt: controllerState.lastSyncAttemptAt,
                shiftDiagnostics: controllerState.shiftDiagnostics,
                lastFailure: controllerState.lastFailure,
                lastSyncError: controllerState.lastSyncError
              }
            : undefined
        })
      : null
  );
  const viewerName = $derived(appShell?.viewer.displayName ?? 'Protected calendar');
  const routeTone = $derived(
    calendarState.mode === 'offline-denied'
      ? 'tone-danger'
      : calendarState.mode === 'cached-offline'
        ? 'tone-warning'
        : 'tone-neutral'
  );
  const networkTone = $derived(
    controllerState?.network === 'offline'
      ? 'tone-warning'
      : controllerState?.retryableQueueLength
        ? 'tone-danger'
        : 'tone-neutral'
  );
  const realtimeTone = $derived(
    realtimeDiagnostics.channelState === 'retrying' || realtimeDiagnostics.remoteRefreshState === 'failed'
      ? 'tone-danger'
      : realtimeDiagnostics.channelState === 'subscribing' || realtimeDiagnostics.remoteRefreshState === 'refreshing'
        ? 'tone-warning'
        : 'tone-neutral'
  );

  async function submitReconnectDrainAction(request: ReconnectDrainActionRequest): Promise<CalendarControllerServerOutcome> {
    const abortController = new AbortController();
    const timeout = window.setTimeout(() => abortController.abort(), 10_000);

    try {
      const response = await fetch(request.url, {
        method: 'POST',
        body: request.formData,
        signal: abortController.signal
      });
      const result = deserialize(await response.text()) as ActionResult;
      return normalizeScheduleActionResult(result, request.actionKey);
    } catch (error) {
      if (abortController.signal.aborted) {
        return createReconnectTransportFailureOutcome({
          request,
          kind: 'timeout'
        });
      }

      return createReconnectTransportFailureOutcome({
        request,
        kind: 'network-error',
        detail: error instanceof Error ? error.message : 'The reconnect request failed before the trusted action responded.'
      });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function runReconnectDrain(nextController: CalendarController) {
    if (!browser || reconnectDrainPromise || !navigator.onLine) {
      return reconnectDrainPromise ?? Promise.resolve();
    }

    reconnectDrainPromise = (async () => {
      const currentReadyView = untrack(() => readyView);
      const drainStart = nextController.beginReconnectDrain();
      const drainResult = await drainReconnectQueue({
        entries: drainStart.entries,
        visibleWeekStart: currentReadyView?.schedule.visibleWeek.start ?? drainStart.entries[0]?.scope.weekStart ?? '',
        submitAction: submitReconnectDrainAction,
        onOutcome: async (entry, outcome) => {
          await nextController.finalizeMutation(entry.id, outcome);
        }
      });

      nextController.completeReconnectDrain({
        ...drainResult,
        attemptedAt: drainStart.attemptedAt
      });
    })();

    try {
      await reconnectDrainPromise;
    } finally {
      reconnectDrainPromise = null;
    }
  }

  function setRealtimeRemoteRefreshState(
    state: CalendarRealtimeDiagnostics['remoteRefreshState'],
    params: {
      reason?: string | null;
      detail?: string | null;
    } = {}
  ) {
    realtimeDiagnostics = {
      ...realtimeDiagnostics,
      remoteRefreshState: state,
      lastRemoteRefreshAt: state === 'idle' ? realtimeDiagnostics.lastRemoteRefreshAt : new Date().toISOString(),
      lastRemoteRefreshReason: params.reason ?? null,
      lastRemoteRefreshDetail: params.detail ?? null
    };
  }

  async function refreshTrustedWeekFromRoute(
    nextController: CalendarController,
    scopeKey: string,
    signal: ShiftRealtimeSignal
  ): Promise<TrustedRemoteRefreshResult> {
    setRealtimeRemoteRefreshState('refreshing', {
      detail: 'Reloading the trusted week after a shared shift change signal.'
    });
    await invalidateAll();

    const currentScopeKey = untrack(() => controllerScopeKey);
    const currentReadyView = untrack(() => readyView);
    const activeController = controller === nextController ? nextController : controller;

    if (!activeController || !currentReadyView || currentScopeKey !== scopeKey) {
      const detail = 'The visible calendar scope changed before the trusted refresh completed, so the old realtime signal was dropped.';
      setRealtimeRemoteRefreshState('failed', {
        reason: 'REMOTE_REFRESH_SCOPE_STALE',
        detail
      });
      return {
        status: 'failed',
        reason: 'REMOTE_REFRESH_SCOPE_STALE',
        detail
      };
    }

    const refreshResult = await activeController.ingestTrustedSchedule(currentReadyView.schedule);
    if (refreshResult.status === 'failed') {
      setRealtimeRemoteRefreshState('failed', {
        reason: refreshResult.reason,
        detail: refreshResult.detail
      });
      return {
        status: 'failed',
        reason: refreshResult.reason,
        detail: refreshResult.detail
      };
    }

    const detail =
      refreshResult.replayedQueueLength > 0
        ? `${signal.eventType} signal reloaded the trusted week and replayed pending local work on top.`
        : `${signal.eventType} signal reloaded the trusted week with no pending local work to replay.`;
    setRealtimeRemoteRefreshState('applied', {
      detail
    });

    return {
      status: 'applied',
      boardSource: refreshResult.boardSource,
      replayedQueueLength: refreshResult.replayedQueueLength,
      detail
    };
  }

  $effect(() => {
    if (!browser) {
      return;
    }

    const snapshotSeedKey = trustedSnapshotSeedKey;
    const currentAppShell = untrack(() => appShell);
    const currentReadyView = untrack(() => readyView);
    if (!snapshotSeedKey || !currentAppShell || !currentReadyView || currentReadyView.schedule.status !== 'ready') {
      return;
    }

    let cancelled = false;

    void (async () => {
      const { createBrowserScheduleRepository } = await import('$lib/offline/repository');
      const { createOfflineMutationQueue } = await import('$lib/offline/mutation-queue');
      if (cancelled) {
        return;
      }

      const repository = createBrowserScheduleRepository();
      const queue = createOfflineMutationQueue({ repository });
      const scope = {
        userId: currentAppShell.viewer.id,
        calendarId: currentReadyView.calendar.id,
        weekStart: currentReadyView.schedule.visibleWeek.start
      };

      try {
        const [currentSnapshot, queueReadResult] = await Promise.all([repository.getWeekSnapshot(scope), queue.read(scope)]);
        if (cancelled) {
          return;
        }

        const writeDecision = decideTrustedRefreshSnapshotWrite({
          currentSnapshot,
          queueReadResult
        });

        if (writeDecision.shouldPersist) {
          await repository.putWeekSnapshot({
            scope,
            visibleWeek: currentReadyView.schedule.visibleWeek,
            shifts: currentReadyView.schedule.days.flatMap((day) => day.shifts),
            cachedAt: new Date().toISOString(),
            origin: writeDecision.origin
          });
        }
      } catch {
        // fail closed: keep the trusted online route active even if snapshot seeding is unavailable
      } finally {
        await repository.close();
      }
    })();

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    if (!browser || !readyView) {
      controller = null;
      controllerState = readyView
        ? createInitialCalendarControllerState({
            initialSchedule: readyView.schedule,
            routeMode: calendarState.mode as App.ProtectedRouteMode,
            isOnline: false
          })
        : null;
      return;
    }

    const scopeKey = controllerScopeKey;
    if (!scopeKey) {
      return;
    }

    const initialSchedule = untrack(() => readyView?.schedule ?? null);
    const currentAppShell = untrack(() => appShell);
    const currentReadyView = untrack(() => readyView);
    if (!initialSchedule || !currentAppShell || !currentReadyView) {
      return;
    }

    controllerState = createInitialCalendarControllerState({
      initialSchedule,
      routeMode: calendarState.mode as App.ProtectedRouteMode,
      isOnline: navigator.onLine
    });

    let disposed = false;
    let cleanup = () => {};

    void (async () => {
      const { createBrowserScheduleRepository } = await import('$lib/offline/repository');
      if (disposed) {
        return;
      }

      const repository = createBrowserScheduleRepository();
      const queue = createOfflineMutationQueue({ repository });
      const nextController = createCalendarController({
        scope: {
          userId: currentAppShell.viewer.id,
          calendarId: currentReadyView.calendar.id,
          weekStart: currentReadyView.schedule.visibleWeek.start
        },
        initialSchedule,
        routeMode: calendarState.mode as App.ProtectedRouteMode,
        repository,
        queue,
        isOnline: () => navigator.onLine
      });

      if (disposed) {
        void nextController.destroy();
        return;
      }

      controller = nextController;

      const unsubscribe = nextController.subscribe((value) => {
        controllerState = value;
      });

      const syncNetwork = () => {
        nextController.setNetwork(navigator.onLine);
        if (navigator.onLine) {
          void runReconnectDrain(nextController);
        }
      };

      window.addEventListener('online', syncNetwork);
      window.addEventListener('offline', syncNetwork);
      await nextController.initialize();
      if (!disposed && navigator.onLine) {
        void runReconnectDrain(nextController);
      }

      cleanup = () => {
        window.removeEventListener('online', syncNetwork);
        window.removeEventListener('offline', syncNetwork);
        unsubscribe();
        if (controller === nextController) {
          controller = null;
        }
        void nextController.destroy();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  });

  $effect(() => {
    if (!browser) {
      realtimeDiagnostics = createInitialRealtimeDiagnostics();
      realtimeSubscription = null;
      return;
    }

    const scopeKey = realtimeScopeKey;
    if (!scopeKey || !controller || !readyView) {
      realtimeDiagnostics = createInitialRealtimeDiagnostics();
      realtimeSubscription = null;
      return;
    }

    realtimeDiagnostics = {
      ...createInitialRealtimeDiagnostics(),
      channelDetail: 'Connecting to shared shift change detection for this calendar week.'
    };

    let disposed = false;
    const nextController = controller;
    const currentReadyView = untrack(() => readyView);
    if (!currentReadyView) {
      return;
    }

    const subscription = createCalendarShiftRealtimeSubscription({
      calendarId: currentReadyView.calendar.id,
      visibleWeek: currentReadyView.schedule.visibleWeek,
      requestTrustedRefresh: (signal) => refreshTrustedWeekFromRoute(nextController, scopeKey, signal),
      onDiagnostics: (diagnostics) => {
        if (!disposed) {
          realtimeDiagnostics = diagnostics;
        }
      }
    });

    realtimeSubscription = subscription;

    return () => {
      disposed = true;
      if (realtimeSubscription === subscription) {
        realtimeSubscription = null;
      }
      void subscription.close();
    };
  });

  const actionKeyByAction = {
    create: 'createShift',
    edit: 'editShift',
    move: 'moveShift',
    delete: 'deleteShift'
  } as const;

  function enhanceMutation(params: {
    action: 'create' | 'edit' | 'move' | 'delete';
    formId: string;
  }): SubmitFunction {
    return async ({ formData, cancel }) => {
      pendingActionKey = params.formId;

      if (!controller) {
        return async ({ update }) => {
          pendingActionKey = null;
          await update({ reset: false });
        };
      }

      const beginResult = await controller.beginMutation({
        action: params.action,
        formId: params.formId,
        formData
      });

      if (!beginResult.submitOnline || !beginResult.operationId) {
        pendingActionKey = null;
        cancel();
        return;
      }

      return async ({ result, update }) => {
        await controller?.finalizeMutation(beginResult.operationId as string, normalizeScheduleActionResult(result, actionKeyByAction[params.action]));
        pendingActionKey = null;
        await update({ reset: false });
      };
    };
  }

  function describeRealtimeState(diagnostics: CalendarRealtimeDiagnostics): string {
    if (diagnostics.channelState === 'subscribing') {
      return 'The shared shift channel is connecting. The current board stays visible while live change detection becomes ready.';
    }

    if (diagnostics.channelState === 'retrying') {
      return 'Live change detection is retrying after a channel failure. Manual refresh and queued local work remain available.';
    }

    if (diagnostics.channelState === 'closed') {
      return 'Live change detection is stopped for this route.';
    }

    return 'Live change detection is connected for this calendar. Realtime signals trigger trusted refreshes instead of direct client writes.';
  }

  function buildTrustedScheduleKey(schedule: CalendarScheduleView): string {
    return JSON.stringify({
      status: schedule.status,
      reason: schedule.reason,
      visibleWeekStart: schedule.visibleWeek.start,
      shiftIds: schedule.shiftIds
    });
  }

  function createInitialRealtimeDiagnostics(): CalendarRealtimeDiagnostics {
    return {
      channelState: 'closed',
      channelReason: null,
      channelDetail: 'Live change detection is idle until a trusted online calendar week is open.',
      lastSignalAt: null,
      lastSignalEvent: null,
      lastSignalDetail: null,
      remoteRefreshState: 'idle',
      lastRemoteRefreshAt: null,
      lastRemoteRefreshReason: null,
      lastRemoteRefreshDetail: null
    };
  }
</script>

<svelte:head>
  <title>
    {readyView ? `${readyView.calendar.name} • Caluno` : 'Access denied • Caluno'}
  </title>
</svelte:head>

<main class="workspace-shell">
  <aside class="workspace-rail framed-panel">
    <p class="eyebrow">Trusted calendar scope</p>
    <h1>{viewerName}</h1>
    <p class="rail-copy">
      {#if calendarState.mode === 'trusted-online'}
        This route rendered from the trusted server contract, so calendar authority was revalidated before the week loaded.
      {:else if calendarState.mode === 'cached-offline'}
        This route reopened from trusted browser-local scope and a cached week snapshot without widening access beyond previously synced calendars.
      {:else}
        Offline continuity failed closed on this route instead of guessing whether the calendar should be visible.
      {/if}
    </p>

    <div class="status-stack">
      <article class={`status-card ${routeTone}`} data-testid="calendar-route-state">
        <span class="status-card__label">Route state</span>
        <strong>{calendarState.mode}</strong>
        <p>{calendarState.detail}</p>
        {#if calendarState.reason}
          <code>{calendarState.reason}</code>
        {/if}
      </article>

      {#if controllerState}
        <article
          class={`status-card ${networkTone}`}
          data-testid="calendar-local-state"
          data-queue-state={controllerState.queueState}
          data-snapshot-status={controllerState.snapshotStatus}
          data-snapshot-at={controllerState.snapshotAt ?? ''}
          data-snapshot-origin={controllerState.snapshotOrigin ?? ''}
        >
          <span class="status-card__label">Local-first state</span>
          <strong>{controllerState.network}</strong>
          <p>
            {#if controllerState.snapshotStatus === 'failed'}
              Browser-local week persistence could not be confirmed, so offline continuity may fail closed until the next trusted refresh succeeds.
            {:else if controllerState.snapshotStatus === 'ready'}
              {controllerState.boardSource === 'cached-local'
                ? 'The visible week is rendering from browser-local data.'
                : 'The visible week is rendering from the trusted server snapshot, and offline continuity is cached on this browser.'}
            {:else}
              {controllerState.boardSource === 'cached-local'
                ? 'The visible week is rendering from browser-local data.'
                : 'The visible week is rendering from the trusted server snapshot while browser-local continuity finishes caching.'}
            {/if}
          </p>
          <code>{controllerState.pendingQueueLength} pending / {controllerState.retryableQueueLength} retryable</code>
        </article>

        <article
          class={`status-card ${
            controllerState.syncPhase === 'paused-retryable'
              ? 'tone-danger'
              : controllerState.syncPhase === 'draining'
                ? 'tone-warning'
                : 'tone-neutral'
          }`}
          data-testid="calendar-sync-state"
        >
          <span class="status-card__label">Sync diagnostics</span>
          <strong>{controllerState.syncPhase}</strong>
          <p>
            {#if controllerState.syncPhase === 'draining'}
              Reconnect is replaying queued browser-local mutations through the trusted route actions in sequence.
            {:else if controllerState.syncPhase === 'paused-retryable'}
              Reconnect stopped on the first retryable failure so later queued writes stayed in order.
            {:else}
              Reconnect is idle. Trusted route actions already confirmed all drained work or nothing was pending.
            {/if}
          </p>
          <code>{controllerState.lastSyncAttemptAt ?? 'No reconnect attempt yet'}</code>
          {#if controllerState.lastSyncError}
            <p>{controllerState.lastSyncError.detail}</p>
            <code>{controllerState.lastSyncError.reason}</code>
          {/if}
        </article>

        <article
          class={`status-card ${realtimeTone}`}
          data-testid="calendar-realtime-state"
          data-channel-state={realtimeDiagnostics.channelState}
          data-remote-refresh-state={realtimeDiagnostics.remoteRefreshState}
        >
          <span class="status-card__label">Realtime diagnostics</span>
          <strong>{realtimeDiagnostics.channelState}</strong>
          <p>{describeRealtimeState(realtimeDiagnostics)}</p>
          <code>
            {#if realtimeDiagnostics.lastSignalAt}
              {realtimeDiagnostics.lastSignalEvent ?? 'signal'} at {realtimeDiagnostics.lastSignalAt}
            {:else}
              No shared shift signal received yet
            {/if}
          </code>
          {#if realtimeDiagnostics.channelDetail}
            <p>{realtimeDiagnostics.channelDetail}</p>
          {/if}
          {#if realtimeDiagnostics.channelReason}
            <code>{realtimeDiagnostics.channelReason}</code>
          {/if}
          {#if realtimeDiagnostics.lastRemoteRefreshDetail}
            <p>{realtimeDiagnostics.lastRemoteRefreshDetail}</p>
          {/if}
          {#if realtimeDiagnostics.lastRemoteRefreshReason}
            <code>{realtimeDiagnostics.lastRemoteRefreshReason}</code>
          {/if}
        </article>
      {/if}

      {#if calendarState.cachedAt}
        <article class="status-card tone-warning">
          <span class="status-card__label">Cached snapshot</span>
          <strong>{calendarState.cachedAt}</strong>
          <p>The visible week reopened from browser-local storage instead of the server.</p>
        </article>
      {/if}

      {#if effectiveSchedule}
        <article class={`status-card ${effectiveSchedule.status === 'ready' ? 'tone-neutral' : effectiveSchedule.status === 'timeout' ? 'tone-warning' : 'tone-danger'}`}>
          <span class="status-card__label">Week scope</span>
          <strong>{effectiveSchedule.visibleWeek.start}</strong>
          <p>{effectiveSchedule.message}</p>
          {#if calendarState.visibleWeekOrigin}
            <code>{calendarState.visibleWeekOrigin}</code>
          {/if}
        </article>
      {/if}
    </div>

    <nav class="rail-links">
      <a href="/groups">Back to groups</a>
      <a href="/logout">Sign out</a>
    </nav>
  </aside>

  <section class="workspace-main">
    {#if readyView}
      {#if board && effectiveSchedule}
        <header class="hero-panel compact" data-testid="calendar-shell" data-trusted-schedule-key={buildTrustedScheduleKey(effectiveSchedule)}>
          <p class="eyebrow">{readyView.group?.name ?? 'Permitted calendar'}</p>
          <h2>{readyView.calendar.name}</h2>
          <p class="lede">
            {#if controllerState?.network === 'offline'}
              A calm week board reopened from browser-local continuity. Local schedule changes stay on this device until the trusted server path is reachable again.
            {:else}
              A calm week board for multi-shift days: local writes render immediately, while trusted server actions stay authoritative for confirmation.
            {/if}
          </p>

          <div class="calendar-board__meta">
            <span class="pill pill-active">{readyView.calendar.isDefault ? 'Default calendar' : 'Secondary calendar'}</span>
            <span class="pill pill-neutral">{readyView.group?.role ?? 'member'} access</span>
            <span class="pill pill-neutral">{effectiveSchedule.totalShifts} visible shifts</span>
            <span class={`pill ${controllerState?.boardSource === 'cached-local' ? 'pill-expired' : 'pill-neutral'}`}>
              {controllerState?.boardSource === 'cached-local' ? 'Cached local' : 'Trusted online'}
            </span>
            <span
              class={`pill ${
                controllerState?.syncPhase === 'paused-retryable'
                  ? 'pill-danger'
                  : controllerState?.syncPhase === 'draining'
                    ? 'pill-expired'
                    : 'pill-neutral'
              }`}
            >
              {controllerState?.syncPhase ?? 'idle'}
            </span>
            <span class={`pill ${realtimeDiagnostics.channelState === 'ready' ? 'pill-active' : realtimeDiagnostics.channelState === 'retrying' ? 'pill-danger' : 'pill-expired'}`}>
              realtime {realtimeDiagnostics.channelState}
            </span>
          </div>
        </header>

        <CalendarWeekBoard
          {board}
          scheduleStatus={effectiveSchedule.status}
          scheduleReason={effectiveSchedule.reason}
          scheduleMessage={effectiveSchedule.message}
          actionStates={controllerState?.actionStates ?? []}
          realtimeDiagnostics={realtimeDiagnostics}
          {pendingActionKey}
          {enhanceMutation}
        />
      {/if}
    {:else if deniedView}
      <section class="denied-banner framed-panel" data-testid="access-denied-state">
        <p class="eyebrow">{deniedView.detail.badge}</p>
        <h2>{deniedView.detail.title}</h2>
        <p class="lede">{deniedView.detail.detail}</p>

        <div class="denied-meta">
          <div>
            <span>Failure phase</span>
            <strong>{deniedView.failurePhase}</strong>
          </div>
          <div>
            <span>Reason code</span>
            <strong>{deniedView.reason}</strong>
          </div>
          <div>
            <span>Attempted id</span>
            <code>{deniedView.attemptedCalendarId}</code>
          </div>
        </div>

        <div class="denied-actions">
          <a class="button button-primary" href="/groups">Return to permitted groups</a>
          {#if appShell?.primaryCalendar}
            <a class="button button-secondary" href={`/calendars/${appShell.primaryCalendar.id}`}>
              Open a permitted calendar
            </a>
          {/if}
        </div>
      </section>
    {/if}

    <section class="related-panel framed-panel">
      <div class="group-card__header">
        <div>
          <p class="panel-kicker">Visible calendar inventory</p>
          <h3>Only trusted calendars appear in navigation.</h3>
        </div>
        <span class="pill pill-neutral">{relatedCalendars.length} visible</span>
      </div>

      <div class="calendar-list">
        {#each relatedCalendars as calendar}
          <a class={`calendar-link ${readyView && calendar.id === readyView.calendar.id ? 'active' : ''}`} href={`/calendars/${calendar.id}`}>
            <strong>{calendar.name}</strong>
            <span>{calendar.isDefault ? 'Default calendar' : 'Secondary calendar'}</span>
          </a>
        {/each}
      </div>
    </section>
  </section>
</main>
