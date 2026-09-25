import { act, renderHook } from '@testing-library/react-native';
import { useHistoryStore } from '../../stores/historyStore';
import { useSortedHistory } from '../useSortedHistory';

it('refreshes the dashboard history after additions, edits and deletions without remounting', () => {
  useHistoryStore.setState({ sessions: [] });
  const { result } = renderHook(useSortedHistory);
  const session = { id: 'today', userId: 'local', name: 'Today', startedAt: new Date(), createdAt: new Date(), updatedAt: new Date(), exercises: [] };
  act(() => useHistoryStore.setState({ sessions: [session] }));
  expect(result.current[0]?.name).toBe('Today');
  act(() => useHistoryStore.setState({ sessions: [{ ...session, name: 'Edited' }] }));
  expect(result.current[0]?.name).toBe('Edited');
  act(() => useHistoryStore.setState({ sessions: [] }));
  expect(result.current).toEqual([]);
});
