import type { PageIR, Section, Element } from './ir/schema';

function esc(s: string | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Curated inline icon set (Lucide-style, stroke, currentColor). Static strings
// authored here — never derived from the IR — so they stay safe by construction.
// Feature cards, primary buttons, and the logo pull from this set.
// ---------------------------------------------------------------------------
const ICON_ATTRS =
  'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const ICONS: Record<string, string> = {
  arrow: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  shield: '<path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6z"/><path d="M9.5 12l2 2 3.5-4"/>',
  chart: '<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/>',
  layers: '<path d="M12 2l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
  sparkles: '<path d="M12 3l1.8 4.7L18 9.5l-4.2 1.8L12 16l-1.8-4.7L6 9.5z"/>',
  rocket: '<path d="M5 15c-1 1-1.5 4-1.5 4s3-.5 4-1.5"/><path d="M9 13a11 11 0 0 1 8-9c1.6 0 2 .4 2 2a11 11 0 0 1-9 8z"/><circle cx="14.5" cy="9.5" r="1.1"/>',
  chevronLeft: '<path d="M15 6l-6 6 6 6"/>',
  chevronRight: '<path d="M9 6l6 6-6 6"/>',
};
function icon(name: string): string {
  return `<svg ${ICON_ATTRS}>${ICONS[name] ?? ICONS.sparkles}</svg>`;
}
// Rotating icons for feature cards (only used when a card has no image of its own).
const FEATURE_ICONS = ['zap', 'shield', 'chart', 'layers', 'sparkles', 'rocket'];

// Social-network glyphs (complete inline SVGs — brand marks are filled shapes,
// unlike the stroked utility icons above). Static strings authored here, never
// derived from the IR, so they stay safe by construction.
const SOCIAL_STROKE = `<svg ${ICON_ATTRS}>`;
const SOCIAL_ICONS: Record<string, string> = {
  facebook:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.13 22 16.99 22 12z"/></svg>',
  twitter:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.12z"/></svg>',
  linkedin:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 5a2 2 0 1 1-4-.01 2 2 0 0 1 4 .01zM7 8.48H3V21h4zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91z"/></svg>',
  instagram:
    `${SOCIAL_STROKE}<rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="4.3"/><circle cx="17.6" cy="6.4" r="1.3" fill="currentColor" stroke="none"/></svg>`,
  youtube:
    `${SOCIAL_STROKE}<rect x="2" y="5.5" width="20" height="13" rx="4"/><path d="M10.2 9.5l4.8 2.5-4.8 2.5z" fill="currentColor" stroke="none"/></svg>`,
  github:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.66.41.36.78 1.05.78 2.13v3.16c0 .3.2.67.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>',
  tiktok:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.77.12V9.77a5.76 5.76 0 0 0-.77-.05 5.66 5.66 0 1 0 5.66 5.66V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.22-1.48z"/></svg>',
  email: `${SOCIAL_STROKE}<rect x="2.5" y="4.5" width="19" height="15" rx="3"/><path d="M3 6l9 7 9-7"/></svg>`,
};
const SOCIAL_ALIASES: Record<string, string> = {
  fb: 'facebook',
  x: 'twitter',
  insta: 'instagram',
  ig: 'instagram',
  yt: 'youtube',
  mail: 'email',
  gmail: 'email',
};
function socialIcon(label: string): string | undefined {
  const key = label.toLowerCase().replace(/[^a-z]/g, '');
  return SOCIAL_ICONS[SOCIAL_ALIASES[key] ?? key];
}

// ---------------------------------------------------------------------------
// Palette-derived mesh placeholder. A layered mesh (linear base + two radial
// spots in primary/secondary) with a soft "image" glyph, so an empty media slot
// reads as an intentional frame, not a flat box. Composition rotates by variant
// so repeated placeholders on one page differ. No external request; the palette
// values are validated 6-digit hex, safe to interpolate. encodeURIComponent
// encodes each '#' to %23 exactly once (double-encoding would render black).
// ---------------------------------------------------------------------------
function hexToRgb(h: string): [number, number, number] | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(h);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  if (!pa || !pb) return a;
  const c = (i: number) => Math.round(pa[i] + (pb[i] - pa[i]) * t);
  return '#' + [c(0), c(1), c(2)].map((n) => n.toString(16).padStart(2, '0')).join('');
}

// Spot placements per variant: [primary spot, secondary spot] as bounding-box fractions.
const MESH_VARIANTS: Array<{ p: [number, number]; s: [number, number]; angle: [number, number, number, number] }> = [
  { p: [0.16, 0.2], s: [0.86, 0.24], angle: [0, 0, 1, 1] },
  { p: [0.9, 0.82], s: [0.12, 0.16], angle: [1, 0, 0, 1] },
  { p: [0.28, 0.86], s: [0.8, 0.1], angle: [0, 1, 1, 0] },
];

// Curated, allowlisted photographic library for hero/gallery media slots. Every
// URL was verified live (HTTP 200 + `Access-Control-Allow-Origin: *`), so the
// client-side exporter can fetch and bundle them into the offline .zip via the
// existing asset pipeline. These are hardcoded here and NEVER model-supplied —
// generated pages stay free of untrusted URLs. Other image slots keep the mesh
// placeholder, which also backs a photo while it loads / if it ever fails.
const CURATED_PHOTOS = [
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1531973576160-7125cd663d86?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
];

function placeholderSvg(primary: string, secondary: string, variant: number): string {
  const v = MESH_VARIANTS[variant % MESH_VARIANTS.length];
  const base = mix(primary, '#0b1020', 0.62);
  const [x1, y1, x2, y2] = v.angle;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">' +
    '<defs>' +
    `<linearGradient id="b" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${primary}"/><stop offset="1" stop-color="${base}"/></linearGradient>` +
    `<radialGradient id="p" cx="${v.p[0]}" cy="${v.p[1]}" r="0.62"><stop offset="0" stop-color="${primary}" stop-opacity="0.95"/><stop offset="1" stop-color="${primary}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="s" cx="${v.s[0]}" cy="${v.s[1]}" r="0.55"><stop offset="0" stop-color="${secondary}" stop-opacity="0.9"/><stop offset="1" stop-color="${secondary}" stop-opacity="0"/></radialGradient>` +
    '</defs>' +
    '<rect width="800" height="600" fill="url(#b)"/>' +
    '<rect width="800" height="600" fill="url(#p)"/>' +
    '<rect width="800" height="600" fill="url(#s)"/>' +
    '<g transform="translate(338,232)" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="0" y="0" width="124" height="124" rx="14"/><path d="M10 98 46 62l26 26 20-20 32 32"/>' +
    '<circle cx="42" cy="42" r="10" fill="#ffffff" fill-opacity="0.55" stroke="none"/></g>' +
    '</svg>';
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// Auto color rhythm: honor the model's background when it set one; otherwise pick
// a lively default by role so pages are never flat white even when the model
// plays the palette safe. Alternating index tints break up long stacks.
function effectiveBackground(section: Section, index: number): string {
  if (section.background && section.background !== 'default') return section.background;
  switch (section.role) {
    case 'hero':
      return 'gradient';
    case 'footer':
      return 'dark';
    case 'cta':
      return 'default'; // the inset gradient panel carries the colour
    case 'features':
    case 'gallery':
    case 'text':
      return index % 2 === 1 ? 'surface' : 'default';
    default:
      return 'default';
  }
}

// Neutral placeholder copy so empty sketch boxes render as styled, visible
// headings / body / buttons. Deterministic and static (always escaped), so the
// model can honestly leave text empty while the page still looks complete.
const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
const HEADING_PLACEHOLDER: Record<number, string> = {
  1: 'Your Headline Goes Here',
  2: 'A Section Heading',
  3: 'A Subheading',
  4: 'Detail Heading',
};
const LIST_PLACEHOLDER = ['First item', 'Second item', 'Third item'];

// Structural region names that sometimes leak from the sketch into heading
// text ("Footer", "Header") despite the prompt rule — never real page copy.
const STRUCTURAL_LABELS = new Set([
  'footer', 'header', 'nav', 'navbar', 'navigation', 'sidebar', 'banner', 'section', 'page', 'body', 'content', 'wrapper', 'main',
]);
const isStructuralHeading = (el: Element): boolean =>
  el.type === 'heading' && STRUCTURAL_LABELS.has((el.text ?? '').trim().toLowerCase());

// Partner/client logo marks render as muted chips, never full photos.
const LOGOISH = /logo|partner|client|brand|sponsor/;

type RenderCtx = { primary: string; secondary: string; img: { v: number }; photo: { v: number } };

function logoChip(ctx: RenderCtx, alt: string | undefined): string {
  const ph = placeholderSvg(ctx.primary, ctx.secondary, ctx.img.v++);
  return `<img class="pp-logochip" data-pp-asset="1" src="${ph}" alt="${esc(alt) || 'logo'}" />`;
}

// Carousel frame — a curated photo slide with prev/next arrows and dots.
// Decorative chrome only (no JS); GrapesJS owns the page after generation.
function renderCarousel(alt: string, ctx: RenderCtx): string {
  const src = CURATED_PHOTOS[ctx.photo.v++ % CURATED_PHOTOS.length];
  return (
    `<div class="pp-carousel"><img class="pp-image pp-carousel__img" data-pp-asset="1" src="${src}" alt="${esc(alt) || 'Slide'}" loading="lazy" />` +
    `<span class="pp-carousel__nav pp-carousel__nav--prev" aria-hidden="true">${icon('chevronLeft')}</span>` +
    `<span class="pp-carousel__nav pp-carousel__nav--next" aria-hidden="true">${icon('chevronRight')}</span>` +
    `<span class="pp-carousel__dots" aria-hidden="true"><i class="pp-carousel__dot pp-carousel__dot--active"></i><i class="pp-carousel__dot"></i><i class="pp-carousel__dot"></i></span></div>`
  );
}

function renderElement(el: Element, ctx: RenderCtx, role: Section['role']): string {
  switch (el.type) {
    case 'heading': {
      const lvl = Math.min(Math.max(el.level ?? 2, 1), 4);
      const text = esc(el.text) || esc(HEADING_PLACEHOLDER[lvl] ?? 'Heading');
      if (lvl === 4) return `<span class="pp-eyebrow">${text}</span>`;
      return `<h${lvl} class="pp-heading">${text}</h${lvl}>`;
    }
    case 'paragraph':
      return `<p class="pp-paragraph">${esc(el.text) || esc(LOREM)}</p>`;
    case 'button': {
      const v = el.variant ?? 'primary';
      const label = esc(el.text) || 'Learn More';
      const tail = v === 'primary' ? `<svg ${ICON_ATTRS}>${ICONS.arrow}</svg>` : '';
      return `<a class="pp-button pp-button--${v}" href="#">${label}${tail}</a>`;
    }
    case 'image': {
      // A small round avatar/icon (the sketch's circles) renders as a small
      // circular mesh tile — NOT a full-bleed photo — so circles stay circles.
      const altLc = (el.alt || '').toLowerCase();
      if (/avatar|icon|circle|profile/.test(altLc)) {
        const ph = placeholderSvg(ctx.primary, ctx.secondary, ctx.img.v++);
        return `<img class="pp-image pp-image--avatar" data-pp-asset="1" src="${ph}" alt="${esc(el.alt)}" />`;
      }
      // Partner/client logos: a muted chip, never a curated photo. A lone
      // image standing for a whole drawn strip ("partner logo slider",
      // "client logos") expands to a chip row — the sketch drew many boxes.
      if (LOGOISH.test(altLc)) {
        const strip = /slider|carousel|strip|row|wall|logos|partners|clients|brands|sponsors/.test(altLc);
        if (strip) {
          const chips = Array.from({ length: 6 }, () => logoChip(ctx, el.alt)).join('');
          return `<div class="pp-logos">${chips}</div>`;
        }
        return logoChip(ctx, el.alt);
      }
      // A drawn image slider (labeled slider/carousel) gets carousel chrome —
      // the sketch's < > arrows — around its photo slide.
      if (role === 'gallery' && /slider|carousel/.test(altLc)) return renderCarousel(el.alt ?? '', ctx);
      // Hero & gallery picture regions get a curated photograph; everything else
      // gets the palette-mesh placeholder. All stay replaceable (data-pp-asset)
      // and bundle offline on export.
      if (role === 'hero' || role === 'gallery') {
        const src = CURATED_PHOTOS[ctx.photo.v++ % CURATED_PHOTOS.length];
        return `<img class="pp-image" data-pp-asset="1" src="${src}" alt="${esc(el.alt)}" loading="lazy" />`;
      }
      const ph = placeholderSvg(ctx.primary, ctx.secondary, ctx.img.v++);
      return `<img class="pp-image" data-pp-asset="1" src="${ph}" alt="${esc(el.alt)}" />`;
    }
    case 'list': {
      const src = el.items && el.items.length ? el.items : LIST_PLACEHOLDER;
      // A footer list naming ONLY social networks (the sketch's "facebook /
      // linkedin" corner) renders as a horizontal icon-link row, not bullets.
      if (role === 'footer') {
        const icons = src.map(socialIcon);
        if (icons.every(Boolean)) {
          const links = src
            .map((label, i) => `<a class="pp-social__link" href="#" aria-label="${esc(label)}">${icons[i]}</a>`)
            .join('');
          return `<div class="pp-social">${links}</div>`;
        }
      }
      const items = src.map((i) => `<li>${esc(i)}</li>`).join('');
      return `<ul class="pp-list">${items}</ul>`;
    }
    case 'input':
      return `<input class="pp-input" type="text" placeholder="${esc(el.placeholder) || 'Enter text'}" />`;
    case 'logo':
      return `<span class="pp-logo"><span class="pp-logo__mark">${icon('sparkles')}</span>${esc(el.text) || 'Logo'}</span>`;
    case 'divider':
      return `<hr class="pp-divider" />`;
    case 'tabs': {
      const items = el.items && el.items.length ? el.items : ['Tab 1', 'Tab 2', 'Tab 3'];
      // A drawn image slider (a media box flanked by < > arrows) sometimes
      // reaches the IR as tabs whose items are arrow glyphs. Render that as a
      // carousel frame — photo slide + prev/next chrome + dots — not pill
      // buttons. Pagination bars keep real labels, so they stay tabs.
      const isArrow = (t: string) => /^[<>‹›«»←→]+$|^<-+$|^-+>$/.test(t.trim());
      const labels = items.filter((t) => !isArrow(t));
      if (items.length - labels.length >= 2 && labels.length <= 1) return renderCarousel(labels[0] ?? '', ctx);
      const tabs = items
        .map((t, i) => `<button class="pp-tab${i === 0 ? ' pp-tab--active' : ''}" type="button">${esc(t)}</button>`)
        .join('');
      return `<div class="pp-tabs" role="tablist">${tabs}</div>`;
    }
    case 'video':
      return `<div class="pp-video"><span class="pp-video__play" aria-hidden="true"></span></div>`;
    default:
      return '';
  }
}

const clampInt = (n: number | undefined, lo: number, hi: number): number | undefined =>
  n == null ? undefined : Math.min(Math.max(Math.trunc(n), lo), hi);

// Horizontal grid placement for one column-cell, clamped to the section's track
// count. Only integers derived from the IR reach `style=`, so this stays
// injection-safe. Rows are intentionally left to grid auto-flow.
function cellStyle(col: number | undefined, colSpan: number | undefined, columns: number): string {
  const c = clampInt(col, 1, columns);
  if (c != null) {
    const span = clampInt(colSpan ?? 1, 1, columns - c + 1) ?? 1;
    return ` style="grid-column:${c} / span ${span}"`;
  }
  if (colSpan && columns > 1) return ` style="grid-column: span ${clampInt(colSpan, 1, columns)}"`;
  return '';
}

// Render a cell's elements. A run of 3+ consecutive images (a thumbnail wall —
// e.g. a media archive or portfolio) becomes a compact tile grid instead of a
// stack of full-bleed photos.
function renderCellInner(els: Element[], ctx: RenderCtx, role: Section['role']): string {
  const out: string[] = [];
  let i = 0;
  while (i < els.length) {
    if (els[i].type === 'image') {
      let j = i;
      while (j < els.length && els[j].type === 'image') j++;
      const run = els.slice(i, j);
      if (run.length >= 3 && run.every((e) => LOGOISH.test((e.alt || '').toLowerCase()))) {
        // A row of drawn logo boxes (partners/clients wall) → logo chip strip.
        out.push(`<div class="pp-logos">${run.map((e) => logoChip(ctx, e.alt)).join('')}</div>`);
      } else if (run.length >= 3) {
        const tiles = run
          .map((e) => {
            const ph = placeholderSvg(ctx.primary, ctx.secondary, ctx.img.v++);
            return `<img class="pp-thumb" data-pp-asset="1" src="${ph}" alt="${esc(e.alt)}" />`;
          })
          .join('');
        out.push(`<div class="pp-thumbs">${tiles}</div>`);
      } else {
        for (const e of run) out.push(renderElement(e, ctx, role));
      }
      i = j;
    } else {
      out.push(renderElement(els[i], ctx, role));
      i++;
    }
  }
  return out.join('\n        ');
}

function renderSection(section: Section, ctx: RenderCtx, index: number): string {
  // Defense-in-depth against the model echoing region names as visible copy.
  section = { ...section, elements: section.elements.filter((e) => !isStructuralHeading(e)) };
  const cols = section.layout.columns;
  const bg = effectiveBackground(section, index);
  // Hero with a background image + overlaid text (the sketch drew text ON the
  // image): render the photo full-bleed with the heading / copy / button
  // overlaid, instead of stacking image-then-text.
  if (section.role === 'hero' && cols <= 1) {
    const imgEl = section.elements.find((e) => e.type === 'image');
    const overlay = section.elements.filter((e) => e !== imgEl);
    if (imgEl && overlay.some((e) => e.type !== 'image')) {
      const src = CURATED_PHOTOS[ctx.photo.v++ % CURATED_PHOTOS.length];
      const content = overlay.map((e) => renderElement(e, ctx, 'hero')).join('\n        ');
      return `  <section data-region="hero" class="pp-section pp-hero pp-hero--media" data-align="${section.layout.align}">
    <div class="pp-hero__bg"><img class="pp-hero__img" data-pp-asset="1" src="${src}" alt="${esc(imgEl.alt)}" loading="lazy" /></div>
    <div class="pp-container" style="--pp-cols:1">
      <div class="pp-cell">
        ${content}
      </div>
    </div>
  </section>`;
    }
    // A lone hero image (nothing else drawn in the band) is a wide banner
    // strip, as sketched — not a tall 4:3 photo.
    if (imgEl && section.elements.length === 1) {
      const src = CURATED_PHOTOS[ctx.photo.v++ % CURATED_PHOTOS.length];
      return `  <section data-region="hero" class="pp-section pp-hero pp-bg-${bg}" data-align="${section.layout.align}" style="--pp-cols:1">
    <div class="pp-container">
      <div class="pp-cell">
        <img class="pp-image pp-image--banner" data-pp-asset="1" src="${src}" alt="${esc(imgEl.alt)}" loading="lazy" />
      </div>
    </div>
  </section>`;
    }
  }
  // Group elements into column cells so a card's contents (image / title / text
  // / button) end up in ONE cell — even when the model emits row-major (all
  // images, then all titles, then all descriptions). Full-width banners
  // (colSpan == columns, or elements with no col) stand alone and flush the
  // current band, preserving top-to-bottom order.
  type Group = { col?: number; colSpan?: number; els: Element[] };
  const groups: Group[] = [];
  let band = new Map<number, Group>();
  const flush = () => {
    for (const col of [...band.keys()].sort((a, b) => a - b)) groups.push(band.get(col)!);
    band = new Map();
  };
  for (const el of section.elements) {
    const col = el.col;
    // A heading spanning 2+ columns is a section title -> full-width banner.
    const isBanner =
      cols <= 1 ||
      col == null ||
      (el.colSpan != null && el.colSpan >= cols) ||
      (el.type === 'heading' && (el.colSpan ?? 1) >= 2);
    if (isBanner || col == null) {
      flush();
      groups.push({ col, colSpan: el.colSpan, els: [el] });
    } else {
      const g = band.get(col);
      if (g) {
        g.els.push(el);
        g.colSpan = Math.max(g.colSpan ?? 1, el.colSpan ?? 1);
      } else {
        band.set(col, { col, colSpan: el.colSpan, els: [el] });
      }
    }
  }
  flush();
  let featureIdx = 0;
  const cells = groups
    .map((g) => {
      const inner = renderCellInner(g.els, ctx, section.role);
      // A lone image in a card grid fills its (stretched) cell, so a single tall
      // block matches the height of a taller neighbouring column — as drawn.
      const fill =
        (section.role === 'features' || section.role === 'gallery') &&
        g.els.length === 1 &&
        g.els[0].type === 'image';
      // Feature cards without their own image get a leading themed icon tile.
      let lead = '';
      if (section.role === 'features' && !g.els.some((e) => e.type === 'image')) {
        lead = `<span class="pp-icon">${icon(FEATURE_ICONS[featureIdx % FEATURE_ICONS.length])}</span>\n        `;
        featureIdx++;
      }
      return `<div class="pp-cell"${fill ? ' data-fill="1"' : ''}${cellStyle(g.col, g.colSpan, cols)}>\n        ${lead}${inner}\n      </div>`;
    })
    .join('\n      ');
  // CTA sections wrap their content in an inset gradient panel.
  const container =
    section.role === 'cta'
      ? `<div class="pp-container">\n      <div class="pp-cta__inner">\n      ${cells}\n      </div>\n    </div>`
      : `<div class="pp-container">\n      ${cells}\n    </div>`;
  return `  <section data-region="${section.role}" class="pp-section pp-${section.role} pp-bg-${bg}" data-align="${section.layout.align}" style="--pp-cols:${cols}">
    ${container}
  </section>`;
}

const SPACING_SCALE: Record<PageIR['theme']['spacing'], string> = {
  compact: '3.25rem',
  normal: '5rem',
  roomy: '7rem',
};

export function renderPage(ir: PageIR): { html: string; css: string } {
  const { theme } = ir;
  const ctx: RenderCtx = { primary: theme.palette.primary, secondary: theme.palette.secondary, img: { v: 0 }, photo: { v: 0 } };
  const sections = ir.sections.map((s, i) => renderSection(s, ctx, i)).join('\n');
  const html = `<body class="pp-page">\n${sections}\n</body>`;

  const fontParam = [theme.fonts.heading, theme.fonts.body]
    .map((f) => `family=${f.replace(/ /g, '+')}:wght@400;500;600;700;800`)
    .join('&');

  const css = `@import url('https://fonts.googleapis.com/css2?${fontParam}&display=swap');

:root {
  --pp-primary: ${theme.palette.primary};
  --pp-secondary: ${theme.palette.secondary};
  --pp-background: ${theme.palette.background};
  --pp-surface: ${theme.palette.surface};
  --pp-text: ${theme.palette.text};
  --pp-space: ${SPACING_SCALE[theme.spacing]};
  --pp-font-heading: '${theme.fonts.heading}', system-ui, sans-serif;
  --pp-font-body: '${theme.fonts.body}', system-ui, sans-serif;
  --pp-radius: 18px;
  --pp-border: color-mix(in srgb, var(--pp-text) 10%, transparent);
  --pp-shadow: 0 14px 40px -12px rgba(15, 23, 42, 0.22);
  --pp-shadow-sm: 0 4px 14px -6px rgba(15, 23, 42, 0.16);
  --pp-muted: color-mix(in srgb, var(--pp-text) 62%, transparent);
}

* { box-sizing: border-box; }
.pp-page { margin: 0; background: var(--pp-background); color: var(--pp-text); font-family: var(--pp-font-body); font-size: 1.0625rem; line-height: 1.65; -webkit-font-smoothing: antialiased; }
img { max-width: 100%; }

.pp-section { padding: var(--pp-space) 1.5rem; position: relative; }
.pp-container { display: grid; grid-template-columns: repeat(var(--pp-cols), minmax(0, 1fr)); gap: 1.9rem; max-width: 1140px; margin: 0 auto; align-items: start; }
.pp-cell { min-width: 0; display: flex; flex-direction: column; gap: 0.75rem; }
/* Alignment — honor the IR's per-section align on cell contents. */
.pp-section[data-align="center"] .pp-cell { align-items: center; text-align: center; }
.pp-section[data-align="end"] .pp-cell { align-items: flex-end; text-align: right; }
.pp-hero .pp-container { align-items: center; }

/* Eyebrow (level-4 headings become tracked, accented labels) */
.pp-eyebrow { display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--pp-primary); }
.pp-eyebrow::before { content: ""; width: 22px; height: 2px; border-radius: 2px; background: var(--pp-primary); }
.pp-section[data-align="center"] .pp-eyebrow, .pp-hero .pp-eyebrow { justify-content: center; }

/* Typography */
.pp-heading { font-family: var(--pp-font-heading); font-weight: 800; line-height: 1.1; letter-spacing: -0.025em; margin: 0 0 0.3rem; text-wrap: balance; }
h1.pp-heading { font-size: clamp(2.4rem, 5.2vw, 3.75rem); }
h2.pp-heading { font-size: clamp(1.7rem, 3.4vw, 2.5rem); }
h3.pp-heading { font-size: 1.28rem; }
.pp-paragraph { margin: 0 0 0.3rem; color: var(--pp-muted); max-width: 62ch; }

/* Buttons */
.pp-button { align-self: flex-start; display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.85rem 1.6rem; border-radius: 12px; text-decoration: none; font-weight: 700; background: var(--pp-primary); color: #fff; box-shadow: 0 10px 24px -8px color-mix(in srgb, var(--pp-primary) 60%, transparent); transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease; }
.pp-button svg { width: 18px; height: 18px; }
.pp-button:hover { transform: translateY(-2px); filter: brightness(1.05); box-shadow: 0 16px 30px -8px color-mix(in srgb, var(--pp-primary) 70%, transparent); }
.pp-button--primary { background: linear-gradient(135deg, var(--pp-primary), color-mix(in srgb, var(--pp-primary) 55%, var(--pp-secondary))); color: #fff; }
.pp-button--secondary { background: var(--pp-secondary); color: var(--pp-text); box-shadow: 0 10px 24px -8px color-mix(in srgb, var(--pp-secondary) 55%, transparent); }
.pp-button--ghost { background: color-mix(in srgb, var(--pp-background) 100%, transparent); color: var(--pp-text); border: 1px solid var(--pp-border); box-shadow: var(--pp-shadow-sm); }
.pp-button--ghost:hover { border-color: color-mix(in srgb, var(--pp-primary) 45%, transparent); filter: none; }
/* Buttons & tabs follow the section alignment (align-self overrides the cell's align-items). */
.pp-section[data-align="center"] .pp-button, .pp-hero .pp-button { align-self: center; }
.pp-section[data-align="end"] .pp-button { align-self: flex-end; }
.pp-section[data-align="center"] .pp-tabs, .pp-hero .pp-tabs { justify-content: center; }
.pp-section[data-align="end"] .pp-tabs { justify-content: flex-end; }

/* Icon tile (feature cards) */
.pp-icon { width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center; color: var(--pp-primary); background: color-mix(in srgb, var(--pp-primary) 12%, var(--pp-background)); border: 1px solid color-mix(in srgb, var(--pp-primary) 22%, transparent); }
.pp-icon svg { width: 23px; height: 23px; }

/* Media, lists, inputs */
.pp-image { width: 100%; height: auto; aspect-ratio: 4 / 3; border-radius: var(--pp-radius); display: block; object-fit: cover; box-shadow: var(--pp-shadow); border: 1px solid var(--pp-border); transition: transform 0.35s ease; background: linear-gradient(135deg, color-mix(in srgb, var(--pp-primary) 70%, #0b1020), color-mix(in srgb, var(--pp-secondary) 45%, #0b1020)); }
.pp-features .pp-cell:hover .pp-image, .pp-gallery .pp-cell:hover .pp-image { transform: scale(1.025); }
.pp-image--avatar { width: 72px; height: 72px; min-height: 0; aspect-ratio: 1 / 1; border-radius: 50%; }
.pp-image--banner { aspect-ratio: 5 / 2; min-height: 240px; }
/* Carousel frame (a slider drawn with < > arrows) — decorative chrome, no JS */
.pp-carousel { position: relative; width: 100%; }
.pp-carousel__img { aspect-ratio: 21 / 9; }
.pp-carousel__nav { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: rgba(255, 255, 255, 0.92); color: var(--pp-text); box-shadow: var(--pp-shadow-sm); cursor: pointer; }
.pp-carousel__nav--prev { left: 14px; }
.pp-carousel__nav--next { right: 14px; }
.pp-carousel__nav svg { width: 20px; height: 20px; }
.pp-carousel__dots { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); display: flex; gap: 7px; }
.pp-carousel__dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255, 255, 255, 0.55); }
.pp-carousel__dot--active { background: #fff; }
/* Thumbnail wall (a run of many images -> compact tile grid) */
.pp-thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 0.6rem; width: 100%; }
.pp-thumb { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 10px; border: 1px solid var(--pp-border); display: block; }
.pp-logos { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 1rem; width: 100%; }
.pp-logochip { height: 52px; width: 124px; object-fit: cover; border-radius: 12px; border: 1px solid var(--pp-border); opacity: 0.8; filter: saturate(0.35); display: block; }
.pp-list { margin: 0; padding-left: 1.15rem; }
.pp-list li { margin: 0.35rem 0; }
.pp-list li::marker { color: var(--pp-primary); }
.pp-input { width: 100%; padding: 0.8rem 1.1rem; border: 1px solid var(--pp-border); border-radius: 12px; font: inherit; background: #fff; }
.pp-logo { font-family: var(--pp-font-heading); font-weight: 850; font-size: 1.35rem; letter-spacing: -0.03em; color: var(--pp-text); display: inline-flex; align-items: center; gap: 0.55rem; }
.pp-logo__mark { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--pp-primary), var(--pp-secondary)); box-shadow: var(--pp-shadow-sm); }
.pp-logo__mark svg { width: 17px; height: 17px; }
.pp-divider { border: none; border-top: 1px solid var(--pp-border); margin: 1.25rem 0; width: 100%; }

/* Tabs / pagination bar */
.pp-tabs { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.pp-tab { padding: 0.5rem 1.1rem; border-radius: 999px; border: 1px solid var(--pp-border); background: transparent; font: inherit; font-weight: 600; color: var(--pp-muted); cursor: pointer; transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease; }
.pp-tab:hover { color: var(--pp-primary); border-color: var(--pp-primary); }
.pp-tab--active { background: var(--pp-primary); color: #fff; border-color: transparent; }

/* Video player mockup */
.pp-video { position: relative; width: 100%; aspect-ratio: 16 / 9; border-radius: var(--pp-radius); background: linear-gradient(135deg, color-mix(in srgb, var(--pp-text) 82%, #000), var(--pp-primary)); display: grid; place-items: center; box-shadow: var(--pp-shadow); overflow: hidden; }
.pp-video__play { width: 72px; height: 72px; border-radius: 50%; background: rgba(255, 255, 255, 0.92); position: relative; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); }
.pp-video__play::after { content: ''; position: absolute; top: 50%; left: 54%; transform: translate(-50%, -50%); border-style: solid; border-width: 13px 0 13px 21px; border-color: transparent transparent transparent var(--pp-primary); }

/* Nav bar — horizontal, sticky, glass */
.pp-nav { padding: 0.9rem 1.5rem; background: color-mix(in srgb, var(--pp-background) 78%, transparent); border-bottom: 1px solid var(--pp-border); position: sticky; top: 0; z-index: 30; backdrop-filter: blur(14px) saturate(1.4); }
.pp-nav .pp-container { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.pp-nav .pp-cell { flex-direction: row; align-items: center; gap: 1.5rem; }
.pp-nav .pp-list { display: flex; flex-wrap: wrap; gap: 0.3rem 1.6rem; list-style: none; padding: 0; margin: 0; }
.pp-nav .pp-list li { margin: 0; font-weight: 550; color: var(--pp-muted); padding: 0.3rem 0.1rem; cursor: pointer; border-bottom: 2px solid transparent; transition: color 0.12s ease, border-color 0.12s ease; }
.pp-nav .pp-list li:hover { color: var(--pp-text); border-color: var(--pp-primary); }
.pp-nav .pp-button { padding: 0.6rem 1.2rem; font-size: 0.95rem; }

/* Hero */
.pp-hero { overflow: hidden; }
.pp-hero .pp-heading { margin-top: 0; }

/* Hero with a full-bleed background image + overlaid text */
.pp-hero--media { position: relative; color: #fff; }
.pp-hero__bg { position: absolute; inset: 0; z-index: 0; }
.pp-hero__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pp-hero--media::after { content: ""; position: absolute; inset: 0; z-index: 1; background: linear-gradient(90deg, rgba(9, 13, 24, 0.86) 0%, rgba(9, 13, 24, 0.6) 42%, rgba(9, 13, 24, 0.12) 100%); }
.pp-hero--media .pp-container { position: relative; z-index: 2; min-height: 420px; align-items: center; }
.pp-hero--media .pp-cell { max-width: 640px; }
.pp-hero--media .pp-heading { color: #fff; }
.pp-hero--media .pp-paragraph { color: rgba(255, 255, 255, 0.85); }
.pp-section.pp-hero--media[data-align="center"] .pp-cell { margin: 0 auto; }

/* Feature / gallery cards */
.pp-features .pp-cell, .pp-gallery .pp-cell { align-items: flex-start; background: color-mix(in srgb, var(--pp-surface) 55%, #fff); border: 1px solid var(--pp-border); border-radius: var(--pp-radius); padding: 1.7rem; box-shadow: var(--pp-shadow-sm); transition: transform 0.18s ease, box-shadow 0.18s ease; }
.pp-features .pp-cell:hover, .pp-gallery .pp-cell:hover { transform: translateY(-5px); box-shadow: var(--pp-shadow); }
.pp-features .pp-image, .pp-gallery .pp-image { box-shadow: none; }
/* Equal-height cards per row; a lone block image fills its stretched cell so a
   tall block matches a taller neighbouring column (as drawn). */
.pp-features .pp-container, .pp-gallery .pp-container { align-items: stretch; }
.pp-features .pp-cell[data-fill] .pp-image, .pp-gallery .pp-cell[data-fill] .pp-image { flex: 1 1 auto; height: 100%; min-height: 220px; aspect-ratio: auto; object-fit: cover; }

/* CTA — inset gradient panel */
.pp-cta .pp-container { grid-template-columns: 1fr; }
.pp-cta__inner { position: relative; overflow: hidden; border-radius: 26px; padding: clamp(2.5rem, 5vw, 4rem); text-align: center; color: #fff; display: flex; flex-direction: column; align-items: center; gap: 1rem; background: linear-gradient(135deg, var(--pp-primary), color-mix(in srgb, var(--pp-primary) 45%, var(--pp-secondary))); box-shadow: var(--pp-shadow); }
.pp-cta__inner::before { content: ""; position: absolute; inset: 0; background: radial-gradient(500px 300px at 15% 10%, rgba(255, 255, 255, 0.22), transparent 60%), radial-gradient(500px 300px at 90% 120%, rgba(0, 0, 0, 0.18), transparent 60%); }
.pp-cta__inner > * { position: relative; z-index: 1; }
.pp-cta__inner .pp-heading, .pp-cta__inner .pp-eyebrow { color: #fff; }
.pp-cta__inner .pp-eyebrow::before { background: #fff; }
.pp-cta__inner .pp-paragraph { color: rgba(255, 255, 255, 0.86); }
.pp-cta__inner .pp-button { align-self: center; background: #fff; color: var(--pp-primary); box-shadow: none; }
.pp-cta__inner .pp-button--ghost { background: rgba(255, 255, 255, 0.14); color: #fff; border-color: rgba(255, 255, 255, 0.4); }

/* Footer */
.pp-footer { background: var(--pp-text); color: #fff; text-align: center; }
.pp-footer .pp-container { justify-items: center; }
.pp-footer .pp-cell { align-items: center; }
.pp-footer .pp-logo, .pp-footer .pp-heading { color: #fff; }
.pp-footer .pp-paragraph { color: rgba(255, 255, 255, 0.62); margin: 0; }
.pp-footer .pp-list { list-style: none; padding: 0; }

/* Footer social row — a footer list naming only social networks becomes icon links */
.pp-social { display: flex; flex-wrap: wrap; gap: 0.7rem; }
.pp-social__link { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: currentColor; background: color-mix(in srgb, currentColor 10%, transparent); border: 1px solid color-mix(in srgb, currentColor 24%, transparent); transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease; }
.pp-social__link:hover { background: var(--pp-primary); border-color: transparent; color: #fff; transform: translateY(-2px); }
.pp-social__link svg { width: 18px; height: 18px; display: block; }

/* Section background variants (visual rhythm) */
.pp-bg-surface { background: var(--pp-surface); }
.pp-bg-primary { background: color-mix(in srgb, var(--pp-primary) 8%, var(--pp-background)); }
.pp-bg-gradient { background:
  radial-gradient(680px 420px at 8% -8%, color-mix(in srgb, var(--pp-primary) 24%, transparent), transparent 70%),
  radial-gradient(620px 400px at 98% 8%, color-mix(in srgb, var(--pp-secondary) 20%, transparent), transparent 68%),
  var(--pp-background); }
.pp-bg-dark { background: var(--pp-text); color: #fff; }
.pp-bg-dark .pp-paragraph { color: rgba(255, 255, 255, 0.82); }
.pp-bg-dark .pp-heading { color: #fff; }

/* Motion — entrance on load, upgraded to scroll-reveal where supported. Gated on
   no-preference so reduced-motion users always see fully-visible content. */
@media (prefers-reduced-motion: no-preference) {
  @keyframes pp-fade-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
  .pp-section:not(.pp-nav) .pp-cell { animation: pp-fade-up 0.75s cubic-bezier(0.16, 0.84, 0.44, 1) both; }
  @supports (animation-timeline: view()) {
    .pp-section:not(.pp-nav) .pp-cell { animation-timeline: view(); animation-range: entry 0% cover 30%; }
  }
  @keyframes pp-hero-drift { from { background-position: 0% 0%, 100% 0%, 0 0; } to { background-position: 6% 4%, 94% 3%, 0 0; } }
  .pp-bg-gradient { animation: pp-hero-drift 14s ease-in-out infinite alternate; }
}

/* Responsive — multi-column sections collapse 3→2→1 for ANY column count by
   dropping explicit placement so grid auto-flow repacks the cells. */
@media (max-width: 960px) {
  .pp-container { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pp-cell { grid-column: auto !important; }
  .pp-hero .pp-container { grid-template-columns: 1fr; }
  .pp-hero .pp-cell:has(.pp-image) { order: -1; }
}
@media (max-width: 600px) {
  :root { --pp-space: 3rem; }
  .pp-container { grid-template-columns: 1fr; }
  .pp-nav .pp-container { flex-wrap: wrap; }
  .pp-button { width: 100%; justify-content: center; }
  .pp-nav .pp-button { width: auto; }
}
`;

  return { html, css };
}
