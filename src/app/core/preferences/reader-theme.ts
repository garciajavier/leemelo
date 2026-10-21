export type ReaderTheme = 'light' | 'sepia' | 'dark';

export const READER_THEMES: readonly { id: ReaderTheme; label: string }[] = [
  { id: 'light', label: 'Claro' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'dark', label: 'Oscuro' },
];

export function isReaderTheme(value: unknown): value is ReaderTheme {
  return READER_THEMES.some(t => t.id === value);
}
