import { describe, it, expect } from 'vitest';
import { generationStage } from './progress';

describe('generationStage', () => {
  it('walks through the three stages as time elapses', () => {
    expect(generationStage(0)).toBe('Reading your sketch…');
    expect(generationStage(7_999)).toBe('Reading your sketch…');
    expect(generationStage(8_000)).toBe('Building the layout…');
    expect(generationStage(17_999)).toBe('Building the layout…');
    expect(generationStage(18_000)).toBe('Rendering your page…');
    expect(generationStage(120_000)).toBe('Rendering your page…');
  });
});
