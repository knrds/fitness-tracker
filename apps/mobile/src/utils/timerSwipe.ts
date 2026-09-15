/**
 * Helper logic for vertical swipe detection on the Rest Timer panel.
 * Defines direction, threshold, and velocity guards to guarantee that:
 * - Collapsed timer expands ONLY on deliberate upward swipe
 * - Expanded timer collapses ONLY on deliberate downward swipe
 * - Normal taps and small finger movements are ignored
 * - Primarily horizontal gestures are ignored
 */

export const TIMER_SWIPE_MIN_DISTANCE = 16;
export const TIMER_SWIPE_RELEASE_THRESHOLD = 20;

export function shouldCaptureTimerSwipe(
  dx: number,
  dy: number,
  expanded: boolean,
): boolean {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Must be primarily vertical
  if (absDx >= absDy) return false;

  // Must exceed minimum movement threshold to avoid intercepting normal taps
  if (absDy < TIMER_SWIPE_MIN_DISTANCE) return false;

  // When collapsed, only swipe up (< -16) should be captured
  if (!expanded && dy < -TIMER_SWIPE_MIN_DISTANCE) {
    return true;
  }

  // When expanded, only swipe down (> 16) should be captured
  if (expanded && dy > TIMER_SWIPE_MIN_DISTANCE) {
    return true;
  }

  return false;
}

export function shouldTriggerTimerAction(
  dx: number,
  dy: number,
  expanded: boolean,
  vy: number = 0,
): 'expand' | 'collapse' | null {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Reject horizontal gestures
  if (absDx >= absDy) return null;

  const isFlickUp = dy < -15 && vy < -0.3;
  const isFlickDown = dy > 15 && vy > 0.3;

  if (!expanded && (dy <= -TIMER_SWIPE_RELEASE_THRESHOLD || isFlickUp)) {
    return 'expand';
  }

  if (expanded && (dy >= TIMER_SWIPE_RELEASE_THRESHOLD || isFlickDown)) {
    return 'collapse';
  }

  return null;
}
