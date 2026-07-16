'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatRelativeDate } from '@/utils/dates';

export type ProjectSummary = {
  id: string;
  name: string;
  updated_at: string;
  hasPage: boolean;
  /** Signed URL of the uploaded sketch (shown until a page is generated). */
  sketchUrl: string | null;
  /** Self-contained HTML document of the generated page, for the mini preview. */
  previewDoc: string | null;
};

export default function ProjectCard({
  project,
  onDelete,
}: {
  project: ProjectSummary;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(project.name);
  const [draft, setDraft] = useState(project.name);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function commitRename() {
    setEditing(false);
    const next = draft.trim();
    if (!next || next === name) {
      setDraft(name);
      return;
    }
    setName(next);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: next }),
    });
    if (!res.ok) {
      setName(project.name);
      setDraft(project.name);
    }
  }

  return (
    <div className="group relative rounded-2xl bg-surface backdrop-blur-lg border border-border shadow-glass hover:shadow-glass-hover transition-shadow overflow-hidden flex flex-col">
      <Link
        href={`/studio/${project.id}`}
        className="absolute inset-0 z-0"
        aria-label={`Open ${name}`}
      />

      {/* Preview: generated page > uploaded sketch > empty placeholder */}
      <div className="relative aspect-[16/10] bg-white/60 border-b border-border overflow-hidden pointer-events-none">
        {project.previewDoc ? (
          <iframe
            srcDoc={project.previewDoc}
            sandbox=""
            loading="lazy"
            scrolling="no"
            tabIndex={-1}
            aria-hidden="true"
            title=""
            className="border-0 select-none"
            style={{ width: '400%', height: '400%', transform: 'scale(0.25)', transformOrigin: 'top left' }}
          />
        ) : project.sketchUrl ? (
          <img src={project.sketchUrl} alt="" className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            <span className="text-xs font-medium">No page yet — upload a sketch</span>
          </div>
        )}
        <span
          className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
            project.hasPage ? 'bg-mint-50 text-mint-500' : 'bg-white/80 text-slate-500'
          }`}
        >
          {project.hasPage ? 'Generated' : 'No page yet'}
        </span>
      </div>

      {/* Delete: appears on hover, confirms inline */}
      <div className="absolute top-2 right-2 z-10">
        {confirming ? (
          <span className="flex items-center gap-1 rounded-lg bg-white/95 shadow px-2 py-1 text-xs">
            Delete?
            <button
              onClick={() => onDelete(project.id)}
              className="font-semibold text-red-600 hover:underline"
            >
              Yes
            </button>
            <button onClick={() => setConfirming(false)} className="text-slate-500 hover:underline">
              No
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${name}`}
            title="Delete project"
            className="p-1.5 rounded-lg bg-white/90 shadow text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-4 flex flex-col gap-0.5">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setDraft(name);
                setEditing(false);
              }
            }}
            className="relative z-10 font-bold text-base bg-white/70 border border-border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-mint-400"
          />
        ) : (
          <span className="flex items-center gap-1.5 min-w-0">
            <h3 className="text-base font-bold truncate">{name}</h3>
            <button
              onClick={() => setEditing(true)}
              aria-label={`Rename ${name}`}
              title="Rename"
              className="relative z-10 shrink-0 p-1 rounded text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          </span>
        )}
        <p className="text-xs text-slate-500" suppressHydrationWarning>
          Updated {formatRelativeDate(project.updated_at)}
        </p>
      </div>
    </div>
  );
}
