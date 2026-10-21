import { ChangeDetectionStrategy, Component } from '@angular/core';
import { APP_INFO } from '../../core/app-info';
import { IconComponent } from './icon.component';

/** "Buy me a coffee" link to support the project (Ko-fi). */
@Component({
  selector: 'app-support-link',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="support" [href]="app.supportUrl" target="_blank" rel="noopener" [title]="'Apoya ' + app.name + ' en Ko-fi'">
      <app-icon name="coffee" />
      <span><strong>¿Te gusta {{ app.name }}?</strong><small>Invítame a un café en Ko-fi</small></span>
    </a>`,
  styles: `
    :host { display: contents; }
    .support {
      --icon-size: 24px;
      display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 10px 12px;
      border: 1px solid var(--border); border-radius: 12px; background: var(--surface-2);
      color: var(--text); text-decoration: none; transition: background-color .15s, border-color .15s;
    }
    .support:hover { border-color: var(--accent); background: rgb(246 201 69 / 12%); }
    .support app-icon { color: var(--accent-ink); }
    .support span { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .support strong { font-size: 13px; }
    .support small { font-size: 12px; color: var(--muted); }`,
})
export class SupportLinkComponent {
  protected readonly app = APP_INFO;
}
