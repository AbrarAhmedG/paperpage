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

// Colorful inline SVG placeholder — a primary→secondary gradient so empty image
// slots read as vibrant, on-brand blocks (not grey boxes) until the user drops a
// real image in. No external request; safe by construction. Palette values are
// validated 6-digit hex, so they're safe to interpolate. Use raw '#' — encode-
// URIComponent encodes each '#' to %23 exactly once (double-encoding to %2523
// would decode to a literal string and render black).
function placeholderSvg(a: string, b: string): string {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>` +
    '</linearGradient></defs>' +
    '<rect width="100%" height="100%" fill="url(#g)"/>' +
    '<circle cx="400" cy="250" r="64" fill="#ffffff" fill-opacity="0.28"/>' +
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
      return 'primary';
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

function renderElement(el: Element, ph: string): string {
  switch (el.type) {
    case 'heading': {
      const lvl = Math.min(Math.max(el.level ?? 2, 1), 4);
      const text = esc(el.text) || esc(HEADING_PLACEHOLDER[lvl] ?? 'Heading');
      return `<h${lvl} class="pp-heading">${text}</h${lvl}>`;
    }
    case 'paragraph':
      return `<p class="pp-paragraph">${esc(el.text) || esc(LOREM)}</p>`;
    case 'button': {
      const v = el.variant ?? 'primary';
      return `<a class="pp-button pp-button--${v}" href="#">${esc(el.text) || 'Learn More'}</a>`;
    }
    case 'image':
      return `<img class="pp-image" data-pp-asset="1" src="${ph}" alt="${esc(el.alt)}" />`;
    case 'list': {
      const src = el.items && el.items.length ? el.items : LIST_PLACEHOLDER;
      const items = src.map((i) => `<li>${esc(i)}</li>`).join('');
      return `<ul class="pp-list">${items}</ul>`;
    }
    case 'input':
      return `<input class="pp-input" type="text" placeholder="${esc(el.placeholder) || 'Enter text'}" />`;
    case 'logo':
      return `<span class="pp-logo">${esc(el.text) || 'Logo'}</span>`;
    case 'divider':
      return `<hr class="pp-divider" />`;
    case 'tabs': {
      const items = el.items && el.items.length ? el.items : ['Tab 1', 'Tab 2', 'Tab 3'];
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

function renderSection(section: Section, ph: string, index: number): string {
  const cols = section.layout.columns;
  const bg = effectiveBackground(section, index);
  // Group consecutive elements that share a column into ONE stacked cell. This
  // prevents overlap (the model sometimes assigns several elements to the same
  // cell) and keeps a card's contents (icon / title / text / button) together.
  // Grid auto-flow positions the cells; the model's explicit rows are ignored.
  type Group = { col?: number; colSpan?: number; els: Element[] };
  const groups: Group[] = [];
  for (const el of section.elements) {
    const last = groups[groups.length - 1];
    if (last && el.col != null && last.col === el.col) {
      last.els.push(el);
      last.colSpan = Math.max(last.colSpan ?? 1, el.colSpan ?? 1);
    } else {
      groups.push({ col: el.col, colSpan: el.colSpan, els: [el] });
    }
  }
  const cells = groups
    .map(
      (g) =>
        `<div class="pp-cell"${cellStyle(g.col, g.colSpan, cols)}>\n        ${g.els
          .map((e) => renderElement(e, ph))
          .join('\n        ')}\n      </div>`,
    )
    .join('\n      ');
  return `  <section data-region="${section.role}" class="pp-section pp-${section.role} pp-bg-${bg}" data-align="${section.layout.align}" style="--pp-cols:${cols}">
    <div class="pp-container">
      ${cells}
    </div>
  </section>`;
}

const SPACING_SCALE: Record<PageIR['theme']['spacing'], string> = {
  compact: '2rem',
  normal: '4rem',
  roomy: '6rem',
};

export function renderPage(ir: PageIR): { html: string; css: string } {
  const { theme } = ir;
  const ph = placeholderSvg(theme.palette.primary, theme.palette.secondary);
  const sections = ir.sections.map((s, i) => renderSection(s, ph, i)).join('\n');
  const html = `<body class="pp-page">\n${sections}\n</body>`;

  const fontParam = [theme.fonts.heading, theme.fonts.body]
    .map((f) => `family=${f.replace(/ /g, '+')}:wght@400;600;700`)
    .join('&');

  const css = `@import url('https://fonts.googleapis.com/css2?${fontParam}&display=swap');

:root {
  --pp-primary: ${theme.palette.primary};
  --pp-secondary: ${theme.palette.secondary};
  --pp-background: ${theme.palette.background};
  --pp-surface: ${theme.palette.surface};
  --pp-text: ${theme.palette.text};
  --pp-space: ${SPACING_SCALE[theme.spacing]};
  --pp-font-heading: '${theme.fonts.heading}', sans-serif;
  --pp-font-body: '${theme.fonts.body}', sans-serif;
  --pp-radius: 16px;
  --pp-border: color-mix(in srgb, var(--pp-text) 12%, transparent);
  --pp-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
  --pp-muted: color-mix(in srgb, var(--pp-text) 66%, transparent);
}

* { box-sizing: border-box; }
.pp-page { margin: 0; background: var(--pp-background); color: var(--pp-text); font-family: var(--pp-font-body); font-size: 1.0625rem; line-height: 1.65; -webkit-font-smoothing: antialiased; }
img { max-width: 100%; }

.pp-section { padding: var(--pp-space) 1.5rem; }
.pp-container { display: grid; grid-template-columns: repeat(var(--pp-cols), 1fr); gap: 1.75rem; max-width: 1140px; margin: 0 auto; align-items: start; }
.pp-cell { min-width: 0; display: flex; flex-direction: column; gap: 0.6rem; }
/* Alignment — honor the IR's per-section align on cell contents. */
.pp-section[data-align="center"] .pp-cell { align-items: center; text-align: center; }
.pp-section[data-align="end"] .pp-cell { align-items: flex-end; text-align: right; }
.pp-hero .pp-cell { align-items: center; text-align: center; }

/* Typography */
.pp-heading { font-family: var(--pp-font-heading); font-weight: 800; line-height: 1.12; letter-spacing: -0.02em; margin: 0 0 0.4rem; }
h1.pp-heading { font-size: clamp(2.2rem, 5vw, 3.5rem); }
h2.pp-heading { font-size: clamp(1.5rem, 3vw, 2.25rem); }
h3.pp-heading { font-size: 1.3rem; }
h4.pp-heading { font-size: 1rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pp-primary); }
.pp-paragraph { margin: 0 0 0.4rem; color: var(--pp-muted); max-width: 62ch; }

/* Buttons */
.pp-button { align-self: flex-start; display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.8rem 1.5rem; border-radius: 999px; text-decoration: none; font-weight: 700; background: var(--pp-primary); color: #fff; box-shadow: 0 8px 18px color-mix(in srgb, var(--pp-primary) 32%, transparent); transition: transform 0.14s ease, box-shadow 0.14s ease, filter 0.14s ease; }
.pp-button:hover { transform: translateY(-2px); filter: brightness(1.06); box-shadow: 0 12px 26px color-mix(in srgb, var(--pp-primary) 42%, transparent); }
.pp-button--primary { background: linear-gradient(135deg, var(--pp-primary), color-mix(in srgb, var(--pp-primary) 55%, var(--pp-secondary))); color: #fff; }
.pp-button--secondary { background: var(--pp-secondary); color: var(--pp-text); box-shadow: 0 8px 18px color-mix(in srgb, var(--pp-secondary) 32%, transparent); }
.pp-button--ghost { background: transparent; color: var(--pp-primary); border: 2px solid color-mix(in srgb, var(--pp-primary) 40%, transparent); box-shadow: none; }
/* Buttons & tabs follow the section alignment (align-self overrides the cell's align-items). */
.pp-section[data-align="center"] .pp-button, .pp-hero .pp-button { align-self: center; }
.pp-section[data-align="end"] .pp-button { align-self: flex-end; }
.pp-section[data-align="center"] .pp-tabs, .pp-hero .pp-tabs { justify-content: center; }
.pp-section[data-align="end"] .pp-tabs { justify-content: flex-end; }

/* Media, lists, inputs */
.pp-image { width: 100%; height: auto; min-height: 120px; border-radius: var(--pp-radius); display: block; object-fit: cover; box-shadow: var(--pp-shadow); transition: transform 0.35s ease; }
.pp-features .pp-cell:hover .pp-image, .pp-gallery .pp-cell:hover .pp-image { transform: scale(1.035); }
.pp-list { margin: 0; padding-left: 1.1rem; }
.pp-list li { margin: 0.35rem 0; }
.pp-input { width: 100%; padding: 0.75rem 1.1rem; border: 1px solid var(--pp-border); border-radius: 999px; font: inherit; background: #fff; }
.pp-logo { font-family: var(--pp-font-heading); font-weight: 900; font-size: 1.4rem; letter-spacing: -0.02em; color: var(--pp-primary); }
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

/* Nav bar — horizontal, sticky */
.pp-nav { padding: 0.9rem 1.5rem; background: color-mix(in srgb, var(--pp-background) 88%, #fff); border-bottom: 1px solid var(--pp-border); position: sticky; top: 0; z-index: 20; backdrop-filter: blur(8px); }
.pp-nav .pp-container { align-items: center; gap: 1rem; }
.pp-nav .pp-list { display: flex; flex-wrap: wrap; gap: 0.3rem 1.4rem; list-style: none; padding: 0; }
.pp-nav .pp-list li { margin: 0; font-weight: 600; color: var(--pp-text); padding: 0.3rem 0.1rem; cursor: pointer; border-bottom: 2px solid transparent; transition: color 0.12s ease, border-color 0.12s ease; }
.pp-nav .pp-list li:hover { color: var(--pp-primary); border-color: var(--pp-primary); }

/* Hero */
.pp-hero .pp-heading { margin-top: 0; }

/* Feature / gallery cards */
.pp-features .pp-cell, .pp-gallery .pp-cell { background: color-mix(in srgb, var(--pp-surface) 60%, #fff); border: 1px solid var(--pp-border); border-radius: var(--pp-radius); padding: 1.4rem; box-shadow: var(--pp-shadow); transition: transform 0.16s ease, box-shadow 0.16s ease; }
.pp-features .pp-cell:hover, .pp-gallery .pp-cell:hover { transform: translateY(-4px); box-shadow: 0 20px 44px rgba(15, 23, 42, 0.14); }
.pp-features .pp-image, .pp-gallery .pp-image { box-shadow: none; }

/* Footer */
.pp-footer { background: var(--pp-text); color: #fff; text-align: center; }
.pp-footer .pp-container { justify-items: center; }
.pp-footer .pp-paragraph { color: rgba(255, 255, 255, 0.82); margin: 0; }

/* Section background variants (visual rhythm) */
.pp-bg-surface { background: var(--pp-surface); }
.pp-bg-primary { background: color-mix(in srgb, var(--pp-primary) 8%, var(--pp-background)); }
.pp-bg-gradient { background:
  radial-gradient(1200px 500px at 12% -12%, color-mix(in srgb, var(--pp-primary) 26%, transparent), transparent),
  radial-gradient(1000px 500px at 96% 0%, color-mix(in srgb, var(--pp-secondary) 24%, transparent), transparent),
  var(--pp-background); }
.pp-bg-dark { background: var(--pp-text); color: #fff; }
.pp-bg-dark .pp-paragraph { color: rgba(255, 255, 255, 0.82); }
.pp-bg-dark .pp-heading { color: #fff; }

/* Motion — entrance on load, upgraded to scroll-reveal where supported. Gated on
   no-preference so reduced-motion users always see fully-visible content. */
@media (prefers-reduced-motion: no-preference) {
  @keyframes pp-fade-up { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
  .pp-section:not(.pp-nav) .pp-cell { animation: pp-fade-up 0.8s cubic-bezier(0.16, 0.84, 0.44, 1) both; }
  @supports (animation-timeline: view()) {
    .pp-section:not(.pp-nav) .pp-cell { animation-timeline: view(); animation-range: entry 0% cover 32%; }
  }
  @keyframes pp-hero-drift { from { background-position: 0% 0%, 100% 0%, 0 0; } to { background-position: 6% 4%, 94% 3%, 0 0; } }
  .pp-bg-gradient { animation: pp-hero-drift 14s ease-in-out infinite alternate; }
}

@media (max-width: 768px) {
  .pp-container { grid-template-columns: 1fr; }
  .pp-nav { position: static; }
}
`;

  return { html, css };
}
