export function estimateOneRepMax(weight: number, reps: number, rpe?: number, rir?: number): number {
  if (reps <= 0) return 0;
  
  let additionalReps = 0;
  if (rir !== undefined && rir !== null) {
    additionalReps = rir;
  } else if (rpe !== undefined && rpe !== null) {
    additionalReps = Math.max(0, 10 - rpe);
  }
  
  const effectiveReps = reps + additionalReps;
  if (effectiveReps === 1) return weight;
  return weight * (1 + effectiveReps / 30);
}
