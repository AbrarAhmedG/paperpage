import 'server-only';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
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

// JSON responseSchema mirrors utils/ir/schema.ts (Gemini's schema dialect).
const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    theme: {
      type: SchemaType.OBJECT,
      properties: {
        palette: {
          type: SchemaType.OBJECT,
          properties: {
            primary: { type: SchemaType.STRING },
            secondary: { type: SchemaType.STRING },
            background: { type: SchemaType.STRING },
            surface: { type: SchemaType.STRING },
            text: { type: SchemaType.STRING },
          },
          required: ['primary', 'secondary', 'background', 'surface', 'text'],
        },
        fonts: {
          type: SchemaType.OBJECT,
          properties: {
            heading: { type: SchemaType.STRING, enum: [...CURATED_FONTS] },
            body: { type: SchemaType.STRING, enum: [...CURATED_FONTS] },
          },
          required: ['heading', 'body'],
        },
        spacing: { type: SchemaType.STRING, enum: ['compact', 'normal', 'roomy'] },
      },
      required: ['palette', 'fonts', 'spacing'],
    },
    sections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          role: { type: SchemaType.STRING, enum: [...SECTION_ROLES] },
          layout: {
            type: SchemaType.OBJECT,
            properties: {
              columns: { type: SchemaType.INTEGER },
              align: { type: SchemaType.STRING, enum: ['start', 'center', 'end'] },
            },
            required: ['columns', 'align'],
          },
          elements: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                type: { type: SchemaType.STRING, enum: [...ELEMENT_TYPES] },
                text: { type: SchemaType.STRING },
                level: { type: SchemaType.INTEGER },
                variant: { type: SchemaType.STRING, enum: ['primary', 'secondary', 'ghost'] },
                items: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                placeholder: { type: SchemaType.STRING },
                alt: { type: SchemaType.STRING },
              },
              required: ['type'],
            },
          },
        },
        required: ['id', 'role', 'layout', 'elements'],
      },
    },
  },
  required: ['theme', 'sections'],
} as const;

const PROMPT = `You are a web layout interpreter. Look at this photo of a hand-drawn website page sketch.
Produce a structured page layout as JSON matching the provided schema.
Rules:
- Infer each section's role (nav, hero, features, gallery, cta, text, footer) from the drawing.
- Order sections top-to-bottom as drawn.
- Fill in legible, sensible placeholder copy where handwriting is unclear. Keep copy short and realistic.
- Choose 6-digit hex colors for a clean, modern palette (light background).
- Pick a heading font and body font ONLY from the allowed font list.
- Use "normal" spacing unless the sketch is clearly dense or airy.`;

export async function callGeminiVision(image: { data: string; mimeType: string }): Promise<unknown> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      // @ts-expect-error responseSchema typing is looser than our const object
      responseSchema,
    },
  });

  const result = await model.generateContent([
    { text: PROMPT },
    { inlineData: { data: image.data, mimeType: image.mimeType } },
  ]);
  const text = result.response.text();
  return JSON.parse(text);
}
