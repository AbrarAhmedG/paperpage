import { describe, it, expect } from 'vitest';
import { LAYOUT_PROMPT, buildLayoutPrompt } from './prompt';
import { SECTION_ROLES, ELEMENT_TYPES, CURATED_FONTS } from '@/utils/ir/schema';
import { PALETTE_PRESETS } from '@/utils/ir/palettes';

describe('LAYOUT_PROMPT', () => {
  it('tells the model to ignore browser/device window chrome (regression: address bar became a nav+search)', () => {
    expect(LAYOUT_PROMPT).toMatch(/ignore .*browser .*window frame/i);
    expect(LAYOUT_PROMPT.toLowerCase()).toContain('address');
    expect(LAYOUT_PROMPT.toLowerCase()).toContain('chrome');
  });

  it('steers a top bar toward a heading, not a search input (regression: title bar became an input)', () => {
    expect(LAYOUT_PROMPT.toLowerCase()).toContain('is not a search input');
    expect(LAYOUT_PROMPT.toLowerCase()).toContain('choose a heading');
  });

  it('tags small circles as avatars/icons so they render small', () => {
    expect(LAYOUT_PROMPT.toLowerCase()).toContain('avatar');
  });

  it('embeds the current schema enums so the model targets valid values', () => {
    for (const r of SECTION_ROLES) expect(LAYOUT_PROMPT).toContain(r);
    for (const t of ELEMENT_TYPES) expect(LAYOUT_PROMPT).toContain(t);
    for (const f of CURATED_FONTS) expect(LAYOUT_PROMPT).toContain(f);
  });

  it('keeps the free-choice palette rule with no injected default (diag + corpus rely on this)', () => {
    expect(LAYOUT_PROMPT).toContain('MODERN, VIBRANT, COLORFUL');
    expect(LAYOUT_PROMPT).not.toContain('Use EXACTLY this palette');
  });
});

describe('buildLayoutPrompt(preset)', () => {
  const preset = PALETTE_PRESETS[3]; // any preset; index arbitrary but fixed
  const prompt = buildLayoutPrompt(preset);

  it('embeds every preset hex verbatim as the default palette', () => {
    for (const hex of Object.values(preset.palette)) {
      expect(prompt).toContain(hex);
    }
    expect(prompt).toContain('Use EXACTLY this palette');
  });

  it('lets sketch-specified colors win over the preset', () => {
    expect(prompt).toMatch(/UNLESS the sketch itself specifies colors/i);
  });

  it('replaces the free-choice rule instead of contradicting it', () => {
    expect(prompt).not.toContain('MODERN, VIBRANT, COLORFUL');
  });

  it('keeps the rest of the interpretation rules intact', () => {
    // spot-check rules from both ends of the rule list
    expect(prompt).toContain('LOGO STRIP');
    expect(prompt).toContain('Output the JSON object only.');
    expect(prompt).toContain('Allowed fonts');
    // section background rhythm guidance must survive the rule swap
    expect(prompt).toMatch(/"gradient" hero/);
  });
});
