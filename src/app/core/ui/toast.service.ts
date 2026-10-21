import { Injectable, signal } from '@angular/core';

export interface ToastAction { label: string; run: () => void; }
export interface Toast { text: string; kind: 'info' | 'error'; action?: ToastAction; }

const INFO_DURATION_MS = 4000;

/** Transient user notifications. Errors stay until dismissed; info messages fade on their own. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _current = signal<Toast | undefined>(undefined);
  readonly current = this._current.asReadonly();
  private timer?: ReturnType<typeof setTimeout>;

  info(text: string, options: { action?: ToastAction; durationMs?: number } = {}): void {
    this.show({ text, kind: 'info', action: options.action });
    this.timer = setTimeout(() => this.dismiss(), options.durationMs ?? INFO_DURATION_MS);
  }

  error(text: string): void {
    this.show({ text, kind: 'error' });
  }

  runAction(): void {
    const action = this._current()?.action;
    this.dismiss();
    action?.run();
  }

  dismiss(): void {
    clearTimeout(this.timer);
    this._current.set(undefined);
  }

  private show(toast: Toast): void {
    clearTimeout(this.timer);
    this._current.set(toast);
  }
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
