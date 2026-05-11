import { a as attr_class, e as ensure_array_like, d as derived, h as head } from "../../../../../chunks/renderer.js";
import { a as attr, e as escape_html } from "../../../../../chunks/attributes.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/root.js";
import "../../../../../chunks/state.svelte.js";
import { p as previewShiftConflicts, s as summarizeScheduleActions, b as buildCalendarWeekBoard } from "../../../../../chunks/board.js";
import { n as normalizeShiftDraft } from "../../../../../chunks/recurrence.js";
import "@supabase/ssr";
function deriveShiftEditorClashes(params) {
  if (!params.calendarId) {
    return [];
  }
  const draftResult = normalizeShiftDraft({
    calendarId: params.calendarId,
    title: params.mode === "move" ? params.fallbackTitle ?? params.title : params.title,
    startAt: params.startAt,
    endAt: params.endAt,
    recurrence: null
  });
  if (!draftResult.ok) {
    return [];
  }
  return previewShiftConflicts(
    draftResult.value,
    params.existingShifts.filter((candidate) => candidate.id !== params.shiftId)
  );
}
function ShiftEditorDialog($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const weekdayLabels = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ];
    let {
      action,
      mode,
      formId,
      visibleWeekStart,
      createPrefill = null,
      recurrenceSuggestion = null,
      existingShifts = [],
      actionStates = [],
      shift = null,
      defaultDayKey = null,
      pendingActionKey,
      enhanceMutation
    } = $$props;
    const advisoryCalendarId = derived(() => existingShifts[0]?.calendarId ?? null);
    const currentSuggestionKey = derived(() => buildSuggestionKey(recurrenceSuggestion));
    const suggestionWeekdayLabel = derived(() => recurrenceSuggestion ? weekdayLabels[recurrenceSuggestion.weekday] ?? "weekly" : "weekly");
    const suggestionToneCopy = derived(() => {
      if (!recurrenceSuggestion) {
        return null;
      }
      return `Recent shifts suggest a calm ${suggestionWeekdayLabel().toLowerCase()} ${recurrenceSuggestion.startTime}–${recurrenceSuggestion.endTime} rhythm.`;
    });
    let draftTitle = "";
    let draftStartAt = "";
    let draftEndAt = "";
    const advisoryConflicts = derived(() => deriveShiftEditorClashes({
      mode,
      calendarId: advisoryCalendarId(),
      shiftId: shift?.id ?? null,
      title: draftTitle,
      fallbackTitle: shift?.title ?? "",
      startAt: draftStartAt,
      endAt: draftEndAt,
      existingShifts
    }));
    const advisoryOverlapLabel = derived(() => advisoryConflicts().length === 1 ? "1 overlapping shift" : `${advisoryConflicts().length} overlapping shifts`);
    const suggestionState = derived(() => {
      if (!currentSuggestionKey()) {
        return "absent";
      }
      if (dismissedSuggestionKey === currentSuggestionKey()) {
        return "dismissed";
      }
      if (acceptedSuggestionKey === currentSuggestionKey()) {
        return "accepted";
      }
      return "idle";
    });
    const shouldShowSuggestion = derived(() => mode === "create" && Boolean(recurrenceSuggestion) && suggestionState() === "idle");
    let open = false;
    let recurrenceCadence = "";
    let recurrenceInterval = "";
    let repeatCount = "";
    let repeatUntil = "";
    let acceptedSuggestionKey = null;
    let dismissedSuggestionKey = null;
    const isSubmitting = derived(() => pendingActionKey === formId);
    const actionTarget = derived(() => `?/${mode === "create" ? "createShift" : mode === "edit" ? "editShift" : "moveShift"}&start=${visibleWeekStart}`);
    const scopedState = derived(() => actionStates.find((state) => state.formId === formId) ?? null);
    const tone = derived(() => {
      if (!scopedState()) {
        return "tone-neutral";
      }
      if (scopedState().status === "success") {
        return "tone-neutral";
      }
      return scopedState().status === "pending-local" || scopedState().status === "timeout" ? "tone-warning" : "tone-danger";
    });
    const summaryLabel = derived(() => {
      if (mode === "create") {
        return "Plan a shift";
      }
      if (mode === "edit") {
        return "Edit details";
      }
      return "Move timing";
    });
    const heading = derived(() => {
      if (mode === "create") {
        return "Create a shift";
      }
      if (mode === "edit") {
        return "Revise shift details";
      }
      return "Move this shift";
    });
    const submitLabel = derived(() => {
      if (mode === "create") {
        return "Save shift";
      }
      if (mode === "edit") {
        return "Save edits";
      }
      return "Save new timing";
    });
    function buildSuggestionKey(suggestion) {
      if (!suggestion) {
        return null;
      }
      return [
        suggestion.exemplarShiftId,
        suggestion.cadence,
        suggestion.interval,
        suggestion.weekday,
        suggestion.startTime,
        suggestion.endTime,
        suggestion.matchCount,
        suggestion.matchingShiftIds.join(",")
      ].join(":");
    }
    function formatAdvisoryWindow(conflict) {
      const start = new Date(conflict.startAt);
      const end = new Date(conflict.endAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return `${conflict.startAt} → ${conflict.endAt}`;
      }
      const sameDay = conflict.startAt.slice(0, 10) === conflict.endAt.slice(0, 10);
      if (sameDay) {
        return `${formatUtcMonthDay(start)} · ${formatUtcTime(start)}–${formatUtcTime(end)} UTC`;
      }
      return `${formatUtcMonthDay(start)} ${formatUtcTime(start)} → ${formatUtcMonthDay(end)} ${formatUtcTime(end)} UTC`;
    }
    function formatUtcMonthDay(date) {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    }
    function formatUtcTime(date) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC"
      });
    }
    $$renderer2.push(`<details${attr_class(`shift-editor ${mode === "create" ? "shift-editor--create" : ""}`)}${attr("open", open, true)}${attr("data-testid", `${mode}-shift-editor`)}${attr("data-create-source", mode === "create" ? createPrefill?.source ?? "manual" : "")}${attr("data-open-on-arrival", mode === "create" && createPrefill ? "true" : "false")}><summary${attr_class(`button ${mode === "create" ? "button-primary" : "button-secondary"}`)}>${escape_html(summaryLabel())}</summary> <div class="shift-editor__panel framed-panel"><div class="shift-editor__header"><div><p class="panel-kicker">${escape_html(mode === "create" ? "Local-first create" : mode === "edit" ? "Local-first edit" : "Local-first move")}</p> <h3>${escape_html(heading())}</h3></div> <span class="pill pill-neutral">UTC times</span></div> `);
    if (mode === "create" && createPrefill) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article class="inline-state tone-neutral" data-testid="create-prefill-source"${attr("data-prefill-source", createPrefill.source)}${attr("data-prefill-start", createPrefill.startAt)}${attr("data-prefill-end", createPrefill.endAt)}><strong>From Find time</strong> <p>The dialog opened from a shared free-time suggestion and preserved the exact slot window.</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <form method="POST"${attr("action", actionTarget())} class="stacked-form"><input type="hidden" name="visibleWeekStart"${attr("value", visibleWeekStart)}/> `);
    if (shift) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<input type="hidden" name="shiftId"${attr("value", shift.id)}/>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <fieldset class="shift-editor__fieldset"${attr("disabled", isSubmitting(), true)}>`);
    if (mode !== "move") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<label class="field"><span>Title</span> <input class="input" name="title"${attr("value", draftTitle)} placeholder="Opening shift" required=""/></label>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="code-strip shift-editor__locked-title"><span>Shift title</span> <code>${escape_html(shift?.title ?? "Unknown shift")}</code></div> <input type="hidden" name="title"${attr("value", shift?.title ?? "")}/>`);
    }
    $$renderer2.push(`<!--]--> <div class="calendar-form-grid"><label class="field"><span>Start</span> <input class="input" type="datetime-local" name="startAt"${attr("value", draftStartAt)} required=""/></label> <label class="field"><span>End</span> <input class="input" type="datetime-local" name="endAt"${attr("value", draftEndAt)} required=""/></label></div> `);
    if (advisoryConflicts().length > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article class="inline-state tone-warning clash-advisory" data-testid="clash-advisory"${attr("data-overlap-count", advisoryConflicts().length)}${attr("data-conflicting-shift-ids", advisoryConflicts().map((conflict) => conflict.id).join(","))} aria-live="polite" aria-atomic="true"><div class="clash-advisory__header"><div><p class="panel-kicker">Heads up</p> <strong>${escape_html(advisoryOverlapLabel())}</strong></div> <span class="pill pill-conflict">Warning only</span></div> <p>This draft overlaps another visible-week shift in the same calendar. You can still save it if the overlap is intentional.</p> <ul class="clash-advisory__list"><!--[-->`);
      const each_array = ensure_array_like(advisoryConflicts());
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let conflict = each_array[$$index];
        $$renderer2.push(`<li><strong>${escape_html(conflict.title)}</strong> <span>${escape_html(formatAdvisoryWindow(conflict))}</span></li>`);
      }
      $$renderer2.push(`<!--]--></ul></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (mode === "create") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="recurrence-fields"><div class="recurrence-fields__header"><div><p class="panel-kicker">Bounded recurrence</p> <h3>Optional repeat rule</h3></div> <span class="pill pill-neutral">Count or until required</span></div> <div class="recurrence-fields__state" data-testid="recurrence-field-state"${attr("data-cadence", "one-off")}${attr("data-interval", recurrenceInterval)}${attr("data-repeat-count", repeatCount)}${attr("data-repeat-until", repeatUntil)}${attr("data-suggestion-state", suggestionState())}><strong>${escape_html("One-off shift")}</strong> <p>`);
      {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`Leave this blank for a single shift, or choose a cadence below.`);
      }
      $$renderer2.push(`<!--]--></p></div> `);
      if (shouldShowSuggestion() && recurrenceSuggestion) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<article class="recurrence-suggestion" data-testid="recurrence-suggestion"${attr("data-cadence", recurrenceSuggestion.cadence)}${attr("data-interval", recurrenceSuggestion.interval)}${attr("data-weekday", recurrenceSuggestion.weekday)}${attr("data-match-count", recurrenceSuggestion.matchCount)}${attr("data-exemplar-shift-id", recurrenceSuggestion.exemplarShiftId)}><div><p class="panel-kicker">Calm suggestion</p> <strong>${escape_html(suggestionWeekdayLabel())} ${escape_html(recurrenceSuggestion.startTime)}–${escape_html(recurrenceSuggestion.endTime)}</strong> <p>${escape_html(suggestionToneCopy())}</p></div> <div class="recurrence-suggestion__actions"><button class="button button-secondary" type="button" data-testid="recurrence-suggestion-accept">Use weekly suggestion</button> <button class="button button-secondary recurrence-suggestion__dismiss" type="button" data-testid="recurrence-suggestion-dismiss">Dismiss suggestion</button></div></article>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <div class="calendar-form-grid recurrence-fields__grid"><fieldset class="field recurrence-cadence-group"><span>Cadence</span> <div class="recurrence-cadence-options"><label${attr_class(`recurrence-cadence-option ${"is-selected"}`)}><input type="radio" name="recurrenceCadence" value=""${attr("checked", recurrenceCadence === "", true)}/> <strong>One-off</strong> <small>No repeats</small></label> <label${attr_class(`recurrence-cadence-option ${""}`)}><input type="radio" name="recurrenceCadence" value="daily"${attr("checked", recurrenceCadence === "daily", true)}/> <strong>Daily</strong> <small>Every day</small></label> <label${attr_class(`recurrence-cadence-option ${""}`)}><input type="radio" name="recurrenceCadence" value="weekly"${attr("checked", recurrenceCadence === "weekly", true)}/> <strong>Weekly</strong> <small>Weekly cadence</small></label> <label${attr_class(`recurrence-cadence-option ${""}`)}><input type="radio" name="recurrenceCadence" value="monthly"${attr("checked", recurrenceCadence === "monthly", true)}/> <strong>Monthly</strong> <small>Monthly cadence</small></label></div></fieldset> <label class="field"><span>Interval</span> <input class="input" type="number" min="1" step="1" name="recurrenceInterval"${attr("value", recurrenceInterval)}/></label> <label class="field"><span>Repeat count</span> <input class="input" type="number" min="1" step="1" name="repeatCount"${attr("value", repeatCount)}/></label> <label class="field"><span>Repeat until</span> <input class="input" type="datetime-local" name="repeatUntil"${attr("value", repeatUntil)}/></label></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></fieldset> `);
    if (scopedState()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article${attr_class(`inline-state ${tone()}`)}${attr("data-testid", `${mode}-state`)}><strong>${escape_html(scopedState().reason)}</strong> <p>${escape_html(scopedState().message)}</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="calendar-form-actions"><button${attr_class(`button ${mode === "create" ? "button-primary" : "button-secondary"}`)} type="submit">${escape_html(isSubmitting() ? "Saving…" : submitLabel())}</button> <span class="calendar-form-note">${escape_html(mode === "create" ? "The board updates locally first, then waits for trusted server confirmation when online." : "The board updates locally first and keeps the trusted server action as the confirmation path.")}</span></div></form></div></details>`);
  });
}
function ShiftCard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      shift,
      visibleWeekStart,
      existingShifts = [],
      actionStates = [],
      pendingActionKey,
      enhanceMutation
    } = $$props;
    const deleteFormId = derived(() => `delete:${shift.id}`);
    const deleteActionTarget = derived(() => `?/deleteShift&start=${visibleWeekStart}`);
    const isDeleting = derived(() => pendingActionKey === deleteFormId());
    const scopedDeleteState = derived(() => actionStates.find((state) => state.formId === deleteFormId()) ?? null);
    const deleteTone = derived(() => {
      if (!scopedDeleteState()) {
        return "tone-neutral";
      }
      if (scopedDeleteState().status === "success") {
        return "tone-neutral";
      }
      return scopedDeleteState().status === "pending-local" || scopedDeleteState().status === "timeout" ? "tone-warning" : "tone-danger";
    });
    $$renderer2.push(`<article${attr_class(`shift-card shift-card--${shift.density} ${shift.conflict ? "shift-card--conflict" : ""}`)}${attr("data-testid", `shift-card-${shift.id}`)}${attr("data-conflict-overlaps", shift.conflict?.overlapCount ?? 0)}><div class="shift-card__header"><div><p class="panel-kicker">${escape_html(shift.sourceLabel)}</p> <h3>${escape_html(shift.title)}</h3></div> <div class="shift-card__meta-pills"><span class="pill pill-neutral">${escape_html(shift.rangeLabel)}</span> `);
    if (shift.occurrenceLabel) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="pill pill-active">${escape_html(shift.occurrenceLabel)}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (shift.conflict) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="pill pill-conflict"${attr("data-testid", `shift-conflict-pill-${shift.id}`)}${attr("data-conflict-overlaps", shift.conflict.overlapCount)}>${escape_html(shift.conflict.label)}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <!--[-->`);
    const each_array = ensure_array_like(shift.statusBadges);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let badge = each_array[$$index];
      $$renderer2.push(`<span${attr_class(`pill ${badge.tone === "danger" ? "pill-danger" : badge.tone === "warning" ? "pill-expired" : "pill-neutral"}`)}>${escape_html(badge.label)}</span>`);
    }
    $$renderer2.push(`<!--]--></div></div> `);
    if (shift.conflict) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article class="inline-state tone-warning shift-card__conflict"${attr("data-testid", `shift-conflict-summary-${shift.id}`)}${attr("data-conflict-overlaps", shift.conflict.overlapCount)}><strong>${escape_html(shift.conflict.label)}</strong> <p>${escape_html(shift.conflict.detail)}</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="shift-card__stats"><div><span>Window</span> <strong>${escape_html(shift.startTimeLabel)} → ${escape_html(shift.endTimeLabel)}</strong></div> <div><span>Duration</span> <strong>${escape_html(shift.durationLabel)}</strong></div> <div><span>Shift id</span> <code>${escape_html(shift.id)}</code></div></div> <div class="shift-card__actions">`);
    ShiftEditorDialog($$renderer2, {
      action: "edit",
      mode: "edit",
      formId: `edit:${shift.id}`,
      visibleWeekStart,
      existingShifts,
      actionStates,
      shift,
      pendingActionKey,
      enhanceMutation
    });
    $$renderer2.push(`<!----> `);
    ShiftEditorDialog($$renderer2, {
      action: "move",
      mode: "move",
      formId: `move:${shift.id}`,
      visibleWeekStart,
      existingShifts,
      actionStates,
      shift,
      pendingActionKey,
      enhanceMutation
    });
    $$renderer2.push(`<!----> <form method="POST"${attr("action", deleteActionTarget())} class="shift-delete-form"><input type="hidden" name="visibleWeekStart"${attr("value", visibleWeekStart)}/> <input type="hidden" name="shiftId"${attr("value", shift.id)}/> <input type="hidden" name="title"${attr("value", shift.title)}/> <input type="hidden" name="startAt"${attr("value", shift.startAt)}/> <input type="hidden" name="endAt"${attr("value", shift.endAt)}/> <button class="button button-secondary button-danger" type="submit"${attr("disabled", isDeleting(), true)}>${escape_html(isDeleting() ? "Deleting…" : "Delete shift")}</button></form></div> `);
    if (scopedDeleteState()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article${attr_class(`inline-state ${deleteTone()}`)}${attr("data-testid", `delete-state-${shift.id}`)}><strong>${escape_html(scopedDeleteState().reason)}</strong> <p>${escape_html(scopedDeleteState().message)}</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></article>`);
  });
}
function ShiftDayColumn($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      day,
      visibleWeekStart,
      existingShifts = [],
      actionStates = [],
      pendingActionKey,
      enhanceMutation
    } = $$props;
    $$renderer2.push(`<section${attr_class(`shift-day-column shift-day-column--${day.density} ${day.isToday ? "shift-day-column--today" : ""} ${day.conflict ? "shift-day-column--conflict" : ""}`)}${attr("data-conflict-pairs", day.conflict?.overlapCount ?? 0)}${attr("data-testid", `day-shell-${day.dayKey}`)}><header class="shift-day-column__header"><div><p class="panel-kicker">${escape_html(day.weekdayLabel)}</p> <h3>${escape_html(day.monthLabel)} ${escape_html(day.dayNumberLabel)}</h3></div> <div class="shift-day-column__pills">`);
    if (day.isToday) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="pill pill-active">Today</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (day.conflict) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="pill pill-conflict"${attr("data-testid", `day-conflict-pill-${day.dayKey}`)}${attr("data-conflict-pairs", day.conflict.overlapCount)}${attr("data-conflict-shifts", day.conflict.conflictingShiftIds.length)}>${escape_html(day.conflict.label)}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <span class="pill pill-neutral">${escape_html(day.shiftCount)} ${escape_html(day.shiftCount === 1 ? "shift" : "shifts")}</span></div></header> `);
    if (day.isEmpty) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article class="empty-card shift-day-column__empty"${attr("data-testid", `day-empty-${day.dayKey}`)}><p class="panel-kicker">Open capacity</p> <h3>Nothing scheduled.</h3> <p class="panel-copy">This day stays visible so users can add or move a shift here without losing week context.</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="shift-day-column__stack"${attr("data-testid", `day-column-${day.dayKey}`)}>`);
      if (day.conflict) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<article class="inline-state tone-warning shift-day-column__conflict"${attr("data-testid", `day-conflict-summary-${day.dayKey}`)}${attr("data-conflict-pairs", day.conflict.overlapCount)}${attr("data-conflict-shifts", day.conflict.conflictingShiftIds.length)}><strong>${escape_html(day.conflict.label)}</strong> <p>${escape_html(day.conflict.detail)}</p></article>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <!--[-->`);
      const each_array = ensure_array_like(day.shifts);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let shift = each_array[$$index];
        ShiftCard($$renderer2, {
          shift,
          visibleWeekStart,
          existingShifts,
          actionStates,
          pendingActionKey,
          enhanceMutation
        });
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></section>`);
  });
}
function CalendarWeekBoard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      board,
      scheduleStatus,
      scheduleReason,
      scheduleMessage,
      createPrefill = null,
      recurrenceSuggestion = null,
      existingShifts = [],
      actionStates = [],
      realtimeDiagnostics = null,
      pendingActionKey,
      enhanceMutation
    } = $$props;
    const boardTone = derived(() => {
      if (scheduleStatus === "ready") {
        return "tone-neutral";
      }
      return scheduleStatus === "timeout" ? "tone-warning" : "tone-danger";
    });
    const canRenderSchedule = derived(() => scheduleStatus !== "malformed-response");
    const actionSummaries = derived(() => summarizeScheduleActions(actionStates));
    const realtimeTone = derived(() => !realtimeDiagnostics ? "tone-neutral" : realtimeDiagnostics.channelState === "retrying" || realtimeDiagnostics.remoteRefreshState === "failed" ? "tone-danger" : realtimeDiagnostics.channelState === "subscribing" || realtimeDiagnostics.remoteRefreshState === "refreshing" ? "tone-warning" : "tone-neutral");
    $$renderer2.push(`<section class="calendar-week-board framed-panel" data-testid="calendar-week-board"${attr("data-visible-week-start", board.visibleWeekStart)}${attr("data-visible-week-end", board.visibleWeekEndExclusive)}><header class="calendar-week-board__header"><div><p class="eyebrow">Protected week board</p> <h2>${escape_html(board.rangeLabel)}</h2> <p class="lede">${escape_html(board.caption)}</p></div> <div class="calendar-week-board__header-side"><div class="calendar-week-board__meta"><span${attr_class(`pill pill-neutral ${board.sourceTone === "warning" ? "pill-expired" : ""}`)}>${escape_html(board.sourceLabel)}</span> <span class="pill pill-active">${escape_html(board.totalShifts)} ${escape_html(board.totalShifts === 1 ? "shift" : "shifts")}</span> <span class="pill pill-neutral">UTC board</span> `);
    if (board.conflict) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="pill pill-conflict" data-testid="board-conflict-pill"${attr("data-conflict-days", board.conflict.dayCount)}${attr("data-conflict-shifts", board.conflict.shiftCount)}${attr("data-conflict-pairs", board.conflict.overlapCount)}>${escape_html(board.conflict.label)}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <!--[-->`);
    const each_array = ensure_array_like(board.statusBadges);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let badge = each_array[$$index];
      $$renderer2.push(`<span${attr_class(`pill ${badge.tone === "danger" ? "pill-danger" : badge.tone === "warning" ? "pill-expired" : badge.tone === "success" ? "pill-active" : "pill-neutral"}`)}>${escape_html(badge.label)}</span>`);
    }
    $$renderer2.push(`<!--]--></div> <nav class="calendar-week-board__nav" aria-label="Visible week navigation"><a class="button button-secondary"${attr("href", `?start=${board.previousWeekStart}`)}>Previous week</a> <a class="button button-secondary"${attr("href", `?start=${board.nextWeekStart}`)}>Next week</a></nav></div></header> <section class="calendar-toolbar">`);
    ShiftEditorDialog($$renderer2, {
      action: "create",
      mode: "create",
      formId: "create:week",
      visibleWeekStart: board.visibleWeekStart,
      createPrefill,
      recurrenceSuggestion,
      existingShifts,
      actionStates,
      defaultDayKey: board.days[0]?.dayKey ?? board.visibleWeekStart,
      pendingActionKey,
      enhanceMutation
    });
    $$renderer2.push(`<!----> <div class="calendar-toolbar__notes"><p class="panel-kicker">Board rhythm</p> <p class="panel-copy">Local writes update the visible week immediately, stay queued when the server is unavailable, and keep the trusted server action as the confirmation path.</p></div></section> `);
    if (scheduleStatus !== "ready") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article${attr_class(`status-card ${boardTone()}`)} data-testid="schedule-load-state"><span class="status-card__label">Schedule state</span> <strong>${escape_html(scheduleStatus)}</strong> <p>${escape_html(scheduleMessage)}</p> `);
      if (scheduleReason) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<code>${escape_html(scheduleReason)}</code>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (board.lastFailure) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article class="status-card tone-danger" data-testid="local-write-failure"><span class="status-card__label">Local-first failure</span> <strong>${escape_html(board.lastFailure.reason)}</strong> <p>${escape_html(board.lastFailure.detail)}</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (board.conflict) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article class="status-card tone-warning" data-testid="board-conflict-summary"${attr("data-conflict-days", board.conflict.dayCount)}${attr("data-conflict-shifts", board.conflict.shiftCount)}${attr("data-conflict-pairs", board.conflict.overlapCount)}><span class="status-card__label">Visible-week conflict watch</span> <strong>${escape_html(board.conflict.label)}</strong> <p>${escape_html(board.conflict.detail)}</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <article${attr_class(`status-card ${board.lastSyncError ? "tone-danger" : board.syncPhaseLabel === "Sync draining reconnect queue" ? "tone-warning" : "tone-neutral"}`)} data-testid="board-sync-diagnostics"><span class="status-card__label">Board sync diagnostics</span> <strong>${escape_html(board.syncPhaseLabel)}</strong> <p>`);
    if (board.lastSyncAttemptLabel) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`Last reconnect attempt: <code>${escape_html(board.lastSyncAttemptLabel)}</code>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`No reconnect attempt has been recorded on this route yet.`);
    }
    $$renderer2.push(`<!--]--></p> `);
    if (board.lastSyncError) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p>${escape_html(board.lastSyncError.detail)}</p> <code>${escape_html(board.lastSyncError.reason)}</code>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></article> `);
    if (realtimeDiagnostics) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article${attr_class(`status-card ${realtimeTone()}`)} data-testid="board-realtime-diagnostics"${attr("data-channel-state", realtimeDiagnostics.channelState)}${attr("data-remote-refresh-state", realtimeDiagnostics.remoteRefreshState)}><span class="status-card__label">Board realtime diagnostics</span> <strong>${escape_html(realtimeDiagnostics.channelState)}</strong> <p>`);
      if (realtimeDiagnostics.lastSignalAt) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`Last signal: ${escape_html(realtimeDiagnostics.lastSignalEvent ?? "signal")} at <code>${escape_html(realtimeDiagnostics.lastSignalAt)}</code>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`No shared shift signal has touched this visible week yet.`);
      }
      $$renderer2.push(`<!--]--></p> <p>${escape_html(realtimeDiagnostics.channelDetail)}</p> `);
      if (realtimeDiagnostics.channelReason) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<code>${escape_html(realtimeDiagnostics.channelReason)}</code>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (realtimeDiagnostics.lastRemoteRefreshDetail) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<p>${escape_html(realtimeDiagnostics.lastRemoteRefreshDetail)}</p>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (realtimeDiagnostics.lastRemoteRefreshReason) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<code>${escape_html(realtimeDiagnostics.lastRemoteRefreshReason)}</code>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (actionSummaries().length > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="calendar-action-strip" data-testid="schedule-action-strip"><!--[-->`);
      const each_array_1 = ensure_array_like(actionSummaries());
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let summary = each_array_1[$$index_1];
        $$renderer2.push(`<article${attr_class(`status-card tone-${summary.tone === "neutral" ? "neutral" : summary.tone}`)}><span class="status-card__label">${escape_html(summary.label)}</span> <strong>${escape_html(summary.state.status)}</strong> <p>${escape_html(summary.state.message)}</p> <code>${escape_html(summary.state.reason)}</code></article>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (canRenderSchedule()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="calendar-week-grid" data-testid="schedule-week-grid"><!--[-->`);
      const each_array_2 = ensure_array_like(board.days);
      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
        let day = each_array_2[$$index_2];
        ShiftDayColumn($$renderer2, {
          day,
          visibleWeekStart: board.visibleWeekStart,
          existingShifts,
          actionStates,
          pendingActionKey,
          enhanceMutation
        });
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<article class="empty-card calendar-week-board__unavailable" data-testid="schedule-malformed-state"><p class="panel-kicker">Non-renderable schedule</p> <h3>The week payload could not be trusted.</h3> <p class="panel-copy">The board stayed on the same calendar route, but the malformed response was withheld instead of rendering broken cards.</p></article>`);
    }
    $$renderer2.push(`<!--]--></section>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let pendingActionKey = null;
    let realtimeDiagnostics = createInitialRealtimeDiagnostics();
    const calendarState = derived(() => data.protectedCalendarState);
    const appShell = derived(() => data.appShell ?? null);
    const calendarView = derived(() => data.calendarView ?? null);
    const readyView = derived(() => calendarView()?.kind === "calendar" ? calendarView() : null);
    const deniedView = derived(() => calendarView()?.kind === "denied" ? calendarView() : null);
    const readyCreatePrefill = derived(() => readyView()?.createPrefill ?? null);
    const readyRecurrenceSuggestion = derived(() => readyView()?.recurrenceSuggestion ?? null);
    const relatedCalendars = derived(() => readyView()?.group?.calendars ?? appShell()?.calendars ?? []);
    const effectiveSchedule = derived(() => readyView()?.schedule ?? null);
    const existingShifts = derived(() => effectiveSchedule()?.status === "ready" ? effectiveSchedule().days.flatMap((day) => day.shifts) : []);
    const board = derived(() => effectiveSchedule() ? buildCalendarWeekBoard(effectiveSchedule(), {
      now: /* @__PURE__ */ new Date(),
      runtime: void 0
    }) : null);
    const viewerName = derived(() => appShell()?.viewer.displayName ?? "Protected calendar");
    const routeTone = derived(() => calendarState().mode === "offline-denied" ? "tone-danger" : calendarState().mode === "cached-offline" ? "tone-warning" : "tone-neutral");
    function enhanceMutation(params) {
      return async ({ formData, cancel }) => {
        pendingActionKey = params.formId;
        {
          return async ({ update }) => {
            pendingActionKey = null;
            await update({ reset: false });
          };
        }
      };
    }
    function buildTrustedScheduleKey(schedule) {
      return JSON.stringify({
        status: schedule.status,
        reason: schedule.reason,
        visibleWeekStart: schedule.visibleWeek.start,
        shiftIds: schedule.shiftIds
      });
    }
    function createInitialRealtimeDiagnostics() {
      return {
        channelState: "closed",
        channelReason: null,
        channelDetail: "Live change detection is idle until a trusted online calendar week is open.",
        lastSignalAt: null,
        lastSignalEvent: null,
        lastSignalDetail: null,
        remoteRefreshState: "idle",
        lastRemoteRefreshAt: null,
        lastRemoteRefreshReason: null,
        lastRemoteRefreshDetail: null
      };
    }
    head("1x90697", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>
    ${escape_html(readyView() ? `${readyView().calendar.name} • Caluno` : "Access denied • Caluno")}
  </title>`);
      });
    });
    $$renderer2.push(`<main class="workspace-shell"><aside class="workspace-rail framed-panel"><p class="eyebrow">Trusted calendar scope</p> <h1>${escape_html(viewerName())}</h1> <p class="rail-copy">`);
    if (calendarState().mode === "trusted-online") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`This route rendered from the trusted server contract, so calendar authority was revalidated before the week loaded.`);
    } else if (calendarState().mode === "cached-offline") {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`This route reopened from trusted browser-local scope and a cached week snapshot without widening access beyond previously synced calendars.`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`Offline continuity failed closed on this route instead of guessing whether the calendar should be visible.`);
    }
    $$renderer2.push(`<!--]--></p> <div class="status-stack"><article${attr_class(`status-card ${routeTone()}`)} data-testid="calendar-route-state"${attr("data-route-mode", calendarState().mode)}${attr("data-route-reason", calendarState().reason ?? "none")}><span class="status-card__label">Route state</span> <strong>${escape_html(calendarState().mode)}</strong> <p>${escape_html(calendarState().detail)}</p> `);
    if (calendarState().reason) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<code>${escape_html(calendarState().reason)}</code>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></article> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (calendarState().cachedAt) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article class="status-card tone-warning"><span class="status-card__label">Cached snapshot</span> <strong>${escape_html(calendarState().cachedAt)}</strong> <p>The visible week reopened from browser-local storage instead of the server.</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (effectiveSchedule()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article${attr_class(`status-card ${effectiveSchedule().status === "ready" ? "tone-neutral" : effectiveSchedule().status === "timeout" ? "tone-warning" : "tone-danger"}`)}><span class="status-card__label">Week scope</span> <strong>${escape_html(effectiveSchedule().visibleWeek.start)}</strong> <p>${escape_html(effectiveSchedule().message)}</p> `);
      if (calendarState().visibleWeekOrigin) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<code>${escape_html(calendarState().visibleWeekOrigin)}</code>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <nav class="rail-links"><a href="/groups">Back to groups</a> <a href="/logout">Sign out</a></nav></aside> <section class="workspace-main">`);
    if (readyView()) {
      $$renderer2.push("<!--[0-->");
      if (board() && effectiveSchedule()) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<header class="hero-panel compact" data-testid="calendar-shell"${attr("data-trusted-schedule-key", buildTrustedScheduleKey(effectiveSchedule()))}><p class="eyebrow">${escape_html(readyView().group?.name ?? "Permitted calendar")}</p> <h2>${escape_html(readyView().calendar.name)}</h2> <p class="lede">`);
        {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`A calm week board for multi-shift days: local writes render immediately, while trusted server actions stay authoritative for confirmation.`);
        }
        $$renderer2.push(`<!--]--></p> <div class="hero-actions" data-testid="calendar-find-time-entry"><a class="button button-primary" data-testid="find-time-entrypoint"${attr("href", `/calendars/${readyView().calendar.id}/find-time?duration=60&start=${effectiveSchedule().visibleWeek.start}`)}>Browse truthful find-time</a> <span class="pill pill-neutral">Server-shaped availability</span></div> <div class="calendar-board__meta"><span class="pill pill-active">${escape_html(readyView().calendar.isDefault ? "Default calendar" : "Secondary calendar")}</span> <span class="pill pill-neutral">${escape_html(readyView().group?.role ?? "member")} access</span> <span class="pill pill-neutral">${escape_html(effectiveSchedule().totalShifts)} visible shifts</span> <span${attr_class(`pill ${"pill-neutral"}`)}>${escape_html("Trusted online")}</span> <span${attr_class(`pill ${"pill-neutral"}`)}>${escape_html("idle")}</span> <span${attr_class(`pill ${realtimeDiagnostics.channelState === "ready" ? "pill-active" : realtimeDiagnostics.channelState === "retrying" ? "pill-danger" : "pill-expired"}`)}>realtime ${escape_html(realtimeDiagnostics.channelState)}</span></div></header> `);
        CalendarWeekBoard($$renderer2, {
          board: board(),
          scheduleStatus: effectiveSchedule().status,
          scheduleReason: effectiveSchedule().reason,
          scheduleMessage: effectiveSchedule().message,
          createPrefill: readyCreatePrefill(),
          recurrenceSuggestion: readyRecurrenceSuggestion(),
          existingShifts: existingShifts(),
          actionStates: [],
          realtimeDiagnostics,
          pendingActionKey,
          enhanceMutation
        });
        $$renderer2.push(`<!---->`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]-->`);
    } else if (deniedView()) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<section class="denied-banner framed-panel" data-testid="access-denied-state"><p class="eyebrow">${escape_html(deniedView().detail.badge)}</p> <h2>${escape_html(deniedView().detail.title)}</h2> <p class="lede">${escape_html(deniedView().detail.detail)}</p> <div class="denied-meta"><div><span>Failure phase</span> <strong>${escape_html(deniedView().failurePhase)}</strong></div> <div><span>Reason code</span> <strong>${escape_html(deniedView().reason)}</strong></div> <div><span>Attempted id</span> <code>${escape_html(deniedView().attemptedCalendarId)}</code></div></div> <div class="denied-actions"><a class="button button-primary" href="/groups">Return to permitted groups</a> `);
      if (appShell()?.primaryCalendar) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<a class="button button-secondary"${attr("href", `/calendars/${appShell().primaryCalendar.id}`)}>Open a permitted calendar</a>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div></section>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <section class="related-panel framed-panel"><div class="group-card__header"><div><p class="panel-kicker">Visible calendar inventory</p> <h3>Only trusted calendars appear in navigation.</h3></div> <span class="pill pill-neutral">${escape_html(relatedCalendars().length)} visible</span></div> <div class="calendar-list"><!--[-->`);
    const each_array = ensure_array_like(relatedCalendars());
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let calendar = each_array[$$index];
      $$renderer2.push(`<a${attr_class(`calendar-link ${readyView() && calendar.id === readyView().calendar.id ? "active" : ""}`)}${attr("href", `/calendars/${calendar.id}`)}><strong>${escape_html(calendar.name)}</strong> <span>${escape_html(calendar.isDefault ? "Default calendar" : "Secondary calendar")}</span></a>`);
    }
    $$renderer2.push(`<!--]--></div></section></section></main>`);
  });
}
export {
  _page as default
};
