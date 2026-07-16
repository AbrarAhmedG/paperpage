import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/dashboard/DashboardClient';
import type { ProjectSummary } from '@/components/dashboard/ProjectCard';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, sketch_path, updated_at, html, css')
    .order('updated_at', { ascending: false });

  // Sketch thumbnails (private bucket → short-lived signed urls) for projects
  // that have an upload but no generated page yet.
  const sketchPaths = (projects ?? [])
    .filter((p) => !p.html && p.sketch_path)
    .map((p) => p.sketch_path as string);
  const signed = sketchPaths.length
    ? (await supabase.storage.from('sketches').createSignedUrls(sketchPaths, 3600)).data ?? []
    : [];
  const signedByPath = new Map(signed.filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]));

  const summaries: ProjectSummary[] = (projects ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    updated_at: p.updated_at,
    hasPage: !!p.html,
    sketchUrl: (!p.html && p.sketch_path && signedByPath.get(p.sketch_path)) || null,
    previewDoc:
      p.html && p.css
        ? `<!doctype html><html><head><meta charset="utf-8"><style>${p.css}</style></head>${p.html}</html>`
        : null,
  }));

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-800">
      <div className="absolute inset-0 bg-aurora-gradient z-0 pointer-events-none" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <DashboardClient initial={summaries} email={user.email ?? ''} />
      </div>
    </main>
  );
}
