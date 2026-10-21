import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PreferencesService } from '../../core/preferences/preferences.service';
import { LayoutService } from '../../core/ui/layout.service';
import { LibraryService } from '../../library/library.service';
import { ReadAloudService } from '../../narration/read-aloud.service';
import { ReaderService } from '../../reader/reader.service';
import { CoverComponent } from '../shared/cover.component';
import { IconComponent } from '../shared/icon.component';

/** Bottom bar: what is being read, transport controls, click-to-read and the voice settings button. */
@Component({
  selector: 'app-player-bar',
  imports: [CoverComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './player-bar.component.html',
  styleUrl: './player-bar.component.css',
})
export class PlayerBarComponent {
  protected readonly reader = inject(ReaderService);
  protected readonly readAloud = inject(ReadAloudService);
  protected readonly library = inject(LibraryService);
  protected readonly layout = inject(LayoutService);
  protected readonly prefs = inject(PreferencesService);

  protected readonly playLabel = computed(() => this.readAloud.playing() ? 'Pausar' : this.readAloud.paused() ? 'Continuar' : 'Escuchar');
  protected readonly subtitle = computed(() => {
    if (!this.reader.loaded()) return 'Importa un EPUB para empezar';
    const percent = this.reader.percent();
    return (percent !== null ? `${percent} % · ` : '') + (this.reader.chapter() || this.reader.page());
  });
}
