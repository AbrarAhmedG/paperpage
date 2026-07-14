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
});
