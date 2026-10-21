import { Injectable, Injector, afterNextRender, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import ePub from 'epubjs';
import { PreferencesService } from '../core/preferences/preferences.service';
import { ThemeService } from '../core/ui/theme.service';
import { BookDataRepository } from '../library/book-data.repository';
import { BookContents, ReadingSurface, SurfaceClick } from '../narration/reading-surface';
import { LOCATIONS_CACHE } from './locations-cache';
import { KARAOKE_HIGHLIGHT, READER_PALETTES, themeRules, typographyCss } from './reader-themes';
import { TocItem, flattenToc, tocIndexOf } from './toc';

export interface OpenedBook { title: string; author: string; }

/** Characters per epub.js location: lower is more precise but slower to generate. */
const CHARS_PER_LOCATION = 1600;
const SWIPE = { minDistance: 50, maxDurationMs: 600, minRatio: 1.5 } as const;
const TYPOGRAPHY_STYLE_ID = 'ek-typography';
const FONTS_LINK_ID = 'ek-reading-fonts';

/** Adapter over epub.js: rendering, navigation, themes, reading position/progress and the surface used by narration. */
@Injectable({ providedIn: 'root' })
export class ReaderService implements ReadingSurface {
  private readonly prefs = inject(PreferencesService);
  private readonly themes = inject(ThemeService);
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
  private readonly _chapterRemainingChars = signal<number | null>(null);
  private readonly _totalChars = signal<number | null>(null);

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
  /** Characters from the current page to the end of the chapter (for time estimates). */
  readonly chapterRemainingChars = this._chapterRemainingChars.asReadonly();
  /** Approximate characters left in the book; null until locations are ready. */
  readonly bookRemainingChars = computed(() => {
    const total = this._totalChars();
    const percent = this._percent();
    return total === null || percent === null ? null : Math.round(total * (1 - percent / 100));
  });

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
  private wordCfi = '';
  private sentenceCfi = '';
  private pointerMode = false;
  private touchStart?: { x: number; y: number; t: number };

  constructor() {
    effect(() => {
      const theme = this.themes.readerTheme();
      untracked(() => this.rendition?.themes.select(theme));
    });
    effect(() => {
      this.prefs.fontFamily();
      this.prefs.lineSpacing();
      untracked(() => {
        if (!this.rendition) return;
        this.interrupt(); // re-pagination invalidates the narration position
        for (const contents of this.rendition.getContents()) this.applyTypography(contents);
      });
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
    this._chapterRemainingChars.set(null);
    this._totalChars.set(null);
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

  async highlightWord(contents: BookContents, range: Range): Promise<void> {
    if (!this.rendition) return;
    const epubContents = contents as any;
    const cfi: string = epubContents.cfiFromRange(range);
    if (this.wordCfi !== this.sentenceCfi) this.removeAnnotation(this.wordCfi);
    // epub.js keys annotations by CFI and type: a one-word sentence is already marked by the sentence highlight.
    this.wordCfi = cfi === this.sentenceCfi ? '' : cfi;
    if (this.wordCfi) this.addHighlight(cfi, KARAOKE_HIGHLIGHT.word);
    // If the spoken word is in another column/page, turn to it.
    const rect = range.getBoundingClientRect();
    if (rect.left < -2 || rect.left > epubContents.window.innerWidth - 4) await this.rendition.display(cfi);
  }

  highlightSentence(contents: BookContents, range: Range): void {
    if (!this.rendition) return;
    const cfi: string = (contents as any).cfiFromRange(range);
    this.removeAnnotation(this.sentenceCfi);
    this.sentenceCfi = cfi;
    this.addHighlight(cfi, KARAOKE_HIGHLIGHT.sentence);
  }

  clearHighlight(): void {
    this.removeAnnotation(this.wordCfi);
    this.removeAnnotation(this.sentenceCfi);
    this.wordCfi = '';
    this.sentenceCfi = '';
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
    rendition.themes.select(this.themes.readerTheme());
    rendition.hooks.content.register((contents: BookContents) => {
      this.applyPointerCursor(contents);
      this.applyTypography(contents);
    });
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
    this.updateChapterRemaining();
  }

  private updateChapterRemaining(): void {
    try {
      const contents = this.visibleContents();
      const start = this.startRange();
      if (!contents || !start) { this._chapterRemainingChars.set(null); return; }
      const doc = contents.document;
      const range = doc.createRange();
      range.setStart(start.startContainer, start.startOffset);
      range.setEnd(doc.body, doc.body.childNodes.length);
      this._chapterRemainingChars.set(range.toString().replace(/\s+/g, ' ').length);
    } catch {
      this._chapterRemainingChars.set(null);
    }
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
      if (book !== this.book) return;
      this._totalChars.set(book.locations.length() * CHARS_PER_LOCATION);
      this.updatePercent(this.rendition?.currentLocation());
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

  /** User font and line spacing, injected into each section (webfonts come from our own origin). */
  private applyTypography(contents: BookContents): void {
    const doc = contents.document;
    if (!doc.head) return;
    if (!doc.getElementById(FONTS_LINK_ID)) {
      const link = doc.createElement('link');
      link.id = FONTS_LINK_ID;
      link.rel = 'stylesheet';
      link.href = new URL('fonts/reading-fonts.css', document.baseURI).href;
      doc.head.appendChild(link);
    }
    let style = doc.getElementById(TYPOGRAPHY_STYLE_ID);
    if (!style) {
      style = doc.createElement('style');
      style.id = TYPOGRAPHY_STYLE_ID;
      doc.head.appendChild(style);
    }
    style.textContent = typographyCss(this.prefs.fontFamily(), this.prefs.lineSpacing());
  }

  private addHighlight(cfi: string, kind: { className: string; opacity: { normal: string; dark: string } }): void {
    const opacity = this.themes.readerTheme() === 'dark' ? kind.opacity.dark : kind.opacity.normal;
    this.rendition.annotations.highlight(cfi, {}, undefined, kind.className, { fill: KARAOKE_HIGHLIGHT.fill, 'fill-opacity': opacity });
  }

  private removeAnnotation(cfi: string): void {
    if (!cfi || !this.rendition) return;
    try { this.rendition.annotations.remove(cfi, 'highlight'); } catch { /* view already replaced */ }
  }

  private applyPointerCursor(contents: BookContents): void {
    contents.document.documentElement.style.cursor = this.pointerMode ? 'crosshair' : '';
  }

  private interrupt(): void { this.interrupted.next(); }

  private nextRender(): Promise<void> {
    return new Promise(resolve => afterNextRender(() => resolve(), { injector: this.injector }));
  }
}
