import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LayoutService } from '../../core/ui/layout.service';
import { ReaderService } from '../../reader/reader.service';
import { TocItem } from '../../reader/toc';

/** Table of contents with "you are here" and whole-book progress (with a slider to jump). */
@Component({
  selector: 'app-toc-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (reader.loaded()) {
      <div class="progress-card">
        <div class="progress-top">
          <span class="overline">Progreso del libro</span>
          <strong>{{ reader.percent() === null ? 'Calculando…' : reader.percent() + ' %' }}</strong>
        </div>
        <input class="seek" type="range" min="0" max="100" step="1" [value]="reader.percent() ?? 0" [disabled]="reader.percent() === null"
               (change)="seek($event)" aria-label="Ir a otro punto del libro">
        <small>{{ reader.chapter() || reader.title() }}{{ reader.page() ? ' · ' + reader.page() : '' }}</small>
      </div>
      @if (!reader.toc().length) { <p class="empty-note">Este libro no incluye índice.</p> }
      @for (item of reader.toc(); track $index) {
        <button class="toc-item" [class.current]="$index === reader.tocIndex()" [style.padding-left.px]="14 + item.depth * 16"
                [attr.aria-current]="$index === reader.tocIndex() ? 'location' : null" (click)="go(item)">
          <span class="toc-label">{{ item.label }}</span>
          @if ($index === reader.tocIndex()) { <span class="here">Estás aquí</span> }
        </button>
      }
    } @else {
      <p class="empty-note">Abre un libro para ver su índice.</p>
    }`,
  styles: `
    :host { display: contents; }
    .progress-card { margin-bottom: 10px; padding: 12px 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface-2); }
    .progress-top { display: flex; align-items: baseline; justify-content: space-between; }
    .progress-top .overline { margin: 0; }
    .progress-top strong { font-size: 18px; font-variant-numeric: tabular-nums; }
    .seek { width: 100%; height: 28px; margin: 6px 0 2px; accent-color: var(--brand); }
    .progress-card small { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 12px; color: var(--muted); }
    .toc-item {
      position: relative; display: flex; align-items: center; gap: 8px; flex: none;
      width: 100%; min-height: 44px; padding: 8px 12px; border: 0; border-radius: 10px;
      background: transparent; color: var(--text); font-size: 14px; line-height: 1.35; text-align: left;
    }
    .toc-item:hover { background: var(--surface-2); }
    .toc-item.current { background: var(--brand-soft); font-weight: 600; }
    .toc-item.current::before { content: ''; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 2px; background: var(--accent); }
    .toc-label { flex: 1; min-width: 0; }
    .here { flex: none; padding: 2px 8px; border-radius: 10px; background: rgb(246 201 69 / 20%); color: var(--accent-ink); font-size: 11px; font-weight: 700; }`,
})
export class TocPanelComponent {
  protected readonly reader = inject(ReaderService);
  private readonly layout = inject(LayoutService);

  protected go(item: TocItem): void {
    this.layout.closeSidebar();
    void this.reader.goToTocItem(item);
  }

  protected seek(event: Event): void {
    void this.reader.seekPercent((event.target as HTMLInputElement).valueAsNumber);
  }
}
