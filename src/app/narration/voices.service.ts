import { Injectable, computed, inject } from '@angular/core';
import { PreferencesService } from '../core/preferences/preferences.service';
import { SPEECH_ENGINE, Voice } from './speech-engine';

const isSpanish = (voice: Voice) => voice.lang.toLowerCase().startsWith('es');
const byName = (a: Voice, b: Voice) => a.name.localeCompare(b.name);

/** Available voices, grouped for the picker, and the effective voice to use. */
@Injectable({ providedIn: 'root' })
export class VoicesService {
  private readonly engine = inject(SPEECH_ENGINE);
  private readonly prefs = inject(PreferencesService);

  readonly supported = this.engine.supported;
  readonly all = this.engine.voices;
  readonly spanish = computed(() => this.all().filter(isSpanish).sort(byName));
  readonly others = computed(() => this.all().filter(v => !isSpanish(v)).sort(byName));

  /**
   * The saved voice when this browser has it; otherwise a Spanish one. The saved preference is kept,
   * so it is used again as soon as it loads (some browsers load voices in several batches).
   */
  readonly selectedId = computed(() => {
    const voices = this.all();
    const preferred = this.prefs.voiceURI();
    if (voices.some(v => v.id === preferred)) return preferred;
    return (voices.find(isSpanish) ?? voices[0])?.id ?? '';
  });

  select(voiceId: string): void { this.prefs.setVoice(voiceId); }
}
