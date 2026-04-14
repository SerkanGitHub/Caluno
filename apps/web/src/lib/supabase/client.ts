import { browser } from '$app/environment';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readSupabasePublicEnv } from './config';

let browserClient: SupabaseClient | undefined;

export function createSupabaseBrowserClient(): SupabaseClient {
  const { url, publishableKey } = readSupabasePublicEnv();
  return createBrowserClient(url, publishableKey);
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browser) {
    throw new Error('getSupabaseBrowserClient() must only run in the browser.');
  }

  browserClient ??= createSupabaseBrowserClient();
  return browserClient;
}
