import { Injectable, computed, inject, signal } from '@angular/core';
import { PreferencesService } from '../core/preferences/preferences.service';
import { ToastService, errorMessage } from '../core/ui/toast.service';
import { OpenedBook, ReaderService } from '../reader/reader.service';
import { BookDataRepository } from './book-data.repository';
import { LibraryEntry, LibraryRepository } from './library.repository';

/** Library use cases: import, open, remove and restore the last book; exposes entries, covers and % read. */
@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly repo = inject(LibraryRepository);
  private readonly bookData = inject(BookDataRepository);
  private readonly reader = inject(ReaderService);
  private readonly prefs = inject(PreferencesService);
  private readonly toast = inject(ToastService);

  private readonly _entries = signal<LibraryEntry[]>([]);
  private readonly _covers = signal<Record<string, string>>({});
  private readonly storedProgress = signal<Record<string, number>>({});

  /** Most recently opened first. */
  readonly entries = this._entries.asReadonly();
  /** Object URLs of the covers, by book id. */
  readonly covers = this._covers.asReadonly();
  /** % read by book id; the open book reports live progress. */
  readonly progress = computed(() => {
    const progress = { ...this.storedProgress() };
    const openId = this.reader.bookId();
    const percent = this.reader.percent();
    if (openId && percent !== null) progress[openId] = percent;
    return progress;
  });

  /** Loads the library and reopens the last book read. */
  async restore(): Promise<void> {
    try {
      await this.refresh();
    } catch {
      this.toast.error('La biblioteca no está disponible en este navegador (almacenamiento bloqueado). Puedes seguir abriendo libros.');
      return;
    }
    const last = this._entries().find(e => e.id === this.prefs.lastBookId());
    if (last) await this.open(last);
  }

  async importFile(file: File): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.epub')) { this.toast.error('Solo se admiten archivos .epub'); return; }
    const id = `epub-karaoke:${file.name}:${file.size}:${file.lastModified}`;
    const existing = this._entries().find(e => e.id === id);
    const opened = await this.openFile(id, file, file.name);
    if (!opened) return;
    await this.record(id, file, file.name, opened, existing);
    if (!existing) this.toast.info(`«${opened.title}» se ha añadido a tu biblioteca`);
  }

  async open(entry: LibraryEntry): Promise<void> {
    if (entry.id === this.reader.bookId() && this.reader.loaded()) return;
    let file: Blob | undefined;
    try {
      file = await this.repo.getFile(entry.id);
      if (!file) throw new Error('el archivo ya no está en la biblioteca');
    } catch (err) {
      this.toast.error(`No se pudo abrir «${entry.title}»: ${errorMessage(err)}`);
      return;
    }
    const opened = await this.openFile(entry.id, file, entry.fileName);
    if (opened) await this.record(entry.id, file, entry.fileName, opened, entry);
  }

  /** Removes the book with its bookmarks, position and progress. */
  async remove(entry: LibraryEntry): Promise<void> {
    try {
      await this.repo.remove(entry.id);
      this.bookData.clear(entry.id);
      if (entry.id === this.prefs.lastBookId()) this.prefs.setLastBook('');
      if (entry.id === this.reader.bookId()) this.reader.close();
      await this.refresh();
      this.toast.info(`«${entry.title}» se ha quitado de la biblioteca`);
    } catch (err) {
      this.toast.error(`No se pudo quitar de la biblioteca: ${errorMessage(err)}`);
    }
  }

  private async openFile(id: string, file: Blob, fileName: string): Promise<OpenedBook | undefined> {
    try {
      const opened = await this.reader.open(id, file, fileName);
      this.prefs.setLastBook(id);
      return opened;
    } catch (err) {
      this.toast.error(`No se pudo abrir el EPUB: ${errorMessage(err)}`);
      return undefined;
    }
  }

  /** The book stays readable even if saving it to the library fails (e.g. storage quota). */
  private async record(id: string, file: Blob, fileName: string, opened: OpenedBook, existing?: LibraryEntry): Promise<void> {
    try {
      const now = Date.now();
      if (existing) {
        await this.repo.save({ ...existing, lastOpened: now });
      } else {
        const cover = await this.reader.coverImage();
        await this.repo.save({ id, title: opened.title, author: opened.author, fileName, size: file.size, addedAt: now, lastOpened: now, cover }, file);
      }
      await this.refresh();
    } catch (err) {
      this.toast.error(`Libro abierto, pero no se pudo guardar en la biblioteca: ${errorMessage(err)}`);
    }
  }

  private async refresh(): Promise<void> {
    const entries = await this.repo.list();
    const previous = this._covers();
    const covers: Record<string, string> = {};
    for (const entry of entries) covers[entry.id] = previous[entry.id] ?? (entry.cover ? URL.createObjectURL(entry.cover) : '');
    for (const [id, url] of Object.entries(previous)) if (url && covers[id] !== url) URL.revokeObjectURL(url);

    const progress: Record<string, number> = {};
    for (const entry of entries) {
      const value = this.bookData.progress(entry.id);
      if (value !== undefined) progress[entry.id] = value;
    }
    this._entries.set(entries);
    this._covers.set(covers);
    this.storedProgress.set(progress);
  }
}
