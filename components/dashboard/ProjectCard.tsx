'use client';

import Link from 'next/link';

export type ProjectSummary = {
  id: string;
  name: string;
  sketch_path: string | null;
  updated_at: string;
};

export default function ProjectCard({
  project,
  onDelete,
}: {
  project: ProjectSummary;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="p-6 rounded-2xl bg-surface backdrop-blur-lg border border-border shadow-glass flex flex-col">
      <Link href={`/studio/${project.id}`} className="flex-1">
        <h3 className="text-lg font-bold mb-1">{project.name}</h3>
        <p className="text-xs text-slate-500">
          Updated {new Date(project.updated_at).toLocaleDateString()}
        </p>
      </Link>
      <button
        onClick={() => onDelete(project.id)}
        className="mt-4 self-start text-sm text-red-600 hover:underline"
      >
        Delete
      </button>
    </div>
  );
}
