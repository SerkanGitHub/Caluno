<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { bootstrapMobileSession, mobileSession } from '$lib/auth/mobile-session';

  let email = $state('');
  let password = $state('');
  let submitting = $state(false);

  const authState = $derived($mobileSession);
  const flow = $derived(page.url.searchParams.get('flow')?.trim() ?? 'ready');
  const reason = $derived(page.url.searchParams.get('reason')?.trim().toUpperCase() ?? null);
  const returnTo = $derived(normalizeInternalPath(page.url.searchParams.get('returnTo'), '/groups?landing=primary'));
  const surface = $derived.by(() => resolveSurface(authState, flow, reason));
  const formBlocked = $derived(authState.phase === 'error' && authState.failurePhase === 'config');

  function normalizeInternalPath(input: string | null | undefined, fallback = '/groups') {
    if (!input) {
      return fallback;
    }

    const normalized = input.trim();

    if (!normalized.startsWith('/') || normalized.startsWith('//')) {
      return fallback;
    }

    return normalized;
  }

  function resolveSurface(
    state: typeof authState,
    currentFlow: string,
    currentReason: string | null
  ) {
    if (state.phase === 'authenticated') {
      return {
        eyebrow: 'Trusted session ready',
        title: 'Your mobile session is trusted.',
        detail: state.detail,
        tone: 'neutral' as const,
        stateLabel: state.displayName ? `trusted for ${state.displayName}` : 'trusted',
        reasonCode: null as string | null
      };
    }

    if (state.phase === 'invalid-session') {
      return {
        eyebrow: 'Session reset',
        title: 'We refused an untrusted saved session.',
        detail: state.detail,
        tone: 'warning' as const,
        stateLabel: 'invalid-session',
        reasonCode: state.reasonCode
      };
    }

    if (state.phase === 'error') {
      return {
        eyebrow: state.failurePhase === 'config' ? 'Configuration blocked' : 'Auth needs attention',
        title:
          state.failurePhase === 'config'
            ? 'Public Supabase config is missing.'
            : state.failurePhase === 'sign-out'
              ? 'Sign-out could not be confirmed.'
              : 'Trusted auth could not finish cleanly.',
        detail: state.detail,
        tone: 'danger' as const,
        stateLabel: 'auth-error',
        reasonCode: state.reasonCode
      };
    }

    if (state.phase === 'bootstrapping') {
      return {
        eyebrow: 'Validating session',
        title: 'Checking for a trusted mobile session.',
        detail: state.detail,
        tone: 'neutral' as const,
        stateLabel: 'bootstrapping',
        reasonCode: null as string | null
      };
    }

    if (currentFlow === 'invalid-session') {
      return {
        eyebrow: 'Session reset',
        title: 'Sign in again to reopen your calendars.',
        detail:
          'A saved session was rejected during trusted validation, so Caluno kept the mobile shell closed until a fresh sign-in succeeds.',
        tone: 'warning' as const,
        stateLabel: 'signed-out',
        reasonCode: currentReason ?? 'INVALID_SESSION'
      };
    }

    if (currentFlow === 'auth-required') {
      return {
        eyebrow: 'Protected route',
        title: 'Sign in to open your permitted calendars.',
        detail:
          'Protected mobile routes redirect here until a trusted session exists, so stale local auth never reopens the shell silently.',
        tone: 'warning' as const,
        stateLabel: 'signed-out',
        reasonCode: currentReason ?? 'AUTH_REQUIRED'
      };
    }

    return {
      eyebrow: 'Trusted entrypoint',
      title: 'Open Caluno with email and password.',
      detail:
        'This mobile entrypoint validates saved sessions on boot and stays explicit about signed-out, invalid-session, and auth-error states.',
      tone: 'neutral' as const,
      stateLabel: 'signed-out',
      reasonCode: currentReason
    };
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    submitting = true;

    try {
      const nextState = await mobileSession.signIn({ email, password });

      if (nextState.phase === 'authenticated') {
        password = '';
        await goto(returnTo, { replaceState: true });
      }
    } finally {
      submitting = false;
    }
  }

  async function handleRetryBootstrap() {
    submitting = true;

    try {
      const nextState = await bootstrapMobileSession({ force: true });

      if (nextState.phase === 'authenticated') {
        await goto(returnTo, { replaceState: true });
      }
    } finally {
      submitting = false;
    }
  }

  function handleReset() {
    password = '';
    mobileSession.reset();
  }

  async function handleSignOut() {
    submitting = true;

    try {
      await mobileSession.signOut();
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Sign in • Caluno Mobile</title>
</svelte:head>

<main class="auth-shell">
  <section class="hero-card">
    <p class="eyebrow">{surface.eyebrow}</p>
    <h1>{surface.title}</h1>
    <p class="lede">{surface.detail}</p>

    <div class="signal-grid">
      <article
        class={`signal-card tone-${surface.tone}`}
        data-testid="mobile-auth-state"
        data-auth-phase={authState.phase}
        data-auth-failure-phase={authState.failurePhase ?? 'none'}
        data-auth-reason={surface.reasonCode ?? 'none'}
      >
        <span class="signal-card__label">Trusted auth state</span>
        <strong>{surface.stateLabel}</strong>
        <p>{surface.detail}</p>
        {#if surface.reasonCode}
          <code>{surface.reasonCode}</code>
        {/if}
      </article>

      <article class="signal-card tone-neutral" data-testid="mobile-auth-scope-promise">
        <span class="signal-card__label">Scope promise</span>
        <strong>No guessed calendars</strong>
        <p>Only memberships and calendars backed by a trusted session are allowed to open the mobile shell.</p>
      </article>
    </div>
  </section>

  <section class="form-card">
    <div class="form-copy">
      <p class="panel-kicker">Email/password access</p>
      <h2>Request a trusted mobile session.</h2>
      <p>
        Mobile stays on password auth in this slice. Cached sessions are revalidated on boot before the
        protected shell can open.
      </p>
    </div>

    {#if formBlocked}
      <div class="blocked-state" data-testid="mobile-auth-config-error">
        <strong>Configuration required</strong>
        <p>{authState.detail}</p>
      </div>
    {:else}
      <form class="auth-form" onsubmit={handleSubmit} data-testid="mobile-signin-form">
        <label class="field">
          <span>Email</span>
          <input
            class="input"
            type="email"
            name="email"
            autocomplete="email"
            placeholder="alice@example.com"
            bind:value={email}
            data-testid="mobile-signin-email"
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
            bind:value={password}
            data-testid="mobile-signin-password"
            required
          />
        </label>

        <button class="button button-primary" type="submit" disabled={submitting} data-testid="mobile-signin-submit">
          {submitting ? 'Checking session…' : 'Request trusted session'}
        </button>
      </form>
    {/if}

    <div class="actions" data-testid="mobile-auth-actions">
      <button class="button button-secondary" type="button" onclick={handleRetryBootstrap} disabled={submitting}>
        Retry validation
      </button>
      <button class="button button-secondary" type="button" onclick={handleReset} disabled={submitting}>
        Reset to sign-in
      </button>
      {#if authState.phase === 'authenticated'}
        <button class="button button-secondary" type="button" onclick={handleSignOut} disabled={submitting}>
          Sign out
        </button>
      {/if}
    </div>
  </section>
</main>

<style>
  .auth-shell {
    min-height: 100vh;
    display: grid;
    gap: 1.1rem;
    padding: 1rem;
  }

  .hero-card,
  .form-card {
    display: grid;
    gap: 1rem;
    padding: 1.35rem;
    border-radius: 1.5rem;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 20px 45px rgba(33, 28, 23, 0.1);
    backdrop-filter: blur(16px);
  }

  .eyebrow,
  .panel-kicker,
  .signal-card__label {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .eyebrow,
  .panel-kicker {
    color: #266b67;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  h1 {
    font-size: clamp(2.1rem, 9vw, 3.5rem);
    line-height: 0.95;
  }

  h2 {
    font-size: 1.3rem;
  }

  .lede,
  .form-copy p,
  .signal-card p,
  .blocked-state p {
    color: #4c443b;
    line-height: 1.55;
  }

  .signal-grid {
    display: grid;
    gap: 0.85rem;
  }

  .signal-card {
    display: grid;
    gap: 0.4rem;
    padding: 1rem;
    border-radius: 1.1rem;
    border: 1px solid rgba(23, 20, 17, 0.08);
  }

  .signal-card strong,
  .blocked-state strong {
    font-size: 1.05rem;
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

  .tone-neutral {
    background: rgba(244, 246, 246, 0.92);
  }

  .tone-warning {
    background: rgba(255, 244, 214, 0.92);
  }

  .tone-danger {
    background: rgba(255, 232, 229, 0.92);
  }

  .auth-form,
  .actions {
    display: grid;
    gap: 0.85rem;
  }

  .field {
    display: grid;
    gap: 0.45rem;
    font-weight: 600;
  }

  .input {
    min-height: 3rem;
    padding: 0.85rem 1rem;
    border-radius: 1rem;
    border: 1px solid rgba(23, 20, 17, 0.12);
    background: rgba(255, 255, 255, 0.92);
    font: inherit;
    color: inherit;
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 3rem;
    padding: 0.9rem 1.1rem;
    border-radius: 999px;
    border: none;
    font: inherit;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
  }

  .button:disabled {
    opacity: 0.62;
    cursor: progress;
  }

  .button-primary {
    background: linear-gradient(135deg, #1b6a66, #2f8d86);
    color: white;
  }

  .button-secondary {
    background: rgba(255, 255, 255, 0.72);
    color: #171411;
    border: 1px solid rgba(23, 20, 17, 0.12);
  }

  .blocked-state {
    display: grid;
    gap: 0.4rem;
    padding: 1rem;
    border-radius: 1rem;
    background: rgba(255, 232, 229, 0.92);
    border: 1px solid rgba(181, 65, 47, 0.15);
  }

  @media (min-width: 48rem) {
    .auth-shell {
      width: min(40rem, calc(100% - 2rem));
      margin: 0 auto;
      padding-block: 2rem;
    }
  }
</style>
