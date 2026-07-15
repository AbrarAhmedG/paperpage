import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { serverError } from '@/lib/apiError';
import { normalizeProjectName } from '@/utils/projects/name';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, sketch_path, updated_at')
    .order('updated_at', { ascending: false });

  if (error) return serverError('projects: list', error);
  return NextResponse.json({ projects: data });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = normalizeProjectName(body?.name ?? '');

  const { data, error } = await supabase
    .from('projects')
    .insert({ user_id: user.id, name })
    .select('id')
    .single();

  if (error) return serverError('projects: create', error);
  return NextResponse.json({ id: data.id }, { status: 201 });
}
