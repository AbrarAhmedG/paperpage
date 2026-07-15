import { z } from 'zod';

export const CURATED_FONTS = ['Inter', 'Poppins', 'Roboto', 'Lora', 'Montserrat', 'Merriweather'] as const;

export const CURATED_PALETTES = {
  indigo: { primary: '#6366f1', secondary: '#f59e0b', background: '#ffffff', surface: '#f5f6ff', text: '#0f172a' },
  teal: { primary: '#0d9488', secondary: '#f43f5e', background: '#ffffff', surface: '#f0fdfa', text: '#0f172a' },
} as const;

export const SECTION_ROLES = [
  'nav', 'hero', 'features', 'gallery', 'cta', 'text', 'footer',
] as const;

export const SECTION_BACKGROUNDS = ['default', 'surface', 'primary', 'gradient', 'dark'] as const;

export const ELEMENT_TYPES = [
  'heading', 'paragraph', 'button', 'image', 'list', 'input', 'logo', 'divider', 'tabs', 'video',
] as const;

type ElementType = (typeof ELEMENT_TYPES)[number];
type SectionRole = (typeof SECTION_ROLES)[number];

// Normalize a model-supplied enum-ish value to a lookup key (lowercase, alnum only).
const normKey = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

// AI models emit reasonable-but-off type names. Map common variants to our canonical
// element types; anything still unknown falls back to 'paragraph' so a single off-label
// element never fails the whole page.
const ELEMENT_ALIASES: Record<string, ElementType> = {
  text: 'paragraph', p: 'paragraph', copy: 'paragraph', subtitle: 'paragraph', description: 'paragraph', span: 'paragraph', label: 'paragraph', caption: 'paragraph',
  title: 'heading', header: 'heading', headline: 'heading', h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', subheading: 'heading',
  link: 'button', cta: 'button', btn: 'button', navlink: 'button', action: 'button', anchor: 'button',
  img: 'image', picture: 'image', photo: 'image', icon: 'image', avatar: 'image', graphic: 'image', illustration: 'image',
  brand: 'logo', navbar: 'logo', wordmark: 'logo',
  ul: 'list', ol: 'list', menu: 'list', navmenu: 'list', bullets: 'list', links: 'list', nav: 'list',
  field: 'input', textbox: 'input', textfield: 'input', search: 'input', form: 'input', email: 'input', textarea: 'input',
  hr: 'divider', line: 'divider', separator: 'divider', rule: 'divider', spacer: 'divider', break: 'divider',
  tab: 'tabs', tabbar: 'tabs', pagination: 'tabs', pager: 'tabs', breadcrumb: 'tabs', breadcrumbs: 'tabs', steps: 'tabs', stepper: 'tabs', pages: 'tabs',
  player: 'video', videoplayer: 'video', mediaplayer: 'video', movie: 'video', media: 'video',
};
const elementType = z.preprocess((v) => {
  const n = normKey(v);
  if ((ELEMENT_TYPES as readonly string[]).includes(n)) return n;
  return ELEMENT_ALIASES[n] ?? 'paragraph';
}, z.enum(ELEMENT_TYPES));

// Section-role synonyms → canonical roles. Genuinely unknown roles pass through unchanged
// so the enum still rejects them (roles are a small, deliberate set).
const ROLE_ALIASES: Record<string, SectionRole> = {
  navigation: 'nav', navbar: 'nav', menu: 'nav', header: 'nav', topbar: 'nav', navigationbar: 'nav',
  banner: 'hero', jumbotron: 'hero', masthead: 'hero', splash: 'hero', herosection: 'hero',
  feature: 'features', cards: 'features', services: 'features', benefits: 'features', featuregrid: 'features',
  images: 'gallery', portfolio: 'gallery', grid: 'gallery', photos: 'gallery', imagegallery: 'gallery',
  calltoaction: 'cta', signup: 'cta', subscribe: 'cta', newsletter: 'cta',
  content: 'text', paragraph: 'text', about: 'text', body: 'text', section: 'text', textblock: 'text',
  foot: 'footer', bottom: 'footer', footersection: 'footer',
};
const sectionRole = z.preprocess((v) => {
  const n = normKey(v);
  if ((SECTION_ROLES as readonly string[]).includes(n)) return n;
  return ROLE_ALIASES[n] ?? v;
}, z.enum(SECTION_ROLES));

// 6-digit hex; salvage 3-digit (#abc) and missing-# forms. Non-hex words (e.g. "red") still reject.
const hexColor = z.preprocess((v) => {
  const s = String(v ?? '').trim();
  const three = s.match(/^#?([0-9a-fA-F]{3})$/);
  if (three) return '#' + three[1].split('').map((c) => c + c).join('');
  const six = s.match(/^#?([0-9a-fA-F]{6})$/);
  if (six) return '#' + six[1];
  return s;
}, z.string().regex(/^#([0-9a-fA-F]{6})$/, 'must be a 6-digit hex color'));

// Unknown fonts are coerced to a safe curated default rather than rejected.
const curatedFont = z.string().transform((f) => ((CURATED_FONTS as readonly string[]).includes(f) ? f : 'Inter'));

const elementSchema = z.object({
  type: elementType,
  text: z.string().max(600).optional(),
  level: z.coerce.number().int().optional().catch(undefined),
  variant: z.enum(['primary', 'secondary', 'ghost']).optional().catch(undefined),
  items: z.array(z.string().max(200)).max(20).optional().catch(undefined),
  placeholder: z.string().max(120).optional(),
  alt: z.string().max(200).optional(),
  // Explicit CSS-grid placement (1-indexed). Clamped to the section's column
  // count by the renderer; here we only coerce to a positive int, dropping junk.
  col: z.coerce.number().int().min(1).optional().catch(undefined),
  colSpan: z.coerce.number().int().min(1).optional().catch(undefined),
  row: z.coerce.number().int().min(1).optional().catch(undefined),
  rowSpan: z.coerce.number().int().min(1).optional().catch(undefined),
});

// Unknown/missing background -> 'default'. Case-insensitive.
const sectionBackground = z
  .preprocess((v) => (v == null ? 'default' : String(v).toLowerCase()), z.enum(SECTION_BACKGROUNDS))
  .catch('default');

const sectionSchema = z.object({
  id: z.string().min(1).max(64).catch('section'),
  role: sectionRole,
  background: sectionBackground,
  layout: z
    .object({
      columns: z.coerce.number().int().min(1).max(12).catch(1),
      align: z.enum(['start', 'center', 'end']).catch('start'),
    })
    .catch({ columns: 1, align: 'start' }),
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
  spacing: z.enum(['compact', 'normal', 'roomy']).catch('normal'),
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
