import { ChangeDetectionStrategy, Component, HostListener, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppUpdateService } from './core/pwa/app-update.service';
import { FileLaunchService } from './core/pwa/file-launch.service';
import { HintsService } from './core/ui/hints.service';
import { LayoutService } from './core/ui/layout.service';
import { ThemeService } from './core/ui/theme.service';
import { LibraryService } from './library/library.service';
import { ReadAloudService } from './narration/read-aloud.service';
import { ReaderService } from './reader/reader.service';
import { PlayerBarComponent } from './ui/player-bar/player-bar.component';
import { ReaderViewComponent } from './ui/reader-view/reader-view.component';
import { SettingsSheetComponent } from './ui/settings-sheet/settings-sheet.component';
import { IconComponent } from './ui/shared/icon.component';
import { SidebarComponent } from './ui/sidebar/sidebar.component';
import { ToastComponent } from './ui/toast/toast.component';
import { TopBarComponent } from './ui/top-bar/top-bar.component';

/** App shell: layout, theme, drag-and-drop and "open with" import, keyboard shortcuts and first-use tips. */
@Component({
  selector: 'app-root',
  imports: [TopBarComponent, SidebarComponent, ReaderViewComponent, PlayerBarComponent, SettingsSheetComponent, ToastComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  protected readonly themes = inject(ThemeService);
  private readonly reader = inject(ReaderService);
  private readonly readAloud = inject(ReadAloudService);
  private readonly library = inject(LibraryService);
  private readonly layout = inject(LayoutService);
  private readonly hints = inject(HintsService);
  protected readonly dragging = signal(false);

  private readonly shortcuts: Record<string, () => unknown> = {
    ' ': () => this.readAloud.toggle(),
    ArrowRight: () => this.reader.next(),
    ArrowLeft: () => this.reader.previous(),
    Escape: () => this.readAloud.stop(),
  };

  constructor() {
    inject(AppUpdateService); // offers to reload when a new version is installed
    inject(FileLaunchService).listen(file => void this.library.importFile(file));
    void this.library.restore();
    this.reader.keydown$.pipe(takeUntilDestroyed()).subscribe(event => this.handleKey(event, true));
    // Opening a book shows its table of contents in the side panel.
    effect(() => {
      if (this.reader.bookId() && this.reader.toc().length) untracked(() => this.layout.showTab('toc'));
    });
    effect(() => {
      if (this.reader.loaded() && this.layout.isTouch()) {
        untracked(() => this.hints.once('swipe', 'Desliza el dedo para pasar página. Toca el título del capítulo para ver el índice.'));
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKey(event: KeyboardEvent): void {
    this.handleKey(event, false);
  }

  protected onDragOver(event: DragEvent): void {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    if (!(event.currentTarget as Node).contains(event.relatedTarget as Node | null)) this.dragging.set(false);
  }

  protected async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) await this.library.importFile(file);
  }

  /** Events from the book iframe arrive through passive listeners, so they cannot be prevented. */
  private handleKey(event: KeyboardEvent, fromBook: boolean): void {
    if (event.key === 'Escape' && this.layout.closeOverlays()) return;
    const target = event.target as HTMLElement | null;
    if (event.ctrlKey || event.metaKey || event.altKey || target?.closest?.('input,select,textarea,button,[contenteditable]')) return;
    const action = this.shortcuts[event.key];
    if (!action || !this.reader.loaded()) return;
    if (!fromBook) event.preventDefault();
    void action();
  }
}
