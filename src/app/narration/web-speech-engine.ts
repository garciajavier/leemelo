import { signal } from '@angular/core';
import type { SpeechEngine, UtteranceHandlers, Voice } from './speech-engine';

/** SpeechEngine backed by the browser's Web Speech API (speechSynthesis). */
export class WebSpeechEngine implements SpeechEngine {
  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  private readonly _voices = signal<readonly Voice[]>([]);
  readonly voices = this._voices.asReadonly();
  private native = new Map<string, SpeechSynthesisVoice>();
  /** Chrome may garbage-collect a pending utterance and never fire its events: keep a reference. */
  private current?: SpeechSynthesisUtterance;

  constructor() {
    if (!this.supported) return;
    const load = () => {
      const list = speechSynthesis.getVoices();
      this.native = new Map(list.map(v => [v.voiceURI, v]));
      this._voices.set(list.map(v => ({ id: v.voiceURI, name: v.name, lang: v.lang })));
    };
    load();
    // Voices load asynchronously (and in several batches in some browsers).
    speechSynthesis.addEventListener('voiceschanged', load);
  }

  speak(text: string, options: { voiceId: string; rate: number }, handlers: UtteranceHandlers): void {
    if (!this.supported) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.native.get(options.voiceId);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? 'es-ES';
    utterance.rate = options.rate;
    utterance.onboundary = ev => { if (ev.name === 'word') handlers.onWord(ev.charIndex, ev.charLength ?? 0); };
    utterance.onend = () => handlers.onEnd();
    utterance.onerror = ev => handlers.onError(ev.error);
    this.current = utterance;
    speechSynthesis.speak(utterance);
  }

  pause(): void { if (this.supported) speechSynthesis.pause(); }
  resume(): void { if (this.supported) speechSynthesis.resume(); }

  cancel(): void {
    if (!this.supported) return;
    speechSynthesis.cancel();
    speechSynthesis.resume(); // Chrome keeps the synth paused after cancel() if it was paused.
    this.current = undefined;
  }
}
