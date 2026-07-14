import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-800">
      <div className="absolute inset-0 bg-aurora-gradient z-0 pointer-events-none" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <header className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-extrabold">Your projects</h1>
          <span className="text-sm text-slate-500">{user.email}</span>
        </header>
        <p className="text-slate-500">No projects yet.</p>
      </div>
    </main>
  );
}
