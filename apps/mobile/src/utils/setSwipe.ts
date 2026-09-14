export const SET_DELETE_WIDTH = 88;

export function shouldCaptureSetSwipe(dx: number, dy: number, open: boolean) {
  return Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5 && (open || dx < 0);
}

export function setSwipeOffset(dx: number, open: boolean) {
  return Math.max(-SET_DELETE_WIDTH, Math.min(0, dx - (open ? SET_DELETE_WIDTH : 0)));
}

/** A gesture reveals an action; only an explicit press deletes a set. */
export function shouldOpenSetSwipe(dx: number, vx: number, open: boolean) {
  if (open && dx > 12 && vx > 0.3) return false;
  if (!open && dx < -12 && vx < -0.3) return true;
  return setSwipeOffset(dx, open) < -SET_DELETE_WIDTH / 2;
}
