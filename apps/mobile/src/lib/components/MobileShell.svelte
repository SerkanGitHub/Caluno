<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import type { MobileShellBootstrapMode } from '$lib/shell/load-app-shell';
  import { mobileSession } from '$lib/auth/mobile-session';

  type Props = {
    viewerName: string;
    title: string;
    subtitle: string;
    activeTab: 'groups' | 'calendar';
    shellBootstrapMode: MobileShellBootstrapMode;
    onboardingState?: 'ready' | 'needs-group' | null;
    failurePhase?: string | null;
    failureDetail?: string | null;
    primaryHref?: string | null;
    primaryLabel?: string | null;
    children?: import('svelte').Snippet;
  };

  let {
    viewerName,
    title,
    subtitle,
    activeTab,
    shellBootstrapMode,
    onboardingState = null,
    failurePhase = null,
    failureDetail = null,
    primaryHref = null,
    primaryLabel = null,
    children
  }: Props = $props();

  const shellTone = $derived.by(() => {
    if (shellBootstrapMode === 'load-failed') {
      return 'tone-danger';
    }

    if (shellBootstrapMode === 'needs-group') {
      return 'tone-warning';
    }

    return 'tone-neutral';
  });

  const shellLabel = $derived.by(() => {
    switch (shellBootstrapMode) {
      case 'ready':
        return 'trusted-ready';
      case 'needs-group':
        return 'onboarding-empty';
      case 'load-failed':
        return 'shell-load-failed';
      case 'loading':
        return 'loading-trusted-shell';
      default:
        return 'idle';
    }
  });

  let signingOut = $state(false);

  async function handleSignOut() {
    if (!browser || signingOut) {
      return;
    }

    signingOut = true;

    try {
      await mobileSession.signOut();
      const returnTo = encodeURIComponent(`${page.url.pathname}${page.url.search}`);
      await goto(`/signin?flow=signed-out&reason=AUTH_REQUIRED&returnTo=${returnTo}`, {
        replaceState: true
      });
    } finally {
      signingOut = false;
    }
  }
</script>

<div class="mobile-shell-frame" data-testid="mobile-shell-frame" data-shell-bootstrap={shellBootstrapMode} data-onboarding-state={onboardingState ?? 'unknown'}>
  <header class="mobile-shell-header framed-panel">
    <div class="shell-kicker-row">
      <p class="eyebrow">Caluno pocket shell</p>
      <div class="shell-header-actions">
        <span class="viewer-chip">{viewerName}</span>
        <button
          class="signout-chip"
          type="button"
          onclick={handleSignOut}
          disabled={signingOut}
          data-testid="mobile-shell-signout"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>

    <div class="mobile-shell-copy">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>

    <div class="status-ribbon">
      <article class={`status-pill ${shellTone}`} data-testid="mobile-shell-status">
        <span>Shell state</span>
        <strong>{shellLabel}</strong>
      </article>

      {#if onboardingState}
        <article class={`status-pill ${onboardingState === 'needs-group' ? 'tone-warning' : 'tone-neutral'}`}>
          <span>Onboarding</span>
          <strong>{onboardingState}</strong>
        </article>
      {/if}

      {#if failurePhase}
        <article class="status-pill tone-danger">
          <span>Failure phase</span>
          <strong>{failurePhase}</strong>
        </article>
      {/if}
    </div>

    {#if failureDetail}
      <p class="shell-caption">{failureDetail}</p>
    {/if}
  </header>

  <section class="mobile-shell-body">
    {@render children?.()}
  </section>

  <nav class="mobile-tab-bar framed-panel" aria-label="Primary mobile navigation">
    <a class:active={activeTab === 'groups'} href="/groups">Groups</a>
    {#if primaryHref}
      <a class:active={activeTab === 'calendar'} href={primaryHref}>{primaryLabel ?? 'Calendar'}</a>
    {:else}
      <span class="tab-placeholder">Calendar locked</span>
    {/if}
    <a href="/signin">Account</a>
  </nav>
</div>

<style>
  .mobile-shell-frame {
    min-height: 100dvh;
    display: grid;
    gap: 1rem;
    padding: max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom));
  }

  .mobile-shell-header,
  .mobile-tab-bar {
    backdrop-filter: blur(18px);
  }

  .mobile-shell-header {
    display: grid;
    gap: 1rem;
    padding: 1.15rem;
  }

  .mobile-shell-copy {
    display: grid;
    gap: 0.55rem;
  }

  .shell-kicker-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .shell-header-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .eyebrow,
  .status-pill span {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--caluno-ink-soft);
  }

  h1 {
    margin: 0;
    font-size: clamp(2.2rem, 9vw, 3.6rem);
    line-height: 0.95;
  }

  .mobile-shell-copy p,
  .shell-caption {
    margin: 0;
    color: var(--caluno-ink-muted);
    line-height: 1.55;
  }

  .viewer-chip {
    padding: 0.45rem 0.8rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(34, 31, 27, 0.08);
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--caluno-ink-strong);
  }

  .signout-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.2rem;
    padding: 0.45rem 0.85rem;
    border-radius: 999px;
    border: 1px solid rgba(34, 31, 27, 0.1);
    background: rgba(255, 255, 255, 0.72);
    color: var(--caluno-ink-strong);
    font: inherit;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
  }

  .signout-chip:disabled {
    opacity: 0.64;
    cursor: progress;
  }

  .status-ribbon {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
  }

  .status-pill {
    display: grid;
    gap: 0.2rem;
    min-width: 9rem;
    padding: 0.8rem 0.9rem;
    border-radius: 1rem;
    border: 1px solid rgba(34, 31, 27, 0.08);
  }

  .status-pill strong {
    font-size: 0.96rem;
    color: var(--caluno-ink-strong);
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

  .mobile-shell-body {
    display: grid;
    gap: 0.95rem;
    align-content: start;
  }

  .mobile-tab-bar {
    position: sticky;
    bottom: max(0.35rem, env(safe-area-inset-bottom));
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.55rem;
    padding: 0.7rem;
  }

  .mobile-tab-bar a,
  .tab-placeholder {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 3rem;
    border-radius: 999px;
    text-decoration: none;
    font-weight: 700;
    color: var(--caluno-ink-strong);
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(34, 31, 27, 0.08);
  }

  .mobile-tab-bar a.active {
    background: linear-gradient(135deg, #114e55, #2a8279);
    color: white;
    box-shadow: 0 14px 28px rgba(17, 78, 85, 0.2);
  }

  .tab-placeholder {
    color: var(--caluno-ink-soft);
  }

  @media (min-width: 48rem) {
    .mobile-shell-frame {
      width: min(44rem, calc(100% - 2rem));
      margin: 0 auto;
    }
  }
</style>
