import { useCallback, useRef, type RefObject } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

type ScrollTarget = {
  scrollTo?: (options: { y: number; animated: boolean }) => void;
  scrollToOffset?: (options: { offset: number; animated: boolean }) => void;
};

/** Reset the visible tab on focus, after its native scroll surface has mounted. */
export function useFocusScroll<T extends ScrollTarget = ScrollView>(
  existing?: RefObject<T | null>,
) {
  const own = useRef<T>(null);
  const ref = existing ?? own;
  const reducedMotion = useReducedMotion();
  useFocusEffect(
    useCallback(() => {
      const frame = requestAnimationFrame(() => {
        ref.current?.scrollTo?.({ y: 0, animated: !reducedMotion });
        ref.current?.scrollToOffset?.({ offset: 0, animated: !reducedMotion });
      });
      return () => cancelAnimationFrame(frame);
    }, [ref, reducedMotion]),
  );
  return ref;
}
