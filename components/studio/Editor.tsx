'use client';

import { useEffect, useRef } from 'react';
import { CURATED_FONTS } from '@/utils/ir/schema';

export default function Editor({
  projectId,
  html,
  css,
  onChange,
  editorRef,
}: {
  projectId: string;
  html: string;
  css: string;
  onChange: () => void;
  editorRef: React.MutableRefObject<any>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let editor: any;
    let disposed = false;

    (async () => {
      const grapesjs = (await import('grapesjs')).default;
      await import('grapesjs/dist/css/grapes.min.css');
      if (disposed || !containerRef.current) return;

      const fontOptions = CURATED_FONTS.map((f) => ({ id: f, label: f, value: `'${f}', sans-serif` }));

      editor = grapesjs.init({
        container: containerRef.current,
        height: 'calc(100vh - 49px)',
        fromElement: false,
        storageManager: false, // app owns persistence
        components: html,
        style: css,
        assetManager: {
          upload: false, // we handle uploads via custom logic below
          autoAdd: true,
        },
        deviceManager: {
          devices: [
            { name: 'Desktop', width: '' },
            { name: 'Mobile', width: '375px' },
          ],
        },
        styleManager: {
          sectors: [
            {
              name: 'Typography',
              open: true,
              properties: [
                { property: 'font-family', type: 'select', defaults: `'Inter', sans-serif`, options: fontOptions },
                'font-size',
                'font-weight',
                'line-height',
                { property: 'color', type: 'color' },
                'text-align',
              ],
            },
            { name: 'Background', open: false, properties: [{ property: 'background-color', type: 'color' }] },
            { name: 'Spacing', open: false, properties: ['padding', 'margin'] },
            { name: 'Border', open: false, properties: ['border-radius', 'border'] },
          ],
        },
        blockManager: {
          blocks: [
            { id: 'heading', label: 'Heading', content: '<h2 class="pp-heading">New heading</h2>' },
            { id: 'paragraph', label: 'Text', content: '<p class="pp-paragraph">New paragraph text.</p>' },
            { id: 'button', label: 'Button', content: '<a class="pp-button pp-button--primary" href="#">Button</a>' },
            {
              id: 'hero',
              label: 'Hero',
              content:
                '<section data-region="hero" class="pp-section pp-hero"><div class="pp-container"><h1 class="pp-heading">Headline</h1><p class="pp-paragraph">Supporting text</p><a class="pp-button pp-button--primary" href="#">Get started</a></div></section>',
            },
            {
              id: 'features',
              label: 'Features',
              content:
                '<section data-region="features" class="pp-section pp-features"><div class="pp-container"><h2 class="pp-heading">Features</h2></div></section>',
            },
            {
              id: 'cta',
              label: 'CTA',
              content:
                '<section data-region="cta" class="pp-section pp-cta"><div class="pp-container"><h2 class="pp-heading">Ready?</h2><a class="pp-button pp-button--primary" href="#">Start now</a></div></section>',
            },
          ],
        },
      });

      // Load existing project assets into the manager.
      try {
        const res = await fetch(`/api/assets?projectId=${projectId}`);
        if (res.ok) {
          const { assets } = await res.json();
          editor.AssetManager.add((assets ?? []).map((a: any) => ({ type: 'image', src: a.url, name: a.filename })));
        }
      } catch {}

      // Route the asset manager's file input through /api/assets.
      editor.AssetManager.getConfig().uploadFile = async (e: any) => {
        const files: FileList = e.dataTransfer ? e.dataTransfer.files : e.target.files;
        for (const file of Array.from(files)) {
          const fd = new FormData();
          fd.append('projectId', projectId);
          fd.append('file', file);
          const res = await fetch('/api/assets', { method: 'POST', body: fd });
          if (res.ok) {
            const a = await res.json();
            editor.AssetManager.add({ type: 'image', src: a.url, name: a.filename });
          }
        }
      };

      // Inject curated fonts into the canvas so picks render identically to export.
      const fontParam = CURATED_FONTS.map((f) => `family=${f.replace(/ /g, '+')}:wght@400;600;700`).join('&');
      editor.Canvas.getDocument()?.head?.insertAdjacentHTML(
        'beforeend',
        `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fontParam}&display=swap">`,
      );

      editor.on('update', onChange);
      editor.on('component:update', onChange);
      editor.on('style:update', onChange);

      editorRef.current = editor;
    })();

    return () => {
      disposed = true;
      try {
        editor?.destroy();
      } catch {}
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} />;
}
