import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LayoutService } from '../../core/ui/layout.service';
import { Classic, classicCoverUrl } from '../../library/classics';
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
      <p class="empty-note">Los libros que importes o abras se guardan aquí, en este navegador.</p>
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
        <button class="icon-btn subtle" (click)="library.remove(entry)" aria-label="Quitar de la biblioteca" title="Quitar de la biblioteca">
          <app-icon name="trash" />
        </button>
      </div>
    }

    @if (library.availableClassics().length) {
      <p class="overline classics-title">Clásicos gratis</p>
      @for (classic of library.availableClassics(); track classic.slug) {
        <div class="row">
          <button class="row-main" (click)="openClassic(classic)" [title]="classic.title">
            <app-cover [src]="coverUrl(classic)" [title]="classic.title" />
            <span class="row-text">
              <strong>{{ classic.title }}</strong>
              <small>{{ classic.author }}</small>
              <small class="lang">{{ classic.lang === 'es' ? 'Español' : 'Inglés' }} · dominio público</small>
            </span>
          </button>
        </div>
      }
    }`,
  styles: `
    :host { display: contents; }
    .classics-title { margin: 16px 4px 6px; }
    .lang { font-size: 11px !important; }`,
})
export class LibraryPanelComponent {
  protected readonly library = inject(LibraryService);
  protected readonly reader = inject(ReaderService);
  private readonly layout = inject(LayoutService);
  protected readonly coverUrl = classicCoverUrl;

  protected open(entry: LibraryEntry): void {
    this.layout.closeSidebar();
    void this.library.open(entry);
  }

  protected openClassic(classic: Classic): void {
    this.layout.closeSidebar();
    void this.library.openClassic(classic);
  }
}
