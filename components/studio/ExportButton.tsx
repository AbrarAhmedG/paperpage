'use client';

import { useState } from 'react';
import { extractAssetUrls, buildFilenameMap, rewriteAssetUrls, buildSiteZip } from '@/utils/export/bundle';

export default function ExportButton({
  editorRef,
  name,
}: {
  editorRef: React.MutableRefObject<any>;
  name: string;
}) {
  const [busy, setBusy] = useState(false);

  async function onExport() {
    const editor = editorRef.current;
    if (!editor) return;
    setBusy(true);
    try {
      const html: string = editor.getHtml();
      const css: string = editor.getCss();

      const urls = extractAssetUrls(html, css);
      const map = buildFilenameMap(urls);

      const assets: { relativePath: string; blob: Blob }[] = [];
      for (const url of urls) {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          assets.push({ relativePath: map[url], blob });
        } catch {
          // Skip an image that fails to fetch rather than failing the whole export.
        }
      }

      const rewritten = rewriteAssetUrls(html, css, map);
      const zip = await buildSiteZip({ html: rewritten.html, css: rewritten.css, assets });

      const a = document.createElement('a');
      a.href = URL.createObjectURL(zip);
      a.download = `${name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'site'}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onExport}
      disabled={busy}
      className="px-4 py-2 rounded-xl bg-mint-500 text-white font-semibold disabled:opacity-50"
    >
      {busy ? 'Exporting…' : 'Export .zip'}
    </button>
  );
}
