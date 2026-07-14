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
      "layout": { "columns": <integer 1-4>, "align": "start" | "center" | "end" },
      "elements": [
        { "type": "<one of: ${ELEMENT_TYPES.join(', ')}>", "text": "<optional>", "level": "<optional 1-4>", "variant": "<optional: primary|secondary|ghost>", "items": ["<optional list>"], "placeholder": "<optional>", "alt": "<optional>" }
      ]
    }
  ]
}

Allowed fonts (use these EXACT names only, for both heading and body): ${CURATED_FONTS.join(', ')}.

Rules:
- Infer each section's role from the drawing; order sections top-to-bottom exactly as drawn.
- Every section must have at least one element.
- All palette colors MUST be 6-digit hex like "#14b8a6". Use a clean, modern palette with a light background.
- The main title is a heading with "level": 1. Buttons use "type": "button" with short "text".
- Fill in short, sensible placeholder copy where the handwriting is unclear.
- Use "normal" spacing unless the sketch is clearly dense (compact) or airy (roomy).
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

/**
 * Calls an OpenAI-compatible vision chat endpoint and returns the raw parsed
 * layout object (validated downstream by validateIR). Defaults to Groq (free);
 * override with AI_BASE_URL / AI_API_KEY / AI_MODEL for OpenRouter, Ollama, etc.
 */
export async function callGeminiVision(image: { data: string; mimeType: string }): Promise<unknown> {
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
      messages: [
        { role: 'system', content: PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Interpret this hand-drawn website sketch and return the layout JSON.' },
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
