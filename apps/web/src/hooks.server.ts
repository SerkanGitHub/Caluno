import type { Handle } from '@sveltejs/kit';
import { createSupabaseServerClient, safeGetSession } from '$lib/supabase/server';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createSupabaseServerClient(event);
  event.locals.safeGetSession = () => safeGetSession(event.locals.supabase);

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
};
