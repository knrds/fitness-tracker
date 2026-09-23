import React from 'react';
import { fireEvent, render, act } from '@testing-library/react-native';
import { ThemeProvider } from '@fitness-tracker/ui';
import { StartupWorkoutChecker } from '../StartupWorkoutChecker';
import { useWorkoutStore } from '../../../stores/workoutStore';
import { useProfileStore } from '../../../stores/profileStore';
import * as resumeGuard from '../../../utils/resumeWorkoutGuard';
import * as startupRecovery from '../../../utils/startup-recovery';

const mockNavigate = jest.fn();
let mockPathname = '/';

jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: mockNavigate }),
  usePathname: () => mockPathname,
}));

describe('StartupWorkoutChecker i18n & Actions', () => {
  let triggerStartupInspect: () => void = () => {};

  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/';
    useProfileStore.setState({
      profile: { ...useProfileStore.getState().profile, language: 'de' },
    });
    useWorkoutStore.setState({
      status: 'active',
      isMinimized: true,
    });

    jest.spyOn(startupRecovery, 'inspectStartupState').mockImplementation((_persist, onReady) => {
      triggerStartupInspect = onReady;
      return () => {};
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('remains hidden when startup decision is ignore', () => {
    jest.spyOn(resumeGuard, 'getResumeWorkoutDecision').mockReturnValue('ignore');

    const { queryByText } = render(
      <ThemeProvider>
        <StartupWorkoutChecker />
      </ThemeProvider>,
    );

    act(() => {
      triggerStartupInspect();
    });

    expect(queryByText('Nicht beendetes Training')).toBeNull();
    expect(queryByText('Unfinished Workout')).toBeNull();
  });

  it('renders German dialog when language is de and startup decision is prompt', () => {
    useProfileStore.setState({
      profile: { ...useProfileStore.getState().profile, language: 'de' },
    });
    jest.spyOn(resumeGuard, 'getResumeWorkoutDecision').mockReturnValue('prompt');

    const { getByText } = render(
      <ThemeProvider>
        <StartupWorkoutChecker />
      </ThemeProvider>,
    );

    act(() => {
      triggerStartupInspect();
    });

    expect(getByText('Nicht beendetes Training')).toBeTruthy();
    expect(
      getByText('Du hast ein aktives Training. Möchtest du es fortsetzen oder verwerfen und neu starten?'),
    ).toBeTruthy();
    expect(getByText('Workout fortsetzen')).toBeTruthy();
    expect(getByText('Verwerfen & Neu starten')).toBeTruthy();
  });

  it('renders English dialog when language is en and startup decision is prompt', () => {
    useProfileStore.setState({
      profile: { ...useProfileStore.getState().profile, language: 'en' },
    });
    jest.spyOn(resumeGuard, 'getResumeWorkoutDecision').mockReturnValue('prompt');

    const { getByText } = render(
      <ThemeProvider>
        <StartupWorkoutChecker />
      </ThemeProvider>,
    );

    act(() => {
      triggerStartupInspect();
    });

    expect(getByText('Unfinished Workout')).toBeTruthy();
    expect(
      getByText('You have an active workout session in progress. Resume it or start fresh?'),
    ).toBeTruthy();
    expect(getByText('Resume Workout')).toBeTruthy();
    expect(getByText('Discard & Start New')).toBeTruthy();
  });

  it('resumes workout, unminimizes, and navigates to /workout/session when resume button is pressed', () => {
    useProfileStore.setState({
      profile: { ...useProfileStore.getState().profile, language: 'de' },
    });
    jest.spyOn(resumeGuard, 'getResumeWorkoutDecision').mockReturnValue('prompt');

    const resumeWorkoutSpy = jest.fn();
    useWorkoutStore.setState({
      status: 'paused',
      isMinimized: true,
      resumeWorkout: resumeWorkoutSpy,
    });

    const { getByText, queryByText } = render(
      <ThemeProvider>
        <StartupWorkoutChecker />
      </ThemeProvider>,
    );

    act(() => {
      triggerStartupInspect();
    });

    fireEvent.press(getByText('Workout fortsetzen'));

    expect(resumeWorkoutSpy).toHaveBeenCalledTimes(1);
    expect(useWorkoutStore.getState().isMinimized).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith('/workout/session');
    expect(queryByText('Nicht beendetes Training')).toBeNull();
  });

  it('discards and resets workout when discard button is pressed', () => {
    useProfileStore.setState({
      profile: { ...useProfileStore.getState().profile, language: 'de' },
    });
    jest.spyOn(resumeGuard, 'getResumeWorkoutDecision').mockReturnValue('prompt');

    const resetWorkoutSpy = jest.fn();
    useWorkoutStore.setState({
      status: 'active',
      resetWorkout: resetWorkoutSpy,
    });

    const { getByText, queryByText } = render(
      <ThemeProvider>
        <StartupWorkoutChecker />
      </ThemeProvider>,
    );

    act(() => {
      triggerStartupInspect();
    });

    fireEvent.press(getByText('Verwerfen & Neu starten'));

    expect(resetWorkoutSpy).toHaveBeenCalledTimes(1);
    expect(queryByText('Nicht beendetes Training')).toBeNull();
  });
});
