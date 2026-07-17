import { describe, it, expect } from 'vitest';
import { PALETTE_PRESETS, pickPalettePreset } from './palettes';
import { validateIR } from './schema';

// A minimal valid page whose theme carries the palette under test — presets are
// only useful if the exact values they hand the model survive Zod validation.
const pageWith = (palette: (typeof PALETTE_PRESETS)[number]['palette']) => ({
  theme: {
    palette,
    fonts: { heading: 'Poppins', body: 'Inter' },
    spacing: 'normal',
  },
  sections: [
    {
      id: 's1',
      role: 'hero',
      layout: { columns: 1, align: 'center' },
      elements: [{ type: 'heading', level: 1, text: 'Hi' }],
    },
  ],
});

describe('PALETTE_PRESETS', () => {
  it('offers a wide pool of presets', () => {
    expect(PALETTE_PRESETS.length).toBeGreaterThanOrEqual(10);
  });

  it('has unique names and unique primary colors', () => {
    const names = PALETTE_PRESETS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    const primaries = PALETTE_PRESETS.map((p) => p.palette.primary.toLowerCase());
    expect(new Set(primaries).size).toBe(primaries.length);
  });

  it('every preset passes IR palette validation exactly as authored', () => {
    for (const preset of PALETTE_PRESETS) {
      const r = validateIR(pageWith(preset.palette));
      expect(r.ok, `preset "${preset.name}" failed validation`).toBe(true);
      // The hexes must survive untransformed — the prompt embeds them verbatim
      // and the diag compares model output against them.
      if (r.ok) expect(r.ir.theme.palette).toEqual(preset.palette);
    }
  });

  it('keeps backgrounds light and text dark so the renderer’s light-UI assumptions hold', () => {
    const luma = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
    };
    for (const { name, palette } of PALETTE_PRESETS) {
      expect(luma(palette.background), `"${name}" background too dark`).toBeGreaterThan(220);
      expect(luma(palette.surface), `"${name}" surface too dark`).toBeGreaterThan(200);
      expect(luma(palette.text), `"${name}" text too light`).toBeLessThan(90);
    }
  });
});

describe('pickPalettePreset', () => {
  it('is driven by the injected rng across the full range', () => {
    expect(pickPalettePreset(() => 0)).toBe(PALETTE_PRESETS[0]);
    expect(pickPalettePreset(() => 0.999999)).toBe(PALETTE_PRESETS[PALETTE_PRESETS.length - 1]);
  });

  it('returns a member of the pool by default', () => {
    expect(PALETTE_PRESETS).toContain(pickPalettePreset());
  });
});
