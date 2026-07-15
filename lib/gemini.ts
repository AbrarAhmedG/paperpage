import 'server-only';
import sharp from 'sharp';
import { SECTION_ROLES, ELEMENT_TYPES, CURATED_FONTS } from '@/utils/ir/schema';

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

// Self-contained prompt: the JSON shape is described here (no provider-native
// schema needed), so any OpenAI-compatible vision model can produce it. The IR
// is still validated with Zod (utils/ir/schema.ts) after generation.
const PROMPT = `You are a web layout interpreter. You are given a photo of a hand-drawn website page sketch.
Return ONLY a single JSON object (no markdown, no commentary) with EXACTLY this shape:

{
  "theme": {
    "palette": { "primary": "#RRGGBB", "secondary": "#RRGGBB", "background": "#RRGGBB", "surface": "#RRGGBB", "text": "#RRGGBB" },
    "fonts": { "heading": "<allowed font>", "body": "<allowed font>" },
    "spacing": "compact" | "normal" | "roomy"
  },
  "sections": [
    {
      "id": "<short unique string>",
      "role": "<one of: ${SECTION_ROLES.join(', ')}>",
      "background": "default" | "surface" | "primary" | "gradient" | "dark",
      "layout": { "columns": <integer 1-12>, "align": "start" | "center" | "end" },
      "elements": [
        { "type": "<one of: ${ELEMENT_TYPES.join(', ')}>", "text": "<optional>", "level": "<optional 1-4>", "variant": "<optional: primary|secondary|ghost>", "items": ["<optional list>"], "placeholder": "<optional>", "alt": "<optional>", "col": "<optional 1-indexed column>", "colSpan": "<optional integer>", "row": "<optional 1-indexed row>" }
      ]
    }
  ]
}

Allowed fonts (use these EXACT names only, for both heading and body): ${CURATED_FONTS.join(', ')}.

Rules:
- Transcribe what is ACTUALLY DRAWN. Do NOT invent marketing copy, feature lists, or sections that are not in the sketch. If a box is labeled (e.g. "AD 300x100", "CHAT BOX", "LOGO"), use that label.
- Every section object MUST include an "elements" array with at least one element. Never omit the "elements" key.
- Infer each section's role from the drawing; order sections top-to-bottom exactly as drawn.
- PLACE ELEMENTS ON A GRID to match the drawing's 2D arrangement. Set the section's "columns" to the number of columns you see, and give each element a "col" (1-indexed; col 1 = leftmost), plus "colSpan" for wide items and "row" for vertical position. Elements drawn side by side get DIFFERENT "col" values; a full-width banner uses "colSpan" equal to "columns". If a region is a simple single column, use columns 1 and omit col/row.
- Map drawn regions to the closest element type: a picture/video/media box -> "image"; a labeled ad/banner slot -> "image" (put its label in "alt"); an input/search field -> "input"; a menu or bullet list -> "list"; a block of body text or a labeled placeholder box -> "paragraph".
- All palette colors MUST be 6-digit hex. Choose a MODERN, ATTRACTIVE palette (clean, high-contrast, light background; do NOT use pure black #000000 as primary unless clearly drawn that way). Set each section's "background" for visual rhythm (e.g. a "gradient" hero, alternating "surface"); use "default" when unsure.
- The main title is a heading with "level": 1. Buttons use "type": "button" with short "text".
- Only add short placeholder copy where the handwriting is genuinely unclear; otherwise leave "text" empty rather than inventing content (the renderer fills neutral placeholders).
- Use "normal" spacing unless the sketch is clearly dense (compact) or airy (roomy).
- If the image is clearly NOT a hand-drawn web-page layout, return a single "hero" section with one heading and one paragraph as a starter — do not invent a full site.
- Output the JSON object only.`;

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
    system: PROMPT,
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
        { role: 'system', content: PROMPT },
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
