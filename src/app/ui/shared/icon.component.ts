import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** 24×24 icon set. Adding an icon only means adding an entry here. */
const ICONS = {
  menu: { d: 'M4 7h16M4 12h16M4 17h10' },
  upload: { d: 'M12 15V4M7.5 8.5 12 4l4.5 4.5M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3' },
  trash: { d: 'M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3' },
  bookmark: { d: 'M6 4h12v17l-6-4-6 4z' },
  close: { d: 'M6 6l12 12M18 6 6 18' },
  list: { d: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01' },
  'chevron-left': { d: 'M15 18l-6-6 6-6' },
  'chevron-right': { d: 'M9 18l6-6-6-6' },
  crosshair: { d: 'M5.5 12a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4' },
  mic: { d: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21' },
  'skip-back': { d: 'M6 5.5v13M18.5 6 9.5 12l9 6z' },
  'skip-forward': { d: 'M18 5.5v13M5.5 6l9 6-9 6z' },
  moon: { d: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z' },
  coffee: { d: 'M4.5 9.5h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM15.5 10.5h1.25a2.5 2.5 0 0 1 0 5H15M8 3.5c-.6.9.6 1.6 0 2.5M11.5 3.5c-.6.9.6 1.6 0 2.5' },
  volume: { d: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11' },
  play: { d: 'M8 5.5v13l11-6.5z', fill: true },
  pause: {
    d: 'M7.7 5h1.6a1.2 1.2 0 0 1 1.2 1.2v11.6a1.2 1.2 0 0 1-1.2 1.2H7.7a1.2 1.2 0 0 1-1.2-1.2V6.2A1.2 1.2 0 0 1 7.7 5z'
      + 'M14.7 5h1.6a1.2 1.2 0 0 1 1.2 1.2v11.6a1.2 1.2 0 0 1-1.2 1.2h-1.6a1.2 1.2 0 0 1-1.2-1.2V6.2A1.2 1.2 0 0 1 14.7 5z',
    fill: true,
  },
  stop: { d: 'M8.5 6.5h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z', fill: true },
} satisfies Record<string, { d: string; fill?: boolean }>;

export type IconName = keyof typeof ICONS;

/** Sized with the --icon-size custom property (default 22px); stroke/fill follow currentColor. */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg class="i" [class.fill]="filled()" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path [attr.d]="path()" /></svg>`,
  styles: `:host { display: contents; }`,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  protected readonly path = computed(() => ICONS[this.name()].d);
  protected readonly filled = computed(() => 'fill' in ICONS[this.name()]);
}
