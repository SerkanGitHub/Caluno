<script lang="ts">
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData | null } = $props();

  const signInState = $derived(form?.signIn ?? null);
  const surfaceTone = $derived.by(() => {
    if (!signInState) {
      return data.authSurface.tone;
    }

    return signInState.status === 'timeout' ? 'warning' : 'danger';
  });
</script>

<svelte:head>
  <title>Sign in • Caluno</title>
</svelte:head>

<main class="auth-shell">
  <section class="hero-panel">
    <p class="eyebrow">{data.authSurface.eyebrow}</p>
    <h1>{data.authSurface.title}</h1>
    <p class="lede">{data.authSurface.detail}</p>

    <div class="diagnostic-grid">
      <article class={`status-card tone-${surfaceTone}`} data-testid="signed-out-entrypoint">
        <span class="status-card__label">Trusted auth state</span>
        <strong>{signInState ? signInState.status : data.authSurface.state}</strong>
        <p>
          {signInState ? signInState.message : 'Server-side session verification runs before any group or calendar shell is opened.'}
        </p>
        {#if (signInState?.reason ?? data.authSurface.reasonCode) !== null}
          <code>{signInState?.reason ?? data.authSurface.reasonCode}</code>
        {/if}
      </article>

      <article class="status-card tone-neutral">
        <span class="status-card__label">Scope promise</span>
        <strong>No guessed calendars</strong>
        <p>
          After sign-in, the app shell loads only the memberships and calendars your trusted session can prove.
        </p>
      </article>
    </div>
  </section>

  <section class="form-panel framed-panel">
    <div>
      <p class="panel-kicker">Email/password access</p>
      <h2>Open your shared scheduling workspace.</h2>
      <p class="panel-copy">
        Use the same Supabase credentials that back your group memberships. Callback and logout failures
        collapse into high-level reason codes here instead of leaking provider details.
      </p>
    </div>

    <form method="POST" class="auth-form">
      <input type="hidden" name="returnTo" value={data.returnTo} />

      <label class="field">
        <span>Email</span>
        <input
          class="input"
          type="email"
          name="email"
          autocomplete="email"
          placeholder="alice@example.com"
          value={signInState?.fields.email ?? ''}
          required
        />
      </label>

      <label class="field">
        <span>Password</span>
        <input
          class="input"
          type="password"
          name="password"
          autocomplete="current-password"
          placeholder="••••••••••••"
          required
        />
      </label>

      <button class="button button-primary" type="submit">Request trusted session</button>
    </form>

    <div class="form-footnote">
      <span>Protected routes redirect here automatically.</span>
      <a href="/">Return to the public entrypoint</a>
    </div>
  </section>
</main>
