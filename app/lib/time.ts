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

function toMs(minutes: number, seconds: number, frac?: string): number {
  // ".4" is four tenths, ".45" is 45 hundredths — pad, don't parse as-is.
  const millis = frac ? parseInt(frac.padEnd(3, "0"), 10) : 0;
  return minutes * 60_000 + seconds * 1000 + millis;
}

/**
 * Parse a hand-entered time.
 *
 * Accepts an explicit "1:23.45", and — because the numeric keypad has no colon
 * — the colon-free form a scoreboard uses, where the digits left of the decimal
 * run minutes-then-seconds: "101.45" is 1:01.45, "214.88" is 2:14.88.
 *
 * One or two digits stay a plain seconds count, so "45.67" and "83.45" still
 * mean what they always did.
 *
 * Returns null if it can't be read as a time.
 */
export function parseTime(input: string): number | null {
  const text = input.trim().replace(",", ".");
  if (!text) return null;

  const withColon = /^(\d{1,3}):([0-5]?\d)(?:\.(\d{1,3}))?$/.exec(text);
  if (withColon) {
    const [, min, sec, frac] = withColon;
    return toMs(parseInt(min, 10), parseInt(sec, 10), frac);
  }

  const plain = /^(\d{1,5})(?:\.(\d{1,3}))?$/.exec(text);
  if (!plain) return null;
  const [, digits, frac] = plain;

  if (digits.length <= 2) {
    return toMs(0, parseInt(digits, 10), frac);
  }

  // Three or more digits can't be a seconds count, so the last two are the
  // seconds and whatever precedes them is minutes.
  const seconds = parseInt(digits.slice(-2), 10);
  if (seconds > 59) return null;
  return toMs(parseInt(digits.slice(0, -2), 10), seconds, frac);
}
