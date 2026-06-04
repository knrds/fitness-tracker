export function estimateOneRepMax(
  weight: number,
  reps: number,
  rpe?: number,
  rir?: number,
  exerciseName?: string,
): number {
  if (reps <= 0) return 0;

  let additionalReps = 0;
  if (rir !== undefined && rir !== null) {
    additionalReps = rir;
  } else if (rpe !== undefined && rpe !== null) {
    additionalReps = Math.max(0, 10 - rpe);
  }

  const effectiveReps = reps + additionalReps;
  if (effectiveReps === 1) return weight;

  let divisor = 30; // legacy default
  if (exerciseName) {
    const name = exerciseName.toLowerCase();
    if (name.includes('squat') || name.includes('deadlift') || name.includes('leg press')) {
      divisor = 45; // heavy compound leg/hip movements
    } else if (
      name.includes('fly') ||
      name.includes('raise') ||
      name.includes('curl') ||
      name.includes('extension') ||
      name.includes('pushdown') ||
      name.includes('skull') ||
      name.includes('plank') ||
      name.includes('crunch')
    ) {
      divisor = 60; // isolations & core
    } else {
      divisor = 50; // standard compounds
    }
  }

  return weight * (1 + effectiveReps / divisor);
}
