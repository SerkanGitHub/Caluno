import type { PageServerLoad } from './$types';
import { describeDeniedCalendarReason, resolveCalendarPageState } from '$lib/server/app-shell';

export const load: PageServerLoad = async ({ params, parent, url }) => {
  const { appShell, user } = await parent();
  const calendarState = resolveCalendarPageState({
    calendarId: params.calendarId,
    userId: user?.id ?? null,
    memberships: appShell.memberships,
    calendars: appShell.calendars
  });

  if (calendarState.kind === 'denied') {
    return {
      calendarView: {
        kind: 'denied' as const,
        attemptedCalendarId: params.calendarId,
        failurePhase: calendarState.failurePhase,
        reason: calendarState.reason,
        detail: describeDeniedCalendarReason(calendarState.reason),
        welcome: url.searchParams.get('welcome')
      }
    };
  }

  const group = appShell.groups.find((candidate) => candidate.id === calendarState.calendar.groupId) ?? null;

  return {
    calendarView: {
      kind: 'calendar' as const,
      calendar: calendarState.calendar,
      group,
      welcome: url.searchParams.get('welcome')
    }
  };
};
