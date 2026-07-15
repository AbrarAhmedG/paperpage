import { NextResponse } from 'next/server';

// Log the real error server-side and return a generic message to the client, so
// Postgres/Supabase internals (schema, constraint, RLS detail) are never leaked
// in an API response. Use for unexpected 5xx failures — not for intentional
// 4xx validation messages, which are safe and useful to return verbatim.
export function serverError(context: string, err: unknown, status = 500) {
  console.error(`[api] ${context}:`, err);
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status });
}
