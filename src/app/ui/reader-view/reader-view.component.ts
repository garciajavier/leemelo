import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { LayoutService } from '../../core/ui/layout.service';
import { ThemeService } from '../../core/ui/theme.service';
import { BookmarksService } from '../../library/bookmarks.service';
import { SAMPLE_CLASSIC, classicCoverUrl } from '../../library/classics';
import { LibraryService } from '../../library/library.service';
import { ReaderService } from '../../reader/reader.service';
import { CoverComponent } from '../shared/cover.component';
import { IconComponent } from '../shared/icon.component';
import { ImportButtonComponent } from '../shared/import-button.component';

/** The page: chapter header, progress, the epub.js viewer, edge tap zones, and the empty/loading states. */
@Component({
  selector: 'app-reader-view',
  imports: [CoverComponent, IconComponent, ImportButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reader-view.component.html',
  styleUrl: './reader-view.component.css',
})
export class ReaderViewComponent implements AfterViewInit {
  protected readonly reader = inject(ReaderService);
  protected readonly library = inject(LibraryService);
  protected readonly bookmarks = inject(BookmarksService);
  protected readonly layout = inject(LayoutService);
  protected readonly themes = inject(ThemeService);
  protected readonly sample = SAMPLE_CLASSIC;
  protected readonly coverUrl = classicCoverUrl;
  private readonly viewer = viewChild.required<ElementRef<HTMLElement>>('viewer');

  ngAfterViewInit(): void {
    this.reader.attach(this.viewer().nativeElement);
  }
}
