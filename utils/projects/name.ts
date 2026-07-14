export function normalizeProjectName(raw: string): string {
  const cleaned = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Untitled project';
  return cleaned.slice(0, 80);
}
