import { describe, it, expect } from 'vitest';
import { normalizeProjectName, deriveProjectName, DEFAULT_PROJECT_NAME } from './name';
import type { PageIR } from '@/utils/ir/schema';

function ir(sections: PageIR['sections']): PageIR {
  return {
    theme: {
      palette: { primary: '#14b8a6', secondary: '#eab308', background: '#ffffff', surface: '#f8fafc', text: '#0f172a' },
      fonts: { heading: 'Inter', body: 'Inter' },
      spacing: 'normal',
    },
    sections,
  } as PageIR;
}

describe('deriveProjectName', () => {
  it('uses the hero heading', () => {
    const name = deriveProjectName(
      ir([
        { id: 'n', role: 'nav', layout: { columns: 2, align: 'start' }, elements: [{ type: 'heading', text: 'Menu', level: 3 }] },
        { id: 'h', role: 'hero', layout: { columns: 1, align: 'center' }, elements: [{ type: 'heading', text: 'Fresh Coffee Daily', level: 1 }] },
      ] as PageIR['sections']),
    );
    expect(name).toBe('Fresh Coffee Daily');
  });

  it('falls back to the first heading anywhere when there is no hero heading', () => {
    const name = deriveProjectName(
      ir([
        { id: 'f', role: 'features', layout: { columns: 3, align: 'start' }, elements: [{ type: 'paragraph', text: 'x' }, { type: 'heading', text: 'What we do', level: 2 }] },
      ] as PageIR['sections']),
    );
    expect(name).toBe('What we do');
  });

  it('returns null when no usable heading exists', () => {
    const name = deriveProjectName(
      ir([
        { id: 'g', role: 'gallery', layout: { columns: 3, align: 'start' }, elements: [{ type: 'image' }] },
      ] as PageIR['sections']),
    );
    expect(name).toBeNull();
  });

  it('normalizes whitespace and caps length', () => {
    const name = deriveProjectName(
      ir([
        { id: 'h', role: 'hero', layout: { columns: 1, align: 'center' }, elements: [{ type: 'heading', text: '  Big   Launch  ', level: 1 }] },
      ] as PageIR['sections']),
    );
    expect(name).toBe('Big Launch');
  });
});

describe('normalizeProjectName', () => {
  it('exposes the default name constant used for auto-naming checks', () => {
    expect(DEFAULT_PROJECT_NAME).toBe('Untitled project');
  });
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
