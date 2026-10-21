import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LayoutService } from '../../core/ui/layout.service';
import { LibraryEntry } from '../../library/library.repository';
import { LibraryService } from '../../library/library.service';
import { ReaderService } from '../../reader/reader.service';
import { CoverComponent } from '../shared/cover.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-library-panel',
  imports: [CoverComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!library.entries().length) {
      <p class="empty-note">Los libros que importes se guardan aquí, en este navegador.</p>
    }
    @for (entry of library.entries(); track entry.id) {
      @let current = entry.id === reader.bookId() && reader.loaded();
      @let percent = library.progress()[entry.id];
      <div class="row" [class.active]="current">
        <button class="row-main" (click)="open(entry)" [title]="entry.title">
          <app-cover [src]="library.covers()[entry.id]" [title]="entry.title" />
          <span class="row-text">
            <strong>{{ entry.title }}</strong>
            <small>{{ entry.author || 'Autor desconocido' }}</small>
            @if (percent !== undefined) {
              <span class="row-progress">
                <span class="bar"><span [style.width.%]="percent"></span></span>{{ percent }} %
                @if (current) { <b class="reading">· Leyendo</b> }
              </span>
            } @else {
              <small>{{ current ? 'Leyendo ahora' : 'Sin empezar' }}</small>
            }
          </span>
        </button>
        <button class="icon-btn subtle" (click)="remove(entry)" aria-label="Quitar de la biblioteca" title="Quitar de la biblioteca">
          <app-icon name="trash" />
        </button>
      </div>
    }`,
  styles: `:host { display: contents; }`,
})
export class LibraryPanelComponent {
  protected readonly library = inject(LibraryService);
  protected readonly reader = inject(ReaderService);
  private readonly layout = inject(LayoutService);

  protected open(entry: LibraryEntry): void {
    this.layout.closeSidebar();
    void this.library.open(entry);
  }

  protected remove(entry: LibraryEntry): void {
    if (confirm(`¿Quitar «${entry.title}» de la biblioteca?\nSe borrarán también sus marcadores y la posición guardada.`)) {
      void this.library.remove(entry);
    }
  }
}
