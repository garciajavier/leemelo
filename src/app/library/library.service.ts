import { Injectable, computed, inject, signal } from '@angular/core';
import { PreferencesService } from '../core/preferences/preferences.service';
import { ToastService, errorMessage } from '../core/ui/toast.service';
import { OpenedBook, ReaderService } from '../reader/reader.service';
import { BookDataRepository } from './book-data.repository';
import { CLASSICS, Classic, classicBookId, classicFileUrl } from './classics';
import { LibraryEntry, LibraryRepository } from './library.repository';

/** Time to undo removing a book before it is actually deleted. */
const UNDO_REMOVE_MS = 6000;

/** Library use cases: import, open (also bundled classics), remove with undo, and restore the last book. */
@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly repo = inject(LibraryRepository);
  private readonly bookData = inject(BookDataRepository);
  private readonly reader = inject(ReaderService);
  private readonly prefs = inject(PreferencesService);
  private readonly toast = inject(ToastService);

  private readonly stored = signal<LibraryEntry[]>([]);
  private readonly pendingRemoval = signal<ReadonlySet<string>>(new Set());
  private readonly _covers = signal<Record<string, string>>({});
  private readonly storedProgress = signal<Record<string, number>>({});
  private readonly _busy = signal(false);

  /** Most recently opened first (books pending removal are hidden). */
  readonly entries = computed(() => this.stored().filter(e => !this.pendingRemoval().has(e.id)));
  /** Bundled classics not yet in the library. */
  readonly availableClassics = computed(() => CLASSICS.filter(c => !this.entries().some(e => e.id === classicBookId(c))));
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
  /** True while a bundled classic is being downloaded. */
  readonly busy = this._busy.asReadonly();

  /** Loads the library and reopens the last book read. */
  async restore(): Promise<void> {
    try {
      await this.refresh();
    } catch {
      this.toast.error('La biblioteca no está disponible en este navegador (almacenamiento bloqueado). Puedes seguir abriendo libros.');
      return;
    }
    const last = this.entries().find(e => e.id === this.prefs.lastBookId());
    if (last) await this.open(last);
  }

  async importFile(file: File): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.epub')) { this.toast.error('Solo se admiten archivos .epub'); return; }
    await this.add(`epub-karaoke:${file.name}:${file.size}:${file.lastModified}`, file, file.name);
  }

  async openClassic(classic: Classic): Promise<void> {
    const existing = this.entries().find(e => e.id === classicBookId(classic));
    if (existing) { await this.open(existing); return; }
    this._busy.set(true);
    try {
      const response = await fetch(classicFileUrl(classic));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const file = await response.blob();
      this._busy.set(false);
      await this.add(classicBookId(classic), file, `${classic.slug}.epub`);
    } catch (err) {
      this.toast.error(`No se pudo descargar «${classic.title}»: ${errorMessage(err)}`);
    } finally {
      this._busy.set(false);
    }
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

  /** Hides the book at once and deletes it (with bookmarks, position and progress) unless the user undoes it. */
  remove(entry: LibraryEntry): void {
    this.pendingRemoval.update(ids => new Set(ids).add(entry.id));
    const wasOpen = entry.id === this.reader.bookId();
    if (wasOpen) this.reader.close();
    const commit = setTimeout(() => void this.commitRemoval(entry), UNDO_REMOVE_MS);
    this.toast.info(`«${entry.title}» se ha quitado de la biblioteca`, {
      durationMs: UNDO_REMOVE_MS,
      action: {
        label: 'Deshacer',
        run: () => {
          clearTimeout(commit);
          this.unhide(entry.id);
          if (wasOpen) void this.open(entry);
        },
      },
    });
  }

  private async add(id: string, file: Blob, fileName: string): Promise<void> {
    const existing = this.stored().find(e => e.id === id);
    if (existing) this.unhide(id);
    const opened = await this.openFile(id, file, fileName);
    if (!opened) return;
    await this.record(id, file, fileName, opened, existing);
    if (!existing) this.toast.info(`«${opened.title}» se ha añadido a tu biblioteca`);
  }

  private async commitRemoval(entry: LibraryEntry): Promise<void> {
    try {
      await this.repo.remove(entry.id);
      this.bookData.clear(entry.id);
      if (entry.id === this.prefs.lastBookId()) this.prefs.setLastBook('');
      await this.refresh();
    } catch (err) {
      this.toast.error(`No se pudo quitar de la biblioteca: ${errorMessage(err)}`);
    } finally {
      this.unhide(entry.id);
    }
  }

  private unhide(id: string): void {
    this.pendingRemoval.update(ids => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
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
    this.stored.set(entries);
    this._covers.set(covers);
    this.storedProgress.set(progress);
  }
}
