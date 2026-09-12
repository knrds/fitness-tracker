import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  ScrollView,
  ViewProps,
  ViewStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { getStorageScope, isScopeCurrent } from '../data/storageScope';
import { getDropIndex, moveItem, RowLayout } from '../utils/reorderGeometry';

/** Stable card sizes, measured targets, one persistence write after a completed drop. */
export function useMeasuredReorder<T extends { id: string }>(
  items: T[],
  onReorder: (items: T[]) => void,
  options?: { onDrop?: (item: T, contentY: number) => void },
) {
  const current = useRef({ items, onReorder, options });
  current.current = { items, onReorder, options };
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const itemLayouts = useRef<Record<string, RowLayout>>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const viewport = useRef({ top: 0, height: 0, contentHeight: 0 });
  const dragY = useRef(new Animated.Value(0)).current;
  const shifts = useRef(new Map<string, Animated.Value>());
  const frame = useRef<number | null>(null);
  const drag = useRef<{
    id: string;
    ids: string[];
    layouts: Record<string, RowLayout>;
    scope: ReturnType<typeof getStorageScope>;
    startScroll: number;
    dy: number;
    pointerY: number;
    to: number;
    active: boolean;
    settling: boolean;
    lastTime: number;
  } | null>(null);
  const valueFor = (id: string) => {
    let value = shifts.current.get(id);
    if (!value) {
      value = new Animated.Value(0);
      shifts.current.set(id, value);
    }
    return value;
  };
  const stopFrame = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };
  const reset = () => {
    stopFrame();
    drag.current = null;
    dragY.stopAnimation();
    dragY.setValue(0);
    shifts.current.forEach((value) => {
      value.stopAnimation();
      value.setValue(0);
    });
    setActiveDragId(null);
    setHoverIndex(null);
  };
  useEffect(
    () => () => {
      stopFrame();
      drag.current = null;
      dragY.stopAnimation();
      shifts.current.forEach((v) => v.stopAnimation());
    },
    [dragY],
  );
  const update = () => {
    const state = drag.current;
    if (!state?.active || state.settling) return;
    const translation = state.dy + scrollYRef.current - state.startScroll;
    dragY.setValue(translation);
    const to = getDropIndex(state.ids, state.layouts, state.id, translation);
    if (to === state.to) return;
    state.to = to;
    setHoverIndex(to);
    if (current.current.options?.onDrop) return;
    const from = state.ids.indexOf(state.id);
    const layout = state.layouts[state.id]!;
    const next = state.layouts[state.ids[from + 1] ?? ''];
    const previous = state.layouts[state.ids[from - 1] ?? ''];
    const gap = next
      ? next.y - layout.y - layout.height
      : previous
        ? layout.y - previous.y - previous.height
        : 0;
    const shift = layout.height + Math.max(0, gap);
    state.ids.forEach((id, index) => {
      if (id === state.id) return;
      const offset = index > from && index <= to ? -shift : index < from && index >= to ? shift : 0;
      Animated.spring(valueFor(id), {
        toValue: offset,
        useNativeDriver: Platform.OS !== 'web',
        speed: 28,
        bounciness: 0,
      }).start();
    });
  };
  const tick = (time: number) => {
    const state = drag.current;
    if (!state?.active || state.settling) return;
    const { top, height, contentHeight } = viewport.current;
    const edge = 64;
    const localY = state.pointerY - top;
    const velocity =
      localY < edge
        ? -Math.min(1, (edge - localY) / edge)
        : localY > height - edge
          ? Math.min(1, (localY - height + edge) / edge)
          : 0;
    const dt = Math.min(32, Math.max(0, time - state.lastTime));
    state.lastTime = time;
    if (height > 0 && velocity !== 0) {
      const y = Math.max(
        0,
        Math.min(Math.max(0, contentHeight - height), scrollYRef.current + velocity * 0.45 * dt),
      );
      if (y !== scrollYRef.current) {
        scrollYRef.current = y;
        scrollViewRef.current?.scrollTo({ y, animated: false });
        update();
      }
    }
    frame.current = requestAnimationFrame(tick);
  };
  const finish = (cancel: boolean) => {
    const state = drag.current;
    stopFrame();
    if (!state?.active || cancel) {
      reset();
      return;
    }
    state.settling = true;
    const from = state.ids.indexOf(state.id);
    const target = state.layouts[state.ids[state.to]!]!;
    const active = state.layouts[state.id]!;
    const destination = current.current.options?.onDrop
      ? state.dy + scrollYRef.current - state.startScroll
      : state.to > from
        ? target.y + target.height - active.height - active.y
        : target.y - active.y;
    Animated.timing(dragY, {
      toValue: destination,
      duration: 140,
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (drag.current !== state) return;
      try {
        if (
          finished &&
          isScopeCurrent(state.scope) &&
          current.current.items.map((i) => i.id).join('|') === state.ids.join('|')
        ) {
          if (current.current.options?.onDrop)
            current.current.options.onDrop(
              current.current.items[from]!,
              active.y + active.height / 2 + destination,
            );
          else if (from !== state.to)
            current.current.onReorder(moveItem(current.current.items, from, state.to));
        }
      } finally {
        reset();
      }
    });
  };
  const responders = useRef(new Map<string, ReturnType<typeof PanResponder.create>>());
  const callbacks = useRef({ update, finish, tick, reset });
  callbacks.current = { update, finish, tick, reset };
  const getHandleProps = (id: string): ViewProps => {
    let responder = responders.current.get(id);
    if (!responder) {
      responder = PanResponder.create({
        onStartShouldSetPanResponder: () =>
          !drag.current && current.current.items.every((item) => itemLayouts.current[item.id]),
        onPanResponderGrant: (event) => {
          const ids = current.current.items.map((item) => item.id);
          drag.current = {
            id,
            ids,
            layouts: { ...itemLayouts.current },
            scope: getStorageScope(),
            startScroll: scrollYRef.current,
            dy: 0,
            pointerY: event.nativeEvent.pageY,
            to: ids.indexOf(id),
            active: false,
            settling: false,
            lastTime: 0,
          };
        },
        onPanResponderMove: (_, gesture) => {
          const state = drag.current;
          if (!state || state.settling) return;
          state.dy = gesture.dy;
          state.pointerY = gesture.moveY;
          if (!state.active && Math.abs(gesture.dy) >= 8) {
            state.active = true;
            setActiveDragId(id);
            setHoverIndex(state.to);
            Haptics.selectionAsync().catch(() => {});
            frame.current = requestAnimationFrame(callbacks.current.tick);
          }
          callbacks.current.update();
        },
        onPanResponderRelease: () => callbacks.current.finish(false),
        onPanResponderTerminate: () => callbacks.current.finish(true),
        onPanResponderTerminationRequest: () => !drag.current?.active,
      });
      responders.current.set(id, responder);
    }
    return {
      ...responder.panHandlers,
      accessible: true,
      accessibilityRole: 'adjustable',
      accessibilityLabel: 'Reihenfolge ändern',
      accessibilityHint: 'Am Griff ziehen oder die Aktionen nach oben und unten verwenden.',
      accessibilityActions: [
        { name: 'increment', label: 'Nach unten' },
        { name: 'decrement', label: 'Nach oben' },
      ],
      onAccessibilityAction: (event) => {
        if (drag.current) return;
        const { items, onReorder } = current.current;
        const index = items.findIndex((i) => i.id === id);
        const to = index + (event.nativeEvent.actionName === 'increment' ? 1 : -1);
        if (to >= 0 && to < items.length) {
          const target = itemLayouts.current[items[to]!.id];
          if (current.current.options?.onDrop && target)
            current.current.options.onDrop(items[index]!, target.y + target.height / 2);
          else onReorder(moveItem(items, index, to));
        }
      },
    };
  };
  return {
    activeDragId,
    hoverIndex,
    itemLayouts,
    scrollViewRef,
    scrollYRef,
    scrollEnabled: activeDragId === null,
    getHandleProps,
    handleStyle: (Platform.OS === 'web'
      ? { touchAction: 'none', userSelect: 'none' }
      : {}) as ViewStyle & {
      touchAction?: string;
      userSelect?: string;
    },
    getRowStyle: (id: string) => ({
      transform: [{ translateY: id === activeDragId ? dragY : valueFor(id) }],
      zIndex: id === activeDragId ? 100 : 0,
      elevation: id === activeDragId ? 6 : 0,
    }),
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = event.nativeEvent.contentOffset.y;
      callbacks.current.update();
    },
    onContentSizeChange: (_width: number, height: number) => {
      viewport.current.contentHeight = height;
    },
    onLayout: () => {
      scrollViewRef.current
        ?.getNativeScrollRef()
        ?.measureInWindow((_x: number, y: number, _width: number, height: number) => {
          viewport.current.top = y;
          viewport.current.height = height;
        });
    },
  };
}
