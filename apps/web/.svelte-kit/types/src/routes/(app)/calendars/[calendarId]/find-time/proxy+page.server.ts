// @ts-nocheck
import type { PageServerLoad } from './$types';
import { describeDeniedCalendarReason } from '$lib/server/app-shell';
import { loadFindTimeSearchView } from '$lib/server/find-time';
import { resolveTrustedCalendarFromAppShell } from '$lib/server/schedule';

function buildDeniedFindTimeView(params: {
  calendarId: string;
  reason: 'calendar-id-invalid' | 'calendar-missing' | 'group-membership-missing' | 'anonymous';
  failurePhase: 'calendar-param' | 'calendar-lookup' | 'calendar-authorization';
  welcome: string | null;
}) {
  return {
    findTimeView: {
      kind: 'denied' as const,
      attemptedCalendarId: params.calendarId,
      failurePhase: params.failurePhase,
      reason: params.reason,
      detail: describeDeniedCalendarReason(params.reason),
      welcome: params.welcome
    }
  };
}

export const load = async ({ params, parent, url, locals }: Parameters<PageServerLoad>[0]) => {
  const { appShell, user } = await parent();
  const calendarState = resolveTrustedCalendarFromAppShell({
    calendarId: params.calendarId,
    userId: user?.id ?? null,
    memberships: appShell?.memberships,
    calendars: appShell?.calendars
  });

  if (!calendarState.ok) {
    return buildDeniedFindTimeView({
      calendarId: params.calendarId,
      reason: calendarState.reason,
      failurePhase: calendarState.failurePhase,
      welcome: url.searchParams.get('welcome')
    });
  }

  const group = Array.isArray(appShell?.groups)
    ? appShell.groups.find((candidate) => candidate.id === calendarState.calendar.groupId) ?? null
    : null;

  const search = await loadFindTimeSearchView({
    supabase: locals.supabase,
    calendarId: calendarState.calendar.id,
    userId: user?.id ?? null,
    duration: url.searchParams.get('duration'),
    start: url.searchParams.get('start')
  });

  return {
    findTimeView: {
      kind: 'calendar' as const,
      calendar: calendarState.calendar,
      group,
      welcome: url.searchParams.get('welcome'),
      search
    }
  };
};
