import { ApplicationConfig, isDevMode, provideZoneChangeDetection } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { LibraryRepository } from './library/library.repository';
import { READING_SURFACE } from './narration/reading-surface';
import { LOCATIONS_CACHE } from './reader/locations-cache';
import { ReaderService } from './reader/reader.service';

/** Wiring of abstractions to implementations (SPEECH_ENGINE and KEY_VALUE_STORE default to the browser APIs). */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: READING_SURFACE, useExisting: ReaderService },
    { provide: LOCATIONS_CACHE, useExisting: LibraryRepository },
    // Offline support and installable app (production builds only).
    provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' }),
  ],
};
