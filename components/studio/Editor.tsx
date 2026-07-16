'use client';

import { useEffect, useRef } from 'react';
import { CURATED_FONTS } from '@/utils/ir/schema';
import { prepareEditorCss } from '@/utils/editor/css';

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
      await import('./editor-theme.css');
      const blocksBasic = (await import('grapesjs-blocks-basic')).default;
      const pluginForms = (await import('grapesjs-plugin-forms')).default;
      const pluginExport = (await import('grapesjs-plugin-export')).default;
      if (disposed || !containerRef.current) return;

      const fontOptions = CURATED_FONTS.map((f) => ({ id: f, label: f, value: `'${f}', sans-serif` }));

      // The renderer's theme CSS must never enter GrapesJS's style model (it
      // strips var()/color-mix shorthands, @keyframes and @import on parse).
      // It rides along as protected CSS instead; GrapesJS only owns user rules.
      const { protectedCss, userCss } = prepareEditorCss(css);

      editor = grapesjs.init({
        container: containerRef.current,
        height: 'calc(100vh - 49px)',
        fromElement: false,
        storageManager: false, // app owns persistence
        components: html,
        style: userCss,
        protectedCss,
        // Wrap plugins so options are passed inline (avoids pluginsOpts keying).
        plugins: [
          (e: any) => blocksBasic(e, { flexGrid: true, category: 'Basic' }),
          (e: any) => pluginForms(e, {}),
          (e: any) => pluginExport(e, {}),
        ],
        assetManager: {
          upload: false, // we handle uploads via custom logic below
          autoAdd: true,
        },
        deviceManager: {
          devices: [
            { name: 'Desktop', width: '' },
            { name: 'Tablet', width: '768px', widthMedia: '992px' },
            { name: 'Mobile', width: '375px', widthMedia: '575px' },
          ],
        },
        styleManager: {
          sectors: [
            {
              name: 'Layout',
              open: false,
              properties: [
                { property: 'display', type: 'select', options: [
                  { id: 'block', label: 'block' }, { id: 'grid', label: 'grid' },
                  { id: 'flex', label: 'flex' }, { id: 'inline-block', label: 'inline-block' },
                  { id: 'none', label: 'none' },
                ] },
                'grid-template-columns',
                'gap',
                { property: 'flex-direction', type: 'select', options: [
                  { id: 'row', label: 'row' }, { id: 'column', label: 'column' },
                ] },
                { property: 'justify-content', type: 'select', options: [
                  { id: 'flex-start', label: 'start' }, { id: 'center', label: 'center' },
                  { id: 'flex-end', label: 'end' }, { id: 'space-between', label: 'space-between' },
                  { id: 'space-around', label: 'space-around' },
                ] },
                { property: 'align-items', type: 'select', options: [
                  { id: 'stretch', label: 'stretch' }, { id: 'flex-start', label: 'start' },
                  { id: 'center', label: 'center' }, { id: 'flex-end', label: 'end' },
                ] },
              ],
            },
            {
              name: 'Dimensions',
              open: false,
              properties: ['width', 'max-width', 'height', 'min-height', 'padding', 'margin'],
            },
            {
              name: 'Typography',
              open: true,
              properties: [
                { property: 'font-family', type: 'select', defaults: `'Inter', sans-serif`, options: fontOptions },
                'font-size',
                'font-weight',
                'line-height',
                'letter-spacing',
                { property: 'color', type: 'color' },
                'text-align',
                { property: 'text-transform', type: 'select', options: [
                  { id: 'none', label: 'none' }, { id: 'uppercase', label: 'UPPER' },
                  { id: 'capitalize', label: 'Capitalize' }, { id: 'lowercase', label: 'lower' },
                ] },
              ],
            },
            {
              name: 'Background',
              open: false,
              properties: [{ property: 'background-color', type: 'color' }, 'background'],
            },
            {
              name: 'Border',
              open: false,
              properties: [
                'border-radius',
                'border-width',
                { property: 'border-style', type: 'select', options: [
                  { id: 'none', label: 'none' }, { id: 'solid', label: 'solid' },
                  { id: 'dashed', label: 'dashed' }, { id: 'dotted', label: 'dotted' },
                ] },
                { property: 'border-color', type: 'color' },
              ],
            },
            {
              name: 'Effects',
              open: false,
              properties: ['box-shadow', 'opacity'],
            },
          ],
        },
        blockManager: {
          blocks: [
            // --- Layout ---
            { id: 'section', label: 'Section', category: 'Layout', content: '<section data-region="text" class="pp-section pp-bg-default" style="--pp-cols:1"><div class="pp-container"><div class="pp-cell"><p class="pp-paragraph">New section.</p></div></div></section>' },
            { id: 'cols-2', label: '2 Columns', category: 'Layout', content: '<section data-region="text" class="pp-section pp-bg-default" style="--pp-cols:2"><div class="pp-container"><div class="pp-cell"><p class="pp-paragraph">Column one.</p></div><div class="pp-cell"><p class="pp-paragraph">Column two.</p></div></div></section>' },
            { id: 'cols-3', label: '3 Columns', category: 'Layout', content: '<section data-region="features" class="pp-section pp-bg-default" style="--pp-cols:3"><div class="pp-container"><div class="pp-cell"><h3 class="pp-heading">One</h3><p class="pp-paragraph">Text.</p></div><div class="pp-cell"><h3 class="pp-heading">Two</h3><p class="pp-paragraph">Text.</p></div><div class="pp-cell"><h3 class="pp-heading">Three</h3><p class="pp-paragraph">Text.</p></div></div></section>' },
            { id: 'cols-4', label: '4 Columns', category: 'Layout', content: '<section data-region="features" class="pp-section pp-bg-default" style="--pp-cols:4"><div class="pp-container"><div class="pp-cell"></div><div class="pp-cell"></div><div class="pp-cell"></div><div class="pp-cell"></div></div></section>' },
            { id: 'divider', label: 'Divider', category: 'Layout', content: '<hr class="pp-divider" />' },
            // --- Content ---
            { id: 'heading', label: 'Heading', category: 'Content', content: '<h2 class="pp-heading">New heading</h2>' },
            { id: 'subheading', label: 'Subheading', category: 'Content', content: '<h4 class="pp-heading">Overline</h4>' },
            { id: 'paragraph', label: 'Text', category: 'Content', content: '<p class="pp-paragraph">New paragraph text.</p>' },
            { id: 'list', label: 'List', category: 'Content', content: '<ul class="pp-list"><li>First item</li><li>Second item</li><li>Third item</li></ul>' },
            { id: 'image', label: 'Image', category: 'Content', content: { type: 'image', classes: ['pp-image'], attributes: { alt: 'Image' } } },
            { id: 'button', label: 'Button', category: 'Content', content: '<a class="pp-button pp-button--primary" href="#">Button</a>' },
            { id: 'button-secondary', label: 'Button (2nd)', category: 'Content', content: '<a class="pp-button pp-button--secondary" href="#">Button</a>' },
            { id: 'button-ghost', label: 'Button (ghost)', category: 'Content', content: '<a class="pp-button pp-button--ghost" href="#">Button</a>' },
            { id: 'input', label: 'Input', category: 'Content', content: '<input class="pp-input" type="text" placeholder="Enter text" />' },
            { id: 'logo', label: 'Logo', category: 'Content', content: '<span class="pp-logo">Logo</span>' },
            { id: 'tabs', label: 'Tabs', category: 'Content', content: '<div class="pp-tabs" role="tablist"><button class="pp-tab pp-tab--active" type="button">Tab 1</button><button class="pp-tab" type="button">Tab 2</button><button class="pp-tab" type="button">Tab 3</button></div>' },
            { id: 'video', label: 'Video', category: 'Content', content: '<div class="pp-video"><span class="pp-video__play" aria-hidden="true"></span></div>' },
            // --- Sections ---
            { id: 'nav', label: 'Navbar', category: 'Sections', content: '<section data-region="nav" class="pp-section pp-nav pp-bg-default" style="--pp-cols:2"><div class="pp-container"><div class="pp-cell"><span class="pp-logo">Logo</span></div><div class="pp-cell"><ul class="pp-list"><li>Home</li><li>About</li><li>Services</li><li>Contact</li></ul></div></div></section>' },
            { id: 'hero', label: 'Hero', category: 'Sections', content: '<section data-region="hero" class="pp-section pp-hero pp-bg-gradient" style="--pp-cols:1"><div class="pp-container"><div class="pp-cell"><h1 class="pp-heading">Your headline goes here</h1><p class="pp-paragraph">Supporting text that explains the value.</p><a class="pp-button pp-button--primary" href="#">Get started</a></div></div></section>' },
            { id: 'features', label: 'Features', category: 'Sections', content: '<section data-region="features" class="pp-section pp-features pp-bg-surface" style="--pp-cols:3"><div class="pp-container"><div class="pp-cell"><h3 class="pp-heading">Feature one</h3><p class="pp-paragraph">Describe it briefly.</p></div><div class="pp-cell"><h3 class="pp-heading">Feature two</h3><p class="pp-paragraph">Describe it briefly.</p></div><div class="pp-cell"><h3 class="pp-heading">Feature three</h3><p class="pp-paragraph">Describe it briefly.</p></div></div></section>' },
            { id: 'gallery', label: 'Gallery', category: 'Sections', content: '<section data-region="gallery" class="pp-section pp-gallery pp-bg-default" style="--pp-cols:3"><div class="pp-container"><div class="pp-cell"><img class="pp-image" alt="Image" /></div><div class="pp-cell"><img class="pp-image" alt="Image" /></div><div class="pp-cell"><img class="pp-image" alt="Image" /></div></div></section>' },
            { id: 'cta', label: 'CTA', category: 'Sections', content: '<section data-region="cta" class="pp-section pp-cta pp-bg-primary" style="--pp-cols:1"><div class="pp-container"><div class="pp-cell"><h2 class="pp-heading">Ready to start?</h2><a class="pp-button pp-button--primary" href="#">Start now</a></div></div></section>' },
            { id: 'footer', label: 'Footer', category: 'Sections', content: '<section data-region="footer" class="pp-section pp-footer pp-bg-dark" style="--pp-cols:1"><div class="pp-container"><div class="pp-cell"><p class="pp-paragraph">© Your Company</p></div></div></section>' },
          ],
        },
      });

      // GrapesJS drops <body> attributes when parsing `components`, so the
      // theme scope class is re-applied to the wrapper on every load; the
      // wrapper serializes back to <body class="pp-page"> in getHtml().
      editor.getWrapper()?.addClass('pp-page');

      // Add undo / redo to the options toolbar (core commands, text labels so
      // they render without an external icon font).
      try {
        editor.Panels.addButton('options', { id: 'pp-undo', command: 'core:undo', label: '↶', attributes: { title: 'Undo (Ctrl+Z)' } });
        editor.Panels.addButton('options', { id: 'pp-redo', command: 'core:redo', label: '↷', attributes: { title: 'Redo (Ctrl+Shift+Z)' } });
      } catch {}

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
