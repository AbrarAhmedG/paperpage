import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { downscaleImage, callGeminiVision } from '@/lib/gemini';
import { validateIR, type PageIR } from '@/utils/ir/schema';
import { renderPage } from '@/utils/renderer';

export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const projectId = form?.get('projectId');
  const image = form?.get('image');
  if (typeof projectId !== 'string' || !(image instanceof File)) {
    return NextResponse.json({ error: 'projectId and image are required' }, { status: 400 });
  }
  if (image.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image exceeds 10 MB' }, { status: 400 });
  }
  if (!ALLOWED.includes(image.type)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
  }

  const buffer = Buffer.from(await image.arrayBuffer());

  // 1. Store the original sketch.
  const sketchPath = `${user.id}/${projectId}/original.jpg`;
  const downscaled = await downscaleImage(buffer, image.type);
  const { error: upErr } = await supabase.storage
    .from('sketches')
    .upload(sketchPath, Buffer.from(downscaled.data, 'base64'), {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // 2 + 3. Gemini → IR, validate, one retry.
  let ir: PageIR | null = null;
  let lastError = 'unknown';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callGeminiVision(downscaled);
      const result = validateIR(raw);
      if (result.ok) {
        ir = result.ir;
        break;
      }
      lastError = result.error;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  if (!ir) {
    return NextResponse.json({ error: `Could not interpret sketch: ${lastError}` }, { status: 422 });
  }

  // 4. Render.
  const { html, css } = renderPage(ir);

  // 5. Persist (RLS ensures the project belongs to this user).
  const { data: saved, error: saveErr } = await supabase
    .from('projects')
    .update({ sketch_path: sketchPath, ir, html, css, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select('id')
    .maybeSingle();
  if (saveErr) return NextResponse.json({ error: saveErr.message }, { status: 500 });
  if (!saved) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  return NextResponse.json({ ir, html, css });
}
