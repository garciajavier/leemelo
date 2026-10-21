import { InjectionToken } from '@angular/core';

/** Storage for epub.js "locations" (needed for the whole-book %), so they are generated only once per book. */
export interface LocationsCache {
  getLocations(bookId: string): Promise<string | undefined>;
  saveLocations(bookId: string, locations: string): Promise<void>;
}

export const LOCATIONS_CACHE = new InjectionToken<LocationsCache>('LocationsCache');
