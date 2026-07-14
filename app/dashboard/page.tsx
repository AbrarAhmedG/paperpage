import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/dashboard/DashboardClient';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, sketch_path, updated_at')
    .order('updated_at', { ascending: false });

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-800">
      <div className="absolute inset-0 bg-aurora-gradient z-0 pointer-events-none" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <DashboardClient initial={projects ?? []} />
      </div>
    </main>
  );
}
