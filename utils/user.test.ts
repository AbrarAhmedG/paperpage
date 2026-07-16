import { describe, it, expect } from 'vitest';
import { initialsFor } from './user';

describe('initialsFor', () => {
  it('uses the first letters of the first two words of a name', () => {
    expect(initialsFor('Abrar Ahmed')).toBe('AA');
    expect(initialsFor('  jo   ann  smith ')).toBe('JA');
  });
  it('uses the first two letters of a single word', () => {
    expect(initialsFor('Abrar')).toBe('AB');
  });
  it('falls back to the email local part', () => {
    expect(initialsFor('tech@dreamnotion.com')).toBe('TE');
  });
  it('handles a dotted email local part like two words', () => {
    expect(initialsFor('jane.doe@example.com')).toBe('JD');
  });
  it('never returns empty', () => {
    expect(initialsFor('')).toBe('?');
    expect(initialsFor('   ')).toBe('?');
  });
});
