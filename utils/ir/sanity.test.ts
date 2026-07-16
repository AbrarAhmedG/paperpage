import { describe, it, expect } from 'vitest';
import { irLooksSane } from './sanity';
import type { PageIR } from './schema';

const theme: PageIR['theme'] = {
  palette: { primary: '#14b8a6', secondary: '#facc15', background: '#ffffff', surface: '#f8fafc', text: '#0f172a' },
  fonts: { heading: 'Poppins', body: 'Inter' },
  spacing: 'normal',
};
const mk = (sections: PageIR['sections']): PageIR => ({ theme, sections });

describe('irLooksSane', () => {
  it('accepts a normal small page', () => {
    expect(
      irLooksSane(
        mk([
          {
            id: 'h',
            role: 'hero',
            background: 'default',
            layout: { columns: 1, align: 'center' },
            elements: [
              { type: 'heading', level: 1, text: 'Hi' },
              { type: 'paragraph', text: 'There' },
            ],
          },
        ]),
      ),
    ).toBe(true);
  });

  it('rejects a page with a single element', () => {
    expect(
      irLooksSane(
        mk([
          { id: 'a', role: 'text', background: 'default', layout: { columns: 1, align: 'start' }, elements: [{ type: 'heading', text: 'Only this' }] },
        ]),
      ),
    ).toBe(false);
  });

  it('rejects a page made only of dividers', () => {
    expect(
      irLooksSane(
        mk([
          {
            id: 'a',
            role: 'text',
            background: 'default',
            layout: { columns: 1, align: 'start' },
            elements: [{ type: 'divider' }, { type: 'divider' }, { type: 'divider' }],
          },
        ]),
      ),
    ).toBe(false);
  });
});
