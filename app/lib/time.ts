/**
 * Swim times are conventionally shown to hundredths: "28.91", "1:23.45".
 */

export function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "--";
  const totalHundredths = Math.floor(ms / 10);
  const hundredths = totalHundredths % 100;
  const totalSeconds = Math.floor(totalHundredths / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const hh = String(hundredths).padStart(2, "0");
  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, "0")}.${hh}`;
  }
  return `${seconds}.${hh}`;
}

/** Same as `formatTime` but always shows m:ss so the running clock never reflows. */
export function formatClock(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalHundredths = Math.floor(ms / 10);
  const hundredths = totalHundredths % 100;
  const totalSeconds = Math.floor(totalHundredths / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(
    hundredths,
  ).padStart(2, "0")}`;
}

/**
 * Parse a hand-entered time. Accepts "1:23.45", "83.45", "83", "1:23".
 * Returns null if it can't be read as a time.
 */
export function parseTime(input: string): number | null {
  const text = input.trim();
  if (!text) return null;
  const match = /^(?:(\d+):)?(\d{1,2})(?:[.,](\d{1,3}))?$/.exec(text);
  if (!match) return null;
  const [, min, sec, frac] = match;
  const minutes = min ? parseInt(min, 10) : 0;
  const seconds = parseInt(sec, 10);
  // A bare "83.45" is fine (83 seconds), but "1:83.45" is not.
  if (min && seconds > 59) return null;
  const fraction = frac ? parseInt(frac.padEnd(3, "0"), 10) : 0;
  return minutes * 60_000 + seconds * 1000 + fraction;
}
