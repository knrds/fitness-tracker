import { resolveSwipeTarget, SWIPE_TAB_ORDER } from '../TabSwipeArea';
import { isTabSwipeLocked, lockTabSwipe } from '../../utils/tabSwipeLock';

describe('tab swipe navigation', () => {
  it('pages to the visible neighbour like a pager', () => {
    expect(SWIPE_TAB_ORDER).toEqual(['history', 'workouts', 'index', 'coach', 'body']);
    expect(resolveSwipeTarget('index', -120, 4, -200)).toBe('coach');
    expect(resolveSwipeTarget('index', 120, 4, 200)).toBe('workouts');
    expect(resolveSwipeTarget('workouts', 90, 0, 0)).toBe('history');
  });

  it('ignores short, vertical, edge and hidden-route swipes', () => {
    expect(resolveSwipeTarget('index', -30, 0, -100)).toBeNull();
    expect(resolveSwipeTarget('index', -100, 90, -100)).toBeNull();
    expect(resolveSwipeTarget('history', 120, 0, 0)).toBeNull();
    expect(resolveSwipeTarget('body', -120, 0, 0)).toBeNull();
    expect(resolveSwipeTarget('programs', -120, 0, 0)).toBeNull();
  });

  it('accepts a quick flick below the distance threshold', () => {
    expect(resolveSwipeTarget('coach', -50, 2, -900)).toBe('body');
  });

  it('locks while a reorder drag is active and releases idempotently', () => {
    const release = lockTabSwipe();
    const second = lockTabSwipe();
    expect(isTabSwipeLocked()).toBe(true);
    release();
    release();
    expect(isTabSwipeLocked()).toBe(true);
    second();
    expect(isTabSwipeLocked()).toBe(false);
  });
});
