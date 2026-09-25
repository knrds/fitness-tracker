import { useMemo } from 'react';
import { useHistoryStore } from '../stores/historyStore';

export function useSortedHistory() {
  const sessions = useHistoryStore(state => state.sessions);
  const getSessionsByDateDesc = useHistoryStore(state => state.getSessionsByDateDesc);
  return useMemo(() => getSessionsByDateDesc(), [sessions, getSessionsByDateDesc]);
}
