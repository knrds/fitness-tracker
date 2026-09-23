import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  ContextualPermissionModal,
  PERMISSION_CONFIGS,
} from '../ContextualPermissionModal';

describe('Contextual Permission Pre-Prompts (WP-06 Task 06.06)', () => {
  it('renders microphone pre-prompt with transparent privacy explanation', () => {
    const onContinue = jest.fn();
    const onDismiss = jest.fn();

    const { getByText, getByLabelText } = render(
      <ContextualPermissionModal
        visible={true}
        type="microphone"
        onContinue={onContinue}
        onDismiss={onDismiss}
      />,
    );

    expect(getByText(PERMISSION_CONFIGS.microphone.titleDe)).toBeTruthy();
    expect(getByText(PERMISSION_CONFIGS.microphone.descriptionDe)).toBeTruthy();

    // Tap "Weiter" triggers onContinue
    fireEvent.press(getByLabelText('Weiter'));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('allows user to dismiss with "Nicht jetzt" without triggering permission flow', () => {
    const onContinue = jest.fn();
    const onDismiss = jest.fn();

    const { getByLabelText } = render(
      <ContextualPermissionModal
        visible={true}
        type="photos"
        onContinue={onContinue}
        onDismiss={onDismiss}
      />,
    );

    // Tap "Nicht jetzt" triggers onDismiss
    fireEvent.press(getByLabelText('Nicht jetzt'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('renders notification pre-prompt emphasizing zero health data on lockscreen', () => {
    const { getByText } = render(
      <ContextualPermissionModal
        visible={true}
        type="notifications"
        onContinue={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(getByText(PERMISSION_CONFIGS.notifications.titleDe)).toBeTruthy();
    expect(getByText(PERMISSION_CONFIGS.notifications.benefitDe)).toBeTruthy();
  });
});
