import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';
import { ThemeProvider } from '@fitness-tracker/ui';
import type { Program, WorkoutSession, WorkoutTemplate } from '@fitness-tracker/domain';
import HomeScreen from '../../../app/(tabs)/index';

let mockLanguage = 'en';
let mockToday = new Date(2026, 8, 27, 16);
let mockSessions: WorkoutSession[] = [];
let mockStatus = 'idle';
const mockStartQuick = jest.fn();
const mockStartTemplate = jest.fn();
const mockPush = jest.fn();

const mockTemplates: WorkoutTemplate[] = ['Sunday workout', 'Monday workout'].map((name, index) => ({
  id: `template-${index}`, userId: 'user', name, exercises: [], isArchived: false,
  createdAt: new Date(2026, 8, 1), updatedAt: new Date(2026, 8, 1),
}));
const mockProgram: Program = {
  id: 'program', userId: 'user', name: 'Active program', durationWeeks: 4, isActive: true,
  startedAt: new Date(2026, 8, 21), createdAt: new Date(2026, 8, 21), updatedAt: new Date(2026, 8, 21),
  workouts: [
    { id: 'sunday', templateId: 'template-0', week: 1, dayOfWeek: 7, order: 0 },
    { id: 'monday', templateId: 'template-1', week: 2, dayOfWeek: 1, order: 0 },
  ],
};

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, navigate: jest.fn() }), useFocusEffect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@fitness-tracker/ui', () => ({
  ...jest.requireActual('@fitness-tracker/ui'),
  useDialog: () => ({ showConfirm: jest.fn() }),
}));
jest.mock('../../i18n', () => ({
  useI18n: () => ({ language: mockLanguage, t: (key: string) => key, formatMuscle: (key: string) => key }),
}));
jest.mock('../../hooks/useLocalToday', () => ({ useLocalToday: () => mockToday }));
jest.mock('../../hooks/useSortedHistory', () => ({ useSortedHistory: () => mockSessions }));
jest.mock('../../stores/programStore', () => ({ useProgramStore: () => ({ programs: [mockProgram], templates: mockTemplates }) }));
jest.mock('../../stores/workoutStore', () => ({
  useWorkoutStore: () => ({ status: mockStatus, startWorkout: mockStartQuick, startWorkoutFromTemplate: mockStartTemplate }),
}));
jest.mock('../../stores/exerciseStore', () => ({ useExerciseStore: () => ({ exercises: [] }) }));
jest.mock('../../stores/historyStore', () => ({ useHistoryStore: () => ({ getSessionsByDateDesc: () => mockSessions, getStreak: () => 1 }) }));
jest.mock('../../stores/profileStore', () => ({ useProfileStore: () => ({ profile: {} }) }));
jest.mock('../../stores/achievementStore', () => ({ useAchievementStore: () => ({ level: 1, xp: 0 }) }));
jest.mock('../../services/avatarStorageService', () => ({ resolveAvatarUri: () => undefined }));
jest.mock('../../utils/haptics', () => ({ hapticFeedback: { selection: jest.fn() } }));
jest.mock('../ActivityRing', () => ({ ActivityRing: () => null }));
jest.mock('../anatomy/AnatomyFigure', () => ({ AnatomyFigure: () => null }));
jest.mock('../MuscleHeatmap', () => ({ MuscleHeatmap: () => null }));
jest.mock('../LevelProgress', () => ({ LevelProgress: () => null }));
jest.mock('../LevelRankBadge', () => ({ LevelRankBadge: () => null }));
jest.mock('../BattlePassModal', () => ({ BattlePassModal: () => null }));
jest.mock('../SyncIndicator', () => ({ SyncIndicator: () => null }));
jest.mock('../VoltBackdrop', () => ({ VoltBackdrop: () => null }));

beforeEach(() => {
  jest.clearAllMocks();
  mockLanguage = 'en';
  mockToday = new Date(2026, 8, 27, 16);
  mockStatus = 'finished';
  mockSessions = [{
    id: 'completed-sunday', userId: 'user', programId: 'program', templateId: 'template-0',
    name: 'Sunday workout', startedAt: new Date(2026, 8, 27, 10), completedAt: new Date(2026, 8, 27, 11),
    exercises: [], createdAt: new Date(2026, 8, 27, 10), updatedAt: new Date(2026, 8, 27, 11),
  }];
});

it('keeps completed Sunday in today, shows Monday separately, and starts an additional quick workout', () => {
  const screen = render(<ThemeProvider><HomeScreen /></ThemeProvider>);
  const today = within(screen.getByTestId('today-session'));
  expect(today.getByText('TRAINING COMPLETE')).toBeTruthy();
  expect(today.getByText(/Well done! Sunday workout/)).toBeTruthy();
  expect(today.queryByText('Monday workout')).toBeNull();
  const next = within(screen.getByTestId('next-program-session'));
  expect(next.getByText('NEXT SCHEDULED SESSION')).toBeTruthy();
  expect(next.getByText('Monday workout')).toBeTruthy();
  expect(next.getByText('Monday · Week 2')).toBeTruthy();

  fireEvent.press(screen.getByRole('button', { name: 'START ANOTHER WORKOUT →' }));
  expect(mockStartQuick).toHaveBeenCalledWith('Quick Workout');
  expect(mockStartTemplate).not.toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith('/workout/session');
});

it('promotes Monday only after the local calendar date changes', () => {
  const screen = render(<ThemeProvider><HomeScreen /></ThemeProvider>);
  mockToday = new Date(2026, 8, 28, 8);
  screen.rerender(<ThemeProvider><HomeScreen /></ThemeProvider>);
  expect(within(screen.getByTestId('today-session')).getByText('Monday workout')).toBeTruthy();
  expect(screen.queryByText('TRAINING COMPLETE')).toBeNull();
  expect(screen.getByRole('button', { name: 'START SESSION →' })).toBeTruthy();
});

it('localizes the completion and future date and keeps resuming an active workout available', () => {
  mockLanguage = 'de';
  const screen = render(<ThemeProvider><HomeScreen /></ThemeProvider>);
  expect(screen.getByText('TRAINING ERLEDIGT')).toBeTruthy();
  expect(screen.getByText(/Stark gemacht! Sunday workout/)).toBeTruthy();
  expect(screen.getByText('Montag · Woche 2')).toBeTruthy();
  mockStatus = 'active';
  screen.rerender(<ThemeProvider><HomeScreen /></ThemeProvider>);
  fireEvent.press(screen.getByRole('button', { name: 'WORKOUT.RESUMEWORKOUT →' }));
  expect(mockStartQuick).not.toHaveBeenCalled();
  expect(mockStartTemplate).not.toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith('/workout/session');
});

it('opens the next session preview with its future program week', () => {
  const screen = render(<ThemeProvider><HomeScreen /></ThemeProvider>);
  fireEvent.press(screen.getByTestId('next-program-session'));
  expect(screen.getByText('Active program · Week 2 (Monday)')).toBeTruthy();
  expect(mockStartQuick).not.toHaveBeenCalled();
  expect(mockStartTemplate).not.toHaveBeenCalled();
});
