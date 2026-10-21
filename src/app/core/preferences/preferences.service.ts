import { Injectable, inject, signal } from '@angular/core';
import { KEY_VALUE_STORE, readJson } from '../storage/key-value-store';
import { ThemePreference, isThemePreference } from './reader-theme';
import { FontFamilyId, LineSpacingId, isFontFamilyId, isLineSpacingId } from './typography';

export const RATES: readonly number[] = Array.from({ length: 16 }, (_, i) => Math.round((0.5 + i * 0.1) * 10) / 10); // 0.5× … 2×
export const FONT_SIZE = { min: 80, max: 170, step: 10 } as const;

interface Preferences {
  voiceURI: string;
  rate: number;
  fontSize: number;
  lastBookId: string;
  theme: ThemePreference;
  fontFamily: FontFamilyId;
  lineSpacing: LineSpacingId;
}

const PREFS_KEY = 'epub-karaoke:prefs';

/** User preferences, persisted as a single JSON entry. */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly store = inject(KEY_VALUE_STORE);

  private readonly _voiceURI = signal('');
  private readonly _rate = signal(1);
  private readonly _fontSize = signal(110);
  private readonly _theme = signal<ThemePreference>('auto');
  private readonly _fontFamily = signal<FontFamilyId>('original');
  private readonly _lineSpacing = signal<LineSpacingId>('original');
  private readonly _lastBookId = signal('');

  /** Preferred voice; it may not exist in this browser (see VoicesService for the effective one). */
  readonly voiceURI = this._voiceURI.asReadonly();
  readonly rate = this._rate.asReadonly();
  readonly fontSize = this._fontSize.asReadonly();
  /** Chosen theme, possibly 'auto' (see ThemeService for the effective one). */
  readonly theme = this._theme.asReadonly();
  readonly fontFamily = this._fontFamily.asReadonly();
  readonly lineSpacing = this._lineSpacing.asReadonly();
  readonly lastBookId = this._lastBookId.asReadonly();

  constructor() {
    const saved = readJson<Partial<Preferences>>(this.store, PREFS_KEY, {});
    if (typeof saved.rate === 'number' && RATES.includes(saved.rate)) this._rate.set(saved.rate);
    if (typeof saved.fontSize === 'number') this._fontSize.set(clampFontSize(saved.fontSize));
    if (isThemePreference(saved.theme)) this._theme.set(saved.theme);
    if (isFontFamilyId(saved.fontFamily)) this._fontFamily.set(saved.fontFamily);
    if (isLineSpacingId(saved.lineSpacing)) this._lineSpacing.set(saved.lineSpacing);
    this._voiceURI.set(saved.voiceURI ?? '');
    this._lastBookId.set(saved.lastBookId ?? '');
  }

  setVoice(voiceURI: string): void { this._voiceURI.set(voiceURI); this.save(); }

  setRate(rate: number): void {
    if (!RATES.includes(rate)) return;
    this._rate.set(rate);
    this.save();
  }

  changeFontSize(delta: number): void {
    this._fontSize.update(size => clampFontSize(size + delta));
    this.save();
  }

  setTheme(theme: ThemePreference): void { this._theme.set(theme); this.save(); }
  setFontFamily(fontFamily: FontFamilyId): void { this._fontFamily.set(fontFamily); this.save(); }
  setLineSpacing(lineSpacing: LineSpacingId): void { this._lineSpacing.set(lineSpacing); this.save(); }
  setLastBook(bookId: string): void { this._lastBookId.set(bookId); this.save(); }

  private save(): void {
    const prefs: Preferences = {
      voiceURI: this._voiceURI(), rate: this._rate(), fontSize: this._fontSize(), lastBookId: this._lastBookId(),
      theme: this._theme(), fontFamily: this._fontFamily(), lineSpacing: this._lineSpacing(),
    };
    this.store.set(PREFS_KEY, JSON.stringify(prefs));
  }
}

function clampFontSize(size: number): number {
  return Math.min(FONT_SIZE.max, Math.max(FONT_SIZE.min, size));
}
