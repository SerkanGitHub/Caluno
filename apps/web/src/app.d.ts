import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      safeGetSession: () => Promise<{
        session: Session | null;
        user: User | null;
        authStatus: 'anonymous' | 'authenticated' | 'invalid';
      }>;
    }

    interface PageData {
      session: Session | null;
      user: User | null;
      authStatus: 'anonymous' | 'authenticated' | 'invalid';
    }
  }
}

export {};
