import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LayoutService } from '../../core/ui/layout.service';
import { BookmarksService } from '../../library/bookmarks.service';
import { LibraryService } from '../../library/library.service';
import { FocusTrapDirective } from '../shared/focus-trap.directive';
import { BookmarksPanelComponent } from './bookmarks-panel.component';
import { LibraryPanelComponent } from './library-panel.component';
import { TocPanelComponent } from './toc-panel.component';

/** Side panel with index, library and bookmarks: drawer on phones and tablets, fixed column on desktop. */
@Component({
  selector: 'app-sidebar',
  imports: [TocPanelComponent, LibraryPanelComponent, BookmarksPanelComponent, FocusTrapDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  protected readonly layout = inject(LayoutService);
  protected readonly library = inject(LibraryService);
  protected readonly bookmarks = inject(BookmarksService);
}
