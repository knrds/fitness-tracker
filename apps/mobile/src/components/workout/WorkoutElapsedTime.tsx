import React, { useEffect, useState } from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import { useWorkoutStore } from '../../stores/workoutStore';

/** The ticking label owns its clock so the exercise list does not render every second. */
export function WorkoutElapsedTime({ style }: { style: StyleProp<TextStyle> }) {
  const status = useWorkoutStore((s) => s.status);
  const startedAt = useWorkoutStore((s) => s.startedAt);
  const pausedAt = useWorkoutStore((s) => s.pausedAt);
  const accumulatedPauseMs = useWorkoutStore((s) => s.accumulatedPauseMs);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const update = () =>
      setElapsed(
        startedAt
          ? Math.max(
              0,
              Math.floor(
                ((pausedAt ? new Date(pausedAt).getTime() : Date.now()) -
                  new Date(startedAt).getTime() -
                  accumulatedPauseMs) /
                  1000,
              ),
            )
          : 0,
      );
    update();
    if (status !== 'active') return;
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [status, startedAt, pausedAt, accumulatedPauseMs]);
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = String(elapsed % 60).padStart(2, '0');
  const value = hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`;
  return (
    <Text numberOfLines={1} style={style} accessibilityLabel={`Trainingsdauer ${value}`}>
      {value}
    </Text>
  );
}
