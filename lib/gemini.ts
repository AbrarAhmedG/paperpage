import 'server-only';
import sharp from 'sharp';
import { LAYOUT_PROMPT } from './prompt';

export async function downscaleImage(
  buffer: Buffer,
  _mimeType: string,
): Promise<{ data: string; mimeType: string }> {
  const out = await sharp(buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return { data: out.toString('base64'), mimeType: 'image/jpeg' };
}

// Pull the first balanced JSON object out of the model's reply (handles code
// fences or stray prose that some models add around the JSON).
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  return start !== -1 && end > start ? raw.slice(start, end + 1) : raw.trim();
}

const USER_INSTRUCTION = 'Interpret this hand-drawn website sketch and return the layout JSON.';

/**
 * Anthropic (Claude) path — uses the official SDK's Messages API with vision.
 * Far higher wireframe fidelity than the free tier, but requires an Anthropic
 * API key (console.anthropic.com; pay-as-you-go — NOT a claude.ai subscription).
 * Enabled with AI_PROVIDER=anthropic. Default model: claude-opus-4-8.
 */
async function callViaAnthropic(image: { data: string; mimeType: string }): Promise<unknown> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY || '';
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set (required when AI_PROVIDER=anthropic)');
  const model = process.env.AI_MODEL || 'claude-opus-4-8';

  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model,
    max_tokens: 8192,
    system: LAYOUT_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              // downscaleImage always emits JPEG; keep in sync if that changes.
              media_type: (image.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp') || 'image/jpeg',
              data: image.data,
            },
          },
          { type: 'text', text: USER_INSTRUCTION },
        ],
      },
    ],
  });

  const block = res.content.find((b) => b.type === 'text');
  const text = block && 'text' in block ? block.text : undefined;
  if (typeof text !== 'string') throw new Error('Anthropic response contained no text content');
  return JSON.parse(extractJson(text));
}

/**
 * OpenAI-compatible path (default) — Groq (free), OpenRouter, local Ollama, etc.
 * Configure with AI_BASE_URL / AI_API_KEY / AI_MODEL.
 */
async function callViaOpenAICompatible(image: { data: string; mimeType: string }): Promise<unknown> {
  const baseUrl = (process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');
  const apiKey = process.env.AI_API_KEY || process.env.GROQ_API_KEY || '';
  const model = process.env.AI_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      // Force valid JSON output. Without this, the model intermittently emits
      // malformed JSON (e.g. a section missing its "elements" key), which throws
      // in JSON.parse and silently degrades the result via the route's retry.
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: LAYOUT_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: USER_INSTRUCTION },
            { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.data}` } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`AI request failed (${res.status}): ${errText.slice(0, 300)}`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('AI response contained no text content');
  return JSON.parse(extractJson(content));
}

/**
 * Interprets a sketch into a raw layout object (validated downstream by
 * validateIR). Provider is chosen by AI_PROVIDER:
 *   - "anthropic" -> Claude via the official SDK (paid, best fidelity)
 *   - anything else (default) -> OpenAI-compatible endpoint (Groq free, etc.)
 */
export async function callGeminiVision(image: { data: string; mimeType: string }): Promise<unknown> {
  const provider = (process.env.AI_PROVIDER || '').toLowerCase();
  if (provider === 'anthropic' || provider === 'claude') return callViaAnthropic(image);
  return callViaOpenAICompatible(image);
}
