import JSZip from 'jszip';

const URL_RE = /https?:\/\/[^\s"')]+/g;

export function extractAssetUrls(html: string, css: string): string[] {
  const found = new Set<string>();
  for (const src of [html, css]) {
    const matches = src.match(URL_RE) ?? [];
    for (const m of matches) {
      if (m.includes('fonts.googleapis.com') || m.includes('fonts.gstatic.com')) continue;
      found.add(m);
    }
  }
  return [...found];
}

function basename(url: string): string {
  const path = url.split('?')[0];
  const name = path.substring(path.lastIndexOf('/') + 1) || 'image';
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function buildFilenameMap(urls: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  urls.forEach((url, i) => {
    map[url] = `./assets/${i}-${basename(url)}`;
  });
  return map;
}

export function rewriteAssetUrls(
  html: string,
  css: string,
  mapping: Record<string, string>,
): { html: string; css: string } {
  let outHtml = html;
  let outCss = css;
  for (const [original, relative] of Object.entries(mapping)) {
    outHtml = outHtml.split(original).join(relative);
    outCss = outCss.split(original).join(relative);
  }
  return { html: outHtml, css: outCss };
}

export async function buildSiteZip(input: {
  html: string;
  css: string;
  assets: { relativePath: string; blob: Blob }[];
}): Promise<Blob> {
  const zip = new JSZip();
  const document = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Exported with PaperPage</title>
<link rel="stylesheet" href="styles.css" />
</head>
${input.html}
</html>`;
  zip.file('index.html', document);
  zip.file('styles.css', input.css);
  const assetsFolder = zip.folder('assets')!;
  for (const a of input.assets) {
    const name = a.relativePath.replace('./assets/', '');
    assetsFolder.file(name, a.blob);
  }
  return zip.generateAsync({ type: 'blob' });
}
