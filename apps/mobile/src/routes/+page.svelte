<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function buildDestination() {
    if (data.authState.phase === 'authenticated') {
      return '/groups';
    }

    const reason = data.authState.phase === 'invalid-session' ? 'INVALID_SESSION' : 'AUTH_REQUIRED';
    const flow = data.authState.phase === 'invalid-session' ? 'invalid-session' : 'auth-required';
    return `/signin?flow=${flow}&reason=${reason}&returnTo=${encodeURIComponent('/groups')}`;
  }

  const handoffLabel = $derived.by(() => {
    switch (data.authState.phase) {
      case 'authenticated':
        return data.authState.displayName ? `trusted for ${data.authState.displayName}` : 'trusted';
      case 'invalid-session':
        return 'invalid-session';
      case 'error':
        return 'auth-error';
      case 'signed-out':
        return 'signed-out';
      default:
        return 'bootstrapping';
    }
  });

  $effect(() => {
    if (!browser || data.authState.phase === 'bootstrapping' || data.authState.phase === 'error') {
      return;
    }

    void goto(buildDestination(), { replaceState: true });
  });
</script>

<svelte:head>
  <title>Caluno Mobile</title>
</svelte:head>

<main class="handoff-shell">
  <section class="handoff-card" data-testid="mobile-auth-handoff" data-auth-phase={data.authState.phase}>
    <p class="eyebrow">Caluno mobile handoff</p>
    <h1>Trusted mobile auth decides the first route.</h1>
    <p class="copy">
      The mobile shell waits for explicit session validation before opening protected calendars. While
      that settles, this root route stays an honest handoff surface instead of a starter placeholder.
    </p>

    <article class={`signal-card tone-${data.authState.phase === 'error' ? 'danger' : data.authState.phase === 'invalid-session' ? 'warning' : 'neutral'}`}>
      <span class="signal-card__label">Current auth phase</span>
      <strong>{handoffLabel}</strong>
      <p>{data.authState.detail}</p>
      {#if data.authState.reasonCode}
        <code>{data.authState.reasonCode}</code>
      {/if}
    </article>

    <div class="actions">
      <a class="button button-primary" href={buildDestination()}>
        {data.authState.phase === 'authenticated' ? 'Open protected shell' : 'Open sign-in'}
      </a>
      <a class="button button-secondary" href="/signin">View sign-in surface</a>
    </div>
  </section>
</main>

<style>
  .handoff-shell {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 2rem 1.25rem;
  }

  .handoff-card {
    width: min(32rem, 100%);
    display: grid;
    gap: 1.2rem;
    padding: 1.75rem;
    border-radius: 1.5rem;
    background: rgba(255, 255, 255, 0.88);
    box-shadow: 0 24px 54px rgba(33, 28, 23, 0.12);
    backdrop-filter: blur(16px);
  }

  .eyebrow {
    margin: 0;
    color: #266b67;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.78rem;
    font-weight: 700;
  }

  h1 {
    margin: 0;
    font-size: clamp(2.2rem, 8vw, 3.4rem);
    line-height: 0.95;
  }

  .copy {
    margin: 0;
    color: #4c443b;
    line-height: 1.6;
  }

  .signal-card {
    display: grid;
    gap: 0.45rem;
    padding: 1rem;
    border-radius: 1.1rem;
    border: 1px solid rgba(23, 20, 17, 0.08);
  }

  .signal-card strong {
    font-size: 1.1rem;
  }

  .signal-card p {
    margin: 0;
    color: #4c443b;
    line-height: 1.55;
  }

  .signal-card code {
    justify-self: start;
    padding: 0.25rem 0.55rem;
    border-radius: 999px;
    background: rgba(38, 107, 103, 0.12);
    color: #184b48;
    font-size: 0.8rem;
    font-weight: 700;
  }

  .signal-card__label {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.75rem;
    font-weight: 700;
    color: #6a6056;
  }

  .tone-neutral {
    background: rgba(244, 246, 246, 0.92);
  }

  .tone-warning {
    background: rgba(255, 244, 214, 0.92);
  }

  .tone-danger {
    background: rgba(255, 232, 229, 0.92);
  }

  .actions {
    display: grid;
    gap: 0.75rem;
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 3rem;
    padding: 0.9rem 1.1rem;
    border-radius: 999px;
    text-decoration: none;
    font-weight: 700;
  }

  .button-primary {
    background: linear-gradient(135deg, #1b6a66, #2f8d86);
    color: white;
  }

  .button-secondary {
    border: 1px solid rgba(23, 20, 17, 0.12);
    color: #171411;
    background: rgba(255, 255, 255, 0.72);
  }
</style>
