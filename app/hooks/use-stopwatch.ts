import { useEffect, useRef, useState } from "react";

/**
 * Elapsed milliseconds since `startedAt`, refreshed every animation frame.
 *
 * The value is always recomputed from `Date.now()` rather than accumulated, so
 * the clock stays true even if frames are dropped, the tab is backgrounded, or
 * the iPad screen locks mid-heat.
 */
export function useElapsed(startedAt: number | null): number {
  const [elapsed, setElapsed] = useState(() =>
    startedAt ? Math.max(0, Date.now() - startedAt) : 0,
  );
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (startedAt === null) {
      setElapsed(0);
      return;
    }

    const tick = () => {
      setElapsed(Math.max(0, Date.now() - startedAt));
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, [startedAt]);

  return elapsed;
}

/**
 * Hold a screen wake lock while `active`. Silently does nothing on browsers
 * without the API (notably iOS Safari before 16.4).
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        // Denied or unsupported — not worth interrupting the meet over.
      }
    };

    // The lock drops whenever the page is hidden; take it again on return.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && !released) acquire();
    };

    acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
