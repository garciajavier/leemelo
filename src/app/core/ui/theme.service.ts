import { Injectable, computed, inject } from '@angular/core';
import { PreferencesService } from '../preferences/preferences.service';
import { ReaderTheme } from '../preferences/reader-theme';
import { mediaQuerySignal } from './media-query';

/** Resolves the theme preference ('auto' follows the system) into the palettes actually shown. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly prefs = inject(PreferencesService);
  private readonly systemDark = mediaQuerySignal('(prefers-color-scheme: dark)');

  /** Page palette. */
  readonly readerTheme = computed<ReaderTheme>(() => {
    const theme = this.prefs.theme();
    return theme === 'auto' ? (this.systemDark() ? 'dark' : 'light') : theme;
  });

  /** App chrome: dark only with the dark page palette; sepia keeps the light chrome. */
  readonly appTheme = computed<'light' | 'dark'>(() => this.readerTheme() === 'dark' ? 'dark' : 'light');
}
