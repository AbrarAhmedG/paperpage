import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SAMPLE_SKETCHES } from './samples';

describe('SAMPLE_SKETCHES manifest', () => {
  it('offers a real pool (10+) with unique files and human labels', () => {
    expect(SAMPLE_SKETCHES.length).toBeGreaterThanOrEqual(10);
    const files = SAMPLE_SKETCHES.map((s) => s.file);
    expect(new Set(files).size).toBe(files.length);
    for (const s of SAMPLE_SKETCHES) expect(s.label.length).toBeGreaterThan(3);
  });

  it('every manifest entry exists in public/samples (a broken entry = broken demo button)', () => {
    for (const s of SAMPLE_SKETCHES) {
      const p = join(__dirname, '..', '..', 'public', 'samples', s.file);
      expect(existsSync(p), `missing ${s.file}`).toBe(true);
    }
  });
});
