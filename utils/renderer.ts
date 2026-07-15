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

// Neutral inline SVG placeholder — no external request, safe by construction.
// Use raw '#' hex colors here: encodeURIComponent encodes each '#' to %23 exactly
// once. (Pre-encoding to %23 would be double-encoded to %2523, which decodes to the
// literal string "%23e2e8f0" — an invalid SVG fill that renders as a solid black box.)
const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" fill="#94a3b8" font-family="sans-serif" font-size="24" text-anchor="middle" dominant-baseline="middle">Image</text></svg>',
  );

function renderElement(el: Element): string {
  switch (el.type) {
    case 'heading': {
      const lvl = Math.min(Math.max(el.level ?? 2, 1), 4);
      return `<h${lvl} class="pp-heading">${esc(el.text)}</h${lvl}>`;
    }
    case 'paragraph':
      return `<p class="pp-paragraph">${esc(el.text)}</p>`;
    case 'button': {
      const v = el.variant ?? 'primary';
      return `<a class="pp-button pp-button--${v}" href="#">${esc(el.text) || 'Button'}</a>`;
    }
    case 'image':
      return `<img class="pp-image" data-pp-asset="1" src="${PLACEHOLDER}" alt="${esc(el.alt)}" />`;
    case 'list': {
      const items = (el.items ?? []).map((i) => `<li>${esc(i)}</li>`).join('');
      return `<ul class="pp-list">${items}</ul>`;
    }
    case 'input':
      return `<input class="pp-input" type="text" placeholder="${esc(el.placeholder) || 'Enter text'}" />`;
    case 'logo':
      return `<span class="pp-logo">${esc(el.text) || 'Logo'}</span>`;
    case 'divider':
      return `<hr class="pp-divider" />`;
    default:
      return '';
  }
}

const clampInt = (n: number | undefined, lo: number, hi: number): number | undefined =>
  n == null ? undefined : Math.min(Math.max(Math.trunc(n), lo), hi);

// Build the inline grid-placement style for one element from its validated
// (positive-int) coordinates, clamped to the section's column count. Only
// integers derived from the IR reach `style=`, so this stays injection-safe.
function placementStyle(el: Element, columns: number): string {
  const parts: string[] = [];
  const col = clampInt(el.col, 1, columns);
  if (col != null) {
    const span = clampInt(el.colSpan ?? 1, 1, columns - col + 1) ?? 1;
    parts.push(`grid-column:${col} / span ${span}`);
  } else if (el.colSpan && columns > 1) {
    parts.push(`grid-column: span ${clampInt(el.colSpan, 1, columns)}`);
  }
  const row = clampInt(el.row, 1, 100);
  if (row != null) {
    const rspan = clampInt(el.rowSpan ?? 1, 1, 100) ?? 1;
    parts.push(`grid-row:${row} / span ${rspan}`);
  } else if (el.rowSpan) {
    parts.push(`grid-row: span ${clampInt(el.rowSpan, 1, 100)}`);
  }
  return parts.length ? ` style="${parts.join(';')}"` : '';
}

function renderSection(section: Section): string {
  const cols = section.layout.columns;
  const bg = section.background ?? 'default';
  const cells = section.elements
    .map((el) => `<div class="pp-cell"${placementStyle(el, cols)}>${renderElement(el)}</div>`)
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
  const sections = ir.sections.map(renderSection).join('\n');
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
}

* { box-sizing: border-box; }
.pp-page { margin: 0; background: var(--pp-background); color: var(--pp-text); font-family: var(--pp-font-body); line-height: 1.6; }
.pp-section { padding: var(--pp-space) 1.5rem; }
.pp-container { display: grid; grid-template-columns: repeat(var(--pp-cols), 1fr); gap: 1.5rem; max-width: 1100px; margin: 0 auto; align-items: start; }
.pp-cell { min-width: 0; }
.pp-hero { text-align: center; }
.pp-heading { font-family: var(--pp-font-heading); font-weight: 700; margin: 0 0 1rem; }
.pp-paragraph { margin: 0 0 1rem; }
.pp-button { display: inline-block; padding: 0.75rem 1.5rem; border-radius: 0.75rem; text-decoration: none; font-weight: 600; }
.pp-button--primary { background: var(--pp-primary); color: #fff; }
.pp-button--secondary { background: var(--pp-secondary); color: var(--pp-text); }
.pp-button--ghost { background: transparent; border: 1px solid var(--pp-primary); color: var(--pp-primary); }
.pp-image { max-width: 100%; height: auto; border-radius: 0.75rem; display: block; }
.pp-list { padding-left: 1.25rem; }
.pp-input { width: 100%; padding: 0.75rem 1rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; }
.pp-logo { font-family: var(--pp-font-heading); font-weight: 700; font-size: 1.25rem; }
.pp-divider { border: none; border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
.pp-footer { font-size: 0.9rem; }

/* Section background variants (visual rhythm) */
.pp-bg-surface { background: var(--pp-surface); }
.pp-bg-primary { background: color-mix(in srgb, var(--pp-primary) 10%, var(--pp-background)); }
.pp-bg-gradient { background:
  radial-gradient(1200px 400px at 20% -10%, color-mix(in srgb, var(--pp-primary) 22%, transparent), transparent),
  radial-gradient(1000px 400px at 90% 0%, color-mix(in srgb, var(--pp-secondary) 22%, transparent), transparent),
  var(--pp-background); }
.pp-bg-dark { background: var(--pp-text); color: var(--pp-background); }

@media (max-width: 768px) {
  .pp-container { grid-template-columns: 1fr; }
}
`;

  return { html, css };
}
