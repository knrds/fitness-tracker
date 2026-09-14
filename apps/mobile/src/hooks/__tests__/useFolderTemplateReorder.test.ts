import { act, renderHook } from '@testing-library/react-native';
import {
  Animated,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import {
  useFolderTemplateReorder,
  buildReorderedTemplates,
} from '../useFolderTemplateReorder';
import { WorkoutTemplate } from '@fitness-tracker/domain';

const mockEvent = (pageY: number) =>
  ({
    nativeEvent: { pageY },
  }) as GestureResponderEvent;

const mockGesture = (dy: number, moveY: number): PanResponderGestureState => ({
  stateID: 1,
  _accountsForMovesUpTo: 0,
  moveX: 0,
  moveY,
  x0: 0,
  y0: moveY - dy,
  dx: 0,
  dy,
  vx: 0,
  vy: 0,
  numberActiveTouches: 1,
});

let callbacks: Parameters<typeof PanResponder.create>[0];

beforeEach(() => {
  jest.spyOn(PanResponder, 'create').mockImplementation((config) => {
    callbacks = config;
    return { panHandlers: {} };
  });
  jest.spyOn(Animated, 'timing').mockImplementation(() => ({
    start: (cb) => cb?.({ finished: true }),
    stop: () => {},
    reset: () => {},
  }));
  jest.spyOn(Animated, 'spring').mockImplementation(() => ({
    start: (cb) => cb?.({ finished: true }),
    stop: () => {},
    reset: () => {},
  }));
  jest.spyOn(global, 'requestAnimationFrame').mockReturnValue(1);
  jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

const mockDate = new Date('2026-01-01');
const createMockTemplate = (
  partial: Partial<WorkoutTemplate> & { id: string; name: string },
): WorkoutTemplate => ({
  userId: 'user-1',
  isArchived: false,
  createdAt: mockDate,
  updatedAt: mockDate,
  exercises: [],
  ...partial,
});

describe('buildReorderedTemplates', () => {
  it('replaces only templates belonging to the target folder', () => {
    const templates: WorkoutTemplate[] = [
      createMockTemplate({ id: 't1', name: 'T1', folder: 'PushPull' }),
      createMockTemplate({ id: 't2', name: 'T2', folder: 'Legs' }),
      createMockTemplate({ id: 't3', name: 'T3', folder: 'PushPull' }),
      createMockTemplate({ id: 't4', name: 'T4' }),
    ];

    const reorderedInPushPull = [templates[2]!, templates[0]!]; // t3, t1
    const result = buildReorderedTemplates(templates, 'PushPull', reorderedInPushPull);

    expect(result.map((t) => t.id)).toEqual(['t3', 't2', 't1', 't4']);
  });
});

describe('useFolderTemplateReorder', () => {
  const t1 = createMockTemplate({ id: 't1', name: 'Bench', folder: 'Chest' });
  const t2 = createMockTemplate({ id: 't2', name: 'Incline', folder: 'Chest' });
  const t3 = createMockTemplate({ id: 't3', name: 'Squat', folder: 'Legs' });
  const t4 = createMockTemplate({ id: 't4', name: 'Abs' });

  function setup() {
    const onMoveTemplateToFolder = jest.fn();
    const onReorderTemplates = jest.fn();
    const onExpandFolder = jest.fn();

    const hook = renderHook(() =>
      useFolderTemplateReorder({
        templates: [t1, t2, t3, t4],
        allFolders: ['Chest', 'Legs'],
        expandedFolders: { Chest: true, Legs: true },
        onExpandFolder,
        onMoveTemplateToFolder,
        onReorderTemplates,
        scrollViewRef: { current: null },
      }),
    );

    // Setup layouts
    hook.result.current.foldersSectionY.current = 100;
    hook.result.current.folderLayouts.current = {
      Chest: { y: 0, height: 200 },       // content range: 100 to 300
      Legs: { y: 220, height: 100 },      // content range: 320 to 420
      __unassigned__: { y: 440, height: 80 }, // content range: 540 to 620
    };

    hook.result.current.itemLayouts.current = {
      t1: { y: 0, height: 80 },
      t2: { y: 90, height: 80 },
      t3: { y: 0, height: 80 },
      t4: { y: 0, height: 80 },
    };

    return { hook, onMoveTemplateToFolder, onReorderTemplates, onExpandFolder };
  }

  it('reorders templates smoothly within the same folder', () => {
    const { hook, onReorderTemplates } = setup();

    hook.result.current.getHandleProps('t1');

    // Grant drag on t1 at pageY 120 (inside Chest: content 100-300)
    act(() => callbacks.onPanResponderGrant?.(mockEvent(120), mockGesture(0, 120)));

    // Drag down within Chest: dy = 95 -> moveY = 215 (content 215, still inside Chest)
    act(() => callbacks.onPanResponderMove?.(mockEvent(215), mockGesture(95, 215)));

    expect(hook.result.current.activeDragId).toBe('t1');
    expect(hook.result.current.hoveredTargetFolder).toBeNull();

    // Release inside Chest
    act(() => callbacks.onPanResponderRelease?.(mockEvent(215), mockGesture(95, 215)));

    expect(onReorderTemplates).toHaveBeenCalledTimes(1);
    const reordered = onReorderTemplates.mock.calls[0][0] as WorkoutTemplate[];
    // t2 should now be before t1
    expect(reordered.map((t) => t.id)).toEqual(['t2', 't1', 't3', 't4']);
  });

  it('moves a template to another folder when dragged into its frame', () => {
    const { hook, onMoveTemplateToFolder } = setup();

    hook.result.current.getHandleProps('t1');

    // Grant drag on t1
    act(() => callbacks.onPanResponderGrant?.(mockEvent(120), mockGesture(0, 120)));

    // Drag down into Legs folder: content range for Legs is 320 to 420. moveY = 350
    act(() => callbacks.onPanResponderMove?.(mockEvent(350), mockGesture(230, 350)));

    expect(hook.result.current.hoveredTargetFolder).toBe('Legs');

    // Release over Legs
    act(() => callbacks.onPanResponderRelease?.(mockEvent(350), mockGesture(230, 350)));

    expect(onMoveTemplateToFolder).toHaveBeenCalledWith('t1', 'Legs');
    expect(hook.result.current.activeDragId).toBeNull();
    expect(hook.result.current.hoveredTargetFolder).toBeNull();
  });

  it('moves a template to unassigned when dragged into OHNE ORDNER', () => {
    const { hook, onMoveTemplateToFolder } = setup();

    hook.result.current.getHandleProps('t1');

    // Grant drag on t1
    act(() => callbacks.onPanResponderGrant?.(mockEvent(120), mockGesture(0, 120)));

    // Drag down into __unassigned__ folder: content range is 540 to 620. moveY = 560
    act(() => callbacks.onPanResponderMove?.(mockEvent(560), mockGesture(440, 560)));

    expect(hook.result.current.hoveredTargetFolder).toBe('__unassigned__');

    // Release over __unassigned__
    act(() => callbacks.onPanResponderRelease?.(mockEvent(560), mockGesture(440, 560)));

    expect(onMoveTemplateToFolder).toHaveBeenCalledWith('t1', undefined);
  });
});
