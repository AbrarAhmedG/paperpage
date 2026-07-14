'use client';

import { useState } from 'react';
import Link from 'next/link';
import Uploader from './Uploader';

type Project = {
  id: string;
  name: string;
  html: string | null;
  css: string | null;
};

export default function StudioClient({ project }: { project: Project }) {
  const [html, setHtml] = useState<string | null>(project.html);
  const [css, setCss] = useState<string | null>(project.css);
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
        <div className="p-6">Editor loads here (Task 15).</div>
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
