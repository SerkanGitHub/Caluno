<script lang="ts">
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData | null } = $props();

  const createState = $derived(form?.createGroup ?? null);
  const joinState = $derived(form?.joinGroup ?? null);
  const groups = $derived(data.appShell.groups);
  const onboardingEmpty = $derived(data.onboardingState === 'needs-group');
</script>

<svelte:head>
  <title>Groups • Caluno</title>
</svelte:head>

<main class="workspace-shell">
  <aside class="workspace-rail framed-panel">
    <p class="eyebrow">Protected shell</p>
    <h1>{data.appShell.viewer.displayName}</h1>
    <p class="rail-copy">
      Group membership, join codes, and calendar scope were resolved on the server before this shell rendered.
    </p>

    <div class="status-stack">
      <article class={`status-card ${onboardingEmpty ? 'tone-warning' : 'tone-neutral'}`} data-testid="groups-shell">
        <span class="status-card__label">Onboarding state</span>
        <strong>{onboardingEmpty ? 'onboarding-empty' : 'workspace-ready'}</strong>
        <p>
          {onboardingEmpty
            ? 'This user does not belong to any groups yet, so the app stays on the onboarding shell.'
            : 'You can open only the groups and calendars returned by the trusted app layout load.'}
        </p>
      </article>

      {#if joinState}
        <article class={`status-card ${joinState.status === 'timeout' ? 'tone-warning' : 'tone-danger'}`} data-testid="join-error-state">
          <span class="status-card__label">Join action</span>
          <strong>{joinState.status}</strong>
          <p>{joinState.message}</p>
          <code>{joinState.reason}</code>
        </article>
      {/if}
    </div>

    <nav class="rail-links">
      {#if data.appShell.primaryCalendar}
        <a href={`/calendars/${data.appShell.primaryCalendar.id}`}>Open primary calendar</a>
      {/if}
      <a href="/logout">Sign out</a>
    </nav>
  </aside>

  <section class="workspace-main">
    <header class="hero-panel compact">
      <p class="eyebrow">Membership console</p>
      <h2>Build or join the calendars your session can actually prove.</h2>
      <p class="lede">
        Create a new group when you are starting fresh, or redeem a join code when another member has
        already established the workspace boundary.
      </p>
    </header>

    {#if onboardingEmpty}
      <section class="feature-banner tone-warning" data-testid="onboarding-empty-state">
        <span>No memberships loaded</span>
        <p>
          This account has not joined any groups yet. Create one or redeem a join code to open the protected app shell.
        </p>
      </section>
    {/if}

    <section class="action-grid">
      <article class="framed-panel action-panel">
        <div>
          <p class="panel-kicker">Create a workspace</p>
          <h3>Launch a new shared calendar boundary.</h3>
          <p class="panel-copy">
            Creating a group also provisions a default calendar and an owner-visible join code on the server.
          </p>
        </div>

        <form method="POST" action="?/createGroup" class="stacked-form">
          <label class="field">
            <span>Group name</span>
            <input
              class="input"
              name="groupName"
              placeholder="Night clinic rota"
              value={createState?.fields.groupName ?? ''}
              required
            />
          </label>

          <label class="field">
            <span>Default calendar name</span>
            <input
              class="input"
              name="calendarName"
              placeholder="Shared calendar"
              value={createState?.fields.calendarName ?? ''}
            />
          </label>

          {#if createState}
            <div class={`inline-state ${createState.status === 'timeout' ? 'tone-warning' : 'tone-danger'}`}>
              <strong>{createState.reason}</strong>
              <p>{createState.message}</p>
            </div>
          {/if}

          <button class="button button-primary" type="submit">Create protected group</button>
        </form>
      </article>

      <article class="framed-panel action-panel">
        <div>
          <p class="panel-kicker">Join existing group</p>
          <h3>Redeem an invite without widening scope.</h3>
          <p class="panel-copy">
            Join codes are normalized and validated server-side, then resolve to the group’s default calendar.
          </p>
        </div>

        <form method="POST" action="?/joinGroup" class="stacked-form">
          <label class="field">
            <span>Join code</span>
            <input
              class="input code-input"
              name="joinCode"
              placeholder="ALPHA123"
              value={joinState?.fields.joinCode ?? ''}
              autocomplete="off"
              spellcheck="false"
              required
            />
          </label>

          {#if joinState}
            <div class={`inline-state ${joinState.status === 'timeout' ? 'tone-warning' : 'tone-danger'}`}>
              <strong>{joinState.reason}</strong>
              <p>{joinState.message}</p>
            </div>
          {/if}

          <button class="button button-secondary" type="submit">Redeem join code</button>
        </form>
      </article>
    </section>

    <section class="group-grid">
      {#if groups.length === 0}
        <article class="empty-card framed-panel">
          <p class="panel-kicker">Awaiting first membership</p>
          <h3>No permitted groups yet.</h3>
          <p class="panel-copy">
            Once a membership exists, the protected layout will render the trusted group and calendar inventory here.
          </p>
        </article>
      {:else}
        {#each groups as group}
          <article class="group-card framed-panel" data-testid="group-card">
            <div class="group-card__header">
              <div>
                <p class="panel-kicker">{group.role === 'owner' ? 'Owner scope' : 'Member scope'}</p>
                <h3>{group.name}</h3>
              </div>

              <span class={`pill pill-${group.joinCodeStatus}`}>
                {group.joinCode ? `${group.joinCodeStatus} join code` : 'join code hidden'}
              </span>
            </div>

            {#if group.joinCode}
              <div class="code-strip">
                <span>Owner join code</span>
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
      {/if}
    </section>
  </section>
</main>
