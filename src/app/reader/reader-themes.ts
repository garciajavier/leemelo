import { ReaderTheme } from '../core/preferences/reader-theme';
import { FONT_FAMILIES, FontFamilyId, LINE_SPACINGS, LineSpacingId } from '../core/preferences/typography';

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

/** Two-level karaoke: soft sentence background, strong word highlight. */
export const KARAOKE_HIGHLIGHT = {
  fill: '#f6c945',
  sentence: { className: 'karaoke-sentence', opacity: { normal: '0.16', dark: '0.12' } },
  word: { className: 'karaoke-mark', opacity: { normal: '0.45', dark: '0.35' } },
} as const;

/** CSS injected into each book section for the user's font and line spacing ("" keeps the book's own). */
export function typographyCss(family: FontFamilyId, spacing: LineSpacingId): string {
  const stack = FONT_FAMILIES.find(f => f.id === family)?.stack;
  const lineHeight = LINE_SPACINGS.find(l => l.id === spacing)?.value;
  let css = '';
  if (stack) css += `body, p, li, div, span, blockquote, h1, h2, h3, h4, h5, h6, td, th, a, em, strong, i, b { font-family: ${stack} !important; }\n`;
  if (lineHeight) css += `body, p, li, div, blockquote { line-height: ${lineHeight} !important; }\n`;
  return css;
}
