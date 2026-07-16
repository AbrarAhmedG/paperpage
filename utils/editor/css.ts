/**
 * GrapesJS re-serializes any CSS it parses through browser longhands, which
 * silently drops shorthand declarations holding var()/color-mix(), @keyframes
 * and @import rules. The renderer's theme CSS must therefore never enter the
 * GrapesJS style model: it is passed as `protectedCss` (injected verbatim into
 * the canvas and prepended verbatim to editor.getCss()), while GrapesJS only
 * owns the rules the user creates in the editor.
 *
 * The base is wrapped in `@layer pp-base` so un-layered user rules always win
 * the cascade regardless of specificity or document order, and @import lines
 * are hoisted above the layer to stay valid at the top of the exported
 * stylesheet. The marker at the end of the protected block is how a saved
 * `base + user` stylesheet is split apart again on the next load.
 */
export const PP_USER_STYLES_MARKER = '/* pp:user-styles */';

// The url string is consumed as a quoted whole first: Google Fonts urls
// contain semicolons (wght@400;500;…), so `[^;]+;` would sever them.
const IMPORT_RE = /@import\s+(?:url\(\s*(?:'[^']*'|"[^"]*"|[^)'"]*)\s*\)|'[^']*'|"[^"]*")[^;]*;/g;

export function prepareEditorCss(projectCss: string): { protectedCss: string; userCss: string } {
  const css = projectCss ?? '';
  const idx = css.indexOf(PP_USER_STYLES_MARKER);
  if (idx !== -1) {
    const end = idx + PP_USER_STYLES_MARKER.length;
    return { protectedCss: css.slice(0, end), userCss: css.slice(end).trim() };
  }
  const imports = css.match(IMPORT_RE) ?? [];
  const rest = css.replace(IMPORT_RE, '').trim();
  const protectedCss = [
    ...imports,
    '* { box-sizing: border-box; } body { margin: 0; }',
    `@layer pp-base {\n${rest}\n}`,
    PP_USER_STYLES_MARKER,
  ].join('\n');
  return { protectedCss, userCss: '' };
}
