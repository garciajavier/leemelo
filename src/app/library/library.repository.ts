import { Injectable } from '@angular/core';
import { LocationsCache } from '../reader/locations-cache';

export interface LibraryEntry {
  id: string;
  title: string;
  author: string;
  fileName: string;
  size: number;
  addedAt: number;
  lastOpened: number;
  cover?: Blob;
}

const DB_NAME = 'epub-karaoke';
const DB_VERSION = 2;
// Metadata and file contents live in separate stores so listing the library never loads the EPUBs.
const META = 'books';
const FILES = 'files';
// Generated epub.js locations (JSON) per book, used for the whole-book progress percentage.
const LOCATIONS = 'locations';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
}
function completed(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(tx.error); });
}

/** EPUB library persisted in IndexedDB (localStorage is too small for book files). */
@Injectable({ providedIn: 'root' })
export class LibraryRepository implements LocationsCache {
  private db?: Promise<IDBDatabase>;

  private open(): Promise<IDBDatabase> {
    return this.db ??= new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
        if (!db.objectStoreNames.contains(LOCATIONS)) db.createObjectStore(LOCATIONS);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }).catch(err => { this.db = undefined; throw err; });
  }

  async list(): Promise<LibraryEntry[]> {
    const db = await this.open();
    const entries = await request(db.transaction(META).objectStore(META).getAll() as IDBRequest<LibraryEntry[]>);
    return entries.sort((a, b) => b.lastOpened - a.lastOpened);
  }

  async getFile(id: string): Promise<Blob | undefined> {
    const db = await this.open();
    return request(db.transaction(FILES).objectStore(FILES).get(id) as IDBRequest<Blob | undefined>);
  }

  /** Saves the metadata; the file is only written when provided (first import). */
  async save(entry: LibraryEntry, file?: Blob): Promise<void> {
    const db = await this.open();
    const tx = db.transaction([META, FILES], 'readwrite');
    tx.objectStore(META).put(entry);
    if (file) tx.objectStore(FILES).put(file, entry.id);
    await completed(tx);
    // Ask the browser not to evict the library under storage pressure (best effort).
    if (file) void navigator.storage?.persist?.().catch(() => false);
  }

  async getLocations(id: string): Promise<string | undefined> {
    const db = await this.open();
    return request(db.transaction(LOCATIONS).objectStore(LOCATIONS).get(id) as IDBRequest<string | undefined>);
  }

  async saveLocations(id: string, locations: string): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(LOCATIONS, 'readwrite');
    tx.objectStore(LOCATIONS).put(locations, id);
    await completed(tx);
  }

  async remove(id: string): Promise<void> {
    const db = await this.open();
    const tx = db.transaction([META, FILES, LOCATIONS], 'readwrite');
    tx.objectStore(META).delete(id);
    tx.objectStore(FILES).delete(id);
    tx.objectStore(LOCATIONS).delete(id);
    await completed(tx);
  }
}
