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

  it('placeholder SVG has valid (not double-encoded) hex fills — regression: black box', () => {
    const { html } = renderPage(ir);
    const src = html.match(/src="(data:image\/svg\+xml[^"]*)"/)?.[1] ?? '';
    // Must not contain a double-encoded '#': %2523 decodes to the literal "%23", an invalid fill.
    expect(src).not.toContain('%2523');
    const decoded = decodeURIComponent(src.replace('data:image/svg+xml;utf8,', ''));
    expect(decoded).toContain('fill="#e2e8f0"');
    expect(decoded).not.toContain('fill="%23');
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
});
