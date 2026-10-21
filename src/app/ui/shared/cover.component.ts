import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Book cover, or the title's initials when the EPUB has no cover image. */
@Component({
  selector: 'app-cover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="cover" [class.sm]="size() === 'sm'" [class.lg]="size() === 'lg'">
      @if (src()) { <img [src]="src()" alt=""> } @else { <span class="cover-fallback">{{ initials() }}</span> }
    </span>`,
  styles: `:host { display: contents; }`,
})
export class CoverComponent {
  readonly src = input<string | undefined>('');
  readonly title = input('');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  protected readonly initials = computed(() =>
    this.title().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '—');
}
