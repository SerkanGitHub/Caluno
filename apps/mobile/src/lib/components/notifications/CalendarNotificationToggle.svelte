<script lang="ts">
  import { presentCalendarNotificationState, type CalendarNotificationPresentation } from '$lib/notifications/presentation';
  import type { MobileNotificationRuntimeCalendarState } from '$lib/notifications/runtime';

  type Props = {
    calendarId: string;
    calendarName: string;
    state?: Partial<MobileNotificationRuntimeCalendarState> | null;
    interactive?: boolean;
    saving?: boolean;
    fallbackDetail?: string | null;
    surface?: 'group-row' | 'calendar-panel';
    onToggle?: ((desiredEnabled: boolean) => void | Promise<void>) | null;
  };

  let {
    calendarId,
    calendarName,
    state = null,
    interactive = false,
    saving = false,
    fallbackDetail = null,
    surface = 'group-row',
    onToggle = null
  }: Props = $props();

  const presentation = $derived<CalendarNotificationPresentation>(
    presentCalendarNotificationState({
      calendarId,
      state,
      interactive,
      saving,
      fallbackDetail
    })
  );
  const toggleId = $derived(`calendar-notification-toggle-${calendarId}`);
  const surfaceTone = $derived.by(() => {
    if (presentation.phase === 'degraded') {
      return 'tone-warning';
    }

    if (presentation.desiredEnabled) {
      return 'tone-active';
    }

    return 'tone-neutral';
  });
  const statusCopy = $derived.by(() => {
    if (presentation.saving) {
      return 'Saving this calendar state.';
    }

    if (presentation.reason === 'permission-denied') {
      return 'Permission is denied, so the toggle keeps intent visible while reminders stay blocked.';
    }

    if (presentation.remoteSubscription === 'degraded' || presentation.remoteSubscription === 'provider-unconfigured') {
      return 'Remote shared-calendar changes are degraded, even if local reminders still exist.';
    }

    if (presentation.readOnly) {
      return 'This control is visible but read only until trusted notification state settles.';
    }

    return presentation.desiredEnabled
      ? 'This calendar is trying to keep both local reminders and shared-calendar changes in sync.'
      : 'This calendar will stay quiet until you enable both reminder and shared-change delivery.';
  });

  function handleChange(event: Event) {
    if (!onToggle) {
      return;
    }

    const nextValue = (event.currentTarget as HTMLInputElement).checked;
    void onToggle(nextValue);
  }
</script>

<section
  class={`notification-toggle framed-panel ${surfaceTone} ${surface === 'calendar-panel' ? 'calendar-panel' : 'group-row'}`}
  data-testid="calendar-notification-toggle"
  data-calendar-id={calendarId}
  data-notification-enabled={presentation.desiredEnabled ? 'true' : 'false'}
  data-notification-permission={presentation.permission}
  data-local-reminders={presentation.localReminders}
  data-remote-subscription={presentation.remoteSubscription}
  data-notification-phase={presentation.phase}
  data-notification-reason={presentation.reason ?? 'none'}
  data-notification-read-only={presentation.readOnly ? 'true' : 'false'}
  data-local-sync-phase={presentation.localSyncPhase}
  data-remote-registration={presentation.remoteRegistration}
>
  <div class="toggle-header">
    <div class="toggle-copy">
      <p class="toggle-kicker">Calm notifications</p>
      <h3>{calendarName}</h3>
      <p>{statusCopy}</p>
    </div>

    <label class={`switch ${presentation.readOnly ? 'is-readonly' : ''}`} for={toggleId}>
      <input
        id={toggleId}
        data-testid="calendar-notification-switch"
        type="checkbox"
        role="switch"
        checked={presentation.desiredEnabled}
        disabled={presentation.readOnly || !onToggle}
        onchange={handleChange}
      />
      <span class="switch-track" aria-hidden="true">
        <span class="switch-thumb"></span>
      </span>
      <span class="switch-label">{presentation.desiredEnabled ? 'On' : 'Off'}</span>
    </label>
  </div>

  <div class="state-grid">
    <article class="state-pill">
      <span>Permission</span>
      <strong>{presentation.permission}</strong>
    </article>
    <article class="state-pill">
      <span>Local reminders</span>
      <strong>{presentation.localReminders}</strong>
    </article>
    <article class="state-pill">
      <span>Shared changes</span>
      <strong>{presentation.remoteSubscription}</strong>
    </article>
    <article class="state-pill">
      <span>Phase</span>
      <strong>{presentation.phase}</strong>
    </article>
  </div>

  <div class="diag-strip">
    <span class="diag-chip">reason: {presentation.reason ?? 'none'}</span>
    <span class="diag-chip">reminders: {presentation.localReminderCount}</span>
    <span class="diag-chip">registration: {presentation.remoteRegistration}</span>
    {#if presentation.lastReminderResyncAt}
      <span class="diag-chip">last sync: {presentation.lastReminderResyncAt}</span>
    {/if}
  </div>

  <p class="toggle-detail">{presentation.detail}</p>
</section>

<style>
  .notification-toggle {
    display: grid;
    gap: 0.85rem;
    padding: 0.95rem;
    border: 1px solid rgba(34, 31, 27, 0.08);
  }

  .group-row {
    background: rgba(255, 255, 255, 0.84);
  }

  .calendar-panel {
    background: rgba(255, 255, 255, 0.9);
  }

  .tone-neutral {
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24);
  }

  .tone-active {
    background: linear-gradient(180deg, rgba(238, 248, 246, 0.96), rgba(255, 255, 255, 0.9));
    border-color: rgba(17, 78, 85, 0.16);
  }

  .tone-warning {
    background: rgba(255, 244, 214, 0.86);
    border-color: rgba(181, 130, 48, 0.18);
  }

  .toggle-header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 0.9rem;
  }

  .toggle-copy {
    display: grid;
    gap: 0.3rem;
  }

  .toggle-kicker,
  .state-pill span {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--caluno-accent-deep);
  }

  h3,
  p {
    margin: 0;
  }

  h3 {
    font-size: 1rem;
    line-height: 1.05;
    color: var(--caluno-ink-strong);
  }

  .toggle-copy p,
  .toggle-detail {
    color: var(--caluno-ink-muted);
    line-height: 1.5;
  }

  .switch {
    display: inline-grid;
    justify-items: center;
    gap: 0.45rem;
    min-width: 5.5rem;
  }

  .switch input {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .switch-track {
    position: relative;
    inline-size: 3.5rem;
    block-size: 2rem;
    border-radius: 999px;
    background: rgba(122, 112, 100, 0.2);
    border: 1px solid rgba(34, 31, 27, 0.08);
    transition: background 160ms ease;
  }

  .switch-thumb {
    position: absolute;
    inset: 0.2rem auto 0.2rem 0.2rem;
    inline-size: 1.5rem;
    border-radius: 999px;
    background: white;
    box-shadow: 0 8px 18px rgba(34, 31, 27, 0.18);
    transition: transform 160ms ease;
  }

  .switch input:checked + .switch-track {
    background: linear-gradient(135deg, #114e55, #2a8279);
  }

  .switch input:checked + .switch-track .switch-thumb {
    transform: translateX(1.45rem);
  }

  .switch-label {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--caluno-ink-strong);
  }

  .is-readonly {
    opacity: 0.72;
  }

  .state-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .state-pill,
  .diag-chip {
    border-radius: 0.9rem;
    background: rgba(255, 255, 255, 0.74);
    border: 1px solid rgba(34, 31, 27, 0.08);
  }

  .state-pill {
    display: grid;
    gap: 0.22rem;
    padding: 0.7rem 0.75rem;
  }

  .state-pill strong {
    font-size: 0.92rem;
    color: var(--caluno-ink-strong);
  }

  .diag-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .diag-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.35rem 0.55rem;
    font-size: 0.76rem;
    color: var(--caluno-ink-muted);
  }

  @media (max-width: 30rem) {
    .toggle-header {
      grid-template-columns: 1fr;
      display: grid;
    }

    .switch {
      justify-items: start;
    }
  }
</style>
