import type { PageIR } from './schema';

/**
 * A cheap plausibility check on a validated IR: a real sketch interpretation
 * has at least two substantive elements. Used by /api/generate to spend its
 * retry on a suspiciously thin result — a thin final attempt is still
 * accepted (some sketches genuinely are minimal), never a hard failure.
 */
export function irLooksSane(ir: PageIR): boolean {
  const substantive = ir.sections.flatMap((s) => s.elements).filter((e) => e.type !== 'divider');
  return substantive.length >= 2;
}
