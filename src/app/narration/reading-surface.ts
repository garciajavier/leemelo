import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

/** Opaque handle to one rendered section of the book. */
export interface BookContents { readonly document: Document; }

export interface SurfaceClick { contents: BookContents; x: number; y: number; }

/**
 * What narration needs from the reader. Defined here, on the narration side, and implemented by the reader:
 * narration never depends on epub.js.
 */
export interface ReadingSurface {
  /** Emits when the user changes what is shown (page turn, jump, new book, layout change): narration must stop. */
  readonly interrupted$: Observable<void>;
  readonly textClick$: Observable<SurfaceClick>;
  visibleContents(): BookContents | undefined;
  /** DOM range at the start of the current page, if known. */
  startRange(): Range | null;
  /** Marks the word being read (strong highlight) and turns the page if it is not visible. */
  highlightWord(contents: BookContents, range: Range): Promise<void>;
  /** Marks the sentence being read (soft highlight). */
  highlightSentence(contents: BookContents, range: Range): void;
  clearHighlight(): void;
  /** Displays the section after `contents`; resolves undefined at the end of the book. */
  showNextSection(contents: BookContents): Promise<BookContents | undefined>;
  setPointerMode(enabled: boolean): void;
}

export const READING_SURFACE = new InjectionToken<ReadingSurface>('ReadingSurface');
