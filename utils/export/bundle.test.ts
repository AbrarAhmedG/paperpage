import { describe, it, expect } from 'vitest';
import { extractAssetUrls, rewriteAssetUrls, buildFilenameMap } from './bundle';

const html =
  '<img src="https://x.supabase.co/storage/v1/object/sign/assets/a.png?token=1" />' +
  '<img src="data:image/svg+xml;utf8,placeholder" />';
const css = '.hero { background: url("https://x.supabase.co/storage/v1/object/sign/assets/b.jpg?token=2"); }';

describe('extractAssetUrls', () => {
  it('collects remote urls and ignores data URIs', () => {
    const urls = extractAssetUrls(html, css);
    expect(urls).toContain('https://x.supabase.co/storage/v1/object/sign/assets/a.png?token=1');
    expect(urls).toContain('https://x.supabase.co/storage/v1/object/sign/assets/b.jpg?token=2');
    expect(urls.some((u) => u.startsWith('data:'))).toBe(false);
  });

  it('collects curated photo URLs (with query strings) so they bundle offline', () => {
    const photo = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80';
    const urls = extractAssetUrls(`<img src="${photo}" />`, '');
    expect(urls).toContain(photo); // full URL incl. query captured, stops at the quote
  });
});

describe('buildFilenameMap', () => {
  it('assigns unique relative paths', () => {
    const urls = extractAssetUrls(html, css);
    const map = buildFilenameMap(urls);
    const paths = Object.values(map);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every((p) => p.startsWith('./assets/'))).toBe(true);
  });
});

describe('rewriteAssetUrls', () => {
  it('replaces originals with relative paths', () => {
    const urls = extractAssetUrls(html, css);
    const map = buildFilenameMap(urls);
    const out = rewriteAssetUrls(html, css, map);
    expect(out.html).toContain(map[urls[0]]);
    expect(out.html).not.toContain('token=1');
    expect(out.css).toContain(map[urls.find((u) => u.includes('b.jpg'))!]);
  });
});
