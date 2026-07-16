import { describe, it, expect } from 'vitest';
import { prepareEditorCss, PP_USER_STYLES_MARKER } from './css';
import { renderPage } from '@/utils/renderer';
import { validateIR } from '@/utils/ir/schema';

const FRESH_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');
:root { --pp-primary: #123456; }
.pp-button { background: var(--pp-primary); }
@keyframes pp-fade { from { opacity: 0; } to { opacity: 1; } }`;

describe('prepareEditorCss', () => {
  it('wraps fresh renderer css in a protected base layer with hoisted imports and a trailing marker', () => {
    const { protectedCss, userCss } = prepareEditorCss(FRESH_CSS);
    // @import must stay first so it remains valid at the top of the exported stylesheet
    expect(protectedCss.startsWith(`@import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');`)).toBe(true);
    // the base is layered so un-layered GrapesJS user rules always win the cascade
    expect(protectedCss).toContain('@layer pp-base {');
    expect(protectedCss).toContain('--pp-primary: #123456');
    expect(protectedCss).toContain('@keyframes pp-fade');
    // box-sizing/body reset replaces the GrapesJS default protectedCss it displaces
    expect(protectedCss).toContain('box-sizing: border-box');
    expect(protectedCss.endsWith(PP_USER_STYLES_MARKER)).toBe(true);
    expect(userCss).toBe('');
  });

  it('returns stored protected css verbatim and the user tail when the marker is present', () => {
    const first = prepareEditorCss(FRESH_CSS);
    const saved = `${first.protectedCss}\n.pp-heading { color: red; }`;
    const second = prepareEditorCss(saved);
    expect(second.protectedCss).toBe(first.protectedCss);
    expect(second.userCss).toBe('.pp-heading { color: red; }');
  });

  it('is stable across repeated save/load cycles (no double wrapping)', () => {
    const first = prepareEditorCss(FRESH_CSS);
    let css = `${first.protectedCss}\n.pp-heading { color: red; }`;
    for (let i = 0; i < 3; i++) {
      const cycle = prepareEditorCss(css);
      css = `${cycle.protectedCss}\n${cycle.userCss}`;
    }
    const final = prepareEditorCss(css);
    expect(final.protectedCss).toBe(first.protectedCss);
    expect(final.userCss).toBe('.pp-heading { color: red; }');
    expect(css.match(/@layer pp-base/g)).toHaveLength(1);
  });

  it('hoists @import urls containing semicolons intact (real Google Fonts weights)', () => {
    const importLine = `@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');`;
    const { protectedCss } = prepareEditorCss(`${importLine}\n.pp-x { color: red; }`);
    expect(protectedCss.startsWith(importLine)).toBe(true);
    // no severed url tail may leak into the layer body and corrupt it
    const layerBody = protectedCss.slice(protectedCss.indexOf('@layer pp-base'));
    expect(layerBody).not.toContain('display=swap');
    expect(layerBody).not.toContain('wght');
    expect(layerBody).toContain('.pp-x { color: red; }');
  });

  it('handles css without imports', () => {
    const { protectedCss } = prepareEditorCss('.pp-button { color: #fff; }');
    expect(protectedCss).not.toContain('@import');
    expect(protectedCss).toContain('@layer pp-base {');
    expect(protectedCss.endsWith(PP_USER_STYLES_MARKER)).toBe(true);
  });
});

describe('renderer output', () => {
  it('never contains the user-styles marker (split must stay unambiguous)', () => {
    const result = validateIR({
      theme: {
        palette: { primary: '#14b8a6', secondary: '#eab308', background: '#ffffff', surface: '#f8fafc', text: '#0f172a' },
        fonts: { heading: 'Inter', body: 'Inter' },
        spacing: 'normal',
      },
      sections: [
        {
          id: 's1',
          role: 'hero',
          layout: { columns: 1, align: 'center' },
          elements: [{ type: 'heading', text: 'Hello', level: 1 }],
        },
      ],
    });
    if (!result.ok) throw new Error('fixture IR must validate');
    const { css } = renderPage(result.ir);
    expect(css).not.toContain(PP_USER_STYLES_MARKER);
  });
});
