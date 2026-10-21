import { DestroyRef, Directive, ElementRef, booleanAttribute, effect, inject, input, untracked } from '@angular/core';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps keyboard focus inside a panel while it is active (drawer, sheet) and gives it back to the
 * element that had it when the panel closes.
 */
@Directive({
  selector: '[appFocusTrap]',
  host: { '(keydown)': 'onKeydown($event)' },
})
export class FocusTrapDirective {
  readonly active = input(true, { alias: 'appFocusTrap', transform: booleanAttribute });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private returnFocus: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const active = this.active();
      untracked(() => (active ? this.activate() : this.restore()));
    });
    inject(DestroyRef).onDestroy(() => this.restore());
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.active() || event.key !== 'Tab') return;
    const items = this.focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const onPanel = document.activeElement === this.host.nativeElement;
    if (event.shiftKey && (document.activeElement === first || onPanel)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  /** Focuses the panel itself (like a dialog): no focus ring on touch, and Tab moves into its controls. */
  private activate(): void {
    this.returnFocus = document.activeElement as HTMLElement | null;
    const panel = this.host.nativeElement;
    if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
    setTimeout(() => panel.focus()); // after the panel has been rendered
  }

  private restore(): void {
    if (this.returnFocus?.isConnected) this.returnFocus.focus();
    this.returnFocus = null;
  }

  private focusables(): HTMLElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.getClientRects().length > 0);
  }
}
