import { describe, it, expect } from 'vitest';
import { renderPage } from './renderer';
import type { PageIR } from './ir/schema';

const ir: PageIR = {
  theme: {
    palette: { primary: '#14b8a6', secondary: '#facc15', background: '#ffffff', surface: '#f8fafc', text: '#0f172a' },
    fonts: { heading: 'Poppins', body: 'Inter' },
    spacing: 'normal',
  },
  sections: [
    {
      id: 's1',
      role: 'hero',
      background: 'default',
      layout: { columns: 1, align: 'center' },
      elements: [
        { type: 'heading', level: 1, text: 'Welcome <script>alert(1)</script>' },
        { type: 'button', text: 'Go', variant: 'primary' },
        { type: 'image', alt: 'Hero shot' },
      ],
    },
    {
      id: 's2',
      role: 'footer',
      background: 'default',
      layout: { columns: 3, align: 'start' },
      elements: [{ type: 'paragraph', text: 'Contact us' }],
    },
  ],
};

describe('renderPage', () => {
  it('emits a section per IR section with data-region', () => {
    const { html } = renderPage(ir);
    expect(html).toContain('data-region="hero"');
    expect(html).toContain('data-region="footer"');
  });

  it('renders a heading at the requested level', () => {
    const { html } = renderPage(ir);
    expect(html).toContain('<h1');
    expect(html).toContain('Welcome');
  });

  it('escapes HTML in text (safe by construction)', () => {
    const { html } = renderPage(ir);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('never emits a script tag', () => {
    const { html } = renderPage(ir);
    expect(html.toLowerCase()).not.toContain('<script');
  });

  it('emits image placeholders tagged for the asset manager', () => {
    const { html } = renderPage(ir);
    expect(html).toContain('data-pp-asset="1"');
    expect(html).toContain('alt="Hero shot"');
  });

  it('placeholder is a palette gradient with valid (not double-encoded) hex — regression: black box', () => {
    const { html } = renderPage(ir);
    const src = html.match(/src="(data:image\/svg\+xml[^"]*)"/)?.[1] ?? '';
    // Must not contain a double-encoded '#': %2523 decodes to the literal "%23", an invalid color.
    expect(src).not.toContain('%2523');
    const decoded = decodeURIComponent(src.replace('data:image/svg+xml;utf8,', ''));
    expect(decoded).toContain('linearGradient');
    expect(decoded).toContain('stop-color="#14b8a6"'); // ir fixture primary
    expect(decoded).not.toContain('stop-color="%23');
  });

  it('emits a gradient primary button', () => {
    const { css } = renderPage(ir);
    expect(css).toContain('.pp-button--primary { background: linear-gradient(');
  });

  it('emits scroll/entrance animation gated on reduced-motion', () => {
    const { css } = renderPage(ir);
    expect(css).toContain('@keyframes pp-fade-up');
    expect(css).toContain('prefers-reduced-motion: no-preference');
    expect(css).toContain('animation-timeline: view()');
  });

  it('auto-applies a color rhythm by role when background is default', () => {
    const p: PageIR = {
      ...ir,
      sections: [
        { id: 'h', role: 'hero', background: 'default', layout: { columns: 1, align: 'center' }, elements: [{ type: 'heading', text: 'Hi' }] },
        { id: 'f', role: 'footer', background: 'default', layout: { columns: 1, align: 'start' }, elements: [{ type: 'paragraph', text: 'x' }] },
      ],
    };
    const { html } = renderPage(p);
    expect(html).toContain('pp-hero pp-bg-gradient'); // hero -> gradient
    expect(html).toContain('pp-footer pp-bg-dark'); // footer -> dark
  });

  it('emits CSS custom properties from the palette', () => {
    const { css } = renderPage(ir);
    expect(css).toContain('--pp-primary: #14b8a6');
    expect(css).toContain('--pp-text: #0f172a');
  });

  it('imports both curated fonts', () => {
    const { css } = renderPage(ir);
    expect(css).toContain('Poppins');
    expect(css).toContain('Inter');
    expect(css).toContain('fonts.googleapis.com');
  });

  it('renders a section as a CSS grid with the requested column count', () => {
    const g: PageIR = {
      ...ir,
      sections: [
        {
          id: 'g',
          role: 'hero',
          background: 'gradient',
          layout: { columns: 4, align: 'start' },
          elements: [
            { type: 'image', alt: 'video', col: 1, colSpan: 2, rowSpan: 2 },
            { type: 'paragraph', text: 'chat', col: 3, colSpan: 2 },
          ],
        },
      ],
    };
    const { html, css } = renderPage(g);
    expect(css).toContain('grid-template-columns: repeat(var(--pp-cols)');
    expect(html).toContain('--pp-cols:4');
    expect(html).toContain('grid-column:1 / span 2');
    expect(html).toContain('pp-bg-gradient');
  });

  it('collapses to a single column on small screens', () => {
    const { css } = renderPage(ir);
    expect(css).toContain('@media (max-width: 768px)');
    expect(css).toContain('grid-template-columns: 1fr');
  });

  it('fills placeholder copy for empty elements', () => {
    const p: PageIR = {
      ...ir,
      sections: [
        {
          id: 'p',
          role: 'text',
          background: 'default',
          layout: { columns: 1, align: 'start' },
          elements: [
            { type: 'heading', level: 2 },
            { type: 'paragraph' },
            { type: 'button' },
            { type: 'list' },
          ],
        },
      ],
    };
    const { html } = renderPage(p);
    expect(html).toMatch(/<h2 class="pp-heading">[^<]+<\/h2>/); // non-empty heading
    expect(html).toMatch(/<p class="pp-paragraph">[^<]+<\/p>/); // non-empty paragraph
    expect(html).toContain('<li>'); // list has placeholder items
    expect(html.toLowerCase()).not.toContain('<script'); // still safe
  });

  it('emits modern styling hooks (card shadow + button hover)', () => {
    const { css } = renderPage(ir);
    expect(css).toContain('.pp-button:hover');
    expect(css).toContain('box-shadow');
  });

  it('groups consecutive same-column elements into one cell (prevents overlap)', () => {
    const g: PageIR = {
      ...ir,
      sections: [
        {
          id: 'f',
          role: 'features',
          background: 'default',
          layout: { columns: 2, align: 'start' },
          elements: [
            { type: 'heading', text: 'A', col: 1 },
            { type: 'paragraph', text: 'a', col: 1 },
            { type: 'heading', text: 'B', col: 2 },
            { type: 'paragraph', text: 'b', col: 2 },
          ],
        },
      ],
    };
    const { html } = renderPage(g);
    // Two column stacks -> two cells, not four overlapping ones.
    expect((html.match(/class="pp-cell"/g) || []).length).toBe(2);
    expect(html).toContain('grid-column:1 / span 1');
    expect(html).toContain('grid-column:2 / span 1');
  });

  it('renders nav menus horizontally, not as vertical bullets', () => {
    const { css } = renderPage(ir);
    expect(css).toMatch(/\.pp-nav \.pp-list\s*\{[^}]*display:\s*flex/);
    expect(css).toMatch(/\.pp-nav \.pp-list[^{]*\{[^}]*list-style:\s*none/);
  });
});
