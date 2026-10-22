import React, { useCallback, useMemo, useSyncExternalStore } from 'react';
import { Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { hapticFeedback } from '../utils/haptics';
import { isTabSwipeLocked, subscribeTabSwipeLock } from '../utils/tabSwipeLock';

/** Visible tab order, left to right, as rendered by the tab bar. */
export const SWIPE_TAB_ORDER = ['history', 'workouts', 'index', 'coach', 'body'] as const;
type SwipeTab = (typeof SWIPE_TAB_ORDER)[number];

const MIN_DISTANCE = 72;
const MIN_VELOCITY = 650;

/** Resolves the neighbouring tab for a finished horizontal swipe, or null when none applies. */
export function resolveSwipeTarget(
  current: string,
  translationX: number,
  translationY: number,
  velocityX: number,
): SwipeTab | null {
  const index = SWIPE_TAB_ORDER.indexOf(current as SwipeTab);
  if (index < 0) return null;
  if (Math.abs(translationX) < MIN_DISTANCE && Math.abs(velocityX) < MIN_VELOCITY) return null;
  if (Math.abs(translationX) < Math.abs(translationY) * 1.5) return null;
  // Finger moving left reveals the tab to the right, like a pager.
  return SWIPE_TAB_ORDER[index + (translationX < 0 ? 1 : -1)] ?? null;
}

// On web, only touch devices get the pager gesture; mouse drags keep selecting text.
const hasTouch = () => {
  if (Platform.OS !== 'web') return true;
  const web = globalThis as { ontouchstart?: unknown; navigator?: { maxTouchPoints?: number } };
  return 'ontouchstart' in web || (web.navigator?.maxTouchPoints ?? 0) > 0;
};

export function TabSwipeArea({ routeName, children }: { routeName: string; children: React.ReactNode }) {
  const router = useRouter();
  const locked = useSyncExternalStore(subscribeTabSwipeLock, isTabSwipeLocked, () => false);
  const navigateTo = useCallback(
    (target: SwipeTab) => {
      void hapticFeedback.selection();
      router.navigate(target === 'index' ? '/' : `/${target}`);
    },
    [router],
  );
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!locked && hasTouch() && SWIPE_TAB_ORDER.includes(routeName as SwipeTab))
        // Horizontal intent only: vertical scrolling fails the swipe immediately.
        .activeOffsetX([-24, 24])
        .failOffsetY([-14, 14])
        .runOnJS(true)
        .onEnd((event) => {
          const target = resolveSwipeTarget(
            routeName,
            event.translationX,
            event.translationY,
            event.velocityX,
          );
          if (target) navigateTo(target);
        }),
    [locked, navigateTo, routeName],
  );
  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1 }} collapsable={false}>
        {children}
      </View>
    </GestureDetector>
  );
}
