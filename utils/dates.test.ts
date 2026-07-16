import { describe, it, expect } from 'vitest';
import { formatRelativeDate } from './dates';

const NOW = new Date('2026-07-16T12:00:00Z');
const at = (iso: string) => formatRelativeDate(iso, NOW);

describe('formatRelativeDate', () => {
  it('says "just now" under a minute', () => {
    expect(at('2026-07-16T11:59:30Z')).toBe('just now');
  });
  it('reports minutes', () => {
    expect(at('2026-07-16T11:58:00Z')).toBe('2 minutes ago');
    expect(at('2026-07-16T11:59:00Z')).toBe('1 minute ago');
  });
  it('reports hours', () => {
    expect(at('2026-07-16T09:00:00Z')).toBe('3 hours ago');
    expect(at('2026-07-16T11:00:00Z')).toBe('1 hour ago');
  });
  it('says "yesterday" between 24 and 48 hours', () => {
    expect(at('2026-07-15T10:00:00Z')).toBe('yesterday');
  });
  it('reports days within a week', () => {
    expect(at('2026-07-13T12:00:00Z')).toBe('3 days ago');
  });
  it('falls back to a date beyond a week', () => {
    expect(at('2026-07-01T12:00:00Z')).toBe(new Date('2026-07-01T12:00:00Z').toLocaleDateString());
  });
  it('treats future/invalid gracefully', () => {
    expect(at('2026-07-16T12:00:05Z')).toBe('just now');
    expect(formatRelativeDate('not-a-date', NOW)).toBe('');
  });
});
