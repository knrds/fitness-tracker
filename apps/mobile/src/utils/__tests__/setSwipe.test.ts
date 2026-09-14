import {
  SET_DELETE_WIDTH,
  setSwipeOffset,
  shouldCaptureSetSwipe,
  shouldDeleteSetSwipe,
  shouldOpenSetSwipe,
} from '../setSwipe';

it('keeps horizontal reveals separate from vertical scrolling and taps', () => {
  expect(shouldCaptureSetSwipe(-8, 0, false)).toBe(false);
  expect(shouldCaptureSetSwipe(-20, 30, false)).toBe(false);
  expect(shouldCaptureSetSwipe(-20, 20, false)).toBe(false);
  expect(shouldCaptureSetSwipe(30, 0, false)).toBe(false);
  expect(shouldCaptureSetSwipe(-30, 3, false)).toBe(true);
  expect(shouldCaptureSetSwipe(30, 3, true)).toBe(true);
});
it('never exposes a gap beyond the anchored delete action', () => {
  expect(setSwipeOffset(-500, false)).toBe(-SET_DELETE_WIDTH);
  expect(setSwipeOffset(500, false)).toBe(0);
  expect(setSwipeOffset(-30, false)).toBe(-30);
  expect(setSwipeOffset(30, true)).toBe(-58);
  expect(setSwipeOffset(500, true)).toBe(0);
});
it('chooses the reveal snap independently of the full-swipe decision', () => {
  expect(shouldOpenSetSwipe(-20, 0, false)).toBe(false);
  expect(shouldOpenSetSwipe(-50, 0, false)).toBe(true);
  expect(shouldOpenSetSwipe(-500, -2, false)).toBe(true);
  expect(shouldOpenSetSwipe(-20, -0.5, false)).toBe(true);
  expect(shouldOpenSetSwipe(55, 0, true)).toBe(false);
  expect(shouldOpenSetSwipe(20, 0.5, true)).toBe(false);
  expect(shouldOpenSetSwipe(5, 0, true)).toBe(true);
});

it('deletes only after deliberate full travel relative to row width', () => {
  expect(shouldDeleteSetSwipe(-90, false, 320)).toBe(false);
  expect(shouldDeleteSetSwipe(-223, false, 320)).toBe(false);
  expect(shouldDeleteSetSwipe(-224, false, 320)).toBe(true);
  expect(shouldDeleteSetSwipe(-500, false, 320)).toBe(true);
  expect(shouldDeleteSetSwipe(-224, false, 600)).toBe(false);
  expect(shouldDeleteSetSwipe(-420, false, 600)).toBe(true);
  expect(shouldDeleteSetSwipe(-136, true, 320)).toBe(true);
  expect(shouldDeleteSetSwipe(40, true, 320)).toBe(false);
  expect(shouldDeleteSetSwipe(-500, false, 0)).toBe(false);
  expect(setSwipeOffset(-250, false, 320)).toBe(-250);
  expect(setSwipeOffset(-500, false, 320)).toBe(-320);
});
