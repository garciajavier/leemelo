import { InjectionToken, Signal } from '@angular/core';
import { WebSpeechEngine } from './web-speech-engine';

export interface Voice { id: string; name: string; lang: string; }

export interface UtteranceHandlers {
  /** Word boundary; `charIndex` is relative to the text passed to speak(). `charLength` is 0 when unknown. */
  onWord(charIndex: number, charLength: number): void;
  onEnd(): void;
  onError(error: string): void;
}

/** Text-to-speech port. The app uses the browser's Web Speech API; a cloud TTS could implement the same contract. */
export interface SpeechEngine {
  readonly supported: boolean;
  readonly voices: Signal<readonly Voice[]>;
  speak(text: string, options: { voiceId: string; rate: number }, handlers: UtteranceHandlers): void;
  pause(): void;
  resume(): void;
  /** Stops any utterance; its handlers may still fire with error 'canceled' or 'interrupted'. */
  cancel(): void;
}

export const SPEECH_ENGINE = new InjectionToken<SpeechEngine>('SpeechEngine', {
  providedIn: 'root',
  factory: () => new WebSpeechEngine(),
});
