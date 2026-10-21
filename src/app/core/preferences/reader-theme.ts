/** Palette actually applied to the page. */
export type ReaderTheme = 'light' | 'sepia' | 'dark';
/** What the user picks: a palette, or follow the system light/dark mode. */
export type ThemePreference = 'auto' | ReaderTheme;

export const THEME_OPTIONS: readonly { id: ThemePreference; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'light', label: 'Claro' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'dark', label: 'Oscuro' },
];

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_OPTIONS.some(t => t.id === value);
}
