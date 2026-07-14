'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ProjectCard, { type ProjectSummary } from './ProjectCard';

export default function DashboardClient({ initial }: { initial: ProjectSummary[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>(initial);
  const [creating, setCreating] = useState(false);

  async function createProject() {
    setCreating(true);
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Untitled project' }),
    });
    setCreating(false);
    if (!res.ok) return;
    const { id } = await res.json();
    router.push(`/studio/${id}`);
  }

  async function deleteProject(id: string) {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    setProjects((p) => p.filter((x) => x.id !== id));
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <header className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-extrabold">Your projects</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={createProject}
            disabled={creating}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'New project'}
          </button>
          <button onClick={signOut} className="text-sm text-slate-500 hover:underline">
            Sign out
          </button>
        </div>
      </header>

      {projects.length === 0 ? (
        <p className="text-slate-500">No projects yet. Create your first one.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onDelete={deleteProject} />
          ))}
        </div>
      )}
    </>
  );
}
