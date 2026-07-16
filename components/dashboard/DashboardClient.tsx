'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { initialsFor } from '@/utils/user';
import ProjectCard, { type ProjectSummary } from './ProjectCard';

export default function DashboardClient({
  initial,
  email,
  userName,
}: {
  initial: ProjectSummary[];
  email: string;
  userName: string | null;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>(initial);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createProject() {
    setCreating(true);
    setError(null);
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Untitled project' }),
    });
    setCreating(false);
    if (!res.ok) {
      setError('Could not create a project. Try again.');
      return;
    }
    const { id } = await res.json();
    router.push(`/studio/${id}`);
  }

  async function deleteProject(id: string) {
    const snapshot = projects;
    setError(null);
    setProjects((p) => p.filter((x) => x.id !== id));
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' }).catch(() => null);
    if (!res || !res.ok) {
      setProjects(snapshot);
      setError('Could not delete the project. Try again.');
    }
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <header className="flex items-center justify-between mb-10">
        <Link href="/" className="text-xl font-extrabold tracking-tight hover:opacity-80">
          Paper<span className="text-mint-500">Page</span>
        </Link>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-2.5" title={email}>
            <span
              aria-hidden="true"
              className="h-8 w-8 rounded-full bg-gradient-to-br from-mint-400 to-gold-400 text-white text-xs font-bold flex items-center justify-center shadow"
            >
              {initialsFor(userName ?? email)}
            </span>
            <span className="hidden sm:inline font-medium text-slate-700">{userName ?? email}</span>
          </span>
          <button onClick={signOut} className="hover:text-slate-800 hover:underline">
            Sign out
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold">Your projects</h1>
        <button
          onClick={createProject}
          disabled={creating}
          className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:-translate-y-0.5 transition-all disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'New project'}
        </button>
      </div>

      {error && (
        <p className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </p>
      )}

      {projects.length === 0 ? (
        <button
          onClick={createProject}
          disabled={creating}
          className="w-full max-w-md mx-auto flex flex-col items-center gap-3 p-12 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-mint-400 hover:text-slate-700 transition-colors bg-white/40"
        >
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          <span className="font-semibold">Create your first project</span>
          <span className="text-sm">Draw a page, snap a photo, and turn it into a real site.</span>
        </button>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onDelete={deleteProject} />
          ))}
        </div>
      )}
    </>
  );
}
