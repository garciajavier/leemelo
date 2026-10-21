import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject } from 'rxjs';
import { PreferencesService } from '../core/preferences/preferences.service';
import { ToastService } from '../core/ui/toast.service';
import { BookContents, READING_SURFACE, SurfaceClick } from './reading-surface';
import { SPEECH_ENGINE } from './speech-engine';
import {
  Paragraph, caretFromPoint, extractParagraphs, locateCaret, paragraphIndexOf, rangeFor, sentenceAt, sentenceStarts, wordLength,
} from './text-segmenter';
import { VoicesService } from './voices.service';

/** "Previous" restarts the current sentence unless fewer characters than this have been read. */
const RESTART_THRESHOLD_CHARS = 12;

const PREVIEW_TEXT = {
  es: 'Hola. Así sonará esta voz al leer tu libro.',
  other: 'Hello. This is how this voice will read your book.',
};

/**
 * Karaoke narration: reads the visible section sentence by sentence, highlights the sentence and each spoken
 * word, follows the text across pages and chapters, and can start from a clicked word.
 * Speaking one sentence per utterance keeps highlighting accurate even without word events, makes
 * "previous/next sentence" exact, and avoids browsers cutting long utterances.
 */
@Injectable({ providedIn: 'root' })
export class ReadAloudService {
  private readonly engine = inject(SPEECH_ENGINE);
  private readonly surface = inject(READING_SURFACE);
  private readonly voices = inject(VoicesService);
  private readonly prefs = inject(PreferencesService);
  private readonly toast = inject(ToastService);

  private readonly _playing = signal(false);
  private readonly _paused = signal(false);
  private readonly _clickToRead = signal(false);
  readonly playing = this._playing.asReadonly();
  readonly paused = this._paused.asReadonly();
  readonly clickToRead = this._clickToRead.asReadonly();
  readonly supported = this.engine.supported;

  private readonly sectionEnded = new Subject<void>();
  /** Emits when narration reaches the end of a section, before moving on; subscribers may stop it. */
  readonly sectionEnded$: Observable<void> = this.sectionEnded.asObservable();

  /** Incremented on every (re)start/stop so callbacks of stale utterances are ignored. */
  private sequence = 0;
  private contents?: BookContents;
  private paragraphs: Paragraph[] = [];
  private index = 0;
  /** Offset (in the paragraph) where the current utterance started. */
  private readOffset = 0;
  /** Paragraph offset of the last word reported by the engine. */
  private lastPosition = -1;
  private highlightedSentence = '';
  private boundaryEvents = false;
  private restartOnResume = false;

  constructor() {
    this.surface.interrupted$.pipe(takeUntilDestroyed()).subscribe(() => this.stop());
    this.surface.textClick$.pipe(takeUntilDestroyed()).subscribe(click => this.readFromClick(click));
    // Voice and rate cannot change mid-utterance: restart from the current word with the new settings.
    let first = true;
    effect(() => {
      this.voices.selectedId();
      this.prefs.rate();
      if (first) { first = false; return; }
      untracked(() => this.applySettings());
    });
  }

  toggle(): void {
    if (!this.supported) { this.toast.error('Este navegador no admite síntesis de voz.'); return; }
    if (this._paused()) {
      if (this.restartOnResume) this.restart();
      else { this.engine.resume(); this.setState(true, false); }
      return;
    }
    if (this._playing()) { this.engine.pause(); this.setState(false, true); return; }

    const contents = this.surface.visibleContents();
    if (!contents) { this.toast.error('No hay contenido visible.'); return; }
    const paragraphs = extractParagraphs(contents.document);
    if (!paragraphs.length) { this.toast.error('Este capítulo no contiene texto legible.'); return; }
    const start = this.surface.startRange();
    const index = start ? Math.max(0, paragraphIndexOf(paragraphs, start.startContainer)) : 0;
    this.boundaryEvents = false;
    this.start(contents, paragraphs, index, 0);
  }

  stop(): void {
    this.sequence++;
    this.engine.cancel();
    this.restartOnResume = false;
    this.highlightedSentence = '';
    this.setState(false, false);
    this.surface.clearHighlight();
  }

  /** Jumps to the next sentence, or restarts/goes back like the "previous track" button of a player. */
  skipSentence(direction: 1 | -1): void {
    const paragraph = this.paragraphs[this.index];
    if (!this.contents || !paragraph || (!this._playing() && !this._paused())) return;
    const starts = sentenceStarts(paragraph.text);
    const position = Math.max(this.readOffset, this.lastPosition);
    let current = 0;
    while (current + 1 < starts.length && starts[current + 1] <= position) current++;

    let target: { index: number; offset: number };
    if (direction > 0) {
      if (current + 1 < starts.length) target = { index: this.index, offset: starts[current + 1] };
      else target = { index: this.index + 1, offset: 0 }; // past the last paragraph: continues with the next section
    } else if (position - starts[current] > RESTART_THRESHOLD_CHARS) {
      target = { index: this.index, offset: starts[current] };
    } else if (current > 0) {
      target = { index: this.index, offset: starts[current - 1] };
    } else if (this.index > 0) {
      target = { index: this.index - 1, offset: sentenceStarts(this.paragraphs[this.index - 1].text).at(-1) ?? 0 };
    } else {
      target = { index: 0, offset: 0 };
    }
    this.start(this.contents, this.paragraphs, target.index, target.offset);
  }

  toggleClickToRead(): void {
    const enabled = !this._clickToRead();
    this._clickToRead.set(enabled);
    this.surface.setPointerMode(enabled);
  }

  /** Short sample with the selected voice and rate (only while not narrating). */
  previewVoice(): void {
    if (!this.supported || this._playing() || this._paused()) return;
    const voice = this.voices.selected();
    const text = voice?.lang.toLowerCase().startsWith('es') ? PREVIEW_TEXT.es : PREVIEW_TEXT.other;
    this.engine.cancel();
    this.engine.speak(text, { voiceId: this.voices.selectedId(), rate: this.prefs.rate() }, { onWord() {}, onEnd() {}, onError() {} });
  }

  private applySettings(): void {
    if (this._playing()) this.restart();
    else if (this._paused()) this.restartOnResume = true;
  }

  private restart(): void {
    // Without word events (some voices) lastPosition stays behind: restart where the utterance began.
    if (this.contents) this.start(this.contents, this.paragraphs, this.index, Math.max(this.readOffset, this.lastPosition));
  }

  private readFromClick({ contents, x, y }: SurfaceClick): void {
    if (!this._clickToRead() || !this.supported) return;
    const caret = caretFromPoint(contents.document, x, y);
    if (!caret) return;
    const paragraphs = extractParagraphs(contents.document);
    const hit = locateCaret(paragraphs, caret.node, caret.offset);
    if (hit) this.start(contents, paragraphs, hit.index, hit.offset);
  }

  private start(contents: BookContents, paragraphs: Paragraph[], index: number, offset: number): void {
    this.sequence++;
    this.engine.cancel();
    this.surface.clearHighlight();
    this.highlightedSentence = '';
    this.contents = contents;
    this.paragraphs = paragraphs;
    this.index = index;
    this.lastPosition = -1;
    this.restartOnResume = false;
    this.setState(true, false);
    this.speak(this.sequence, offset);
  }

  private speak(token: number, offset = 0): void {
    if (token !== this.sequence || !this._playing()) return;
    const paragraph = this.paragraphs[this.index];
    if (!paragraph) { void this.continueWithNextSection(token); return; }
    if (offset >= paragraph.text.length) { this.index++; this.speak(token); return; }
    const contents = this.contents!;
    const sentence = sentenceAt(paragraph.text, offset);
    this.readOffset = offset;
    this.showSentence(contents, paragraph, sentence);
    // Without word events, highlight the first word so the page still follows the narration.
    if (!this.boundaryEvents) void this.highlightWord(contents, paragraph, offset, offset + (wordLength(paragraph.text, offset) || 1), token);

    this.engine.speak(paragraph.text.slice(offset, sentence.end), { voiceId: this.voices.selectedId(), rate: this.prefs.rate() }, {
      onWord: (charIndex, charLength) => {
        if (token !== this.sequence) return;
        this.boundaryEvents = true;
        const start = charIndex + offset;
        if (start === this.lastPosition) return;
        this.lastPosition = start;
        const length = charLength || wordLength(paragraph.text, start) || 1;
        void this.highlightWord(contents, paragraph, start, Math.min(start + length, paragraph.text.length), token);
      },
      onEnd: () => {
        if (token !== this.sequence) return;
        this.lastPosition = -1;
        if (sentence.end < paragraph.text.length) { this.speak(token, sentence.end); return; }
        this.index++;
        this.speak(token);
      },
      onError: error => {
        if (token !== this.sequence) return;
        this.stop();
        if (error !== 'canceled' && error !== 'interrupted') this.toast.error(`Error de narración: ${error}`);
      },
    });
  }

  private showSentence(contents: BookContents, paragraph: Paragraph, sentence: { start: number; end: number }): void {
    const key = `${this.index}:${sentence.start}`;
    if (key === this.highlightedSentence) return;
    this.highlightedSentence = key;
    const end = sentence.start + paragraph.text.slice(sentence.start, sentence.end).trimEnd().length;
    try {
      const range = rangeFor(contents.document, paragraph, sentence.start, end);
      if (range) this.surface.highlightSentence(contents, range);
    } catch { /* the DOM can be replaced during pagination */ }
  }

  private async highlightWord(contents: BookContents, paragraph: Paragraph, start: number, end: number, token: number): Promise<void> {
    try {
      const range = rangeFor(contents.document, paragraph, start, end);
      if (range && token === this.sequence) await this.surface.highlightWord(contents, range);
    } catch { /* the DOM can be replaced during pagination; the next word retries */ }
  }

  private async continueWithNextSection(token: number): Promise<void> {
    this.sectionEnded.next(); // e.g. the sleep timer may stop narration at the end of the chapter
    if (token !== this.sequence) return;
    this.surface.clearHighlight();
    this.highlightedSentence = '';
    try {
      const next = await this.surface.showNextSection(this.contents!);
      if (token !== this.sequence) return;
      if (!next) { this.stop(); this.toast.info('Has llegado al final del libro.'); return; }
      const paragraphs = extractParagraphs(next.document);
      if (!paragraphs.length) { this.stop(); this.toast.info('Este capítulo no tiene texto que narrar.'); return; }
      this.contents = next;
      this.paragraphs = paragraphs;
      this.index = 0;
      this.speak(token);
    } catch {
      this.stop();
      this.toast.error('No se pudo avanzar al siguiente capítulo.');
    }
  }

  private setState(playing: boolean, paused: boolean): void {
    this._playing.set(playing);
    this._paused.set(paused);
  }
}
