import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Next 16 renamed the `middleware` file convention to `proxy`. Guards
// /dashboard and /studio/* by refreshing the Supabase session (see
// lib/supabase/middleware.ts, which redirects unauthenticated users to /login).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
