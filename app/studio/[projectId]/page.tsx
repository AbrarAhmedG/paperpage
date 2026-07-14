import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import StudioClient from '@/components/studio/StudioClient';

export default async function StudioPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
  if (!project) notFound();

  return <StudioClient project={project} />;
}
