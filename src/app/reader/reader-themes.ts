import { ReaderTheme } from '../core/preferences/reader-theme';

export interface ReaderPalette { bg: string; fg: string; link: string; }

export const READER_PALETTES: Record<ReaderTheme, ReaderPalette> = {
  light: { bg: '#fffefb', fg: '#1d2433', link: '#2f5d8c' },
  sepia: { bg: '#f6eedc', fg: '#4a3a24', link: '#8a5a1c' },
  dark: { bg: '#171b23', fg: '#d8dde6', link: '#8fb4e8' },
};

/** epub.js theme rules: the palette overrides the book's own colours so every theme stays readable. */
export function themeRules(palette: ReaderPalette): Record<string, Record<string, string>> {
  return {
    body: { background: `${palette.bg} !important`, color: `${palette.fg} !important` },
    'p, li, h1, h2, h3, h4, h5, h6, span, div, blockquote, td, th, em, strong': { color: 'inherit !important' },
    a: { color: `${palette.link} !important` },
  };
}

export const KARAOKE_HIGHLIGHT = { className: 'karaoke-mark', fill: '#f6c945', opacity: { normal: '0.45', dark: '0.35' } } as const;
