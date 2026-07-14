import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeProjectName } from '@/utils/projects/name';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ project: data });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === 'string') patch.name = normalizeProjectName(body.name);
  if (typeof body.html === 'string') patch.html = body.html;
  if (typeof body.css === 'string') patch.css = body.css;

  const { error } = await supabase.from('projects').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Best-effort storage cleanup (RLS-scoped).
  for (const bucket of ['sketches', 'assets']) {
    const prefix = `${user.id}/${id}`;
    const { data: files } = await supabase.storage.from(bucket).list(prefix);
    if (files?.length) {
      await supabase.storage.from(bucket).remove(files.map((f) => `${prefix}/${f.name}`));
    }
  }

  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
