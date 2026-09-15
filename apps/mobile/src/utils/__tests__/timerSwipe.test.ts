import {
  shouldCaptureTimerSwipe,
  shouldTriggerTimerAction,
  TIMER_SWIPE_MIN_DISTANCE,
  TIMER_SWIPE_RELEASE_THRESHOLD,
} from '../timerSwipe';

describe('timerSwipe helper', () => {
  describe('shouldCaptureTimerSwipe', () => {
    it('captures deliberate upward swipe when collapsed', () => {
      expect(shouldCaptureTimerSwipe(0, -25, false)).toBe(true);
      expect(shouldCaptureTimerSwipe(5, -30, false)).toBe(true);
    });

    it('rejects downward swipe when collapsed', () => {
      expect(shouldCaptureTimerSwipe(0, 25, false)).toBe(false);
      expect(shouldCaptureTimerSwipe(0, 50, false)).toBe(false);
    });

    it('captures deliberate downward swipe when expanded', () => {
      expect(shouldCaptureTimerSwipe(0, 25, true)).toBe(true);
      expect(shouldCaptureTimerSwipe(4, 35, true)).toBe(true);
    });

    it('rejects upward swipe when expanded', () => {
      expect(shouldCaptureTimerSwipe(0, -25, true)).toBe(false);
      expect(shouldCaptureTimerSwipe(0, -50, true)).toBe(false);
    });

    it('rejects movements smaller than minimum threshold (prevents tap interception)', () => {
      expect(shouldCaptureTimerSwipe(0, -(TIMER_SWIPE_MIN_DISTANCE - 1), false)).toBe(false);
      expect(shouldCaptureTimerSwipe(0, TIMER_SWIPE_MIN_DISTANCE - 1, true)).toBe(false);
      expect(shouldCaptureTimerSwipe(2, -8, false)).toBe(false);
      expect(shouldCaptureTimerSwipe(2, 8, true)).toBe(false);
    });

    it('rejects primarily horizontal movements', () => {
      expect(shouldCaptureTimerSwipe(30, -20, false)).toBe(false);
      expect(shouldCaptureTimerSwipe(-40, 25, true)).toBe(false);
      expect(shouldCaptureTimerSwipe(25, -25, false)).toBe(false);
    });
  });

  describe('shouldTriggerTimerAction', () => {
    it('triggers expand on sufficient upward travel when collapsed', () => {
      expect(shouldTriggerTimerAction(0, -TIMER_SWIPE_RELEASE_THRESHOLD, false)).toBe('expand');
      expect(shouldTriggerTimerAction(2, -35, false)).toBe('expand');
    });

    it('triggers expand on quick upward flick when collapsed', () => {
      expect(shouldTriggerTimerAction(0, -16, false, -0.6)).toBe('expand');
    });

    it('returns null on downward movement when collapsed', () => {
      expect(shouldTriggerTimerAction(0, 40, false)).toBeNull();
      expect(shouldTriggerTimerAction(0, 50, false, 0.8)).toBeNull();
    });

    it('triggers collapse on sufficient downward travel when expanded', () => {
      expect(shouldTriggerTimerAction(0, TIMER_SWIPE_RELEASE_THRESHOLD, true)).toBe('collapse');
      expect(shouldTriggerTimerAction(3, 40, true)).toBe('collapse');
    });

    it('triggers collapse on quick downward flick when expanded', () => {
      expect(shouldTriggerTimerAction(0, 16, true, 0.6)).toBe('collapse');
    });

    it('returns null on upward movement when expanded', () => {
      expect(shouldTriggerTimerAction(0, -40, true)).toBeNull();
      expect(shouldTriggerTimerAction(0, -50, true, -0.8)).toBeNull();
    });

    it('returns null on horizontal or minor movements', () => {
      expect(shouldTriggerTimerAction(50, -10, false)).toBeNull();
      expect(shouldTriggerTimerAction(0, -10, false)).toBeNull();
      expect(shouldTriggerTimerAction(0, 10, true)).toBeNull();
    });
  });
});
