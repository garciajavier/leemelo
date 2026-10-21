import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from '../core/ui/toast.service';
import { ReadAloudService } from './read-aloud.service';

/** 'off', a number of minutes, or stop at the end of the current chapter. */
export type SleepTimerMode = 'off' | 'chapter' | number;

export const SLEEP_TIMER_OPTIONS: readonly { mode: SleepTimerMode; label: string }[] = [
  { mode: 'off', label: 'No' },
  { mode: 15, label: '15 min' },
  { mode: 30, label: '30 min' },
  { mode: 60, label: '60 min' },
  { mode: 'chapter', label: 'Fin del capítulo' },
];

const TICK_MS = 5000;

/** Stops the narration after a while or at the end of the chapter (for listening in bed). */
@Injectable({ providedIn: 'root' })
export class SleepTimerService {
  private readonly readAloud = inject(ReadAloudService);
  private readonly toast = inject(ToastService);

  private readonly _mode = signal<SleepTimerMode>('off');
  private readonly endsAt = signal<number | null>(null);
  private readonly now = signal(Date.now());
  private interval?: ReturnType<typeof setInterval>;

  readonly mode = this._mode.asReadonly();
  readonly active = computed(() => this._mode() !== 'off');
  /** Short label for the player bar: "12 min" or "Fin cap.". */
  readonly remainingLabel = computed(() => {
    const mode = this._mode();
    if (mode === 'off') return '';
    if (mode === 'chapter') return 'Fin cap.';
    const ms = (this.endsAt() ?? 0) - this.now();
    return `${Math.max(1, Math.ceil(ms / 60000))} min`;
  });

  constructor() {
    this.readAloud.sectionEnded$.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this._mode() === 'chapter') this.fire('Fin del capítulo: lectura detenida.');
    });
  }

  set(mode: SleepTimerMode): void {
    clearInterval(this.interval);
    this._mode.set(mode);
    this.endsAt.set(typeof mode === 'number' ? Date.now() + mode * 60_000 : null);
    this.now.set(Date.now());
    if (typeof mode === 'number') {
      this.interval = setInterval(() => {
        this.now.set(Date.now());
        if (Date.now() >= (this.endsAt() ?? Infinity)) this.fire('Temporizador: lectura detenida.');
      }, TICK_MS);
    }
  }

  private fire(message: string): void {
    const wasReading = this.readAloud.playing() || this.readAloud.paused();
    this.set('off');
    this.readAloud.stop();
    if (wasReading) this.toast.info(message);
  }
}
