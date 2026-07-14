'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Uploader from './Uploader';
import ExportButton from './ExportButton';
import { debounce } from '@/utils/debounce';

const Editor = dynamic(() => import('./Editor'), { ssr: false });

type Project = { id: string; name: string; html: string | null; css: string | null };

export default function StudioClient({ project }: { project: Project }) {
  const [html, setHtml] = useState<string | null>(project.html);
  const [css, setCss] = useState<string | null>(project.css);
  const editorRef = useRef<any>(null);
  const hasPage = !!html;

  const [name, setName] = useState(project.name);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const save = useRef(
    debounce(async (payload: Record<string, string>) => {
      setSaveState('saving');
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSaveState('saved');
    }, 1200),
  ).current;

  function handleEditorChange() {
    const editor = editorRef.current;
    if (!editor) return;
    save({ html: editor.getHtml(), css: editor.getCss() });
  }

  function handleNameChange(next: string) {
    setName(next);
    save({ name: next });
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">
          ← Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="font-semibold bg-transparent border-b border-transparent focus:border-slate-300 outline-none text-center"
          />
          <span className="text-xs text-slate-400 w-16">
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : ''}
          </span>
        </div>
        {hasPage ? <ExportButton editorRef={editorRef} name={name} /> : <span />}
      </div>
      {hasPage ? (
        <Editor
          projectId={project.id}
          html={html!}
          css={css!}
          editorRef={editorRef}
          onChange={handleEditorChange}
        />
      ) : (
        <Uploader
          projectId={project.id}
          onGenerated={({ html, css }) => {
            setHtml(html);
            setCss(css);
          }}
        />
      )}
    </main>
  );
}
