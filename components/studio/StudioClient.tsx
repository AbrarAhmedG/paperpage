'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Uploader from './Uploader';

const Editor = dynamic(() => import('./Editor'), { ssr: false });

type Project = { id: string; name: string; html: string | null; css: string | null };

export default function StudioClient({ project }: { project: Project }) {
  const [html, setHtml] = useState<string | null>(project.html);
  const [css, setCss] = useState<string | null>(project.css);
  const editorRef = useRef<any>(null);
  const hasPage = !!html;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">
          ← Dashboard
        </Link>
        <span className="font-semibold">{project.name}</span>
        <span />
      </div>
      {hasPage ? (
        <Editor
          html={html!}
          css={css!}
          editorRef={editorRef}
          onChange={() => {
            /* autosave wired in Task 16 */
          }}
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
