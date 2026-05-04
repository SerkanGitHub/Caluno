import {
  hasCreatePrefillSearchParams,
  parseCreatePrefill,
  stripCreatePrefillSearchParams,
  type CreatePrefillPayload
} from '@repo/caluno-core/schedule/create-prefill';

export const MOBILE_FIND_TIME_DEFAULT_DURATION_MINUTES = 60;

export type MobileCreatePrefillArrivalState = {
  status: 'none' | 'accepted' | 'rejected';
  createPrefill: CreatePrefillPayload | null;
  cleanedSearchParams: URLSearchParams;
  shouldStripParams: boolean;
};

export function buildMobileFindTimeEntrypointHref(params: {
  calendarId: string;
  visibleWeekStart: string;
  durationMinutes?: number;
}): string {
  const searchParams = new URLSearchParams({
    duration: String(params.durationMinutes ?? MOBILE_FIND_TIME_DEFAULT_DURATION_MINUTES),
    start: params.visibleWeekStart
  });

  return `/calendars/${encodeURIComponent(params.calendarId)}/find-time?${searchParams.toString()}`;
}

export function resolveMobileCreatePrefillArrival(
  searchParams: URLSearchParams
): MobileCreatePrefillArrivalState {
  const shouldStripParams = hasCreatePrefillSearchParams(searchParams);
  const cleanedSearchParams = shouldStripParams
    ? stripCreatePrefillSearchParams(searchParams)
    : new URLSearchParams(searchParams);

  if (!shouldStripParams) {
    return {
      status: 'none',
      createPrefill: null,
      cleanedSearchParams,
      shouldStripParams: false
    };
  }

  const createPrefill = parseCreatePrefill(searchParams);

  if (!createPrefill) {
    return {
      status: 'rejected',
      createPrefill: null,
      cleanedSearchParams,
      shouldStripParams: true
    };
  }

  return {
    status: 'accepted',
    createPrefill,
    cleanedSearchParams,
    shouldStripParams: true
  };
}
