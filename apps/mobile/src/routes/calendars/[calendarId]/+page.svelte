<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import { onDestroy } from 'svelte';
  import { createEmptyCalendarScheduleView, resolveVisibleWeek, type ScheduleLoadStatus } from '@repo/caluno-core/route-contract';
  import { buildCalendarWeekBoard } from '@repo/caluno-core/schedule/board';
  import { describeDeniedCalendarReason } from '@repo/caluno-core/app-shell';
  import type { CalendarScheduleView } from '@repo/caluno-core/schedule/types';
  import MobileShell from '$lib/components/MobileShell.svelte';
  import MobileCalendarBoard from '$lib/components/calendar/MobileCalendarBoard.svelte';
  import { rememberSyncedCalendarWeek, createMobileOfflineRepository } from '$lib/offline/repository';
  import { createMobileOfflineRuntime, type MobileOfflineRuntime } from '$lib/offline/runtime';
  import { createTrustedMobileScheduleTransport, type MobileTrustedScheduleTransport } from '$lib/offline/transport';
  import type { MobileCalendarControllerState } from '$lib/offline/controller';
  import {
    loadCachedMobileAppShell,
    loadMobileAppShell,
    primaryCalendarLandingHref,
    resolveMobileCalendarRoute,
    type MobileCalendarRouteResult,
    type MobileShellBootstrapMode,
    type MobileShellLoadResult,
    type MobileShellRouteMode,
    type MobileSnapshotOrigin
  } from '$lib/shell/load-app-shell';
  import { getSupabaseBrowserClient } from '$lib/supabase/client';

  const authState = $derived(page.data.authState);
  const protectedEntry = $derived(page.data.protectedEntry);
  const attemptedCalendarId = $derived(page.params.calendarId ?? '');
  const visibleWeek = $derived(resolveVisibleWeek(page.url.searchParams, new Date()));

  let shellResult = $state<MobileShellLoadResult | null>(null);
  let routeResult = $state<MobileCalendarRouteResult | null>(null);
  let shellBootstrapMode = $state<MobileShellBootstrapMode>('loading');
  let loading = $state(false);
  let currentScopeKey = $state<string | null>(null);
  let routeActivationFailure = $state<{ reason: string; detail: string } | null>(null);
  let remoteFailure = $state<{ status: ScheduleLoadStatus; reason: string | null; message: string } | null>(null);
  let runtimeLoading = $state(false);
  let refreshing = $state(false);
  let retrying = $state(false);
  let pendingActionKey = $state<string | null>(null);
  let runtimeState = $state.raw<MobileCalendarControllerState | null>(null);
  let runtime = $state.raw<MobileOfflineRuntime | null>(null);
  let transport = $state.raw<MobileTrustedScheduleTransport | null>(null);
  let runtimeScopeKey = $state<string | null>(null);
  let runtimeSubscription: (() => void) | null = null;
  let runtimeSequence = 0;

  const shellFailure = $derived(shellResult?.ok === false ? shellResult : null);
  const appShell = $derived(shellResult?.ok ? shellResult.appShell : null);
  const primaryHref = $derived(appShell ? primaryCalendarLandingHref(appShell) : null);
  const activeCalendar = $derived(routeResult?.kind === 'calendar' ? routeResult.state.calendar : null);
  const deniedState = $derived(routeResult?.kind === 'denied' ? routeResult.state : null);
  const deniedDetail = $derived(deniedState ? describeDeniedCalendarReason(deniedState.reason) : null);
  const routeMode = $derived<MobileShellRouteMode>(shellResult?.ok ? shellResult.routeMode : protectedEntry.routeMode);
  const snapshotOrigin = $derived<MobileSnapshotOrigin>(shellResult?.ok ? shellResult.snapshotOrigin : protectedEntry.snapshotOrigin);
  const continuityReason = $derived(shellResult?.ok ? shellResult.continuity.reason : protectedEntry.continuityReason);
  const continuityDetail = $derived(shellResult?.ok ? shellResult.continuity.detail : protectedEntry.continuityDetail);
  const lastTrustedRefreshAt = $derived(
    shellResult?.ok ? shellResult.continuity.lastTrustedRefreshAt : protectedEntry.lastTrustedRefreshAt
  );
  const activeViewerId = $derived.by(() => {
    if (authState.phase === 'authenticated' && authState.user) {
      return authState.user.id;
    }

    if (appShell) {
      return appShell.viewer.id;
    }

    return protectedEntry.cachedSnapshot?.viewer.id ?? null;
  });
  const canMutate = $derived(
    Boolean(activeCalendar && activeViewerId && authState.phase === 'authenticated' && authState.user)
  );
  const canRefresh = $derived(
    Boolean(activeCalendar && activeViewerId && runtime && transport && authState.phase === 'authenticated' && authState.user)
  );
  const board = $derived.by(() => {
    if (!runtimeState) {
      return null;
    }

    return buildCalendarWeekBoard(runtimeState.schedule, {
      now: new Date(),
      runtime: {
        boardSource: runtimeState.boardSource,
        network: runtimeState.network,
        queueLength: runtimeState.queueLength,
        pendingQueueLength: runtimeState.pendingQueueLength,
        retryableQueueLength: runtimeState.retryableQueueLength,
        syncPhase: runtimeState.syncPhase,
        lastSyncAttemptAt: runtimeState.lastSyncAttemptAt,
        shiftDiagnostics: runtimeState.shiftDiagnostics,
        lastFailure: runtimeState.lastFailure,
        lastSyncError: runtimeState.lastSyncError
      }
    });
  });
  const trustedCalendars = $derived(appShell?.calendars ?? []);

  async function destroyRuntime() {
    runtimeSubscription?.();
    runtimeSubscription = null;

    const activeRuntime = runtime;
    runtime = null;
    transport = null;
    runtimeState = null;
    runtimeScopeKey = null;

    if (activeRuntime) {
      await activeRuntime.destroy();
    }
  }

  async function persistWeekContinuity(calendarId: string, weekStart: string) {
    if (!activeViewerId) {
      return;
    }

    await rememberSyncedCalendarWeek({
      userId: activeViewerId,
      calendarId,
      weekStart,
      syncedAt: new Date().toISOString(),
      source: routeMode === 'trusted-online' ? 'trusted-online' : 'server-sync'
    });
  }

  async function loadShell(force = false) {
    if (!browser || authState.phase !== 'authenticated' || !authState.user) {
      return;
    }

    loading = true;
    shellBootstrapMode = 'loading';
    const result = await loadMobileAppShell(authState.user, {
      force,
      session: authState.session,
      now: () => new Date()
    });
    shellResult = result;
    shellBootstrapMode = result.bootstrapMode;
    routeResult = result.ok
      ? resolveMobileCalendarRoute({
          appShell: result.appShell,
          calendarId: attemptedCalendarId,
          userId: authState.user.id
        })
      : null;
    loading = false;
  }

  async function ensureCalendarRuntime() {
    if (!browser || !activeCalendar || !activeViewerId || (routeMode !== 'trusted-online' && routeMode !== 'cached-offline')) {
      await destroyRuntime();
      routeActivationFailure = null;
      remoteFailure = null;
      runtimeLoading = false;
      return;
    }

    const nextScopeKey = `${activeViewerId}:${activeCalendar.id}:${visibleWeek.start}:${routeMode}`;
    if (runtimeScopeKey === nextScopeKey && runtimeState) {
      return;
    }

    runtimeSequence += 1;
    const sequence = runtimeSequence;
    runtimeLoading = true;
    routeActivationFailure = null;
    remoteFailure = null;
    await destroyRuntime();

    try {
      const nextTransport = createTrustedMobileScheduleTransport({
        client: getSupabaseBrowserClient(),
        userId: activeViewerId,
        calendarId: activeCalendar.id
      });
      const initialSchedule: CalendarScheduleView =
        routeMode === 'trusted-online'
          ? await nextTransport.loadWeek({
              calendarId: activeCalendar.id,
              visibleWeekStart: visibleWeek.start
            })
          : createEmptyCalendarScheduleView(visibleWeek);

      if (sequence !== runtimeSequence) {
        return;
      }

      remoteFailure = {
        status: initialSchedule.status,
        reason: initialSchedule.reason,
        message: initialSchedule.message
      };

      const nextRuntime = createMobileOfflineRuntime({
        scope: {
          userId: activeViewerId,
          calendarId: activeCalendar.id,
          weekStart: visibleWeek.start
        },
        initialSchedule,
        routeMode,
        repository: createMobileOfflineRepository(),
        transport: nextTransport
      });

      runtime = nextRuntime;
      transport = nextTransport;
      runtimeScopeKey = nextScopeKey;
      runtimeSubscription = nextRuntime.subscribe((state) => {
        runtimeState = state;
      });
      await nextRuntime.initialize();

      if (sequence !== runtimeSequence) {
        await nextRuntime.destroy();
        return;
      }

      if (initialSchedule.status === 'ready') {
        await persistWeekContinuity(activeCalendar.id, visibleWeek.start);
      }
    } catch (error) {
      if (sequence !== runtimeSequence) {
        return;
      }

      routeActivationFailure = {
        reason: 'MOBILE_CALENDAR_RUNTIME_FAILED',
        detail: error instanceof Error ? error.message : 'The phone-first calendar board could not bootstrap.'
      };
      await destroyRuntime();
    } finally {
      if (sequence === runtimeSequence) {
        runtimeLoading = false;
      }
    }
  }

  async function refreshTrustedWeek() {
    if (!transport || !runtime || !activeCalendar || !canRefresh || refreshing) {
      return;
    }

    refreshing = true;

    try {
      const schedule = await transport.loadWeek({
        calendarId: activeCalendar.id,
        visibleWeekStart: visibleWeek.start
      });

      remoteFailure = {
        status: schedule.status,
        reason: schedule.reason,
        message: schedule.message
      };

      if (schedule.status === 'ready') {
        await runtime.getController().ingestTrustedSchedule(schedule);
        await persistWeekContinuity(activeCalendar.id, visibleWeek.start);
      }
    } catch (error) {
      remoteFailure = {
        status: 'query-error',
        reason: 'SCHEDULE_REFRESH_FAILED',
        message: error instanceof Error ? error.message : 'Refreshing the trusted week failed.'
      };
    } finally {
      refreshing = false;
    }
  }

  async function retryDrain() {
    if (!runtime || !canRefresh || retrying) {
      return;
    }

    retrying = true;
    try {
      await runtime.retryDrain();
    } finally {
      retrying = false;
    }
  }

  async function submitMutation(params: {
    action: 'create' | 'edit' | 'move' | 'delete';
    formId: string;
    formData: FormData;
  }) {
    if (!runtime || pendingActionKey === params.formId) {
      return;
    }

    pendingActionKey = params.formId;
    try {
      await runtime.submitMutation(params);
    } finally {
      pendingActionKey = null;
    }
  }

  $effect(() => {
    if (!browser) {
      return;
    }

    if (authState.phase === 'authenticated' && authState.user) {
      const nextScopeKey = `${authState.user.id}:${attemptedCalendarId}`;
      if (currentScopeKey === nextScopeKey && routeResult) {
        return;
      }

      currentScopeKey = nextScopeKey;
      void loadShell();
      return;
    }

    const nextScopeKey = `${protectedEntry.routeMode}:${attemptedCalendarId}`;
    if (currentScopeKey === nextScopeKey && (routeResult || protectedEntry.routeMode === 'denied')) {
      return;
    }

    currentScopeKey = nextScopeKey;

    if (protectedEntry.routeMode === 'cached-offline' && protectedEntry.cachedSnapshot) {
      shellResult = loadCachedMobileAppShell(protectedEntry.cachedSnapshot);
      shellBootstrapMode = shellResult.bootstrapMode;
      routeResult = resolveMobileCalendarRoute({
        appShell: shellResult.appShell,
        calendarId: attemptedCalendarId,
        userId: protectedEntry.cachedSnapshot.viewer.id
      });
      loading = false;
      return;
    }

    shellResult = null;
    routeResult = null;
    shellBootstrapMode = 'idle';
    loading = false;
  });

  $effect(() => {
    void ensureCalendarRuntime();
  });

  onDestroy(() => {
    void destroyRuntime();
  });
</script>

<svelte:head>
  <title>{activeCalendar ? `${activeCalendar.name} • Caluno Mobile` : 'Calendar access • Caluno Mobile'}</title>
</svelte:head>

<MobileShell
  viewerName={appShell?.viewer.displayName ?? authState.displayName ?? 'Caluno member'}
  title={activeCalendar ? activeCalendar.name : 'Calendar access resolved from trusted scope.'}
  subtitle="Previously synced calendars can reopen here offline, keep mobile-local edits visible, and surface exactly when reconnect is pending or retryable."
  activeTab="calendar"
  {shellBootstrapMode}
  {routeMode}
  {snapshotOrigin}
  {continuityReason}
  {lastTrustedRefreshAt}
  onboardingState={appShell?.onboardingState ?? null}
  failurePhase={!shellResult?.ok ? shellResult?.failurePhase : deniedState?.failurePhase ?? null}
  failureDetail={!shellResult?.ok ? shellResult?.detail : continuityDetail ?? deniedDetail?.detail ?? null}
  primaryHref={primaryHref}
  primaryLabel={appShell?.primaryCalendar?.name ?? null}
>
  <section
    class="calendar-route"
    data-testid="calendar-route-state"
    data-shell-bootstrap={shellBootstrapMode}
    data-route-mode={routeMode}
    data-shell-snapshot-origin={snapshotOrigin}
    data-snapshot-origin={runtimeState?.snapshotOrigin ?? 'none'}
    data-visible-week-source={visibleWeek.source}
    data-visible-week-start={visibleWeek.start}
    data-board-source={runtimeState?.boardSource ?? 'none'}
    data-queue-state={runtimeState?.queueState ?? 'idle'}
    data-pending-count={runtimeState?.pendingQueueLength ?? 0}
    data-retryable-count={runtimeState?.retryableQueueLength ?? 0}
    data-sync-phase={runtimeState?.syncPhase ?? 'idle'}
    data-last-retryable-reason={runtimeState?.lastRetryableFailure?.reason ?? 'none'}
    data-attempted-calendar-id={attemptedCalendarId}
  >
    {#if loading}
      <article class="hero-card framed-panel tone-neutral">
        <p class="panel-kicker">Trusted route load</p>
        <h2>Checking the permitted calendar inventory.</h2>
        <p class="panel-copy">The mobile shell is resolving your trusted groups and calendars before the phone board appears.</p>
      </article>
    {:else if shellFailure}
      <article class="hero-card framed-panel tone-danger" data-testid="mobile-shell-load-failure">
        <p class="panel-kicker">Shell load failed</p>
        <h2>Protected content stayed hidden.</h2>
        <p class="panel-copy">{shellFailure.detail}</p>
        <div class="meta-strip">
          <code>{shellFailure.reasonCode}</code>
          <code>{shellFailure.failurePhase}</code>
        </div>
        <button class="button button-primary" type="button" onclick={() => loadShell(true)} disabled={!shellFailure.retryable}>
          Retry trusted load
        </button>
      </article>
    {:else if routeActivationFailure}
      <article class="hero-card framed-panel tone-danger" data-testid="mobile-calendar-runtime-failure">
        <p class="panel-kicker">Board bootstrap failed</p>
        <h2>The phone-first board could not start.</h2>
        <p class="panel-copy">{routeActivationFailure.detail}</p>
        <div class="meta-strip">
          <code>{routeActivationFailure.reason}</code>
          <code>{visibleWeek.start}</code>
        </div>
      </article>
    {:else if routeResult?.kind === 'calendar' && activeCalendar}
      {#if runtimeLoading || !runtimeState || !board}
        <article class="hero-card framed-panel tone-neutral" data-testid="calendar-board-loading">
          <p class="panel-kicker">Preparing week board</p>
          <h2>Shaping the mobile schedule surface.</h2>
          <p class="panel-copy">The local-first controller is opening the visible week, replaying any queued edits, and restoring cached continuity if needed.</p>
        </article>
      {:else}
        <MobileCalendarBoard
          calendarId={activeCalendar.id}
          calendarName={activeCalendar.name}
          {board}
          schedule={runtimeState.schedule}
          routeMode={runtimeState.routeMode}
          controllerState={runtimeState}
          actionStates={runtimeState.actionStates}
          {pendingActionKey}
          {canMutate}
          {canRefresh}
          {refreshing}
          {retrying}
          {remoteFailure}
          {submitMutation}
          refreshTrustedWeek={refreshTrustedWeek}
          retryDrain={retryDrain}
        />
      {/if}
    {:else if protectedEntry.routeMode === 'denied'}
      <article class="hero-card framed-panel tone-danger" data-testid="mobile-continuity-denied">
        <p class="panel-kicker">Continuity denied</p>
        <h2>Protected content stayed closed.</h2>
        <p class="panel-copy">{protectedEntry.continuityDetail ?? 'Cached continuity was unavailable or rejected, so the route failed closed.'}</p>

        <div class="facts-grid denied-grid">
          <div>
            <dt>Reason</dt>
            <dd>{protectedEntry.denialReasonCode ?? 'AUTH_REQUIRED'}</dd>
          </div>
          <div>
            <dt>Route mode</dt>
            <dd>{routeMode}</dd>
          </div>
          <div>
            <dt>Attempted id</dt>
            <dd><code>{attemptedCalendarId}</code></dd>
          </div>
        </div>

        <div class="hero-actions">
          <a class="button button-primary" href={protectedEntry.signInHref ?? '/signin'}>Sign in again</a>
          <a class="button button-secondary" href="/groups">Return to groups</a>
        </div>
      </article>
    {:else if deniedState && deniedDetail}
      <article class="hero-card framed-panel tone-danger" data-testid="access-denied-state">
        <p class="panel-kicker">{deniedDetail.badge}</p>
        <h2>{deniedDetail.title}</h2>
        <p class="panel-copy">{deniedDetail.detail}</p>

        <div class="facts-grid denied-grid">
          <div>
            <dt>Reason</dt>
            <dd>{deniedState.reason}</dd>
          </div>
          <div>
            <dt>Failure phase</dt>
            <dd>{deniedState.failurePhase}</dd>
          </div>
          <div>
            <dt>Attempted id</dt>
            <dd><code>{deniedState.attemptedCalendarId}</code></dd>
          </div>
        </div>

        <div class="hero-actions">
          <a class="button button-primary" href="/groups">Return to groups</a>
          {#if primaryHref}
            <a class="button button-secondary" href={primaryHref}>Open a permitted calendar</a>
          {/if}
        </div>
      </article>
    {/if}
  </section>

  {#if trustedCalendars.length}
    <section class="inventory-card framed-panel">
      <div class="inventory-header">
        <div>
          <p class="panel-kicker">Trusted inventory</p>
          <h3>Jump only within already-permitted calendars.</h3>
        </div>
        <span class="pill">{trustedCalendars.length} visible</span>
      </div>

      <div class="calendar-list">
        {#each trustedCalendars as calendar}
          <a class={`calendar-link ${activeCalendar?.id === calendar.id ? 'active' : ''}`} href={`/calendars/${calendar.id}?start=${visibleWeek.start}`}>
            <strong>{calendar.name}</strong>
            <span>{calendar.isDefault ? 'Primary calendar' : 'Secondary calendar'}</span>
          </a>
        {/each}
      </div>
    </section>
  {/if}
</MobileShell>

<style>
  .calendar-route,
  .inventory-card {
    display: grid;
    gap: 0.95rem;
  }

  .hero-card,
  .inventory-card {
    padding: 1.05rem;
  }

  .hero-card,
  .inventory-card {
    display: grid;
    gap: 0.85rem;
  }

  .panel-kicker,
  .panel-copy,
  h2,
  h3,
  p,
  dt,
  dd {
    margin: 0;
  }

  .panel-kicker,
  dt {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.73rem;
    font-weight: 700;
    color: var(--caluno-accent-deep);
  }

  h2 {
    font-size: 1.7rem;
    line-height: 1.04;
  }

  h3 {
    font-size: 1.2rem;
    line-height: 1.06;
  }

  .panel-copy,
  dd,
  .calendar-link span {
    color: var(--caluno-ink-muted);
    line-height: 1.58;
  }

  .meta-strip,
  .hero-actions,
  .inventory-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.65rem;
    justify-content: space-between;
  }

  .facts-grid {
    display: grid;
    gap: 0.8rem;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  }

  .facts-grid div {
    display: grid;
    gap: 0.3rem;
    padding: 0.75rem 0.8rem;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(34, 31, 27, 0.08);
  }

  .denied-grid {
    margin-top: 0.35rem;
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 3.15rem;
    padding: 0.9rem 1rem;
    border-radius: 1rem;
    text-decoration: none;
    border: 1px solid transparent;
    font-weight: 700;
    font-size: 0.96rem;
    cursor: pointer;
  }

  .button:disabled {
    opacity: 0.64;
    cursor: not-allowed;
  }

  .button-primary {
    color: white;
    background: linear-gradient(135deg, #114e55, #2a8279);
    box-shadow: 0 18px 30px rgba(17, 78, 85, 0.18);
  }

  .button-secondary {
    color: var(--caluno-ink-strong);
    background: rgba(255, 255, 255, 0.72);
    border-color: rgba(34, 31, 27, 0.08);
  }

  .pill,
  code {
    justify-self: start;
    padding: 0.32rem 0.62rem;
    border-radius: 999px;
    background: rgba(17, 78, 85, 0.08);
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--caluno-accent-deep);
  }

  .calendar-list {
    display: grid;
    gap: 0.7rem;
  }

  .calendar-link {
    display: grid;
    gap: 0.22rem;
    padding: 0.9rem 0.95rem;
    border-radius: 1rem;
    text-decoration: none;
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(34, 31, 27, 0.08);
    color: var(--caluno-ink-strong);
  }

  .calendar-link.active {
    border-color: rgba(17, 78, 85, 0.24);
    box-shadow: 0 12px 24px rgba(17, 78, 85, 0.12);
  }

  .tone-neutral {
    background: rgba(247, 244, 236, 0.9);
  }

  .tone-danger {
    background: rgba(255, 231, 226, 0.92);
  }
</style>
