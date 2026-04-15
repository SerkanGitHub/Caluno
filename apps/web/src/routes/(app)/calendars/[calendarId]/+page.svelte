<script lang="ts">
  import { browser } from '$app/environment';
  import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
  import CalendarWeekBoard from '$lib/components/calendar/CalendarWeekBoard.svelte';
  import {
    createCalendarController,
    createInitialCalendarControllerState,
    type CalendarController,
    type CalendarControllerServerOutcome,
    type CalendarControllerState
  } from '$lib/offline/calendar-controller';
  import { createOfflineMutationQueue } from '$lib/offline/mutation-queue';
  import { createBrowserScheduleRepository } from '$lib/offline/repository';
  import { buildCalendarWeekBoard } from '$lib/schedule/board';
  import type { ScheduleActionState } from '$lib/server/schedule';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let pendingActionKey = $state<string | null>(null);
  let controllerState = $state<CalendarControllerState | null>(null);
  let controller: CalendarController | null = null;

  const shellState = $derived(data.protectedShellState);
  const calendarState = $derived(data.protectedCalendarState);
  const appShell = $derived(data.appShell ?? null);
  const calendarView = $derived(data.calendarView ?? null);
  const readyView = $derived(calendarView?.kind === 'calendar' ? calendarView : null);
  const deniedView = $derived(calendarView?.kind === 'denied' ? calendarView : null);
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
                shiftDiagnostics: controllerState.shiftDiagnostics,
                lastFailure: controllerState.lastFailure
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

  $effect(() => {
    if (!browser || !readyView || !appShell) {
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

    const repository = createBrowserScheduleRepository();
    const queue = createOfflineMutationQueue({ repository });
    const nextController = createCalendarController({
      scope: {
        userId: appShell.viewer.id,
        calendarId: readyView.calendar.id,
        weekStart: readyView.schedule.visibleWeek.start
      },
      initialSchedule: readyView.schedule,
      routeMode: calendarState.mode as App.ProtectedRouteMode,
      repository,
      queue,
      isOnline: () => navigator.onLine
    });

    controller = nextController;
    controllerState = createInitialCalendarControllerState({
      initialSchedule: readyView.schedule,
      routeMode: calendarState.mode as App.ProtectedRouteMode,
      isOnline: navigator.onLine
    });

    const unsubscribe = nextController.subscribe((value) => {
      controllerState = value;
    });

    const syncNetwork = () => {
      nextController.setNetwork(navigator.onLine);
    };

    window.addEventListener('online', syncNetwork);
    window.addEventListener('offline', syncNetwork);
    void nextController.initialize();

    return () => {
      window.removeEventListener('online', syncNetwork);
      window.removeEventListener('offline', syncNetwork);
      unsubscribe();
      if (controller === nextController) {
        controller = null;
      }
      void nextController.destroy();
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
        await controller?.finalizeMutation(
          beginResult.operationId as string,
          toServerOutcome(result, actionKeyByAction[params.action])
        );
        pendingActionKey = null;
        await update({ reset: false });
      };
    };
  }

  function toServerOutcome(
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
        <article class={`status-card ${networkTone}`} data-testid="calendar-local-state">
          <span class="status-card__label">Local-first state</span>
          <strong>{controllerState.network}</strong>
          <p>
            {controllerState.boardSource === 'cached-local'
              ? 'The visible week is rendering from browser-local data.'
              : 'The visible week is rendering from the trusted server snapshot.'}
          </p>
          <code>{controllerState.pendingQueueLength} pending / {controllerState.retryableQueueLength} retryable</code>
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
        <header class="hero-panel compact" data-testid="calendar-shell">
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
          </div>
        </header>

        <CalendarWeekBoard
          {board}
          scheduleStatus={effectiveSchedule.status}
          scheduleReason={effectiveSchedule.reason}
          scheduleMessage={effectiveSchedule.message}
          actionStates={controllerState?.actionStates ?? []}
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
