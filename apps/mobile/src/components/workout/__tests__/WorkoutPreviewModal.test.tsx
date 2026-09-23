import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  WorkoutPreviewModal,
  templateToPreviewModel,
  programWorkoutToPreviewModel,
} from '../WorkoutPreviewModal';
import {
  WorkoutTemplate,
  Exercise,
  ProgramWorkout,
  Program,
  MuscleGroup,
  Equipment,
  MovementPattern,
} from '@fitness-tracker/domain';

const mockExercises: Exercise[] = [
  {
    id: 'ex-1',
    name: 'Barbell Bench Press',
    primaryMuscles: [MuscleGroup.Chest],
    secondaryMuscles: [MuscleGroup.Triceps, MuscleGroup.FrontDelts],
    equipment: Equipment.Barbell,
    isCustom: false,
    movementPattern: MovementPattern.HorizontalPush,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'ex-2',
    name: 'Incline Dumbbell Press',
    primaryMuscles: [MuscleGroup.Chest],
    secondaryMuscles: [MuscleGroup.FrontDelts],
    equipment: Equipment.Dumbbell,
    isCustom: false,
    movementPattern: MovementPattern.HorizontalPush,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockTemplate: WorkoutTemplate = {
  id: 'tmpl-push',
  userId: 'user-1',
  name: 'Push Hypertrophy',
  folder: 'Upper Body',
  exercises: [
    {
      id: 'te-1',
      exerciseId: 'ex-1',
      order: 0,
      targetSets: 3,
      targetReps: 8,
      targetRepsMax: 10,
      targetWeight: 80,
      targetRpe: 8,
    },
    {
      id: 'te-2',
      exerciseId: 'ex-2',
      order: 1,
      targetSets: 3,
      targetReps: 12,
    },
  ],
  isArchived: false,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockProgram: Program = {
  id: 'prog-1',
  userId: 'user-1',
  name: 'Strength Block',
  durationWeeks: 6,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  workouts: [],
};

const mockProgramWorkout: ProgramWorkout = {
  id: 'pw-1',
  templateId: 'tmpl-push',
  week: 2,
  dayOfWeek: 1, // Monday
  order: 0,
};

describe('WorkoutPreviewModal', () => {
  it('converts WorkoutTemplate into WorkoutPreviewModel correctly', () => {
    const model = templateToPreviewModel(mockTemplate, mockExercises);
    expect(model.id).toBe('tmpl-push');
    expect(model.name).toBe('Push Hypertrophy');
    expect(model.folder).toBe('Upper Body');
    expect(model.exercises).toHaveLength(2);
    expect(model.exercises[0]?.name).toBe('Barbell Bench Press');
    expect(model.exercises[0]?.targetReps).toBe('8-10');
    expect(model.exercises[0]?.targetWeight).toBe(80);
    expect(model.exercises[0]?.targetRpe).toBe(8);
  });

  it('converts ProgramWorkout into WorkoutPreviewModel with program metadata', () => {
    const model = programWorkoutToPreviewModel(
      mockProgramWorkout,
      mockTemplate,
      mockProgram,
      mockExercises,
    );
    expect(model.programId).toBe('prog-1');
    expect(model.programName).toBe('Strength Block');
    expect(model.week).toBe(2);
    expect(model.dayOfWeek).toBe(1);
    expect(model.exercises).toHaveLength(2);
  });

  it('renders preview modal with exercises, targets and calls onStart', () => {
    const model = templateToPreviewModel(mockTemplate, mockExercises);
    const onStart = jest.fn();
    const onClose = jest.fn();

    const { getByText, getByLabelText } = render(
      <WorkoutPreviewModal visible={true} model={model} onClose={onClose} onStart={onStart} />,
    );

    expect(getByText('Push Hypertrophy')).toBeTruthy();
    expect(getByText('Barbell Bench Press')).toBeTruthy();
    expect(getByText('Incline Dumbbell Press')).toBeTruthy();
    expect(getByText('2 Übungen')).toBeTruthy();
    expect(getByText('6 Sätze gesamt')).toBeTruthy();

    const startBtn = getByLabelText('Workout starten');
    fireEvent.press(startBtn);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith(model);
  });

  it('calls onClose when close button is pressed', () => {
    const model = templateToPreviewModel(mockTemplate, mockExercises);
    const onStart = jest.fn();
    const onClose = jest.fn();

    const { getByLabelText } = render(
      <WorkoutPreviewModal visible={true} model={model} onClose={onClose} onStart={onStart} />,
    );

    const closeBtn = getByLabelText('Schließen');
    fireEvent.press(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();
  });
});
