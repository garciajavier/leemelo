import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FONT_SIZE, PreferencesService, RATES } from '../../core/preferences/preferences.service';
import { THEME_OPTIONS } from '../../core/preferences/reader-theme';
import { FONT_FAMILIES, LINE_SPACINGS } from '../../core/preferences/typography';
import { LayoutService } from '../../core/ui/layout.service';
import { ReadAloudService } from '../../narration/read-aloud.service';
import { SLEEP_TIMER_OPTIONS, SleepTimerService } from '../../narration/sleep-timer.service';
import { VoicesService } from '../../narration/voices.service';
import { FocusTrapDirective } from '../shared/focus-trap.directive';
import { IconComponent } from '../shared/icon.component';
import { SupportLinkComponent } from '../shared/support-link.component';

/** Voice, rate, sleep timer, typography and theme: bottom sheet on phones, floating panel on larger screens. */
@Component({
  selector: 'app-settings-sheet',
  imports: [IconComponent, FocusTrapDirective, SupportLinkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-sheet.component.html',
  styleUrl: './settings-sheet.component.css',
})
export class SettingsSheetComponent {
  protected readonly layout = inject(LayoutService);
  protected readonly prefs = inject(PreferencesService);
  protected readonly voices = inject(VoicesService);
  protected readonly readAloud = inject(ReadAloudService);
  protected readonly sleep = inject(SleepTimerService);
  protected readonly rates = RATES;
  protected readonly themes = THEME_OPTIONS;
  protected readonly fontFamilies = FONT_FAMILIES;
  protected readonly lineSpacings = LINE_SPACINGS;
  protected readonly sleepOptions = SLEEP_TIMER_OPTIONS;
  protected readonly fontSize = FONT_SIZE;
  protected readonly fontMeter = computed(() => (this.prefs.fontSize() - FONT_SIZE.min) / (FONT_SIZE.max - FONT_SIZE.min) * 100);
  protected readonly narrating = computed(() => this.readAloud.playing() || this.readAloud.paused());
  /** The selected voice is a basic one while a natural voice is available. */
  protected readonly suggestNatural = computed(() => {
    const selected = this.voices.selected();
    return !!selected && !selected.natural && this.voices.all().some(v => v.natural && v.lang === selected.lang);
  });

  protected selectedValue(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }
}
