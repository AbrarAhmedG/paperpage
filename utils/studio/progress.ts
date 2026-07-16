/**
 * Perceived-progress stages for the generation wait (~20-60s). The API gives
 * no real progress signal, so stages advance on elapsed time alone.
 */
const STAGES: { at: number; label: string }[] = [
  { at: 18_000, label: 'Rendering your page…' },
  { at: 8_000, label: 'Building the layout…' },
  { at: 0, label: 'Reading your sketch…' },
];

export function generationStage(elapsedMs: number): string {
  return STAGES.find((s) => elapsedMs >= s.at)!.label;
}
