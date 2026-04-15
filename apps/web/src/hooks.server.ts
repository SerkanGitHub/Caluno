import type { Handle } from '@sveltejs/kit';
import { WORKER_ISOLATION_HEADERS } from '$lib/offline/runtime';
import { createSupabaseServerClient, safeGetSession } from '$lib/supabase/server';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createSupabaseServerClient(event);
  event.locals.safeGetSession = () => safeGetSession(event.locals.supabase);

  const response = await resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });

  for (const [headerName, headerValue] of Object.entries(WORKER_ISOLATION_HEADERS)) {
    response.headers.set(headerName, headerValue);
  }

  return response;
};
