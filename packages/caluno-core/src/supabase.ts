export type SupabasePublicEnv = {
  PUBLIC_SUPABASE_URL?: string;
  PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export function readSupabasePublicEnv(source: SupabasePublicEnv = {}): SupabasePublicConfig {
  const url = source.PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = source.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    const missing: string[] = [];

    if (!url) {
      missing.push('PUBLIC_SUPABASE_URL');
    }

    if (!publishableKey) {
      missing.push('PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    }

    throw new Error(`Missing required public Supabase env: ${missing.join(', ')}`);
  }

  return {
    url,
    publishableKey
  };
}
