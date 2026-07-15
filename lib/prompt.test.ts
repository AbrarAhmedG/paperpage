import { describe, it, expect } from 'vitest';
import { LAYOUT_PROMPT } from './prompt';
import { SECTION_ROLES, ELEMENT_TYPES, CURATED_FONTS } from '@/utils/ir/schema';

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
});
