import { act, renderHook } from '@testing-library/react-native';
import { useLocalToday } from '../useLocalToday';

it('refreshes Thursday after a dashboard was left open on Wednesday', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 8, 23, 23, 59, 50));
  const { result, unmount } = renderHook(useLocalToday);
  expect(result.current.getDay()).toBe(3);
  act(() => jest.advanceTimersByTime(30_000));
  expect(result.current.getDay()).toBe(4);
  const thursday = result.current;
  act(() => jest.advanceTimersByTime(30_000));
  expect(result.current).toBe(thursday);
  unmount();
  jest.useRealTimers();
});
