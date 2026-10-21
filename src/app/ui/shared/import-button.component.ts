import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LibraryService } from '../../library/library.service';
import { IconComponent } from './icon.component';

/** File picker for EPUBs. "toolbar" collapses to an icon on phones; "hero" is the large call to action. */
@Component({
  selector: 'app-import-button',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="btn primary" [class.import]="variant() === 'toolbar'" [class.lg]="variant() === 'hero'" title="Importar EPUB">
      <app-icon name="upload" />
      <span class="import-label">Importar EPUB</span>
      <input type="file" accept=".epub,application/epub+zip" (change)="onFileChosen($event)" hidden>
    </label>`,
  styles: `
    :host { display: contents; }
    .import { width: 44px; padding: 0; }
    .import .import-label { display: none; }
    @media (min-width: 600px) {
      .import { width: auto; padding: 0 16px; }
      .import .import-label { display: inline; }
    }`,
})
export class ImportButtonComponent {
  readonly variant = input<'toolbar' | 'hero'>('toolbar');
  private readonly library = inject(LibraryService);

  protected async onFileChosen(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) await this.library.importFile(file);
  }
}
