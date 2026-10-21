import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';
import { ToastService } from '../ui/toast.service';

const UPDATE_TOAST_MS = 15000;

/** Offers to reload when the service worker has downloaded a new version of the app. */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly updates = inject(SwUpdate);
  private readonly toast = inject(ToastService);

  constructor() {
    if (!this.updates.isEnabled) return;
    this.updates.versionUpdates
      .pipe(filter(event => event.type === 'VERSION_READY'), takeUntilDestroyed())
      .subscribe(() => this.toast.info('Hay una nueva versión de EPUB Karaoke.', {
        durationMs: UPDATE_TOAST_MS,
        action: { label: 'Actualizar', run: () => document.location.reload() },
      }));
  }
}
