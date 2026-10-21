import { Injectable } from '@angular/core';

interface LaunchParams { files: readonly FileSystemFileHandle[]; }
interface LaunchQueue { setConsumer(consumer: (params: LaunchParams) => void): void; }

/**
 * "Open with EPUB Karaoke" for the installed app (manifest `file_handlers`, Chromium desktop).
 * Not available in other browsers: listen() is then a no-op.
 */
@Injectable({ providedIn: 'root' })
export class FileLaunchService {
  listen(onFile: (file: File) => void): void {
    const launchQueue = (window as unknown as { launchQueue?: LaunchQueue }).launchQueue;
    launchQueue?.setConsumer(async params => {
      for (const handle of params.files) onFile(await handle.getFile());
    });
  }
}
