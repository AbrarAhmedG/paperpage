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
const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="100%" height="100%" fill="%23e2e8f0"/><text x="50%" y="50%" fill="%2394a3b8" font-family="sans-serif" font-size="24" text-anchor="middle" dominant-baseline="middle">Image</text></svg>',
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

function renderSection(section: Section): string {
  const inner = section.elements.map(renderElement).join('\n      ');
  return `  <section data-region="${section.role}" class="pp-section pp-${section.role}" data-cols="${section.layout.columns}" data-align="${section.layout.align}">
    <div class="pp-container">
      ${inner}
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
.pp-container { max-width: 1100px; margin: 0 auto; }
.pp-hero { text-align: center; background: var(--pp-surface); }
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
.pp-footer { background: var(--pp-surface); font-size: 0.9rem; }
.pp-features .pp-container, .pp-gallery .pp-container { display: grid; gap: 1.5rem; }
`;

  return { html, css };
}
