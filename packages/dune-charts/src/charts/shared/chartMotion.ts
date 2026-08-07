/**
 * Shared chart entrance motion.
 * Duration ≤300ms UI budget; strong ease-out (animations.dev / Emil Kowalski).
 */

/** Strong ease-out for UI entrances (not the weak CSS keyword). */
export const DUNE_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

/** Chart entrance duration (ms). */
export const DUNE_DURATION = 240;

/** Matches `cubic-bezier(0.23, 1, 0.32, 1)` feel for rAF masks. */
export function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

export type EntranceHandle = {
  /** Cancel in-flight motion. Does not mark the entrance complete. */
  cancel: () => void;
};

/**
 * One-shot rAF entrance (canvas destination-in masks).
 * `draw` receives eased progress in [0, 1].
 * `onComplete` runs only when t reaches 1 — not on cancel — so React Strict Mode
 * / layout churn can retry, while a finished entrance won't replay on prop updates.
 */
export function playRafEntrance(
  draw: (easedT: number) => void,
  onComplete?: () => void,
): EntranceHandle {
  let raf = 0;
  let cancelled = false;
  const start = performance.now();

  const tick = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - start) / DUNE_DURATION);
    draw(easeOutCubic(t));
    if (t < 1) {
      raf = requestAnimationFrame(tick);
    } else {
      onComplete?.();
    }
  };

  raf = requestAnimationFrame(tick);
  return {
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    },
  };
}
