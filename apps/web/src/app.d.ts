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

    type ProtectedRouteMode = 'trusted-online' | 'cached-offline' | 'offline-denied';

    interface ProtectedShellState {
      mode: ProtectedRouteMode;
      reason: string | null;
      detail: string;
      refreshedAt: string | null;
      visibleCalendarIds: string[];
    }

    interface ProtectedCalendarState {
      mode: ProtectedRouteMode;
      reason: string | null;
      detail: string;
      cachedAt: string | null;
      visibleWeekStart: string | null;
      visibleWeekOrigin: 'server-sync' | 'cached-local' | null;
    }

    interface PageData {
      session: Session | null;
      user: User | null;
      authStatus: 'anonymous' | 'authenticated' | 'invalid';
    }
  }
}

export {};
