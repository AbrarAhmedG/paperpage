import { z } from 'zod';

export const CURATED_FONTS = ['Inter', 'Poppins', 'Roboto', 'Lora', 'Montserrat', 'Merriweather'] as const;

export const CURATED_PALETTES = {
  mintGold: { primary: '#14b8a6', secondary: '#facc15', background: '#ffffff', surface: '#f8fafc', text: '#0f172a' },
  slate: { primary: '#0f172a', secondary: '#38bdf8', background: '#ffffff', surface: '#f1f5f9', text: '#0f172a' },
} as const;

export const SECTION_ROLES = [
  'nav', 'hero', 'features', 'gallery', 'cta', 'text', 'footer',
] as const;

export const ELEMENT_TYPES = [
  'heading', 'paragraph', 'button', 'image', 'list', 'input', 'logo', 'divider',
] as const;

const hexColor = z.string().regex(/^#([0-9a-fA-F]{6})$/, 'must be a 6-digit hex color');

// Unknown fonts are coerced to a safe curated default rather than rejected.
const curatedFont = z.string().transform((f) => ((CURATED_FONTS as readonly string[]).includes(f) ? f : 'Inter'));

const elementSchema = z.object({
  type: z.enum(ELEMENT_TYPES),
  text: z.string().max(600).optional(),
  level: z.number().int().min(1).max(4).optional(),
  variant: z.enum(['primary', 'secondary', 'ghost']).optional(),
  items: z.array(z.string().max(200)).max(20).optional(),
  placeholder: z.string().max(120).optional(),
  alt: z.string().max(200).optional(),
});

const sectionSchema = z.object({
  id: z.string().min(1).max(64),
  role: z.enum(SECTION_ROLES),
  layout: z.object({
    columns: z.number().int().min(1).max(4),
    align: z.enum(['start', 'center', 'end']).default('start'),
  }),
  elements: z.array(elementSchema).min(1).max(30),
});

const themeSchema = z.object({
  palette: z.object({
    primary: hexColor,
    secondary: hexColor,
    background: hexColor,
    surface: hexColor,
    text: hexColor,
  }),
  fonts: z.object({ heading: curatedFont, body: curatedFont }),
  spacing: z.enum(['compact', 'normal', 'roomy']),
});

export const pageIRSchema = z.object({
  theme: themeSchema,
  sections: z.array(sectionSchema).min(1).max(20),
});

export type Element = z.infer<typeof elementSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type PageIR = z.infer<typeof pageIRSchema>;

export function validateIR(input: unknown): { ok: true; ir: PageIR } | { ok: false; error: string } {
  const r = pageIRSchema.safeParse(input);
  if (r.success) return { ok: true, ir: r.data };
  return { ok: false, error: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
}
