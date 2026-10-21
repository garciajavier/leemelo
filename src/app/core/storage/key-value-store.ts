import { InjectionToken } from '@angular/core';

/** Minimal synchronous key-value storage, so persistence can be swapped (tests, other backends). */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** localStorage can throw (private mode, quota exceeded): failures degrade to "not stored". */
class LocalStorageStore implements KeyValueStore {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  set(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* not persisted */ }
  }
  remove(key: string): void {
    try { localStorage.removeItem(key); } catch { /* no-op */ }
  }
}

export const KEY_VALUE_STORE = new InjectionToken<KeyValueStore>('KeyValueStore', {
  providedIn: 'root',
  factory: () => new LocalStorageStore(),
});

export function readJson<T>(store: KeyValueStore, key: string, fallback: T): T {
  try {
    const raw = store.get(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}
