<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import { resolveVisibleWeek } from '@repo/caluno-core/route-contract';
  import { describeDeniedCalendarReason } from '@repo/caluno-core/app-shell';
  import MobileShell from '$lib/components/MobileShell.svelte';
  import { rememberSyncedCalendarWeek } from '$lib/offline/repository';
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

  const authState = $derived(page.data.authState);
  const protectedEntry = $derived(page.data.protectedEntry);
  const attemptedCalendarId = $derived(page.params.calendarId ?? '');

  let shellResult = $state<MobileShellLoadResult | null>(null);
  let routeResult = $state<MobileCalendarRouteResult | null>(null);
  let shellBootstrapMode = $state<MobileShellBootstrapMode>('loading');
  let loading = $state(false);
  let currentScopeKey = $state<string | null>(null);
  let weekContinuityIssue = $state<{ reason: string; detail: string } | null>(null);

  const shellFailure = $derived(shellResult?.ok === false ? shellResult : null);
  const appShell = $derived(shellResult?.ok ? shellResult.appShell : null);
  const primaryHref = $derived(appShell ? primaryCalendarLandingHref(appShell) : null);
  const activeCalendar = $derived(routeResult?.kind === 'calendar' ? routeResult.state.calendar : null);
  const deniedState = $derived(routeResult?.kind === 'denied' ? routeResult.state : null);
  const deniedDetail = $derived(deniedState ? describeDeniedCalendarReason(deniedState.reason) : null);
  const routeMode = $derived<MobileShellRouteMode>(shellResult?.ok ? shellResult.routeMode : protectedEntry.routeMode);
  const snapshotOrigin = $derived<MobileSnapshotOrigin>(shellResult?.ok ? shellResult.snapshotOrigin : protectedEntry.snapshotOrigin);
  const continuityReason = $derived(
    weekContinuityIssue?.reason ?? (shellResult?.ok ? shellResult.continuity.reason : protectedEntry.continuityReason)
  );
  const continuityDetail = $derived(
    weekContinuityIssue?.detail ?? (shellResult?.ok ? shellResult.continuity.detail : protectedEntry.continuityDetail)
  );
  const lastTrustedRefreshAt = $derived(
    shellResult?.ok ? shellResult.continuity.lastTrustedRefreshAt : protectedEntry.lastTrustedRefreshAt
  );

  async function persistWeekContinuity(calendarId: string) {
    if (authState.phase !== 'authenticated' || !authState.user) {
      return;
    }

    const visibleWeek = resolveVisibleWeek(page.url.searchParams, new Date());
    const result = await rememberSyncedCalendarWeek({
      userId: authState.user.id,
      calendarId,
      weekStart: visibleWeek.start,
      syncedAt: new Date().toISOString(),
      source: 'trusted-online'
    });

    weekContinuityIssue = result.ok
      ? null
      : {
          reason: result.reason === 'repository-unavailable' ? 'storage-unavailable' : 'storage-write-failed',
          detail:
            'This calendar opened with trusted online scope, but week continuity metadata could not be stored, so offline reopen will stay unavailable until persistence recovers.'
        };
  }

  async function loadShell(force = false) {
    if (!browser || authState.phase !== 'authenticated' || !authState.user) {
      return;
    }

    loading = true;
    shellBootstrapMode = 'loading';
    weekContinuityIssue = null;
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

    if (result.ok && routeResult?.kind === 'calendar') {
      await persistWeekContinuity(routeResult.state.calendar.id);
    }

    loading = false;
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
    weekContinuityIssue = null;

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
</script>

<svelte:head>
  <title>{activeCalendar ? `${activeCalendar.name} • Caluno Mobile` : 'Calendar access • Caluno Mobile'}</title>
</svelte:head>

<MobileShell
  viewerName={appShell?.viewer.displayName ?? authState.displayName ?? 'Caluno member'}
  title={activeCalendar ? activeCalendar.name : 'Calendar access resolved from trusted scope.'}
  subtitle="This route never probes arbitrary calendar ids. It resolves the attempted id only against trusted online inventory or a previously synced cached continuity snapshot."
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
    class="calendar-stack"
    data-testid="calendar-route-state"
    data-shell-bootstrap={shellBootstrapMode}
    data-route-mode={routeMode}
    data-snapshot-origin={snapshotOrigin}
    data-continuity-reason={continuityReason ?? 'none'}
    data-last-trusted-refresh-at={lastTrustedRefreshAt ?? 'none'}
    data-denied-reason={deniedState?.reason ?? 'none'}
    data-failure-phase={deniedState?.failurePhase ?? 'none'}
    data-attempted-calendar-id={attemptedCalendarId}
  >
    {#if loading}
      <article class="hero-card framed-panel tone-neutral">
        <p class="panel-kicker">Trusted route load</p>
        <h2>Checking the permitted calendar inventory.</h2>
        <p class="panel-copy">The mobile shell is loading memberships, groups, calendars, and join-code metadata before it renders anything protected.</p>
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
    {:else if routeResult?.kind === 'calendar' && activeCalendar}
      <article class="hero-card framed-panel tone-neutral" data-testid="calendar-shell">
        <div>
          <p class="panel-kicker">Permitted calendar</p>
          <h2>{activeCalendar.name}</h2>
        </div>
        <p class="panel-copy">
          {#if routeMode === 'cached-offline'}
            This calendar reopened from cached continuity only because its id stayed within trusted shell scope and this device had previously synced week metadata for it.
          {:else if activeCalendar.isDefault}
            This is the primary calendar chosen from the shared shell helper contract.
          {:else}
            This calendar is visible because it already belongs to the trusted inventory returned for your memberships.
          {/if}
        </p>
        <div class="meta-strip">
          <span class="pill">{activeCalendar.isDefault ? 'Default calendar' : 'Secondary calendar'}</span>
          <span class="pill">{routeResult.appShell.calendars.length} trusted calendars</span>
          <span class="pill">{routeMode}</span>
        </div>
      </article>

      <article class="detail-card framed-panel">
        <p class="panel-kicker">Route integrity</p>
        <h3>No schedule probe happened here.</h3>
        <p class="panel-copy">The route accepted the attempted id only because the trusted inventory already contained it. If the id had been malformed, out of scope, or missing prior synced-week continuity, the denied state below would have rendered instead.</p>
        <dl class="facts-grid">
          <div>
            <dt>Group</dt>
            <dd>{routeResult.appShell.groups.find((group) => group.id === activeCalendar.groupId)?.name ?? 'Hidden outside scope'}</dd>
          </div>
          <div>
            <dt>Calendar id</dt>
            <dd><code>{activeCalendar.id}</code></dd>
          </div>
          <div>
            <dt>Route mode</dt>
            <dd>{routeMode}</dd>
          </div>
        </dl>
      </article>
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

  {#if appShell?.calendars?.length}
    <section class="inventory-card framed-panel">
      <div class="inventory-header">
        <div>
          <p class="panel-kicker">Visible inventory</p>
          <h3>Only already-permitted calendars appear below.</h3>
        </div>
        <span class="pill">{appShell.calendars.length} visible</span>
      </div>

      <div class="calendar-list">
        {#each appShell.calendars as calendar}
          <a class={`calendar-link ${activeCalendar?.id === calendar.id ? 'active' : ''}`} href={`/calendars/${calendar.id}`}>
            <strong>{calendar.name}</strong>
            <span>{calendar.isDefault ? 'Default calendar' : 'Secondary calendar'}</span>
          </a>
        {/each}
      </div>
    </section>
  {/if}
</MobileShell>

<style>
  .calendar-stack,
  .inventory-card {
    display: grid;
    gap: 0.95rem;
  }

  .hero-card,
  .detail-card,
  .inventory-card {
    padding: 1.05rem;
  }

  .hero-card,
  .detail-card {
    display: grid;
    gap: 0.85rem;
  }

  .panel-kicker {
    margin: 0 0 0.35rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.73rem;
    font-weight: 700;
    color: var(--caluno-accent-deep);
  }

  h2,
  h3,
  p,
  dt,
  dd {
    margin: 0;
  }

  h2 {
    font-size: 1.7rem;
    line-height: 1.04;
  }

  h3 {
    font-size: 1.3rem;
    line-height: 1.05;
  }

  .panel-copy,
  dd {
    color: var(--caluno-ink-muted);
    line-height: 1.6;
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

  dt {
    text-transform: uppercase;
    letter-spacing: 0.09em;
    font-size: 0.74rem;
    font-weight: 700;
    color: var(--caluno-ink-soft);
  }

  .denied-grid {
    margin-top: 0.35rem;
  }

  .tone-neutral {
    background: rgba(247, 244, 236, 0.9);
  }

  .tone-danger {
    background: rgba(255, 231, 226, 0.92);
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

  .calendar-link span {
    color: var(--caluno-ink-soft);
    font-size: 0.88rem;
  }

  .calendar-link.active {
    border-color: rgba(17, 78, 85, 0.24);
    box-shadow: 0 12px 24px rgba(17, 78, 85, 0.12);
  }
</style>
