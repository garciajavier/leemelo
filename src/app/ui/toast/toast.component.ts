import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/ui/toast.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-toast',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (toast.current(); as current) {
      <div class="toast" [class.error]="current.kind === 'error'" role="status" aria-live="polite">
        <span>{{ current.text }}</span>
        <button class="icon-btn subtle" (click)="toast.dismiss()" aria-label="Cerrar aviso"><app-icon name="close" /></button>
      </div>
    }`,
  styles: `
    :host { display: contents; }
    .toast {
      position: fixed; z-index: 70; left: 12px; right: 12px; bottom: calc(84px + var(--safe-b));
      display: flex; align-items: center; gap: 6px; padding: 6px 6px 6px 16px;
      border-radius: 14px; background: #1d2b45; color: #fff; box-shadow: var(--shadow);
      font-size: 14px; line-height: 1.4; animation: toast-in .2s ease;
    }
    .toast span { flex: 1; }
    .toast .icon-btn { color: rgb(255 255 255 / 70%); }
    .toast .icon-btn:hover { background: rgb(255 255 255 / 10%); }
    .toast.error { background: #a5352e; }
    :host-context(.app[data-theme='dark']) .toast:not(.error) { background: #2a3550; }
    @keyframes toast-in { from { opacity: 0; translate: 0 8px; } }
    @media (min-width: 600px) {
      .toast { left: 50%; right: auto; width: max-content; max-width: 480px; translate: -50% 0; animation-name: toast-in-centered; }
      @keyframes toast-in-centered { from { opacity: 0; translate: -50% 8px; } }
    }`,
})
export class ToastComponent {
  protected readonly toast = inject(ToastService);
}
