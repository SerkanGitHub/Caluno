<script lang="ts">
  import type { ShiftCardModel } from '@repo/caluno-core/schedule/board';
  import type { CalendarControllerActionState } from '@repo/caluno-core/schedule/types';
  import ShiftEditorSheet, { type ShiftEditorSubmitParams } from './ShiftEditorSheet.svelte';

  type Props = {
    calendarId: string;
    visibleWeekStart: string;
    shift: ShiftCardModel;
    actionStates?: CalendarControllerActionState[];
    pendingActionKey: string | null;
    canMutate: boolean;
    submitMutation: (params: ShiftEditorSubmitParams) => Promise<void>;
  };

  let {
    calendarId,
    visibleWeekStart,
    shift,
    actionStates = [],
    pendingActionKey,
    canMutate,
    submitMutation
  }: Props = $props();
</script>

<article
  class={`shift-card framed-panel shift-card--${shift.density} ${shift.conflict ? 'shift-card--conflict' : ''}`}
  data-testid={`shift-card-${shift.id}`}
  data-shift-id={shift.id}
  data-local-only={shift.id.startsWith('local-') ? 'true' : 'false'}
  data-conflict-overlaps={shift.conflict?.overlapCount ?? 0}
>
  <div class="shift-card__eyebrow-row">
    <p class="panel-kicker">{shift.sourceLabel}</p>
    <span class="pill pill-soft">{shift.durationLabel}</span>
  </div>

  <div class="shift-card__heading-row">
    <div>
      <h3>{shift.title}</h3>
      <p class="panel-copy">{shift.rangeLabel}</p>
    </div>
    {#if shift.occurrenceLabel}
      <span class="pill pill-deep">{shift.occurrenceLabel}</span>
    {/if}
  </div>

  <div class="shift-card__badges">
    {#each shift.statusBadges as badge}
      <span class={`pill ${badge.tone === 'danger' ? 'pill-danger' : badge.tone === 'warning' ? 'pill-warning' : 'pill-soft'}`}>
        {badge.label}
      </span>
    {/each}
    {#if shift.conflict}
      <span class="pill pill-warning" data-testid={`shift-conflict-pill-${shift.id}`}>{shift.conflict.label}</span>
    {/if}
  </div>

  <dl class="shift-card__meta">
    <div>
      <dt>Start</dt>
      <dd>{shift.startTimeLabel}</dd>
    </div>
    <div>
      <dt>End</dt>
      <dd>{shift.endTimeLabel}</dd>
    </div>
    <div>
      <dt>Shift id</dt>
      <dd><code>{shift.id}</code></dd>
    </div>
  </dl>

  {#if shift.conflict}
    <article class="inline-state tone-warning" data-testid={`shift-conflict-summary-${shift.id}`}>
      <strong>{shift.conflict.label}</strong>
      <p>{shift.conflict.detail}</p>
    </article>
  {/if}

  {#if canMutate}
    <div class="shift-card__actions">
      <ShiftEditorSheet
        mode="edit"
        formId={`edit:${shift.id}`}
        {calendarId}
        {visibleWeekStart}
        {shift}
        {actionStates}
        {pendingActionKey}
        canSubmit={canMutate}
        triggerLabel="Edit"
        {submitMutation}
      />
      <ShiftEditorSheet
        mode="move"
        formId={`move:${shift.id}`}
        {calendarId}
        {visibleWeekStart}
        {shift}
        {actionStates}
        {pendingActionKey}
        canSubmit={canMutate}
        triggerLabel="Move"
        {submitMutation}
      />
      <ShiftEditorSheet
        mode="delete"
        formId={`delete:${shift.id}`}
        {calendarId}
        {visibleWeekStart}
        {shift}
        {actionStates}
        {pendingActionKey}
        canSubmit={canMutate}
        triggerLabel="Delete"
        {submitMutation}
      />
    </div>
  {:else}
    <article class="inline-state tone-warning" data-testid={`shift-readonly-${shift.id}`}>
      <strong>READ_ONLY_CONTINUITY</strong>
      <p>This cached continuity reopen is view-only until a trusted session is available again.</p>
    </article>
  {/if}
</article>

<style>
  .shift-card {
    display: grid;
    gap: 0.85rem;
    padding: 0.95rem;
    border-radius: 1.35rem;
    background: rgba(255, 255, 255, 0.82);
  }

  .shift-card--conflict {
    border-color: rgba(184, 133, 47, 0.32);
    box-shadow: 0 22px 38px rgba(184, 133, 47, 0.16);
  }

  .shift-card__eyebrow-row,
  .shift-card__heading-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.7rem;
  }

  .shift-card__badges,
  .shift-card__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .shift-card__actions :global(.button) {
    flex: 1 1 7rem;
  }

  .shift-card__meta {
    display: grid;
    gap: 0.65rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .shift-card__meta div {
    display: grid;
    gap: 0.22rem;
    padding: 0.74rem 0.78rem;
    border-radius: 1rem;
    background: rgba(247, 244, 236, 0.9);
  }

  .panel-kicker,
  .panel-copy,
  h3,
  p,
  dt,
  dd {
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
    font-size: 1.18rem;
    line-height: 1.06;
  }

  .panel-copy,
  dd {
    color: var(--caluno-ink-muted);
    line-height: 1.5;
  }

  .pill,
  code {
    justify-self: start;
    padding: 0.34rem 0.68rem;
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
    background: rgba(17, 78, 85, 0.08);
  }

  .pill-warning {
    color: #825b14;
    background: rgba(214, 179, 96, 0.18);
  }

  .pill-danger {
    color: #8e2a30;
    background: rgba(184, 77, 88, 0.14);
  }

  .inline-state {
    display: grid;
    gap: 0.3rem;
    padding: 0.82rem 0.88rem;
    border-radius: 1rem;
    border: 1px solid rgba(34, 31, 27, 0.08);
  }

  .inline-state strong {
    font-size: 0.92rem;
  }

  .tone-warning {
    background: rgba(255, 244, 214, 0.92);
  }

  @media (max-width: 32rem) {
    .shift-card__meta {
      grid-template-columns: 1fr;
    }
  }
</style>
