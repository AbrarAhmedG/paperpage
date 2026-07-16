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

  // A text section keeps the mesh placeholder (hero/gallery use curated photos).
  const meshIr: PageIR = {
    ...ir,
    sections: [
      { id: 'm', role: 'text', background: 'default', layout: { columns: 1, align: 'start' }, elements: [{ type: 'image', alt: 'Diagram' }] },
    ],
  };

  it('placeholder is a palette gradient with valid (not double-encoded) hex — regression: black box', () => {
    const { html } = renderPage(meshIr);
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

  it('renders tabs as a horizontal bar (placeholder labels when empty)', () => {
    const t: PageIR = {
      ...ir,
      sections: [
        { id: 't', role: 'nav', background: 'default', layout: { columns: 1, align: 'start' }, elements: [
          { type: 'tabs', items: ['1', '2', '3'] },
          { type: 'tabs' },
        ] },
      ],
    };
    const { html, css } = renderPage(t);
    expect(html).toContain('class="pp-tabs"');
    expect(html).toContain('pp-tab--active');
    expect(html).toContain('>1</button>'); // first labelled tab
    expect(html).toContain('>Tab 1</button>'); // placeholder tab
    expect(css).toContain('.pp-tab--active');
  });

  it('renders a video player mockup with a play button', () => {
    const v: PageIR = {
      ...ir,
      sections: [
        { id: 'v', role: 'hero', background: 'default', layout: { columns: 1, align: 'center' }, elements: [{ type: 'video' }] },
      ],
    };
    const { html, css } = renderPage(v);
    expect(html).toContain('class="pp-video"');
    expect(html).toContain('pp-video__play');
    expect(css).toContain('.pp-video');
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

  it('collapses multi-column layouts responsively (tablet 2-col + mobile 1-col)', () => {
    const { css } = renderPage(ir);
    expect(css).toContain('@media (max-width: 960px)'); // tablet -> 2 columns
    expect(css).toContain('@media (max-width: 600px)'); // mobile -> 1 column
    expect(css).toContain('grid-template-columns: 1fr');
    expect(css).toContain('grid-column: auto'); // drops explicit placement so cells repack
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

  it('honors section alignment (center/end) for cells and buttons', () => {
    const { css } = renderPage(ir);
    expect(css).toContain('[data-align="center"] .pp-cell');
    expect(css).toContain('[data-align="center"] .pp-button');
    expect(css).toContain('[data-align="end"] .pp-cell');
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

  it('builds even cards when the model emits row-major (title, all images, then all descriptions)', () => {
    const f: PageIR = {
      ...ir,
      sections: [
        {
          id: 'f',
          role: 'features',
          background: 'default',
          layout: { columns: 3, align: 'center' },
          elements: [
            { type: 'heading', level: 2, text: 'This is a title', col: 1, colSpan: 3 },
            { type: 'image', alt: 'i1', col: 1 },
            { type: 'image', alt: 'i2', col: 2 },
            { type: 'image', alt: 'i3', col: 3 },
            { type: 'heading', level: 3, text: 'Section title', col: 1 },
            { type: 'paragraph', text: 'desc', col: 1 },
            { type: 'heading', level: 3, text: 'Section title', col: 2 },
            { type: 'paragraph', text: 'desc', col: 2 },
            { type: 'heading', level: 3, text: 'Section title', col: 3 },
            { type: 'paragraph', text: 'desc', col: 3 },
          ],
        },
      ],
    };
    const { html } = renderPage(f);
    // full-width title banner + 3 even cards = 4 cells (title NOT merged into card 1)
    expect((html.match(/class="pp-cell"/g) || []).length).toBe(4);
    expect(html).toContain('grid-column:1 / span 3'); // the title banner
    // each of the 3 cards holds its image AND its title together in one cell
    const cellChunks = html.split('<div class="pp-cell"').slice(1);
    const cards = cellChunks.filter((c) => c.includes('data-pp-asset') && c.includes('Section title'));
    expect(cards.length).toBe(3);
  });

  it('renders a run of many images in one column as a thumbnail grid, not stacked photos', () => {
    const m: PageIR = {
      ...ir,
      sections: [
        {
          id: 'm',
          role: 'gallery',
          background: 'default',
          layout: { columns: 3, align: 'start' },
          elements: [
            { type: 'heading', level: 2, text: 'Media Archive', col: 1, colSpan: 2 },
            { type: 'image', alt: 't1', col: 1 },
            { type: 'image', alt: 't2', col: 1 },
            { type: 'image', alt: 't3', col: 1 },
            { type: 'image', alt: 't4', col: 1 },
            { type: 'image', alt: 't5', col: 1 },
            { type: 'image', alt: 't6', col: 1 },
            { type: 'video', col: 2 },
          ],
        },
      ],
    };
    const { html, css } = renderPage(m);
    expect(html).toContain('class="pp-thumbs"');
    expect((html.match(/class="pp-thumb"/g) || []).length).toBe(6); // 6 small tiles
    expect(html).not.toContain('images.unsplash.com'); // tiles are mesh, not big photos
    expect(css).toContain('.pp-thumbs');
    // the 2-col section heading is a standalone banner, not merged into the thumb column
    expect(html).toContain('grid-column:1 / span 2');
  });

  it('makes a lone block image fill its cell so a tall block matches a taller column', () => {
    const t: PageIR = {
      ...ir,
      sections: [
        {
          id: 't',
          role: 'features',
          background: 'default',
          layout: { columns: 2, align: 'start' },
          elements: [
            { type: 'image', alt: 'tall block', col: 1 }, // lone -> fills
            { type: 'image', alt: 's1', col: 2 },
            { type: 'divider', col: 2 },
            { type: 'image', alt: 's2', col: 2 }, // stacked -> not a lone image
          ],
        },
      ],
    };
    const { html, css } = renderPage(t);
    expect((html.match(/data-fill="1"/g) || []).length).toBe(1); // only the lone left image
    expect(html).toContain('<div class="pp-cell" data-fill="1"');
    expect(css).toContain('align-items: stretch');
    expect(css).toContain('.pp-cell[data-fill]');
  });

  it('overlays hero text on a full-bleed image when the hero has both', () => {
    const h: PageIR = {
      ...ir,
      sections: [
        {
          id: 'h',
          role: 'hero',
          background: 'gradient',
          layout: { columns: 1, align: 'start' },
          elements: [
            { type: 'image', alt: 'bg' },
            { type: 'heading', level: 1, text: 'Product' },
            { type: 'paragraph', text: 'Description' },
            { type: 'button', text: 'Learn More', variant: 'primary' },
          ],
        },
      ],
    };
    const { html, css } = renderPage(h);
    expect(html).toContain('pp-hero--media'); // overlay hero
    expect(html).toContain('pp-hero__img'); // image is the background
    expect(html).toMatch(/pp-hero__bg[\s\S]*Product/); // heading overlaid after the bg
    expect(css).toContain('.pp-hero--media');
  });

  it('renders nav menus horizontally, not as vertical bullets', () => {
    const { css } = renderPage(ir);
    expect(css).toMatch(/\.pp-nav \.pp-list\s*\{[^}]*display:\s*flex/);
    expect(css).toMatch(/\.pp-nav \.pp-list[^{]*\{[^}]*list-style:\s*none/);
  });

  it('gives feature cards a themed icon tile', () => {
    const f: PageIR = {
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
    const { html, css } = renderPage(f);
    expect((html.match(/class="pp-icon"/g) || []).length).toBe(2); // one tile per card
    expect(html).toContain('<svg'); // inline icon, safe by construction
    expect(css).toContain('.pp-icon');
  });

  it('adds a trailing arrow icon to primary buttons only', () => {
    const { html } = renderPage(ir); // hero has a primary "Go" button
    expect(html).toMatch(/pp-button--primary[^>]*>[^<]*Go<svg/);
  });

  it('placeholder is a layered mesh (radial spots) with a media glyph', () => {
    const { html } = renderPage(meshIr);
    const src = html.match(/src="(data:image\/svg\+xml[^"]*)"/)?.[1] ?? '';
    const decoded = decodeURIComponent(src.replace('data:image/svg+xml;utf8,', ''));
    expect(decoded).toContain('radialGradient'); // mesh spots (not a flat 2-stop box)
    expect(decoded).toContain('stroke="#ffffff"'); // the soft image glyph
    expect(decoded).not.toContain('%2523'); // still not double-encoded
  });

  it('uses curated photographs for hero and gallery images (bundled offline on export)', () => {
    const p: PageIR = {
      ...ir,
      sections: [
        { id: 'h', role: 'hero', background: 'gradient', layout: { columns: 1, align: 'center' }, elements: [{ type: 'image', alt: 'Hero' }] },
        { id: 'g', role: 'gallery', background: 'default', layout: { columns: 2, align: 'start' }, elements: [
          { type: 'image', alt: 'One', col: 1 },
          { type: 'image', alt: 'Two', col: 2 },
        ] },
      ],
    };
    const { html } = renderPage(p);
    const photos = html.match(/src="https:\/\/images\.unsplash\.com[^"]+"/g) || [];
    expect(photos.length).toBe(3); // one hero + two gallery
    expect(new Set(photos).size).toBe(3); // rotates — no repeats across the page
    expect(html).toContain('data-pp-asset="1"'); // still replaceable in the editor
    expect(html.toLowerCase()).not.toContain('<script'); // safe by construction
  });

  it('keeps mesh placeholders (no external URLs) for non-hero/gallery images', () => {
    const { html } = renderPage(meshIr); // a text-section image
    expect(html).not.toContain('images.unsplash.com');
    expect(html).toContain('data:image/svg+xml');
  });

  it('renders small circle/avatar images as circular tiles, not full photos', () => {
    const a: PageIR = {
      ...ir,
      sections: [
        { id: 'g', role: 'gallery', background: 'default', layout: { columns: 3, align: 'start' }, elements: [
          { type: 'image', alt: 'mountain photo', col: 1 }, // a real picture -> photo
          { type: 'image', alt: 'avatar', col: 2 }, // a circle -> small tile
          { type: 'image', alt: 'user icon', col: 3 },
        ] },
      ],
    };
    const { html, css } = renderPage(a);
    expect((html.match(/pp-image--avatar/g) || []).length).toBe(2); // both circles
    // avatars use a mesh placeholder, not a stock photo
    expect(html).toMatch(/pp-image--avatar[^>]*src="data:image\/svg\+xml/);
    expect((html.match(/src="https:\/\/images\.unsplash\.com/g) || []).length).toBe(1); // only the real picture
    expect(css).toContain('.pp-image--avatar');
  });

  it('renders arrow-tabs (a drawn slider) as a carousel frame, not pill buttons', () => {
    const s: PageIR = {
      ...ir,
      sections: [
        { id: 's', role: 'gallery', background: 'default', layout: { columns: 1, align: 'center' }, elements: [
          { type: 'tabs', items: ['<', 'Slider', '>'] },
        ] },
      ],
    };
    const { html, css } = renderPage(s);
    expect(html).toContain('class="pp-carousel"');
    expect(html).toContain('pp-carousel__nav--prev');
    expect(html).toContain('pp-carousel__nav--next');
    expect(html).toContain('pp-carousel__dots');
    expect(html).toContain('alt="Slider"'); // the drawn label survives as alt
    expect(html).toContain('images.unsplash.com'); // slide is a curated photo
    expect(html).not.toContain('</button>'); // no arrow pill-tabs
    expect(css).toContain('.pp-carousel__nav');
  });

  it('renders a gallery image labeled slider/carousel with carousel chrome', () => {
    const s: PageIR = {
      ...ir,
      sections: [
        { id: 's', role: 'gallery', background: 'default', layout: { columns: 1, align: 'center' }, elements: [
          { type: 'image', alt: 'slider' },
        ] },
      ],
    };
    const { html } = renderPage(s);
    expect(html).toContain('class="pp-carousel"');
    expect(html).toContain('pp-carousel__nav--prev');
    expect(html).toContain('images.unsplash.com');
  });

  it('keeps real pagination tabs as tabs even when arrows are drawn beside them', () => {
    const s: PageIR = {
      ...ir,
      sections: [
        { id: 's', role: 'text', background: 'default', layout: { columns: 1, align: 'center' }, elements: [
          { type: 'tabs', items: ['<', '1', '2', '3', '>'] },
        ] },
      ],
    };
    const { html } = renderPage(s);
    expect(html).toContain('class="pp-tabs"');
    expect(html).not.toContain('pp-carousel');
  });

  it('renders a lone hero image as a wide banner strip, as drawn', () => {
    const h: PageIR = {
      ...ir,
      sections: [
        { id: 'h', role: 'hero', background: 'gradient', layout: { columns: 1, align: 'center' }, elements: [{ type: 'image', alt: 'Image' }] },
      ],
    };
    const { html, css } = renderPage(h);
    expect(html).toContain('pp-image--banner');
    expect(html).toContain('images.unsplash.com'); // still a curated, exportable photo
    expect(html).toContain('data-pp-asset="1"'); // still replaceable in the editor
    expect(css).toContain('.pp-image--banner');
  });

  it('renders a footer list of social networks as an icon-link row', () => {
    const f: PageIR = {
      ...ir,
      sections: [
        { id: 'f', role: 'footer', background: 'dark', layout: { columns: 2, align: 'start' }, elements: [
          { type: 'paragraph', text: '© 2026', col: 1 },
          { type: 'list', items: ['Facebook', 'LinkedIn', 'X'], col: 2 },
        ] },
      ],
    };
    const { html, css } = renderPage(f);
    expect(html).toContain('class="pp-social"');
    expect((html.match(/pp-social__link/g) || []).length).toBe(3);
    expect(html).toContain('aria-label="Facebook"'); // accessible label survives
    expect(html).toMatch(/aria-label="LinkedIn"><svg/); // inline brand glyph
    expect(html).not.toContain('<li>Facebook</li>'); // no bullet list
    expect(css).toContain('.pp-social__link');
  });

  it('keeps footer lists with non-social items as plain lists', () => {
    const f: PageIR = {
      ...ir,
      sections: [
        { id: 'f', role: 'footer', background: 'dark', layout: { columns: 1, align: 'start' }, elements: [
          { type: 'list', items: ['Facebook', 'Privacy Policy'] }, // mixed -> not a social row
        ] },
      ],
    };
    const { html } = renderPage(f);
    expect(html).not.toContain('pp-social');
    expect(html).toContain('<li>Privacy Policy</li>');
  });

  it('keeps social names outside the footer as a plain list (nav menus stay text)', () => {
    const n: PageIR = {
      ...ir,
      sections: [
        { id: 'n', role: 'nav', background: 'default', layout: { columns: 1, align: 'start' }, elements: [
          { type: 'list', items: ['Facebook', 'Instagram'] },
        ] },
      ],
    };
    const { html } = renderPage(n);
    expect(html).not.toContain('pp-social');
    expect(html).toContain('<li>Facebook</li>');
  });

  it('wraps CTA content in an inset gradient panel', () => {
    const c: PageIR = {
      ...ir,
      sections: [
        {
          id: 'c',
          role: 'cta',
          background: 'default',
          layout: { columns: 1, align: 'center' },
          elements: [{ type: 'heading', text: 'Sign up' }, { type: 'button', text: 'Go' }],
        },
      ],
    };
    const { html, css } = renderPage(c);
    expect(html).toContain('class="pp-cta__inner"');
    expect(css).toContain('.pp-cta__inner');
  });
});

describe('partner logo strips and region-label echoes', () => {
  const theme: PageIR['theme'] = {
    palette: { primary: '#14b8a6', secondary: '#facc15', background: '#ffffff', surface: '#f8fafc', text: '#0f172a' },
    fonts: { heading: 'Poppins', body: 'Inter' },
    spacing: 'normal',
  };
  const mk = (sections: PageIR['sections']): PageIR => ({ theme, sections });

  it('drops a heading that merely names the region (Footer) but keeps real copy', () => {
    const { html } = renderPage(
      mk([
        {
          id: 'f',
          role: 'footer',
          background: 'dark',
          layout: { columns: 2, align: 'start' },
          elements: [
            { type: 'heading', level: 3, text: 'Footer' },
            { type: 'heading', level: 4, text: 'Connect with us' },
            { type: 'paragraph', text: '© 2026 The Studio' },
          ],
        },
      ]),
    );
    expect(html).not.toMatch(/>\s*Footer\s*</);
    expect(html).toContain('Connect with us');
    expect(html).toContain('© 2026 The Studio');
  });

  it('keeps a real section heading like Partners', () => {
    const { html } = renderPage(
      mk([
        {
          id: 'p',
          role: 'gallery',
          background: 'default',
          layout: { columns: 1, align: 'center' },
          elements: [{ type: 'heading', level: 2, text: 'Partners' }, { type: 'image', alt: 'logo' }],
        },
      ]),
    );
    expect(html).toContain('Partners');
  });

  it('renders a lone partner-logo slider as a logo strip, not a photo carousel', () => {
    const { html } = renderPage(
      mk([
        {
          id: 'p',
          role: 'gallery',
          background: 'default',
          layout: { columns: 1, align: 'center' },
          elements: [{ type: 'image', alt: 'partner logo slider' }],
        },
      ]),
    );
    expect(html).toContain('class="pp-logos"');
    expect((html.match(/pp-logochip/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(html).not.toContain('pp-carousel');
    expect(html).not.toContain('images.unsplash.com');
  });

  it('renders a run of logo images as a chip row, not photo thumbnails', () => {
    const { html, css } = renderPage(
      mk([
        {
          id: 'p',
          role: 'gallery',
          background: 'default',
          layout: { columns: 1, align: 'center' },
          elements: [
            { type: 'image', alt: 'logo' },
            { type: 'image', alt: 'logo' },
            { type: 'image', alt: 'logo' },
            { type: 'image', alt: 'logo' },
          ],
        },
      ]),
    );
    expect((html.match(/pp-logochip/g) ?? []).length).toBe(4);
    expect(html).not.toContain('pp-thumb"');
    expect(html).not.toContain('images.unsplash.com');
    expect(css).toContain('.pp-logos');
    expect(css).toContain('.pp-logochip');
  });
});

describe('form, quote, stat and table elements', () => {
  const theme: PageIR['theme'] = {
    palette: { primary: '#14b8a6', secondary: '#facc15', background: '#ffffff', surface: '#f8fafc', text: '#0f172a' },
    fonts: { heading: 'Poppins', body: 'Inter' },
    spacing: 'normal',
  };
  const mk = (elements: PageIR['sections'][0]['elements'], role: PageIR['sections'][0]['role'] = 'text'): PageIR => ({
    theme,
    sections: [{ id: 'x', role, background: 'default', layout: { columns: 1, align: 'start' }, elements }],
  });

  it('renders a contact form with labeled fields, a textarea for message-like fields, and a submit button', () => {
    const { html, css } = renderPage(mk([{ type: 'form', items: ['Name', 'Email', 'Message'], text: 'Send it' }], 'contact'));
    expect(html).toContain('class="pp-form"');
    expect(html).toContain('Name');
    expect(html).toContain('type="email"');
    expect(html).toContain('<textarea');
    expect(html).toContain('Send it');
    expect(html).toContain('type="submit"');
    expect(css).toContain('.pp-form');
  });

  it('renders a default form when the sketch gave no field labels', () => {
    const { html } = renderPage(mk([{ type: 'form' }]));
    expect(html).toContain('class="pp-form"');
    expect(html).toContain('<textarea');
    expect(html).toContain('type="submit"');
  });

  it('renders a quote with attribution and escapes its text', () => {
    const { html, css } = renderPage(mk([{ type: 'quote', text: 'Best <tool> ever', label: 'Jane Doe, CEO' }], 'testimonials'));
    expect(html).toContain('class="pp-quote"');
    expect(html).toContain('<blockquote');
    expect(html).toContain('Best &lt;tool&gt; ever');
    expect(html).toContain('Jane Doe, CEO');
    expect(css).toContain('.pp-quote');
  });

  it('renders a stat with a large value and caption', () => {
    const { html, css } = renderPage(mk([{ type: 'stat', text: '500+', label: 'Happy users' }], 'stats'));
    expect(html).toContain('class="pp-stat"');
    expect(html).toContain('500+');
    expect(html).toContain('Happy users');
    expect(css).toContain('.pp-stat__value');
  });

  it('renders a table with a header row inside a scroll wrapper, escaped', () => {
    const { html, css } = renderPage(mk([{ type: 'table', items: ['Plan|Price', 'Basic|$9', 'Pro <b>|$29'] }], 'pricing'));
    expect(html).toContain('class="pp-tablewrap"');
    expect(html).toContain('<th');
    expect(html).toContain('Plan');
    expect(html).toContain('$29');
    expect(html).toContain('Pro &lt;b&gt;');
    expect(css).toContain('.pp-table');
  });
});
