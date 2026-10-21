/** Average characters spoken per second at 1× by browser voices (~170 words per minute). */
const CHARS_PER_SECOND = 15;

export function estimateSeconds(chars: number, rate: number): number {
  return chars / (CHARS_PER_SECOND * rate);
}

/** "~12 min", "~2 h 05 min", "<1 min". */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `~${hours} h ${String(minutes % 60).padStart(2, '0')} min`;
}
