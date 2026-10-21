import { Injectable, signal } from '@angular/core';
import { mediaQuerySignal } from './media-query';

export type SidebarTab = 'toc' | 'library' | 'bookmarks';

/** UI layout state shared by several components: side panel (drawer below desktop) and settings sheet. */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly _sidebarOpen = signal(false);
  private readonly _sidebarTab = signal<SidebarTab>('library');
  private readonly _settingsOpen = signal(false);

  readonly sidebarOpen = this._sidebarOpen.asReadonly();
  readonly sidebarTab = this._sidebarTab.asReadonly();
  readonly settingsOpen = this._settingsOpen.asReadonly();
  /** On desktop the side panel is a fixed column instead of a drawer (same breakpoint as the CSS). */
  readonly isDesktop = mediaQuerySignal('(min-width: 1024px)');
  readonly isTouch = mediaQuerySignal('(pointer: coarse)');

  toggleSidebar(): void { this._sidebarOpen.update(open => !open); }
  closeSidebar(): void { this._sidebarOpen.set(false); }
  showTab(tab: SidebarTab): void { this._sidebarTab.set(tab); }
  openSidebar(tab: SidebarTab): void { this._sidebarTab.set(tab); this._sidebarOpen.set(true); }

  toggleSettings(): void { this._settingsOpen.update(open => !open); }
  openSettings(): void { this._settingsOpen.set(true); }
  closeSettings(): void { this._settingsOpen.set(false); }

  /** Closes the drawer and the settings sheet; returns whether anything was open. */
  closeOverlays(): boolean {
    const wasOpen = (this._sidebarOpen() && !this.isDesktop()) || this._settingsOpen();
    this._sidebarOpen.set(false);
    this._settingsOpen.set(false);
    return wasOpen;
  }
}
