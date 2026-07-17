// Curated palette presets for generated pages. A pencil sketch carries no color
// signal, so left to itself the vision model converges on the same indigo/violet
// scheme every time. /api/generate picks one of these at random per generation and
// injects it into the prompt as the DEFAULT palette (lib/prompt.ts
// buildLayoutPrompt) — colors actually drawn or written on the sketch still win.
// Every preset must pass the IR palette schema verbatim (locked by palettes.test.ts):
// light background/surface, dark text, a confident primary + complementary secondary.

export type PalettePreset = {
  name: string;
  palette: { primary: string; secondary: string; background: string; surface: string; text: string };
};

export const PALETTE_PRESETS: readonly PalettePreset[] = [
  { name: 'indigo-classic', palette: { primary: '#6366f1', secondary: '#f59e0b', background: '#ffffff', surface: '#eef2ff', text: '#1e1b4b' } },
  { name: 'ocean', palette: { primary: '#0ea5e9', secondary: '#f97316', background: '#f8fafc', surface: '#e0f2fe', text: '#0c4a6e' } },
  { name: 'forest', palette: { primary: '#059669', secondary: '#fbbf24', background: '#f6fdf9', surface: '#d1fae5', text: '#064e3b' } },
  { name: 'sunset-coral', palette: { primary: '#f43f5e', secondary: '#fb923c', background: '#fff8f6', surface: '#ffe4e6', text: '#4c0519' } },
  { name: 'royal-violet', palette: { primary: '#7c3aed', secondary: '#ec4899', background: '#faf8ff', surface: '#ede9fe', text: '#2e1065' } },
  { name: 'teal-fresh', palette: { primary: '#0d9488', secondary: '#f59e0b', background: '#f6fdfc', surface: '#ccfbf1', text: '#134e4a' } },
  { name: 'ruby-bold', palette: { primary: '#dc2626', secondary: '#f59e0b', background: '#fff8f7', surface: '#fee2e2', text: '#450a0a' } },
  { name: 'citrus', palette: { primary: '#ea580c', secondary: '#84cc16', background: '#fffbf5', surface: '#ffedd5', text: '#431407' } },
  { name: 'rose-soft', palette: { primary: '#db2777', secondary: '#8b5cf6', background: '#fdf7fa', surface: '#fce7f3', text: '#500724' } },
  { name: 'lime-energetic', palette: { primary: '#65a30d', secondary: '#0ea5e9', background: '#fbfdf4', surface: '#ecfccb', text: '#1a2e05' } },
  { name: 'espresso', palette: { primary: '#92400e', secondary: '#d97706', background: '#fdfaf5', surface: '#fef3c7', text: '#451a03' } },
  { name: 'navy-gold', palette: { primary: '#1d4ed8', secondary: '#facc15', background: '#f8faff', surface: '#dbeafe', text: '#172554' } },
];

// rng is injectable for tests; must return [0, 1).
export function pickPalettePreset(rng: () => number = Math.random): PalettePreset {
  return PALETTE_PRESETS[Math.floor(rng() * PALETTE_PRESETS.length)];
}
