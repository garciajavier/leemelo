import { Injectable, inject } from '@angular/core';
import { KEY_VALUE_STORE, readJson } from '../storage/key-value-store';
import { ToastService } from './toast.service';

const HINTS_KEY = 'epub-karaoke:hints';
const HINT_DURATION_MS = 6000;
/** If another message is on screen, wait until it has been read. */
const BUSY_DELAY_MS = 4500;

/** One-time tips (first use of a feature), remembered across sessions. */
@Injectable({ providedIn: 'root' })
export class HintsService {
  private readonly store = inject(KEY_VALUE_STORE);
  private readonly toast = inject(ToastService);

  once(key: string, text: string): void {
    const seen = readJson<string[]>(this.store, HINTS_KEY, []);
    if (seen.includes(key)) return;
    this.store.set(HINTS_KEY, JSON.stringify([...seen, key]));
    const show = () => this.toast.info(text, { durationMs: HINT_DURATION_MS });
    if (this.toast.current()) setTimeout(show, BUSY_DELAY_MS);
    else show();
  }
}
