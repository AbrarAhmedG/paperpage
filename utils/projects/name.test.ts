import { describe, it, expect } from 'vitest';
import { normalizeProjectName } from './name';

describe('normalizeProjectName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeProjectName('  My   Site  ')).toBe('My Site');
  });
  it('falls back for empty input', () => {
    expect(normalizeProjectName('   ')).toBe('Untitled project');
  });
  it('caps length at 80 chars', () => {
    expect(normalizeProjectName('a'.repeat(200)).length).toBe(80);
  });
});
