import { Injectable, Injector, afterNextRender, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import ePub from 'epubjs';
import { PreferencesService } from '../core/preferences/preferences.service';
import { BookDataRepository } from '../library/book-data.repository';
import { BookContents, ReadingSurface, SurfaceClick } from '../narration/reading-surface';
import { LOCATIONS_CACHE } from './locations-cache';
import { KARAOKE_HIGHLIGHT, READER_PALETTES, themeRules } from './reader-themes';
import { TocItem, flattenToc, tocIndexOf } from './toc';

export interface OpenedBook { title: string; author: string; }

/** Characters per epub.js location: lower is more precise but slower to generate. */
const CHARS_PER_LOCATION = 1600;
const SWIPE = { minDistance: 50, maxDurationMs: 600, minRatio: 1.5 } as const;

/** Adapter over epub.js: rendering, navigation, themes, reading position/progress and the surface used by narration. */
@Injectable({ providedIn: 'root' })
export class ReaderService implements ReadingSurface {
  private readonly prefs = inject(PreferencesService);
  private readonly bookData = inject(BookDataRepository);
  private readonly locationsCache = inject(LOCATIONS_CACHE);
  private readonly injector = inject(Injector);

  private readonly _bookId = signal('');
  private readonly _title = signal('');
  private readonly _loaded = signal(false);
  private readonly _loading = signal(false);
  private readonly _page = signal('');
  private readonly _percent = signal<number | null>(null);
  private readonly _toc = signal<TocItem[]>([]);
  private readonly _tocIndex = signal(-1);
  private readonly _cfi = signal('');

  readonly bookId = this._bookId.asReadonly();
  readonly title = this._title.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly loading = this._loading.asReadonly();
  /** Page within the current chapter, e.g. "Pág. 2 de 6". */
  readonly page = this._page.asReadonly();
  /** Whole-book progress 0–100; null while locations are being generated. */
  readonly percent = this._percent.asReadonly();
  readonly toc = this._toc.asReadonly();
  readonly tocIndex = this._tocIndex.asReadonly();
  readonly cfi = this._cfi.asReadonly();
  readonly chapter = computed(() => this._toc()[this._tocIndex()]?.label ?? '');

  private readonly interrupted = new Subject<void>();
  private readonly textClicks = new Subject<SurfaceClick>();
  private readonly keys = new Subject<KeyboardEvent>();
  readonly interrupted$: Observable<void> = this.interrupted.asObservable();
  readonly textClick$: Observable<SurfaceClick> = this.textClicks.asObservable();
  /** Key presses inside the book iframe (they do not reach the app document). */
  readonly keydown$: Observable<KeyboardEvent> = this.keys.asObservable();

  private book: any;
  private rendition: any;
  private resolveHost!: (host: HTMLElement) => void;
  private readonly host = new Promise<HTMLElement>(resolve => this.resolveHost = resolve);
  private highlightedCfi = '';
  private pointerMode = false;
  private touchStart?: { x: number; y: number; t: number };

  constructor() {
    effect(() => {
      const theme = this.prefs.theme();
      untracked(() => this.rendition?.themes.select(theme));
    });
    effect(() => {
      const size = this.prefs.fontSize();
      untracked(() => {
        if (!this.rendition) return;
        this.interrupt(); // re-pagination invalidates the narration position
        this.rendition.themes.fontSize(`${size}%`);
      });
    });
  }

  /** The element epub.js renders into; opening a book waits until the view provides it. */
  attach(host: HTMLElement): void { this.resolveHost(host); }

  async open(id: string, file: Blob, fileName: string): Promise<OpenedBook> {
    this.close();
    this._loading.set(true);
    try {
      const host = await this.host;
      const book = ePub(await file.arrayBuffer());
      this.book = book;
      await book.ready;
      const metadata = book.packaging?.metadata;
      const opened: OpenedBook = { title: metadata?.title || fileName.replace(/\.epub$/i, ''), author: metadata?.creator || '' };
      this._bookId.set(id);
      this._title.set(opened.title);
      this._toc.set(flattenToc(book.navigation?.toc ?? []));
      this._loaded.set(true);
      await this.nextRender(); // the reader header must be laid out before epub.js measures the page
      this.rendition = book.renderTo(host, { width: '100%', height: '100%', flow: 'paginated', spread: 'none', manager: 'default' });
      this.configure(this.rendition);
      await this.rendition.display(this.bookData.position(id) || undefined);
      void this.loadLocations(id, book);
      return opened;
    } catch (err) {
      this.close();
      throw err;
    } finally {
      this._loading.set(false);
    }
  }

  close(): void {
    this.interrupt();
    this.clearHighlight();
    try { this.rendition?.destroy(); } catch { /* already gone */ }
    try { this.book?.destroy(); } catch { /* already gone */ }
    this.book = undefined;
    this.rendition = undefined;
    this._bookId.set('');
    this._title.set('');
    this._loaded.set(false);
    this._page.set('');
    this._percent.set(null);
    this._toc.set([]);
    this._tocIndex.set(-1);
    this._cfi.set('');
  }

  async coverImage(): Promise<Blob | undefined> {
    try {
      const url: string | null = await this.book?.coverUrl();
      return url ? await (await fetch(url)).blob() : undefined;
    } catch {
      return undefined;
    }
  }

  // ---------- User navigation (always interrupts narration) ----------

  async next(): Promise<void> {
    if (!this.rendition) return;
    this.interrupt();
    await this.rendition.next();
  }

  async previous(): Promise<void> {
    if (!this.rendition) return;
    this.interrupt();
    await this.rendition.prev();
  }

  async goTo(cfi: string): Promise<void> {
    if (!this.rendition) return;
    this.interrupt();
    await this.rendition.display(cfi);
  }

  async goToTocItem(item: TocItem): Promise<void> {
    if (!this.rendition) return;
    this.interrupt();
    try {
      await this.rendition.display(item.href);
    } catch {
      // TOC hrefs are relative to the nav document: fall back to the spine section with the same path.
      const section = this.book.spine.spineItems.find((s: any) => s.href.endsWith(item.path) || item.path.endsWith(s.href));
      if (section) await this.rendition.display(section.href);
    }
  }

  async seekPercent(value: number): Promise<void> {
    if (!this.rendition || this._percent() === null || !Number.isFinite(value)) return;
    this.interrupt();
    await this.rendition.display(this.book.locations.cfiFromPercentage(value / 100));
  }

  // ---------- ReadingSurface (used by narration) ----------

  visibleContents(): BookContents | undefined {
    return this.rendition?.getContents()?.[0];
  }

  startRange(): Range | null {
    try { return this.rendition?.getRange(this._cfi()) ?? null; } catch { return null; }
  }

  async highlight(contents: BookContents, range: Range): Promise<void> {
    if (!this.rendition) return;
    const epubContents = contents as any;
    const cfi = epubContents.cfiFromRange(range);
    this.clearHighlight();
    this.highlightedCfi = cfi;
    const opacity = this.prefs.theme() === 'dark' ? KARAOKE_HIGHLIGHT.opacity.dark : KARAOKE_HIGHLIGHT.opacity.normal;
    this.rendition.annotations.highlight(cfi, {}, undefined, KARAOKE_HIGHLIGHT.className, { fill: KARAOKE_HIGHLIGHT.fill, 'fill-opacity': opacity });
    // If the spoken word is in another column/page, turn to it.
    const rect = range.getBoundingClientRect();
    if (rect.left < -2 || rect.left > epubContents.window.innerWidth - 4) await this.rendition.display(cfi);
  }

  clearHighlight(): void {
    if (this.highlightedCfi && this.rendition) {
      try { this.rendition.annotations.remove(this.highlightedCfi, 'highlight'); } catch { /* view already replaced */ }
    }
    this.highlightedCfi = '';
  }

  async showNextSection(contents: BookContents): Promise<BookContents | undefined> {
    // Chapter navigation by spine index, not rendition.next() (which would only turn a page).
    const next = this.book?.spine.get((contents as any).sectionIndex + 1);
    if (!next) return undefined;
    await this.rendition.display(next.href);
    return this.visibleContents();
  }

  setPointerMode(enabled: boolean): void {
    this.pointerMode = enabled;
    for (const contents of this.rendition?.getContents() ?? []) this.applyPointerCursor(contents);
  }

  // ---------- Internals ----------

  private configure(rendition: any): void {
    rendition.themes.fontSize(`${this.prefs.fontSize()}%`);
    for (const [name, palette] of Object.entries(READER_PALETTES)) rendition.themes.register(name, themeRules(palette));
    rendition.themes.select(this.prefs.theme());
    rendition.hooks.content.register((contents: BookContents) => this.applyPointerCursor(contents));
    // epub.js forwards iframe DOM events through passive listeners: they cannot be prevented.
    rendition.on('keydown', (event: KeyboardEvent) => this.keys.next(event));
    rendition.on('click', (event: MouseEvent, contents: BookContents) => this.textClicks.next({ contents, x: event.clientX, y: event.clientY }));
    rendition.on('touchstart', (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (touch) this.touchStart = { x: touch.clientX, y: touch.clientY, t: Date.now() };
    });
    rendition.on('touchend', (event: TouchEvent) => this.onSwipe(event));
    rendition.on('relocated', (location: any) => this.onRelocated(location));
  }

  private onRelocated(location: any): void {
    const cfi = location?.start?.cfi;
    if (cfi) {
      this._cfi.set(cfi);
      this.bookData.savePosition(this._bookId(), cfi);
    }
    const displayed = location?.start?.displayed;
    this._page.set(displayed ? `Pág. ${displayed.page} de ${displayed.total}` : '');
    this._tocIndex.set(tocIndexOf(this._toc(), location?.start?.href ?? ''));
    this.updatePercent(location);
  }

  /** Horizontal swipe on the page turns it (touch screens). */
  private onSwipe(event: TouchEvent): void {
    const start = this.touchStart;
    this.touchStart = undefined;
    const touch = event.changedTouches[0];
    if (!start || !touch || Date.now() - start.t > SWIPE.maxDurationMs) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE.minDistance || Math.abs(dx) < Math.abs(dy) * SWIPE.minRatio) return;
    void (dx < 0 ? this.next() : this.previous());
  }

  /** Generated once in the background, then cached; until then the % is unknown (null). */
  private async loadLocations(id: string, book: any): Promise<void> {
    try {
      const cached = await this.locationsCache.getLocations(id).catch(() => undefined);
      if (cached) {
        book.locations.load(cached);
      } else {
        await book.locations.generate(CHARS_PER_LOCATION);
        if (book !== this.book) return;
        void this.locationsCache.saveLocations(id, book.locations.save()).catch(() => undefined);
      }
      if (book === this.book) this.updatePercent(this.rendition?.currentLocation());
    } catch { /* progress is optional: the book stays readable without it */ }
  }

  private updatePercent(location: any): void {
    if (!this.book?.locations?.length()) return;
    const fraction = location?.start?.percentage;
    if (typeof fraction !== 'number') return;
    const percent = Math.round(fraction * 100);
    this._percent.set(percent);
    this.bookData.saveProgress(this._bookId(), percent);
  }

  private applyPointerCursor(contents: BookContents): void {
    contents.document.documentElement.style.cursor = this.pointerMode ? 'crosshair' : '';
  }

  private interrupt(): void { this.interrupted.next(); }

  private nextRender(): Promise<void> {
    return new Promise(resolve => afterNextRender(() => resolve(), { injector: this.injector }));
  }
}
