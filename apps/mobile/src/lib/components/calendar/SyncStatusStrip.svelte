<script lang="ts">
  import type { CalendarControllerFailure } from '@repo/caluno-core/schedule/types';
  import type { MobileCalendarControllerState, MobileOfflineRouteMode } from '$lib/offline/controller';

  type Props = {
    routeMode: MobileOfflineRouteMode;
    controllerState: MobileCalendarControllerState;
    canRefresh: boolean;
    canMutate: boolean;
    refreshing: boolean;
    retrying: boolean;
    onRefresh: () => void | Promise<void>;
    onRetryDrain: () => void | Promise<void>;
  };

  let {
    routeMode,
    controllerState,
    canRefresh,
    canMutate,
    refreshing,
    retrying,
    onRefresh,
    onRetryDrain
  }: Props = $props();

  const queueSummary = $derived(
    `${controllerState.pendingQueueLength} pending / ${controllerState.retryableQueueLength} retryable`
  );
  const queueTone = $derived.by(() => {
    if (controllerState.queueState === 'malformed' || controllerState.retryableQueueLength > 0) {
      return 'tone-danger';
    }

    if (
      controllerState.queueState === 'unavailable' ||
      controllerState.syncPhase === 'draining' ||
      controllerState.pendingQueueLength > 0 ||
      controllerState.network === 'offline'
    ) {
      return 'tone-warning';
    }

    return 'tone-neutral';
  });
  const refreshTone = $derived.by(() => {
    if (controllerState.lastSyncError) {
      return 'tone-danger';
    }

    if (controllerState.syncPhase === 'draining' || refreshing) {
      return 'tone-warning';
    }

    return 'tone-neutral';
  });
  const sourceCopy = $derived.by(() => {
    if (routeMode === 'cached-offline' && controllerState.snapshotOrigin !== 'server-sync') {
      return 'Reopened from cached continuity';
    }

    if (controllerState.boardSource === 'cached-local') {
      return 'Showing cached local board';
    }

    return 'Showing trusted server sync';
  });
  const sourceDetail = $derived.by(() => {
    if (routeMode === 'cached-offline' && !canRefresh) {
      return 'This calendar reopened from a previously synced week. Sign back in before trusted refresh can resume.';
    }

    if (controllerState.retryableQueueLength > 0) {
      return 'Reconnect is paused because at least one mobile-local write must be retried before the queue can drain again.';
    }

    if (controllerState.pendingQueueLength > 0 && controllerState.network === 'offline') {
      return 'Local edits are staged on-device and will drain through the trusted mobile transport after connectivity returns.';
    }

    if (controllerState.pendingQueueLength > 0) {
      return 'Local edits are already staged. The queue is waiting for trusted confirmation.';
    }

    return routeMode === 'cached-offline'
      ? 'The current week is coming from the cached snapshot for this permitted calendar.'
      : 'The visible week is currently in step with the trusted mobile transport.';
  });
  const retryableFailure = $derived<CalendarControllerFailure | null>(controllerState.lastRetryableFailure ?? null);
</script>

<section
  class="sync-strip"
  data-testid="calendar-sync-strip"
  data-route-mode={routeMode}
  data-board-source={controllerState.boardSource}
  data-network={controllerState.network}
  data-queue-state={controllerState.queueState}
  data-pending-count={controllerState.pendingQueueLength}
  data-retryable-count={controllerState.retryableQueueLength}
  data-sync-phase={controllerState.syncPhase}
  data-snapshot-origin={controllerState.snapshotOrigin ?? 'none'}
  data-last-retryable-reason={retryableFailure?.reason ?? 'none'}
>
  <article class={`signal-card framed-panel ${refreshTone}`}>
    <div class="signal-card__header">
      <div>
        <p class="panel-kicker">Sync phase</p>
        <h3>{controllerState.syncPhase}</h3>
      </div>
      <span class="pill pill-deep">{controllerState.network}</span>
    </div>

    <p class="panel-copy">
      {#if controllerState.lastSyncAttemptAt}
        Last reconnect attempt: <code>{controllerState.lastSyncAttemptAt}</code>
      {:else}
        No reconnect attempt has been recorded on this calendar yet.
      {/if}
    </p>

    {#if controllerState.lastSyncError}
      <article class="inline-state tone-danger" data-testid="calendar-sync-error">
        <strong>{controllerState.lastSyncError.reason}</strong>
        <p>{controllerState.lastSyncError.detail}</p>
      </article>
    {/if}

    <div class="sync-strip__actions">
      <button class="button button-secondary" type="button" onclick={() => onRefresh()} disabled={!canRefresh || refreshing} data-testid="calendar-refresh-button">
        {refreshing ? 'Refreshing…' : 'Refresh trusted week'}
      </button>
      <button
        class="button button-primary"
        type="button"
        onclick={() => onRetryDrain()}
        disabled={!canRefresh || retrying || controllerState.queueLength === 0}
        data-testid="calendar-drain-button"
      >
        {retrying ? 'Draining…' : controllerState.retryableQueueLength > 0 ? 'Retry queue' : 'Drain queue'}
      </button>
    </div>
  </article>

  <article class={`signal-card framed-panel ${queueTone}`} data-testid="calendar-queue-strip">
    <div class="signal-card__header">
      <div>
        <p class="panel-kicker">Queue state</p>
        <h3>{sourceCopy}</h3>
      </div>
      <span class="pill pill-soft">{queueSummary}</span>
    </div>

    <p class="panel-copy">{sourceDetail}</p>

    <dl class="facts-grid">
      <div>
        <dt>Snapshot</dt>
        <dd>{controllerState.snapshotOrigin ?? 'none'}</dd>
      </div>
      <div>
        <dt>Queue contract</dt>
        <dd>{controllerState.queueState}</dd>
      </div>
      <div>
        <dt>Writes</dt>
        <dd>{canMutate ? 'editable local-first surface' : 'read-only continuity surface'}</dd>
      </div>
    </dl>

    {#if controllerState.queueDetail}
      <article class={`inline-state ${controllerState.queueState === 'malformed' ? 'tone-danger' : 'tone-warning'}`}>
        <strong>{controllerState.queueReason ?? 'QUEUE_STATE'}</strong>
        <p>{controllerState.queueDetail}</p>
      </article>
    {/if}

    {#if retryableFailure}
      <article class="inline-state tone-danger" data-testid="calendar-retryable-detail">
        <strong>{retryableFailure.reason}</strong>
        <p>{retryableFailure.detail}</p>
      </article>
    {/if}
  </article>
</section>

<style>
  .sync-strip {
    display: grid;
    gap: 0.9rem;
  }

  .signal-card {
    display: grid;
    gap: 0.9rem;
    padding: 1rem;
  }

  .signal-card__header,
  .sync-strip__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem;
    flex-wrap: wrap;
  }

  .panel-kicker,
  .panel-copy,
  h3,
  dt,
  dd,
  p {
    margin: 0;
  }

  .panel-kicker,
  dt {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--caluno-ink-soft);
  }

  h3 {
    font-size: 1.28rem;
    line-height: 1.05;
  }

  .panel-copy,
  dd {
    color: var(--caluno-ink-muted);
    line-height: 1.55;
  }

  .facts-grid {
    display: grid;
    gap: 0.65rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .facts-grid div {
    display: grid;
    gap: 0.24rem;
    padding: 0.72rem 0.78rem;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.74);
    border: 1px solid rgba(34, 31, 27, 0.08);
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 3rem;
    padding: 0.88rem 1rem;
    border-radius: 1rem;
    border: 1px solid transparent;
    font-weight: 700;
    font-size: 0.94rem;
    cursor: pointer;
  }

  .button:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }

  .button-primary {
    color: white;
    background: linear-gradient(135deg, #114e55, #2a8279);
    box-shadow: 0 18px 28px rgba(17, 78, 85, 0.18);
  }

  .button-secondary {
    color: var(--caluno-ink-strong);
    background: rgba(255, 255, 255, 0.76);
    border-color: rgba(34, 31, 27, 0.08);
  }

  .inline-state {
    display: grid;
    gap: 0.32rem;
    padding: 0.8rem 0.9rem;
    border-radius: 1rem;
    border: 1px solid rgba(34, 31, 27, 0.08);
  }

  .inline-state strong {
    font-size: 0.92rem;
  }

  .pill,
  code {
    justify-self: start;
    padding: 0.34rem 0.7rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .pill-deep {
    color: white;
    background: rgba(17, 78, 85, 0.92);
  }

  .pill-soft {
    color: var(--caluno-accent-deep);
    background: rgba(17, 78, 85, 0.1);
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

  @media (max-width: 32rem) {
    .facts-grid {
      grid-template-columns: 1fr;
    }

    .sync-strip__actions {
      display: grid;
      grid-template-columns: 1fr;
    }

    .sync-strip__actions .button {
      width: 100%;
    }
  }
</style>
