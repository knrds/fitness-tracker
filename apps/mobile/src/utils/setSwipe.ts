export const SET_DELETE_WIDTH = 88;

export function shouldCaptureSetSwipe(dx: number, dy: number, open: boolean) {
  return Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5 && (open || dx < 0);
}

export function setSwipeOffset(dx: number, open: boolean, width = SET_DELETE_WIDTH) {
  return Math.max(-width, Math.min(0, dx - (open ? SET_DELETE_WIDTH : 0)));
}

/** Short swipes reveal the action; full swipes are evaluated separately on release. */
export function shouldOpenSetSwipe(dx: number, vx: number, open: boolean) {
  if (open && dx > 12 && vx > 0.3) return false;
  if (!open && dx < -12 && vx < -0.3) return true;
  return setSwipeOffset(dx, open) < -SET_DELETE_WIDTH / 2;
}

/** Require deliberate travel, never velocity alone, to delete on release. */
export function shouldDeleteSetSwipe(dx: number, open: boolean, width: number) {
  return (
    width > 0 &&
    dx < -12 &&
    -setSwipeOffset(dx, open, width) >= Math.max(SET_DELETE_WIDTH * 1.5, width * 0.7)
  );
}
