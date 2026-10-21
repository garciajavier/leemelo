import { DestroyRef, Signal, inject, signal } from '@angular/core';

/** Signal that tracks a CSS media query. Must be called in an injection context. */
export function mediaQuerySignal(query: string): Signal<boolean> {
  if (typeof window === 'undefined' || !window.matchMedia) return signal(false).asReadonly();
  const list = window.matchMedia(query);
  const matches = signal(list.matches);
  const listener = (event: MediaQueryListEvent) => matches.set(event.matches);
  list.addEventListener('change', listener);
  inject(DestroyRef).onDestroy(() => list.removeEventListener('change', listener));
  return matches.asReadonly();
}
