import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { ToastService } from '../core/ui/toast.service';
import { ReaderService } from '../reader/reader.service';
import { BookDataRepository, Bookmark } from './book-data.repository';

/** Bookmarks of the open book. */
@Injectable({ providedIn: 'root' })
export class BookmarksService {
  private readonly repo = inject(BookDataRepository);
  private readonly reader = inject(ReaderService);
  private readonly toast = inject(ToastService);

  private readonly _items = signal<Bookmark[]>([]);
  readonly items = this._items.asReadonly();
  readonly currentIsBookmarked = computed(() => {
    const cfi = this.reader.cfi();
    return !!cfi && this._items().some(b => b.cfi === cfi);
  });

  constructor() {
    effect(() => {
      const bookId = this.reader.bookId();
      untracked(() => this._items.set(bookId ? this.repo.bookmarks(bookId) : []));
    });
  }

  /** Adds a bookmark at the current page, or removes it if the page is already bookmarked. */
  toggleCurrent(): void {
    const cfi = this.reader.cfi();
    if (!cfi) return;
    const existing = this._items().find(b => b.cfi === cfi);
    if (existing) { this.remove(existing); return; }
    const label = [this.reader.chapter(), this.reader.page()].filter(Boolean).join(' · ') || 'Marcador';
    this.persist([{ cfi, label, created: Date.now() }, ...this._items()]);
    this.toast.info('Página guardada en marcadores');
  }

  remove(bookmark: Bookmark): void {
    this.persist(this._items().filter(b => b !== bookmark));
  }

  go(bookmark: Bookmark): Promise<void> {
    return this.reader.goTo(bookmark.cfi);
  }

  private persist(items: Bookmark[]): void {
    this._items.set(items);
    this.repo.saveBookmarks(this.reader.bookId(), items);
  }
}
