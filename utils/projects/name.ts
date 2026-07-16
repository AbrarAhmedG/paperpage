import type { PageIR } from '@/utils/ir/schema';

export const DEFAULT_PROJECT_NAME = 'Untitled project';

export function normalizeProjectName(raw: string): string {
  const cleaned = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return DEFAULT_PROJECT_NAME;
  return cleaned.slice(0, 80);
}

/**
 * A human-meaningful name for a freshly generated page: the hero heading if
 * one exists, else the first heading anywhere. Null when the sketch produced
 * no usable heading — the caller keeps the current name.
 */
export function deriveProjectName(ir: PageIR): string | null {
  const headings = (roleFilter: (role: string) => boolean) =>
    ir.sections
      .filter((s) => roleFilter(s.role))
      .flatMap((s) => s.elements)
      .filter((e) => e.type === 'heading' && typeof e.text === 'string' && e.text.trim());
  const [best] = [...headings((r) => r === 'hero'), ...headings((r) => r !== 'hero')];
  return best ? normalizeProjectName(best.text!) : null;
}
