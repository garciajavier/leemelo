import { Injectable, signal } from '@angular/core';

export type SidebarTab = 'toc' | 'library' | 'bookmarks';

/** UI layout state shared by several components: side panel (drawer on mobile) and settings sheet. */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly _sidebarOpen = signal(false);
  private readonly _sidebarTab = signal<SidebarTab>('library');
  private readonly _settingsOpen = signal(false);

  readonly sidebarOpen = this._sidebarOpen.asReadonly();
  readonly sidebarTab = this._sidebarTab.asReadonly();
  readonly settingsOpen = this._settingsOpen.asReadonly();

  toggleSidebar(): void { this._sidebarOpen.update(open => !open); }
  closeSidebar(): void { this._sidebarOpen.set(false); }
  showTab(tab: SidebarTab): void { this._sidebarTab.set(tab); }
  openSidebar(tab: SidebarTab): void { this._sidebarTab.set(tab); this._sidebarOpen.set(true); }

  toggleSettings(): void { this._settingsOpen.update(open => !open); }
  closeSettings(): void { this._settingsOpen.set(false); }

  /** Closes the drawer and the settings sheet; returns whether anything was open. */
  closeOverlays(): boolean {
    const wasOpen = this._sidebarOpen() || this._settingsOpen();
    this._sidebarOpen.set(false);
    this._settingsOpen.set(false);
    return wasOpen;
  }
}
