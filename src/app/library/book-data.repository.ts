import { Injectable, inject } from '@angular/core';
import { KEY_VALUE_STORE, readJson } from '../core/storage/key-value-store';

export interface Bookmark { cfi: string; label: string; created: number; }

const FIELDS = ['position', 'bookmarks', 'progress'] as const;

/** Per-book reading data (position, bookmarks, % read). Keys are kept from the first version so existing data survives. */
@Injectable({ providedIn: 'root' })
export class BookDataRepository {
  private readonly store = inject(KEY_VALUE_STORE);

  position(bookId: string): string | null { return this.store.get(`${bookId}:position`); }
  savePosition(bookId: string, cfi: string): void { this.store.set(`${bookId}:position`, cfi); }

  bookmarks(bookId: string): Bookmark[] { return readJson<Bookmark[]>(this.store, `${bookId}:bookmarks`, []); }
  saveBookmarks(bookId: string, bookmarks: Bookmark[]): void { this.store.set(`${bookId}:bookmarks`, JSON.stringify(bookmarks)); }

  progress(bookId: string): number | undefined {
    const raw = this.store.get(`${bookId}:progress`);
    const value = Number(raw);
    return raw !== null && Number.isFinite(value) ? value : undefined;
  }
  saveProgress(bookId: string, percent: number): void { this.store.set(`${bookId}:progress`, String(percent)); }

  clear(bookId: string): void {
    for (const field of FIELDS) this.store.remove(`${bookId}:${field}`);
  }
}
