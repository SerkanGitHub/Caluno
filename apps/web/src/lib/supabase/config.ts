import { env } from '$env/dynamic/public';
import {
  readSupabasePublicEnv as readSharedSupabasePublicEnv,
  type SupabasePublicConfig,
  type SupabasePublicEnv
} from '@repo/caluno-core/supabase';

export type { SupabasePublicConfig, SupabasePublicEnv } from '@repo/caluno-core/supabase';

export function readSupabasePublicEnv(source: SupabasePublicEnv = env): SupabasePublicConfig {
  return readSharedSupabasePublicEnv(source);
}
