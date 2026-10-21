import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LayoutService } from '../../core/ui/layout.service';
import { Bookmark } from '../../library/book-data.repository';
import { BookmarksService } from '../../library/bookmarks.service';
import { ReaderService } from '../../reader/reader.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-bookmarks-panel',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button class="btn ghost block" (click)="bookmarks.toggleCurrent()" [disabled]="!reader.loaded()">
      <app-icon name="bookmark" />
      {{ bookmarks.currentIsBookmarked() ? 'Quitar marcador de esta página' : 'Marcar esta página' }}
    </button>
    @if (!bookmarks.items().length) {
      <p class="empty-note">{{ reader.loaded() ? 'Aún no hay marcadores en este libro.' : 'Abre un libro para ver sus marcadores.' }}</p>
    }
    @for (bookmark of bookmarks.items(); track bookmark.created) {
      <div class="row">
        <button class="row-main" (click)="go(bookmark)">
          <app-icon name="bookmark" class="mark-icon" />
          <span class="row-text"><strong>{{ bookmark.label }}</strong><small>{{ formatDate(bookmark.created) }}</small></span>
        </button>
        <button class="icon-btn subtle" (click)="bookmarks.remove(bookmark)" aria-label="Eliminar marcador" title="Eliminar marcador">
          <app-icon name="close" />
        </button>
      </div>
    }`,
  styles: `:host { display: contents; }`,
})
export class BookmarksPanelComponent {
  protected readonly bookmarks = inject(BookmarksService);
  protected readonly reader = inject(ReaderService);
  private readonly layout = inject(LayoutService);

  protected go(bookmark: Bookmark): void {
    this.layout.closeSidebar();
    void this.bookmarks.go(bookmark);
  }

  protected formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
