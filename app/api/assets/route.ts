import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { serverError } from '@/lib/apiError';

const SIGNED_TTL = 60 * 60 * 24 * 7; // 1 week

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const projectId = form?.get('projectId');
  const file = form?.get('file');
  if (typeof projectId !== 'string' || !(file instanceof File)) {
    return NextResponse.json({ error: 'projectId and file are required' }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${user.id}/${projectId}/${crypto.randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from('assets')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });
  if (upErr) return serverError('asset: upload', upErr);

  const { data: row, error: dbErr } = await supabase
    .from('project_assets')
    .insert({ project_id: projectId, user_id: user.id, storage_path: storagePath, filename: safeName })
    .select('id, storage_path, filename')
    .single();
  if (dbErr) return serverError('asset: insert', dbErr);

  const { data: signed } = await supabase.storage.from('assets').createSignedUrl(storagePath, SIGNED_TTL);
  return NextResponse.json({ ...row, url: signed?.signedUrl }, { status: 201 });
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = new URL(req.url).searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const { data: rows, error } = await supabase
    .from('project_assets')
    .select('id, filename, storage_path')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) return serverError('assets: list', error);

  const assets = await Promise.all(
    (rows ?? []).map(async (r) => {
      const { data: signed } = await supabase.storage.from('assets').createSignedUrl(r.storage_path, SIGNED_TTL);
      return { ...r, url: signed?.signedUrl };
    }),
  );
  return NextResponse.json({ assets });
}
