import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FONT_SIZE, PreferencesService, RATES } from '../../core/preferences/preferences.service';
import { READER_THEMES } from '../../core/preferences/reader-theme';
import { LayoutService } from '../../core/ui/layout.service';
import { VoicesService } from '../../narration/voices.service';
import { IconComponent } from '../shared/icon.component';

/** Voice, rate, font size and theme: bottom sheet on phones, floating panel on larger screens. */
@Component({
  selector: 'app-settings-sheet',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-sheet.component.html',
  styleUrl: './settings-sheet.component.css',
})
export class SettingsSheetComponent {
  protected readonly layout = inject(LayoutService);
  protected readonly prefs = inject(PreferencesService);
  protected readonly voices = inject(VoicesService);
  protected readonly rates = RATES;
  protected readonly themes = READER_THEMES;
  protected readonly fontSize = FONT_SIZE;
  protected readonly fontMeter = computed(() => (this.prefs.fontSize() - FONT_SIZE.min) / (FONT_SIZE.max - FONT_SIZE.min) * 100);

  protected selectedValue(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }
}
