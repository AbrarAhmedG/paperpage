import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { serverError } from '@/lib/apiError';
import { isTransientAIError } from '@/lib/aiErrors';
import { downscaleImage, callGeminiVision } from '@/lib/gemini';
import { validateIR, type PageIR } from '@/utils/ir/schema';
import { irLooksSane } from '@/utils/ir/sanity';
import { renderPage } from '@/utils/renderer';
import { deriveProjectName, DEFAULT_PROJECT_NAME } from '@/utils/projects/name';

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
  if (upErr) return serverError('generate: sketch upload', upErr);

  // 2 + 3. Vision → IR, validate, retry. Interpretation-quality failures
  // (invalid or suspiciously-thin IR) get one immediate retry, as before.
  // Transient provider failures (Anthropic 529 Overloaded, rate limits, 5xx)
  // get a THIRD attempt with backoff — an immediate retry lands in the same
  // overload window — bounded by a time budget so the function never exceeds
  // its 60s limit. A thin final attempt is still used rather than failing.
  const started = Date.now();
  let ir: PageIR | null = null;
  let thin: PageIR | null = null;
  let lastError = 'unknown';
  let transient = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await callGeminiVision(downscaled);
      const result = validateIR(raw);
      transient = false;
      if (result.ok) {
        if (irLooksSane(result.ir)) {
          ir = result.ir;
          break;
        }
        thin = result.ir;
        lastError = 'IR valid but too thin';
      } else {
        lastError = result.error;
      }
      if (attempt >= 1) break; // quality failures keep the original 2-attempt cap
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      transient = isTransientAIError(e);
      if (!transient && attempt >= 1) break;
      if (transient) {
        if (Date.now() - started > 30_000 || attempt === 2) break;
        await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
      }
    }
  }
  if (!ir) ir = thin;
  if (!ir) {
    // Log the underlying model/validation detail server-side; return a friendly,
    // non-leaky message (lastError can carry upstream provider text).
    console.error('[api] generate: interpret failed:', lastError);
    if (transient) {
      return NextResponse.json(
        { error: 'The AI service is briefly overloaded — your sketch is fine. Try Generate again in a minute.' },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: 'Could not interpret your sketch. Try a clearer, higher-contrast photo of a page layout.' },
      { status: 422 },
    );
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
  if (saveErr) return serverError('generate: persist', saveErr);
  if (!saved) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // Give never-renamed projects a meaningful name from the page's own heading
  // (the .eq('name', …) guard means a user-chosen name is never overwritten).
  let appliedName: string | null = null;
  const derived = deriveProjectName(ir);
  if (derived && derived !== DEFAULT_PROJECT_NAME) {
    const { data: renamed } = await supabase
      .from('projects')
      .update({ name: derived })
      .eq('id', projectId)
      .eq('name', DEFAULT_PROJECT_NAME)
      .select('name')
      .maybeSingle();
    appliedName = renamed?.name ?? null;
  }

  return NextResponse.json({ ir, html, css, ...(appliedName ? { name: appliedName } : {}) });
}
