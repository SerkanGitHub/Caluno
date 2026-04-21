<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import { onDestroy } from 'svelte';
  import MobileShell from '$lib/components/MobileShell.svelte';
  import { getMobileNetworkAdapter, type MobileNetworkStatus } from '$lib/offline/network';
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
  import { buildCreatePrefillHref, deriveCreatePrefillWeekStart } from '@repo/caluno-core/schedule/create-prefill';
  import { createMobileFindTimeTransport, type MobileFindTimeSearchView } from '$lib/find-time/transport';
  import {
    resolveMobileFindTimeRouteState,
    shouldLoadMobileFindTimeSearch,
    type MobileFindTimeResolvedState
  } from '$lib/find-time/view';
  import type { PageData } from './$types';

  const durationPresets = [30, 60, 90, 120] as const;

  let { data }: { data: PageData } = $props();

  const authState = $derived(data.authState);
  const protectedEntry = $derived(data.protectedEntry);
  const attemptedCalendarId = $derived(page.params.calendarId ?? '');
  const durationParam = $derived(page.url.searchParams.get('duration'));
  const startParam = $derived(page.url.searchParams.get('start'));

  let shellResult = $state<MobileShellLoadResult | null>(null);
  let routeResult = $state<MobileCalendarRouteResult | null>(null);
  let shellBootstrapMode = $state<MobileShellBootstrapMode>('loading');
  let loading = $state(false);
  let currentScopeKey = $state<string | null>(null);
  let networkStatus = $state<MobileNetworkStatus | null>(null);
  let searchView = $state<MobileFindTimeSearchView | null>(null);
  let searchLoading = $state(false);
  let searchSequence = 0;

  let removeNetworkListener: (() => Promise<void>) | null = null;

  const shellFailure = $derived(shellResult?.ok === false ? shellResult : null);
  const appShell = $derived(shellResult?.ok ? shellResult.appShell : null);
  const primaryHref = $derived(appShell ? primaryCalendarLandingHref(appShell) : null);
  const routeMode = $derived<MobileShellRouteMode>(shellResult?.ok ? shellResult.routeMode : protectedEntry.routeMode);
  const snapshotOrigin = $derived<MobileSnapshotOrigin>(shellResult?.ok ? shellResult.snapshotOrigin : protectedEntry.snapshotOrigin);
  const continuityReason = $derived(shellResult?.ok ? shellResult.continuity.reason : protectedEntry.continuityReason);
  const continuityDetail = $derived(shellResult?.ok ? shellResult.continuity.detail : protectedEntry.continuityDetail);
  const lastTrustedRefreshAt = $derived(
    shellResult?.ok ? shellResult.continuity.lastTrustedRefreshAt : protectedEntry.lastTrustedRefreshAt
  );
  const trustedCalendars = $derived(appShell?.calendars ?? []);
  const activeCalendar = $derived(routeResult?.kind === 'calendar' ? routeResult.state.calendar : null);
  const routeState = $derived<MobileFindTimeResolvedState | null>(
    resolveMobileFindTimeRouteState({
      routeAccess: routeResult,
      routeMode,
      network: networkStatus,
      search: searchView
    })
  );
  const selectedDuration = $derived(durationParam ?? '');
  const selectedStart = $derived(startParam ?? '');
  const viewerName = $derived(appShell?.viewer.displayName ?? authState.displayName ?? 'Caluno member');
  const title = $derived(activeCalendar ? `${activeCalendar.name} · Find time` : 'Find time');
  const canSearch = $derived(
    shouldLoadMobileFindTimeSearch({
      routeAccess: routeResult,
      routeMode,
      network: networkStatus
    }) && authState.phase === 'authenticated' && Boolean(authState.user)
  );
  const networkLabel = $derived.by(() => {
    if (routeState?.networkConnected === true) {
      return 'online';
    }

    if (routeState?.networkConnected === false) {
      return 'offline';
    }

    if (networkStatus?.connected === true) {
      return 'online';
    }

    if (networkStatus?.connected === false) {
      return 'offline';
    }

    return 'unknown';
  });

  async function destroyNetworkSubscription() {
    const remove = removeNetworkListener;
    removeNetworkListener = null;
    if (remove) {
      await remove();
    }
  }

  async function initializeNetwork() {
    if (!browser || removeNetworkListener) {
      return;
    }

    const adapter = getMobileNetworkAdapter();
    networkStatus = await adapter.getCurrentStatus();
    removeNetworkListener = await adapter.subscribe((status) => {
      networkStatus = status;
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

  function buildPresetHref(calendarId: string, durationMinutes: number, start: string) {
    const searchParams = new URLSearchParams({
      duration: String(durationMinutes)
    });

    if (start) {
      searchParams.set('start', start);
    }

    return `/calendars/${calendarId}/find-time?${searchParams.toString()}`;
  }

  function buildSuggestionCreateHref(startAt: string, endAt: string) {
    if (!activeCalendar) {
      return null;
    }

    return buildCreatePrefillHref({
      calendarId: activeCalendar.id,
      window: { startAt, endAt }
    });
  }

  function formatUtcSlot(startAt: string, endAt: string) {
    return `${formatUtcDay(startAt)} · ${formatUtcClock(startAt)}–${formatUtcClock(endAt)} UTC`;
  }

  function formatUtcDay(value: string) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC'
    }).format(new Date(value));
  }

  function formatUtcClock(value: string) {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC'
    }).format(new Date(value));
  }

  function availableNames(window: NonNullable<MobileFindTimeSearchView>['windows'][number]) {
    return window.availableMembers.map((member) => member.displayName).join(' · ');
  }

  function blockedNames(window: NonNullable<MobileFindTimeSearchView>['windows'][number]) {
    return window.blockedMembers.map((member) => member.displayName).join(' · ');
  }

  $effect(() => {
    void initializeNetwork();
  });

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
    if (!browser) {
      return;
    }

    if (!canSearch || !activeCalendar || !authState.user) {
      searchView = null;
      searchLoading = false;
      return;
    }

    const currentRun = ++searchSequence;
    searchLoading = true;
    searchView = null;

    const transport = createMobileFindTimeTransport({
      client: getSupabaseBrowserClient()
    });

    void transport
      .loadSearchView({
        calendarId: activeCalendar.id,
        userId: authState.user.id,
        duration: durationParam,
        start: startParam,
        now: new Date()
      })
      .then((result) => {
        if (currentRun !== searchSequence) {
          return;
        }

        searchView = result;
      })
      .finally(() => {
        if (currentRun === searchSequence) {
          searchLoading = false;
        }
      });
  });

  onDestroy(() => {
    void destroyNetworkSubscription();
  });
</script>

<svelte:head>
  <title>{title} • Caluno Mobile</title>
</svelte:head>

<MobileShell
  viewerName={viewerName}
  {title}
  subtitle="Phone-first find-time stays live-backed when trusted connectivity is available and fails closed when scope or network truth is not trustworthy."
  activeTab="calendar"
  {shellBootstrapMode}
  {routeMode}
  {snapshotOrigin}
  {continuityReason}
  {lastTrustedRefreshAt}
  onboardingState={appShell?.onboardingState ?? null}
  failurePhase={!shellResult?.ok ? shellResult?.failurePhase : routeState?.denialPhase}
  failureDetail={!shellResult?.ok ? shellResult?.detail : continuityDetail ?? routeState?.message ?? null}
  primaryHref={primaryHref}
  primaryLabel={appShell?.primaryCalendar?.name ?? null}
  shellTestId="find-time-shell"
>
  <section
    class="find-time-route"
    data-testid="find-time-route-state"
    data-status={routeState?.status ?? 'loading'}
    data-reason={routeState?.reason ?? 'none'}
    data-route-mode={routeMode}
    data-network={networkLabel}
    data-network-source={routeState?.networkSource ?? networkStatus?.source ?? 'none'}
    data-top-pick-count={routeState?.topPickCount ?? 0}
    data-browse-count={routeState?.browseCount ?? 0}
    data-denial-phase={routeState?.denialPhase ?? 'none'}
    data-calendar-id={routeState?.calendarId ?? attemptedCalendarId}
  >
    {#if loading || (routeMode === 'trusted-online' && !networkStatus) || searchLoading}
      <article class="hero-card framed-panel tone-neutral" data-testid="find-time-loading-state">
        <p class="panel-kicker">Find-time route</p>
        <h2>Resolving trusted mobile availability.</h2>
        <p class="panel-copy">
          The route is confirming shell scope, network truth, and the live roster-plus-busy contract before any compact result cards open.
        </p>
      </article>
    {:else if routeState?.status === 'offline-unavailable'}
      <article class="hero-card framed-panel tone-danger" data-testid="find-time-offline-state">
        <p class="panel-kicker">Offline unavailable</p>
        <h2>Find-time stays live-only on mobile.</h2>
        <p class="panel-copy">{routeState.message}</p>
        <div class="facts-grid">
          <div>
            <dt>Reason</dt>
            <dd>{routeState.reason ?? 'none'}</dd>
          </div>
          <div>
            <dt>Route mode</dt>
            <dd>{routeMode}</dd>
          </div>
          <div>
            <dt>Network source</dt>
            <dd>{routeState.networkSource}</dd>
          </div>
        </div>
      </article>
    {:else if routeState?.status === 'denied'}
      <article class="hero-card framed-panel tone-danger" data-testid="find-time-denied-state">
        <p class="panel-kicker">Access denied</p>
        <h2>Protected find-time scope stayed closed.</h2>
        <p class="panel-copy">{routeState.message}</p>
        <div class="facts-grid">
          <div>
            <dt>Reason</dt>
            <dd>{routeState.reason ?? 'none'}</dd>
          </div>
          <div>
            <dt>Failure phase</dt>
            <dd>{routeState.denialPhase ?? 'none'}</dd>
          </div>
          <div>
            <dt>Attempted id</dt>
            <dd><code>{attemptedCalendarId}</code></dd>
          </div>
        </div>
      </article>
    {:else if shellFailure}
      <article class="hero-card framed-panel tone-danger" data-testid="find-time-shell-failure">
        <p class="panel-kicker">Shell load failed</p>
        <h2>Trusted route setup stayed closed.</h2>
        <p class="panel-copy">{shellFailure.detail}</p>
        <div class="facts-grid">
          <div>
            <dt>Reason</dt>
            <dd>{shellFailure.reasonCode}</dd>
          </div>
          <div>
            <dt>Failure phase</dt>
            <dd>{shellFailure.failurePhase}</dd>
          </div>
        </div>
        <button class="button button-primary" type="button" onclick={() => loadShell(true)} disabled={!shellFailure.retryable}>
          Retry trusted load
        </button>
      </article>
    {:else if activeCalendar}
      <div class="find-time-content">
        <header class="hero-card framed-panel tone-neutral" data-testid="find-time-hero">
          <div>
            <p class="panel-kicker">Live mobile find-time</p>
            <h2>{activeCalendar.name}</h2>
            <p class="panel-copy">
              Search a trusted 30-day horizon, keep Top picks distinct from browse windows, and expose stable route diagnostics for denied, timeout, malformed, and offline states.
            </p>
          </div>
          <div class="hero-meta">
            <span class="pill">{routeMode}</span>
            <span class="pill">{networkStatus?.source ?? 'none'}</span>
            <span class="pill">{routeState?.status ?? 'idle'}</span>
            <span class="pill">{routeState?.topPickCount ?? 0} top picks</span>
          </div>
        </header>

        <section class="toolbar-card framed-panel">
          <div>
            <p class="panel-kicker">Search the trusted horizon</p>
            <h3>Duration and anchor stay explicit.</h3>
            <p class="panel-copy">
              Invalid inputs, no-results, query failures, and malformed responses stay attributable through deterministic status codes instead of a generic empty state.
            </p>
          </div>

          <form method="GET" class="query-form" data-testid="find-time-query-form">
            <label class="field">
              <span>Duration (minutes)</span>
              <input
                class="input"
                data-testid="find-time-duration-input"
                type="number"
                min="15"
                max="720"
                step="15"
                name="duration"
                value={selectedDuration}
                placeholder="60"
              />
            </label>

            <label class="field">
              <span>Search from (UTC day)</span>
              <input class="input" data-testid="find-time-start-input" type="date" name="start" value={selectedStart} />
            </label>

            <div class="preset-row" aria-label="Duration presets">
              {#each durationPresets as preset}
                <a
                  class={`pill preset-pill ${selectedDuration === String(preset) ? 'preset-pill--active' : ''}`}
                  href={buildPresetHref(activeCalendar.id, preset, selectedStart)}
                >
                  {preset} min
                </a>
              {/each}
            </div>

            <button class="button button-primary" data-testid="find-time-submit" type="submit">Refresh truthful windows</button>
          </form>
        </section>

        {#if routeState?.status === 'ready'}
          <section class="summary-grid">
            <article class="status-card framed-panel tone-neutral" data-testid="find-time-summary">
              <span class="status-card__label">Route status</span>
              <strong>{routeState.status}</strong>
              <p>{routeState.message}</p>
            </article>
            <article class="status-card framed-panel tone-neutral">
              <span class="status-card__label">Search range</span>
              <strong>{routeState.rangeStartAt?.slice(0, 10)} → {routeState.rangeEndAt?.slice(0, 10)}</strong>
              <p>{routeState.durationMinutes ?? 0} minute duration over {searchView?.roster.length ?? 0} named members.</p>
            </article>
          </section>

          <section class="result-shell" data-testid="find-time-results" data-window-count={routeState.totalWindows}>
            <section class="result-panel framed-panel" data-testid="find-time-top-picks" data-top-pick-count={routeState.topPickCount}>
              <div class="section-heading">
                <div>
                  <p class="panel-kicker">Top picks</p>
                  <h3>Highest-confidence shared windows.</h3>
                </div>
                <span class="pill">{routeState.topPickCount}</span>
              </div>

              {#if routeState.topPicks.length === 0}
                <article class="empty-panel" data-testid="find-time-top-picks-empty">
                  <strong>No shortlist candidate qualified.</strong>
                  <p>The route still stayed ready, but every truthful result belongs in the browse inventory only.</p>
                </article>
              {:else}
                <div class="card-list">
                  {#each routeState.topPicks as window, index}
                    {@const createHref = buildSuggestionCreateHref(window.startAt, window.endAt)}
                    {@const handoffWeekStart = deriveCreatePrefillWeekStart(window.startAt)}
                    <article
                      class="result-card result-card--top framed-panel"
                      data-testid={`find-time-top-pick-${index}`}
                      data-start-at={window.startAt}
                      data-end-at={window.endAt}
                      data-top-pick-rank={window.topPickRank ?? index + 1}
                      data-available-members={availableNames(window)}
                      data-blocked-members={blockedNames(window)}
                    >
                      <div class="card-header">
                        <div>
                          <p class="panel-kicker">Top pick {window.topPickRank ?? index + 1}</p>
                          <h4>{formatUtcSlot(window.startAt, window.endAt)}</h4>
                        </div>
                        <span class="pill">{window.availableMembers.length} free</span>
                      </div>
                      <p class="panel-copy">{window.topPickEligible ? 'Shared slot qualified for the shortlist.' : 'Shared slot stayed browse-only.'}</p>
                      <p class="panel-copy"><strong>Free:</strong> {availableNames(window) || 'none'}</p>
                      {#if window.blockedMembers.length > 0}
                        <p class="panel-copy"><strong>Blocked:</strong> {blockedNames(window)}</p>
                      {/if}
                      {#if createHref && handoffWeekStart}
                        <a
                          class="button button-secondary"
                          data-testid={`find-time-top-pick-${index}-cta`}
                          data-handoff-source="find-time"
                          data-handoff-week-start={handoffWeekStart}
                          data-handoff-start-at={window.startAt}
                          data-handoff-end-at={window.endAt}
                          href={createHref}
                        >
                          Prepare create handoff
                        </a>
                      {/if}
                    </article>
                  {/each}
                </div>
              {/if}
            </section>

            <section class="result-panel framed-panel" data-testid="find-time-browse-results" data-browse-count={routeState.browseCount}>
              <div class="section-heading">
                <div>
                  <p class="panel-kicker">Browse windows</p>
                  <h3>Compact follow-on inventory.</h3>
                </div>
                <span class="pill">{routeState.browseCount}</span>
              </div>

              {#if routeState.browseWindows.length === 0}
                <article class="empty-panel" data-testid="find-time-browse-empty">
                  <strong>No remaining browse windows.</strong>
                  <p>Every truthful result is already represented in the Top picks section.</p>
                </article>
              {:else}
                <div class="card-list">
                  {#each routeState.browseWindows as window, index}
                    {@const createHref = buildSuggestionCreateHref(window.startAt, window.endAt)}
                    {@const handoffWeekStart = deriveCreatePrefillWeekStart(window.startAt)}
                    <article
                      class="result-card framed-panel"
                      data-testid={`find-time-browse-window-${index}`}
                      data-start-at={window.startAt}
                      data-end-at={window.endAt}
                      data-available-members={availableNames(window)}
                      data-blocked-members={blockedNames(window)}
                    >
                      <div class="card-header">
                        <div>
                          <p class="panel-kicker">Browse {index + 1}</p>
                          <h4>{formatUtcSlot(window.startAt, window.endAt)}</h4>
                        </div>
                        <span class="pill">{window.availableMembers.length} free</span>
                      </div>
                      <p class="panel-copy"><strong>Free:</strong> {availableNames(window) || 'none'}</p>
                      {#if window.blockedMembers.length > 0}
                        <p class="panel-copy"><strong>Blocked:</strong> {blockedNames(window)}</p>
                      {/if}
                      {#if createHref && handoffWeekStart}
                        <a
                          class="button button-secondary"
                          data-testid={`find-time-browse-window-${index}-cta`}
                          data-handoff-source="find-time"
                          data-handoff-week-start={handoffWeekStart}
                          data-handoff-start-at={window.startAt}
                          data-handoff-end-at={window.endAt}
                          href={createHref}
                        >
                          Prepare create handoff
                        </a>
                      {/if}
                    </article>
                  {/each}
                </div>
              {/if}
            </section>
          </section>
        {:else if routeState}
          <article class={`status-card framed-panel ${routeState.status === 'no-results' || routeState.status === 'timeout' ? 'tone-warning' : 'tone-danger'}`} data-testid={routeState.status === 'no-results' ? 'find-time-empty-state' : 'find-time-error-state'}>
            <span class="status-card__label">Find-time status</span>
            <strong>{routeState.status}</strong>
            <p>{routeState.message}</p>
            {#if routeState.reason}
              <code>{routeState.reason}</code>
            {/if}
          </article>
        {/if}
      </div>
    {/if}
  </section>

  {#if trustedCalendars.length}
    <section class="inventory-card framed-panel">
      <div class="section-heading">
        <div>
          <p class="panel-kicker">Trusted inventory</p>
          <h3>Jump only within already-permitted calendars.</h3>
        </div>
        <span class="pill">{trustedCalendars.length}</span>
      </div>

      <div class="calendar-list">
        {#each trustedCalendars as calendar}
          <a class={`calendar-link ${activeCalendar?.id === calendar.id ? 'active' : ''}`} href={buildPresetHref(calendar.id, Number.parseInt(selectedDuration || '60', 10) || 60, selectedStart)}>
            <strong>{calendar.name}</strong>
            <span>{calendar.isDefault ? 'Primary calendar' : 'Secondary calendar'} · find-time</span>
          </a>
        {/each}
      </div>
    </section>
  {/if}
</MobileShell>

<style>
  .find-time-route,
  .inventory-card,
  .toolbar-card,
  .summary-grid,
  .result-shell,
  .result-panel,
  .card-list,
  .query-form {
    display: grid;
    gap: 0.95rem;
  }

  .hero-card,
  .inventory-card,
  .toolbar-card,
  .status-card,
  .result-card,
  .empty-panel {
    display: grid;
    gap: 0.8rem;
    padding: 1rem;
  }

  .hero-meta,
  .section-heading,
  .card-header,
  .preset-row,
  .facts-grid {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .facts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  }

  .facts-grid div {
    display: grid;
    gap: 0.28rem;
    padding: 0.78rem 0.82rem;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(34, 31, 27, 0.08);
  }

  .panel-kicker,
  .panel-copy,
  .status-card__label,
  h2,
  h3,
  h4,
  p,
  dt,
  dd,
  strong,
  code {
    margin: 0;
  }

  .panel-kicker,
  .status-card__label,
  dt {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--caluno-accent-deep);
  }

  h2 {
    font-size: clamp(1.8rem, 7vw, 2.4rem);
    line-height: 0.98;
  }

  h3 {
    font-size: 1.18rem;
    line-height: 1.08;
  }

  h4 {
    font-size: 1rem;
    line-height: 1.2;
  }

  .panel-copy,
  dd,
  .calendar-link span,
  .empty-panel p,
  .status-card p {
    color: var(--caluno-ink-muted);
    line-height: 1.55;
  }

  .query-form {
    align-items: start;
  }

  .field {
    display: grid;
    gap: 0.35rem;
  }

  .field span {
    font-weight: 700;
    color: var(--caluno-ink-strong);
  }

  .input {
    min-height: 3rem;
    border-radius: 1rem;
    border: 1px solid rgba(34, 31, 27, 0.12);
    padding: 0.8rem 0.9rem;
    font: inherit;
    background: rgba(255, 255, 255, 0.84);
    color: var(--caluno-ink-strong);
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 3rem;
    padding: 0.88rem 1rem;
    border-radius: 1rem;
    border: 1px solid transparent;
    text-decoration: none;
    font-weight: 700;
    font-size: 0.94rem;
    cursor: pointer;
  }

  .button:disabled {
    opacity: 0.64;
    cursor: not-allowed;
  }

  .button-primary {
    background: linear-gradient(135deg, #114e55, #2a8279);
    color: white;
    box-shadow: 0 18px 30px rgba(17, 78, 85, 0.18);
  }

  .button-secondary {
    color: var(--caluno-ink-strong);
    background: rgba(255, 255, 255, 0.74);
    border-color: rgba(34, 31, 27, 0.08);
  }

  .pill,
  code {
    padding: 0.34rem 0.68rem;
    border-radius: 999px;
    background: rgba(17, 78, 85, 0.08);
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--caluno-accent-deep);
  }

  .preset-pill {
    text-decoration: none;
  }

  .preset-pill--active {
    background: rgba(17, 78, 85, 0.92);
    color: white;
  }

  .result-card--top {
    border-color: rgba(17, 78, 85, 0.2);
    box-shadow: 0 14px 24px rgba(17, 78, 85, 0.08);
  }

  .calendar-list {
    display: grid;
    gap: 0.65rem;
  }

  .calendar-link {
    display: grid;
    gap: 0.2rem;
    padding: 0.9rem 0.95rem;
    border-radius: 1rem;
    text-decoration: none;
    background: rgba(255, 255, 255, 0.74);
    border: 1px solid rgba(34, 31, 27, 0.08);
    color: var(--caluno-ink-strong);
  }

  .calendar-link.active {
    border-color: rgba(17, 78, 85, 0.24);
    box-shadow: 0 12px 24px rgba(17, 78, 85, 0.12);
  }

  .tone-neutral {
    background: rgba(247, 244, 236, 0.92);
  }

  .tone-warning {
    background: rgba(255, 244, 214, 0.94);
  }

  .tone-danger {
    background: rgba(255, 231, 226, 0.94);
  }

  @media (min-width: 42rem) {
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
