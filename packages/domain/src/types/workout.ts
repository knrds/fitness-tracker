export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'glutes'
  | 'abs'
  | 'cardio';

export type ExerciseCategory = 'strength' | 'cardio' | 'flexibility' | 'balance';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  muscleGroups: MuscleGroup[];
  description?: string;
}

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  reps?: number;
  weight?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  restSeconds?: number;
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  title: string;
  startedAt: Date;
  finishedAt?: Date;
  sets: WorkoutSet[];
  notes?: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  exercises: Array<{
    exerciseId: string;
    targetSets: number;
    targetReps?: number;
    targetWeight?: number;
    targetDurationSeconds?: number;
  }>;
}

export interface UserProfile {
  id: string;
  name: string;
  weightKg?: number;
  heightCm?: number;
  birthDate?: Date;
  fitnessGoal?: 'lose_weight' | 'build_muscle' | 'improve_endurance' | 'stay_active';
}
