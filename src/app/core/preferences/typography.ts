export type FontFamilyId = 'original' | 'serif' | 'sans' | 'legible' | 'dyslexic';
export type LineSpacingId = 'original' | 'relaxed' | 'loose';

/** `stack` is null when the book's own typography is kept. Webfonts are declared in public/fonts/reading-fonts.css. */
export const FONT_FAMILIES: readonly { id: FontFamilyId; label: string; stack: string | null }[] = [
  { id: 'original', label: 'Del libro', stack: null },
  { id: 'serif', label: 'Serif', stack: "'Iowan Old Style', 'Palatino Linotype', Georgia, serif" },
  { id: 'sans', label: 'Sans', stack: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { id: 'legible', label: 'Legible', stack: "'Atkinson Hyperlegible', system-ui, sans-serif" },
  { id: 'dyslexic', label: 'Dislexia', stack: "OpenDyslexic, system-ui, sans-serif" },
];

export const LINE_SPACINGS: readonly { id: LineSpacingId; label: string; value: number | null }[] = [
  { id: 'original', label: 'Normal', value: null },
  { id: 'relaxed', label: 'Amplio', value: 1.7 },
  { id: 'loose', label: 'Muy amplio', value: 2 },
];

export function isFontFamilyId(value: unknown): value is FontFamilyId {
  return FONT_FAMILIES.some(f => f.id === value);
}

export function isLineSpacingId(value: unknown): value is LineSpacingId {
  return LINE_SPACINGS.some(l => l.id === value);
}
