import { describe, it, expect } from 'vitest';
import { validateIR, pageIRSchema, CURATED_FONTS } from './schema';

const validIR = {
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
        { type: 'heading', level: 1, text: 'Welcome' },
        { type: 'paragraph', text: 'Subtitle here' },
        { type: 'button', text: 'Get started', variant: 'primary' },
      ],
    },
  ],
};

describe('pageIRSchema', () => {
  it('accepts a well-formed IR', () => {
    const r = validateIR(validIR);
    expect(r.ok).toBe(true);
  });

  it('rejects an unknown section role', () => {
    const bad = { ...validIR, sections: [{ ...validIR.sections[0], role: 'carousel' }] };
    const r = validateIR(bad);
    expect(r.ok).toBe(false);
  });

  it('rejects a non-hex palette color', () => {
    const bad = JSON.parse(JSON.stringify(validIR));
    bad.theme.palette.primary = 'red';
    expect(validateIR(bad).ok).toBe(false);
  });

  it('coerces an unknown font to a curated fallback via parse', () => {
    const bad = JSON.parse(JSON.stringify(validIR));
    bad.theme.fonts.heading = 'Comic Sans MS';
    const parsed = pageIRSchema.parse(bad);
    expect(CURATED_FONTS).toContain(parsed.theme.fonts.heading);
  });

  it('requires at least one section', () => {
    const bad = { ...validIR, sections: [] };
    expect(validateIR(bad).ok).toBe(false);
  });

  it('salvages off-label element types instead of failing the whole IR', () => {
    const ir = JSON.parse(JSON.stringify(validIR));
    ir.sections[0].elements = [
      { type: 'text', text: 'a' }, // -> paragraph
      { type: 'link', text: 'b' }, // -> button
      { type: 'zzz', text: 'c' }, // unknown -> paragraph fallback
    ];
    const r = validateIR(ir);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.ir.sections[0].elements.map((e) => e.type)).toEqual(['paragraph', 'button', 'paragraph']);
    }
  });

  it('maps section-role synonyms to canonical roles but still rejects truly unknown roles', () => {
    const withSynonym = JSON.parse(JSON.stringify(validIR));
    withSynonym.sections[0].role = 'navbar'; // -> nav
    const ok = validateIR(withSynonym);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.ir.sections[0].role).toBe('nav');
  });

  function withElement(extra: Record<string, unknown>) {
    const ir = JSON.parse(JSON.stringify(validIR));
    ir.sections[0].layout.columns = 2;
    ir.sections[0].elements = [{ type: 'image', ...extra }];
    return ir;
  }

  it('coerces and keeps grid coordinates on elements', () => {
    const r = validateIR(withElement({ col: '2', colSpan: '2', row: 1, rowSpan: '1' }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      const el = r.ir.sections[0].elements[0];
      expect(el.col).toBe(2);
      expect(el.colSpan).toBe(2);
      expect(el.row).toBe(1);
      expect(el.rowSpan).toBe(1);
    }
  });

  it('drops invalid grid coordinates rather than failing', () => {
    const r = validateIR(withElement({ col: 'left', colSpan: 0 }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      const el = r.ir.sections[0].elements[0];
      expect(el.col).toBeUndefined();
      expect(el.colSpan).toBeUndefined();
    }
  });

  it('accepts up to 12 columns and clamps out-of-range values', () => {
    const twelve = JSON.parse(JSON.stringify(validIR));
    twelve.sections[0].layout.columns = 12;
    expect(validateIR(twelve).ok).toBe(true);

    const tooMany = JSON.parse(JSON.stringify(validIR));
    tooMany.sections[0].layout.columns = 99;
    const r = validateIR(tooMany);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ir.sections[0].layout.columns).toBe(1); // out-of-range -> catch default
  });

  it('salvages an unknown section background to default', () => {
    const ir = JSON.parse(JSON.stringify(validIR));
    ir.sections[0].background = 'neon';
    const r = validateIR(ir);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ir.sections[0].background).toBe('default');
  });

  it('keeps a known section background and lowercases it', () => {
    const ir = JSON.parse(JSON.stringify(validIR));
    ir.sections[0].background = 'GRADIENT';
    const r = validateIR(ir);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ir.sections[0].background).toBe('gradient');
  });
});
