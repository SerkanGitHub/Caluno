<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import MobileShell from '$lib/components/MobileShell.svelte';
  import {
    loadCachedMobileAppShell,
    loadMobileAppShell,
    primaryCalendarLandingHref,
    type MobileShellBootstrapMode,
    type MobileShellLoadResult,
    type MobileShellRouteMode,
    type MobileSnapshotOrigin
  } from '$lib/shell/load-app-shell';

  const authState = $derived(page.data.authState);
  const protectedEntry = $derived(page.data.protectedEntry);
  const landingIntent = $derived(page.url.searchParams.get('landing')?.trim() ?? null);

  let shellResult = $state<MobileShellLoadResult | null>(null);
  let shellBootstrapMode = $state<MobileShellBootstrapMode>('loading');
  let loading = $state(false);
  let currentUserId = $state<string | null>(null);
  let landingRedirected = $state(false);

  const shellFailure = $derived(shellResult?.ok === false ? shellResult : null);
  const appShell = $derived(shellResult?.ok ? shellResult.appShell : null);
  const primaryHref = $derived(appShell ? primaryCalendarLandingHref(appShell) : null);
  const groups = $derived(appShell?.groups ?? []);
  const hasError = $derived(shellFailure !== null);
  const routeMode = $derived<MobileShellRouteMode>(shellResult?.ok ? shellResult.routeMode : protectedEntry.routeMode);
  const snapshotOrigin = $derived<MobileSnapshotOrigin>(shellResult?.ok ? shellResult.snapshotOrigin : protectedEntry.snapshotOrigin);
  const continuityReason = $derived(shellResult?.ok ? shellResult.continuity.reason : protectedEntry.continuityReason);
  const continuityDetail = $derived(shellResult?.ok ? shellResult.continuity.detail : protectedEntry.continuityDetail);
  const lastTrustedRefreshAt = $derived(
    shellResult?.ok ? shellResult.continuity.lastTrustedRefreshAt : protectedEntry.lastTrustedRefreshAt
  );

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
    loading = false;
  }

  $effect(() => {
    if (!browser) {
      return;
    }

    if (authState.phase === 'authenticated' && authState.user) {
      if (currentUserId === authState.user.id && shellResult) {
        return;
      }

      currentUserId = authState.user.id;
      landingRedirected = false;
      void loadShell();
      return;
    }

    currentUserId = null;
    landingRedirected = false;

    if (protectedEntry.routeMode === 'cached-offline' && protectedEntry.cachedSnapshot) {
      shellResult = loadCachedMobileAppShell(protectedEntry.cachedSnapshot);
      shellBootstrapMode = shellResult.bootstrapMode;
      loading = false;
      return;
    }

    shellResult = null;
    shellBootstrapMode = 'idle';
    loading = false;
  });

  $effect(() => {
    if (
      !browser ||
      landingIntent !== 'primary' ||
      landingRedirected ||
      !appShell?.primaryCalendar ||
      shellBootstrapMode !== 'ready' ||
      (routeMode !== 'trusted-online' && routeMode !== 'cached-offline')
    ) {
      return;
    }

    landingRedirected = true;
    void goto(`/calendars/${appShell.primaryCalendar.id}`, { replaceState: true });
  });
</script>

<svelte:head>
  <title>Groups • Caluno Mobile</title>
</svelte:head>

<MobileShell
  viewerName={appShell?.viewer.displayName ?? authState.displayName ?? 'Caluno member'}
  title="Trusted groups, cut for a phone."
  subtitle="Your mobile shell opens only the memberships, calendars, and join-code metadata already proven online or previously stored inside trusted continuity."
  activeTab="groups"
  {shellBootstrapMode}
  {routeMode}
  {snapshotOrigin}
  {continuityReason}
  {lastTrustedRefreshAt}
  onboardingState={appShell?.onboardingState ?? null}
  failurePhase={!shellResult?.ok ? shellResult?.failurePhase : null}
  failureDetail={!shellResult?.ok ? shellResult?.detail : continuityDetail}
  primaryHref={primaryHref}
  primaryLabel={appShell?.primaryCalendar?.name ?? null}
>
  <section
    class="hero-stack"
    data-testid="groups-shell"
    data-shell-bootstrap={shellBootstrapMode}
    data-route-mode={routeMode}
    data-snapshot-origin={snapshotOrigin}
    data-continuity-reason={continuityReason ?? 'none'}
    data-last-trusted-refresh-at={lastTrustedRefreshAt ?? 'none'}
    data-onboarding-state={appShell?.onboardingState ?? 'unknown'}
  >
    <article class="hero-card framed-panel">
      <div>
        <p class="panel-kicker">Pocket overview</p>
        <h2>
          {#if routeMode === 'cached-offline'}
            Trusted continuity reopened your permitted groups.
          {:else}
            {appShell?.primaryCalendar ? 'Your first tap can be the right calendar.' : 'Protected scope is still settling.'}
          {/if}
        </h2>
      </div>
      <p class="panel-copy">
        {#if loading}
          Loading the trusted inventory for this device without widening scope.
        {:else if hasError}
          Protected content stayed hidden because the shell loader hit a typed failure.
        {:else if routeMode === 'cached-offline'}
          The live session is unavailable, but this device reopened only the previously trusted shell snapshot.
        {:else if protectedEntry.routeMode === 'denied'}
          Cached continuity stayed closed, so protected content remains hidden until trusted auth returns.
        {:else if appShell?.onboardingState === 'needs-group'}
          This account has no permitted memberships yet, so the shell stays in an explicit onboarding-empty mode.
        {:else if appShell?.primaryCalendar}
          The shared primary-calendar helper already picked the first truthful landing target for this session.
        {:else}
          The shell resolved without a primary calendar, so the groups inventory remains the only allowed surface.
        {/if}
      </p>

      <div class="hero-actions">
        {#if loading}
          <span class="button button-secondary">Loading trusted shell…</span>
        {:else if appShell?.primaryCalendar}
          <a class="button button-primary" href={primaryHref ?? '/groups'} data-testid="mobile-primary-calendar-link">
            Open {appShell.primaryCalendar.name}
          </a>
        {:else if hasError}
          <button class="button button-primary" type="button" onclick={() => loadShell(true)} disabled={!shellFailure?.retryable}>
            Retry trusted load
          </button>
        {:else}
          <a class="button button-primary" href={protectedEntry.signInHref ?? '/signin'}>Open sign-in</a>
        {/if}

        <a class="button button-secondary" href={protectedEntry.signInHref ?? '/signin'}>Account state</a>
      </div>
    </article>

    {#if shellResult?.ok === false}
      <article class="signal-card framed-panel tone-danger" data-testid="mobile-shell-load-failure">
        <span class="signal-card__label">Load failure</span>
        <strong>{shellResult.reasonCode}</strong>
        <p>{shellResult.detail}</p>
        <code>{shellResult.failurePhase}</code>
      </article>
    {:else if protectedEntry.routeMode === 'denied'}
      <article class="signal-card framed-panel tone-danger" data-testid="mobile-continuity-denied">
        <span class="signal-card__label">Continuity denied</span>
        <strong>{protectedEntry.denialReasonCode ?? 'AUTH_REQUIRED'}</strong>
        <p>{protectedEntry.continuityDetail ?? 'Protected content stayed closed because trusted continuity was unavailable.'}</p>
        {#if protectedEntry.signInHref}
          <a class="button button-secondary" href={protectedEntry.signInHref}>Sign in again</a>
        {/if}
      </article>
    {:else if appShell?.onboardingState === 'needs-group'}
      <article class="signal-card framed-panel tone-warning" data-testid="mobile-shell-onboarding">
        <span class="signal-card__label">Onboarding state</span>
        <strong>needs-group</strong>
        <p>No groups were returned by trusted memberships, so the phone shell stops here instead of guessing a calendar.</p>
      </article>
    {:else if appShell}
      <article class="signal-card framed-panel tone-neutral">
        <span class="signal-card__label">Trusted inventory</span>
        <strong>{appShell.groups.length} groups / {appShell.calendars.length} calendars</strong>
        <p>
          {routeMode === 'cached-offline'
            ? 'All navigation below comes from the stored trusted shell snapshot and remains locked to the previously synced scope.'
            : 'All navigation below comes directly from the shaped app-shell inventory, not from route guessing.'}
        </p>
      </article>
    {/if}
  </section>

  <section class="group-stack">
    {#if !loading && appShell && appShell.groups.length > 0}
      {#each appShell.groups as group}
        <article class="group-card framed-panel" data-testid="mobile-group-card">
          <div class="group-card__header">
            <div>
              <p class="panel-kicker">{group.role === 'owner' ? 'Owner scope' : 'Member scope'}</p>
              <h3>{group.name}</h3>
            </div>
            <span class={`pill pill-${group.joinCodeStatus}`}>{group.joinCodeStatus}</span>
          </div>

          {#if group.joinCode}
            <div class="code-strip">
              <span>Visible join code</span>
              <code>{group.joinCode}</code>
            </div>
          {/if}

          <div class="calendar-list">
            {#each group.calendars as calendar}
              <a class="calendar-link" href={`/calendars/${calendar.id}`}>
                <strong>{calendar.name}</strong>
                <span>{calendar.isDefault ? 'Default calendar' : 'Secondary calendar'}</span>
              </a>
            {/each}
          </div>
        </article>
      {/each}
    {:else if !loading && appShell}
      <article class="empty-card framed-panel">
        <p class="panel-kicker">Awaiting first membership</p>
        <h3>No permitted groups yet.</h3>
        <p class="panel-copy">Once trusted memberships exist, this route will list only the groups and calendars returned by that inventory load.</p>
      </article>
    {/if}
  </section>
</MobileShell>

<style>
  .hero-stack,
  .group-stack {
    display: grid;
    gap: 0.95rem;
  }

  .hero-card,
  .signal-card,
  .group-card,
  .empty-card {
    display: grid;
    gap: 0.85rem;
    padding: 1.05rem;
  }

  .panel-kicker,
  .signal-card__label {
    margin: 0 0 0.35rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.73rem;
    font-weight: 700;
    color: var(--caluno-accent-deep);
  }

  h2,
  h3,
  p {
    margin: 0;
  }

  h2 {
    font-size: 1.6rem;
    line-height: 1.05;
  }

  h3 {
    font-size: 1.25rem;
    line-height: 1.05;
  }

  .panel-copy,
  .signal-card p {
    color: var(--caluno-ink-muted);
    line-height: 1.6;
  }

  .hero-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
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

  .signal-card strong,
  .code-strip code {
    color: var(--caluno-ink-strong);
  }

  .signal-card code {
    justify-self: start;
    padding: 0.28rem 0.55rem;
    border-radius: 999px;
    background: rgba(17, 78, 85, 0.08);
    font-size: 0.78rem;
    font-weight: 700;
  }

  .tone-neutral {
    background: rgba(247, 244, 236, 0.9);
  }

  .tone-warning {
    background: rgba(255, 244, 214, 0.92);
  }

  .tone-danger {
    background: rgba(255, 231, 226, 0.92);
  }

  .group-card__header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 0.8rem;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.4rem 0.65rem;
    border-radius: 999px;
    font-size: 0.76rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: rgba(17, 78, 85, 0.08);
    color: var(--caluno-accent-deep);
  }

  .pill-active {
    background: rgba(32, 132, 90, 0.12);
    color: #155f43;
  }

  .pill-expired,
  .pill-revoked {
    background: rgba(181, 65, 47, 0.12);
    color: #8d2a1b;
  }

  .pill-unavailable {
    background: rgba(122, 112, 100, 0.12);
    color: #5b5248;
  }

  .code-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.8rem 0.9rem;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.76);
    border: 1px dashed rgba(34, 31, 27, 0.12);
  }

  .code-strip span,
  .calendar-link span {
    color: var(--caluno-ink-soft);
    font-size: 0.88rem;
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

  .calendar-link strong {
    font-size: 1rem;
  }
</style>
