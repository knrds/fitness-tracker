import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ExerciseCard } from '../ExerciseCard';
import { MuscleGroup, Equipment, MovementPattern } from '@fitness-tracker/domain';

jest.mock('expo-router', () => ({
  Link: ({ children }: any) => children,
}));

const mockExercise = {
  id: 'test-id',
  name: 'Test Bench Press',
  primaryMuscles: [MuscleGroup.Chest],
  secondaryMuscles: [MuscleGroup.Triceps],
  equipment: Equipment.Barbell,
  movementPattern: MovementPattern.HorizontalPush,
  isCustom: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ExerciseCard', () => {
  it('renders correctly', () => {
    const { getByText } = render(
      <ExerciseCard exercise={mockExercise} />
    );
    expect(getByText('Test Bench Press')).toBeTruthy();
    expect(getByText('Barbell')).toBeTruthy();
  });

  it('shows favorite icon when isFavorite is true', () => {
    const { getByText } = render(
      <ExerciseCard exercise={mockExercise} isFavorite={true} onToggleFavorite={jest.fn()} />
    );
    expect(getByText('★')).toBeTruthy();
  });

  it('calls onToggleFavorite when favorite button is pressed', () => {
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <ExerciseCard exercise={mockExercise} isFavorite={false} onToggleFavorite={onToggle} />
    );
    
    fireEvent.press(getByTestId('favorite-btn'));
    expect(onToggle).toHaveBeenCalledWith('test-id');
  });
});
