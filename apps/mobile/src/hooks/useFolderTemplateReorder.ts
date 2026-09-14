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
import { WorkoutTemplate } from '@fitness-tracker/domain';

export interface FolderLayout {
  y: number;
  height: number;
}

export interface UseFolderTemplateReorderProps {
  templates: WorkoutTemplate[];
  allFolders: string[];
  expandedFolders: Record<string, boolean>;
  onExpandFolder: (folderName: string) => void;
  onMoveTemplateToFolder: (templateId: string, targetFolder: string | undefined) => void;
  onReorderTemplates: (reordered: WorkoutTemplate[]) => void;
  scrollViewRef: React.RefObject<ScrollView | null>;
}

export function buildReorderedTemplates(
  allTemplates: WorkoutTemplate[],
  folderKey: string,
  reorderedInFolder: WorkoutTemplate[],
): WorkoutTemplate[] {
  let siblingIdx = 0;
  return allTemplates.map((t) => {
    const key = t.folder || '__unassigned__';
    if (key === folderKey) {
      const repl = reorderedInFolder[siblingIdx++];
      return repl ?? t;
    }
    return t;
  });
}

export function useFolderTemplateReorder({
  templates,
  allFolders,
  expandedFolders,
  onExpandFolder,
  onMoveTemplateToFolder,
  onReorderTemplates,
  scrollViewRef,
}: UseFolderTemplateReorderProps) {
  const current = useRef({
    templates,
    allFolders,
    expandedFolders,
    onExpandFolder,
    onMoveTemplateToFolder,
    onReorderTemplates,
  });
  current.current = {
    templates,
    allFolders,
    expandedFolders,
    onExpandFolder,
    onMoveTemplateToFolder,
    onReorderTemplates,
  };

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragFolderKey, setActiveDragFolderKey] = useState<string | null>(null);
  const [hoveredTargetFolder, setHoveredTargetFolder] = useState<string | null>(null);

  const itemLayouts = useRef<Record<string, RowLayout>>({});
  const folderLayouts = useRef<Record<string, FolderLayout>>({});
  const foldersSectionY = useRef(0);

  const scrollYRef = useRef(0);
  const viewport = useRef({ top: 0, height: 0, contentHeight: 0 });

  const dragY = useRef(new Animated.Value(0)).current;
  const shifts = useRef(new Map<string, Animated.Value>());
  const frame = useRef<number | null>(null);

  const hoverExpandTimer = useRef<NodeJS.Timeout | null>(null);
  const lastHoveredFolderRef = useRef<string | null>(null);

  const drag = useRef<{
    id: string;
    originFolder: string;
    siblingIds: string[];
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

  const clearHoverTimer = () => {
    if (hoverExpandTimer.current) {
      clearTimeout(hoverExpandTimer.current);
      hoverExpandTimer.current = null;
    }
    lastHoveredFolderRef.current = null;
  };

  const reset = () => {
    stopFrame();
    clearHoverTimer();
    drag.current = null;
    dragY.stopAnimation();
    dragY.setValue(0);
    shifts.current.forEach((value) => {
      value.stopAnimation();
      value.setValue(0);
    });
    setActiveDragId(null);
    setActiveDragFolderKey(null);
    setHoveredTargetFolder(null);
  };

  useEffect(
    () => () => {
      stopFrame();
      clearHoverTimer();
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

    // Calculate current pointer position in ScrollView content coordinates
    const currentContentY = state.pointerY - viewport.current.top + scrollYRef.current;

    // Check which folder the pointer is currently inside
    const folderEntries = Object.entries(folderLayouts.current);
    const matched = folderEntries.find(([, l]) => {
      const top = foldersSectionY.current + l.y;
      const bottom = top + l.height;
      return currentContentY >= top && currentContentY <= bottom;
    });

    const targetFolderKey = matched ? matched[0] : null;

    if (targetFolderKey && targetFolderKey !== state.originFolder) {
      // User is dragging over another folder (drop target candidate)
      if (lastHoveredFolderRef.current !== targetFolderKey) {
        lastHoveredFolderRef.current = targetFolderKey;
        setHoveredTargetFolder(targetFolderKey);
        void Haptics.selectionAsync();

        // If hovering over a closed folder, auto-expand after 350ms
        if (hoverExpandTimer.current) clearTimeout(hoverExpandTimer.current);
        if (
          targetFolderKey !== '__unassigned__' &&
          current.current.expandedFolders[targetFolderKey] === false
        ) {
          hoverExpandTimer.current = setTimeout(() => {
            current.current.onExpandFolder(targetFolderKey);
            void Haptics.selectionAsync();
          }, 350);
        }
      }

      // Reset sibling spring shifts in origin folder back to 0
      state.siblingIds.forEach((id) => {
        if (id === state.id) return;
        Animated.spring(valueFor(id), {
          toValue: 0,
          useNativeDriver: Platform.OS !== 'web',
          speed: 28,
          bounciness: 0,
        }).start();
      });
    } else {
      // Inside origin folder or not over any other folder
      clearHoverTimer();
      if (lastHoveredFolderRef.current !== null) {
        lastHoveredFolderRef.current = null;
        setHoveredTargetFolder(null);
      }

      // Run intra-folder smooth sibling reordering (identical to programs.tsx)
      const to = getDropIndex(state.siblingIds, state.layouts, state.id, translation);
      if (to !== state.to) {
        state.to = to;
      }

      const from = state.siblingIds.indexOf(state.id);
      const layout = state.layouts[state.id];
      if (layout) {
        const next = state.layouts[state.siblingIds[from + 1] ?? ''];
        const previous = state.layouts[state.siblingIds[from - 1] ?? ''];
        const gap = next
          ? next.y - layout.y - layout.height
          : previous
            ? layout.y - previous.y - previous.height
            : 0;
        const shift = layout.height + Math.max(0, gap);

        state.siblingIds.forEach((id, index) => {
          if (id === state.id) return;
          const offset =
            index > from && index <= to ? -shift : index < from && index >= to ? shift : 0;
          Animated.spring(valueFor(id), {
            toValue: offset,
            useNativeDriver: Platform.OS !== 'web',
            speed: 28,
            bounciness: 0,
          }).start();
        });
      }
    }
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
      clearHoverTimer();
      reset();
      return;
    }

    state.settling = true;

    // Check if dropping onto another folder
    const targetFolderKey = lastHoveredFolderRef.current;
    clearHoverTimer();

    if (targetFolderKey && targetFolderKey !== state.originFolder) {
      const newFolder = targetFolderKey === '__unassigned__' ? undefined : targetFolderKey;
      current.current.onMoveTemplateToFolder(state.id, newFolder);
      reset();
      return;
    }

    // Reorder within origin folder
    const from = state.siblingIds.indexOf(state.id);
    const target = state.layouts[state.siblingIds[state.to] ?? ''];
    const active = state.layouts[state.id];

    if (!target || !active || from === state.to) {
      reset();
      return;
    }

    const destination =
      state.to > from
        ? target.y + target.height - active.height - active.y
        : target.y - active.y;

    Animated.timing(dragY, {
      toValue: destination,
      duration: 140,
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (drag.current !== state) return;
      try {
        if (finished && isScopeCurrent(state.scope)) {
          const originFolderKey = state.originFolder;
          const originSiblings = current.current.templates.filter(
            (t) => (t.folder || '__unassigned__') === originFolderKey,
          );
          const reorderedSiblings = moveItem(originSiblings, from, state.to);
          const allReordered = buildReorderedTemplates(
            current.current.templates,
            originFolderKey,
            reorderedSiblings,
          );
          current.current.onReorderTemplates(allReordered);
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
        onStartShouldSetPanResponder: () => {
          if (drag.current) return false;
          const tmpl = current.current.templates.find((t) => t.id === id);
          if (!tmpl) return false;
          const folderKey = tmpl.folder || '__unassigned__';
          const siblings = current.current.templates.filter(
            (t) => (t.folder || '__unassigned__') === folderKey,
          );
          return siblings.every((s) => itemLayouts.current[s.id]);
        },
        onPanResponderGrant: (event) => {
          const tmpl = current.current.templates.find((t) => t.id === id);
          const originFolder = tmpl?.folder || '__unassigned__';
          const siblings = current.current.templates.filter(
            (t) => (t.folder || '__unassigned__') === originFolder,
          );
          const siblingIds = siblings.map((s) => s.id);

          drag.current = {
            id,
            originFolder,
            siblingIds,
            layouts: { ...itemLayouts.current },
            scope: getStorageScope(),
            startScroll: scrollYRef.current,
            dy: 0,
            pointerY: event.nativeEvent.pageY,
            to: siblingIds.indexOf(id),
            active: false,
            settling: false,
            lastTime: 0,
          };
          setActiveDragFolderKey(originFolder);
        },
        onPanResponderMove: (_, gesture) => {
          const state = drag.current;
          if (!state || state.settling) return;
          state.dy = gesture.dy;
          state.pointerY = gesture.moveY;

          if (!state.active && Math.abs(gesture.dy) >= 8) {
            state.active = true;
            setActiveDragId(id);
            void Haptics.selectionAsync().catch(() => {});
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
      accessibilityHint: 'Am Griff ziehen, um die Vorlage zu verschieben oder in einen Ordner zu ziehen.',
    };
  };

  return {
    activeDragId,
    activeDragFolderKey,
    hoveredTargetFolder,
    itemLayouts,
    folderLayouts,
    foldersSectionY,
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
      zIndex: id === activeDragId ? 10000 : 1,
      elevation: id === activeDragId ? 25 : 0,
    }),
    getFolderStyle: (folderKey: string) => ({
      zIndex: folderKey === activeDragFolderKey ? 9999 : 1,
      elevation: folderKey === activeDragFolderKey ? 20 : 0,
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
