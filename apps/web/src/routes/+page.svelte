<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const viewerName = $derived.by(() => {
    const metadata = (data.user?.user_metadata ?? {}) as {
      display_name?: string;
      full_name?: string;
    };

    return (
      metadata.display_name?.trim() ||
      metadata.full_name?.trim() ||
      data.user?.email?.split('@')[0] ||
      'Caluno member'
    );
  });

  const isAuthenticated = $derived(data.authStatus === 'authenticated');
</script>

<svelte:head>
  <title>Caluno</title>
</svelte:head>

<main class="landing-shell">
  <section class="hero-panel framed-panel glow-panel">
    <p class="eyebrow">Caluno secure entrypoint</p>
    <h1>Shared calendars open only after the server trusts your membership.</h1>
    <p class="lede">
      This browser entrypoint routes anonymous visitors into sign-in, keeps onboarding explicit for users with
      zero groups, and turns unauthorized calendar guesses into visible denial states.
    </p>

    <div class="hero-actions">
      {#if isAuthenticated}
        <a class="button button-primary" href="/groups">Open protected shell</a>
        <a class="button button-secondary" href="/logout">Sign out</a>
      {:else}
        <a class="button button-primary" href="/signin">Sign in</a>
      {/if}
    </div>
  </section>

  <section class="signal-grid">
    <article class={`status-card ${isAuthenticated ? 'tone-neutral' : 'tone-warning'}`}>
      <span class="status-card__label">Session state</span>
      <strong>{isAuthenticated ? `trusted for ${viewerName}` : data.authStatus}</strong>
      <p>
        {#if isAuthenticated}
          Your root session has already passed `getUser()` verification and can enter protected routes.
        {:else if data.authStatus === 'invalid'}
          The saved browser session was rejected and must be re-established before protected pages load.
        {:else}
          Anonymous visitors start from the auth entrypoint instead of the starter boilerplate.
        {/if}
      </p>
    </article>

    <article class="status-card tone-neutral">
      <span class="status-card__label">Membership model</span>
      <strong>Group-scoped by design</strong>
      <p>
        Group creation, join-code redemption, and calendar visibility derive from server-side membership proof,
        not from browser-submitted ids.
      </p>
    </article>

    <article class="status-card tone-danger">
      <span class="status-card__label">Denied path</span>
      <strong>Visible failure phase</strong>
      <p>
        Unauthorized calendar routes render an explicit access-denied surface with a reason code and failure phase.
      </p>
    </article>
  </section>
</main>
