import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { formatDateLocal } from '@fitness-tracker/domain';

/** Refresh date-dependent screens across midnight and after background suspension. */
export function useLocalToday(): Date {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => {
      const now = new Date();
      setToday(previous => formatDateLocal(previous) === formatDateLocal(now) ? previous : now);
    };
    const timer = setInterval(refresh, 30_000);
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  return today;
}
