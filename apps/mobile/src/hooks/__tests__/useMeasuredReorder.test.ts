import { act, renderHook } from '@testing-library/react-native';
import {
  Animated,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { useMeasuredReorder } from '../useMeasuredReorder';
import { beginScopeChange, completeScopeChange } from '../../data/storageScope';

const event = { nativeEvent: { pageY: 100 } } as GestureResponderEvent;
const gesture = (dy: number): PanResponderGestureState => ({
  stateID: 1,
  _accountsForMovesUpTo: 0,
  moveX: 0,
  moveY: 100 + dy,
  x0: 0,
  y0: 100,
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
  jest
    .spyOn(Animated, 'timing')
    .mockImplementation(() => ({
      start: (cb) => cb?.({ finished: true }),
      stop: () => {},
      reset: () => {},
    }));
  jest
    .spyOn(Animated, 'spring')
    .mockImplementation(() => ({
      start: (cb) => cb?.({ finished: true }),
      stop: () => {},
      reset: () => {},
    }));
  jest.spyOn(global, 'requestAnimationFrame').mockReturnValue(1);
  jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());
function setup() {
  const commit = jest.fn();
  const hook = renderHook(() =>
    useMeasuredReorder([{ id: 'a' }, { id: 'b' }, { id: 'c' }], commit),
  );
  hook.result.current.itemLayouts.current = {
    a: { y: 0, height: 300 },
    b: { y: 316, height: 90 },
    c: { y: 422, height: 220 },
  };
  hook.result.current.getHandleProps('a');
  act(() => callbacks.onPanResponderGrant?.(event, gesture(0)));
  return { ...hook, commit };
}
it('keeps a tap inert and commits one measured move only on release', () => {
  const hook = setup();
  act(() => callbacks.onPanResponderMove?.(event, gesture(3)));
  expect(hook.result.current.activeDragId).toBeNull();
  act(() => callbacks.onPanResponderMove?.(event, gesture(230)));
  expect(hook.result.current.activeDragId).toBe('a');
  expect(hook.commit).not.toHaveBeenCalled();
  act(() => callbacks.onPanResponderRelease?.(event, gesture(230)));
  expect(hook.commit).toHaveBeenCalledTimes(1);
  expect(hook.commit).toHaveBeenCalledWith([{ id: 'b' }, { id: 'a' }, { id: 'c' }]);
  expect(hook.result.current.scrollEnabled).toBe(true);
});
it('cancels an interrupted gesture without writing', () => {
  const hook = setup();
  act(() => callbacks.onPanResponderMove?.(event, gesture(230)));
  act(() => callbacks.onPanResponderTerminate?.(event, gesture(230)));
  expect(hook.commit).not.toHaveBeenCalled();
  expect(hook.result.current.activeDragId).toBeNull();
});
it('does not commit an old account gesture after the generation changes', () => {
  const hook = setup();
  act(() => callbacks.onPanResponderMove?.(event, gesture(230)));
  const generation = beginScopeChange();
  completeScopeChange(generation);
  act(() => callbacks.onPanResponderRelease?.(event, gesture(230)));
  expect(hook.commit).not.toHaveBeenCalled();
});

describe('useMeasuredReorder with collapsedItemHeight option', () => {
  function setupCollapsed() {
    const commit = jest.fn();
    const hook = renderHook(() =>
      useMeasuredReorder([{ id: 'a' }, { id: 'b' }, { id: 'c' }], commit, {
        collapsedItemHeight: 64,
        itemGap: 12,
      }),
    );
    hook.result.current.itemLayouts.current = {
      a: { y: 100, height: 300 },
      b: { y: 412, height: 250 },
      c: { y: 674, height: 200 },
    };
    hook.result.current.getHandleProps('b');
    return { ...hook, commit };
  }

  it('immediately sets activeDragId on grab to fold/collapse cards, and restores on inert tap release', () => {
    const hook = setupCollapsed();
    expect(hook.result.current.activeDragId).toBeNull();

    // Grab item 'b'
    act(() => callbacks.onPanResponderGrant?.(event, gesture(0)));
    expect(hook.result.current.activeDragId).toBe('b');

    // Release without moving -> inert tap resets activeDragId
    act(() => callbacks.onPanResponderRelease?.(event, gesture(0)));
    expect(hook.result.current.activeDragId).toBeNull();
    expect(hook.commit).not.toHaveBeenCalled();
  });

  it('reorders based on collapsed pitch and commits reorder on release', () => {
    const hook = setupCollapsed();

    // Grab item 'b' (index 1)
    act(() => callbacks.onPanResponderGrant?.(event, gesture(0)));
    expect(hook.result.current.activeDragId).toBe('b');

    // Move up by ~80px (more than pitch = 76px) to move 'b' above 'a'
    act(() => callbacks.onPanResponderMove?.(event, gesture(-85)));
    expect(hook.result.current.hoverIndex).toBe(0);

    // Release to drop 'b' before 'a'
    act(() => callbacks.onPanResponderRelease?.(event, gesture(-85)));
    expect(hook.commit).toHaveBeenCalledWith([{ id: 'b' }, { id: 'a' }, { id: 'c' }]);
    expect(hook.result.current.activeDragId).toBeNull();
  });
});

