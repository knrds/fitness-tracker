import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SaveTemplateModal } from '../SaveTemplateModal';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Medium: 'medium',
  },
}));

describe('SaveTemplateModal', () => {
  it('renders prominent update template button when templateId and onUpdate are provided', () => {
    const onUpdateMock = jest.fn();
    const onSaveMock = jest.fn();
    const onSkipMock = jest.fn();
    const onCloseMock = jest.fn();

    const { getByText } = render(
      <SaveTemplateModal
        visible={true}
        defaultName="Push Workout"
        onClose={onCloseMock}
        onSave={onSaveMock}
        onSkip={onSkipMock}
        templateId="tpl-123"
        onUpdate={onUpdateMock}
      />,
    );

    // Title for template update
    expect(getByText('Template aktualisieren?')).toBeTruthy();

    // Large, prominent update button is present
    const updateBtn = getByText('Template aktualisieren');
    expect(updateBtn).toBeTruthy();

    // "ODER" divider is present
    expect(getByText('ODER')).toBeTruthy();

    // Fire update
    fireEvent.press(updateBtn);
    expect(onUpdateMock).toHaveBeenCalledTimes(1);
    expect(onSaveMock).not.toHaveBeenCalled();
    expect(onSkipMock).not.toHaveBeenCalled();
  });

  it('allows skipping without saving or updating', () => {
    const onUpdateMock = jest.fn();
    const onSaveMock = jest.fn();
    const onSkipMock = jest.fn();
    const onCloseMock = jest.fn();

    const { getByText } = render(
      <SaveTemplateModal
        visible={true}
        defaultName="Push Workout"
        onClose={onCloseMock}
        onSave={onSaveMock}
        onSkip={onSkipMock}
        templateId="tpl-123"
        onUpdate={onUpdateMock}
      />,
    );

    const skipBtn = getByText('Nicht speichern');
    fireEvent.press(skipBtn);
    expect(onSkipMock).toHaveBeenCalledTimes(1);
    expect(onUpdateMock).not.toHaveBeenCalled();
    expect(onSaveMock).not.toHaveBeenCalled();
  });

  it('allows saving as a new template even when templateId exists', () => {
    const onUpdateMock = jest.fn();
    const onSaveMock = jest.fn();
    const onSkipMock = jest.fn();
    const onCloseMock = jest.fn();

    const { getByText, getByDisplayValue } = render(
      <SaveTemplateModal
        visible={true}
        defaultName="Leg Day"
        onClose={onCloseMock}
        onSave={onSaveMock}
        onSkip={onSkipMock}
        templateId="tpl-456"
        onUpdate={onUpdateMock}
      />,
    );

    const input = getByDisplayValue('Leg Day');
    fireEvent.changeText(input, 'Leg Day Heavy');

    const saveAsNewBtn = getByText('Als neues speichern');
    fireEvent.press(saveAsNewBtn);

    expect(onSaveMock).toHaveBeenCalledWith('Leg Day Heavy');
    expect(onUpdateMock).not.toHaveBeenCalled();
  });

  it('renders standard save modal when templateId is not provided', () => {
    const onSaveMock = jest.fn();
    const onSkipMock = jest.fn();
    const onCloseMock = jest.fn();

    const { getByText, queryByText } = render(
      <SaveTemplateModal
        visible={true}
        defaultName="Full Body"
        onClose={onCloseMock}
        onSave={onSaveMock}
        onSkip={onSkipMock}
      />,
    );

    expect(getByText('Als Template speichern?')).toBeTruthy();
    expect(queryByText('Template aktualisieren')).toBeNull();
    expect(queryByText('ODER')).toBeNull();

    const saveBtn = getByText('Speichern');
    fireEvent.press(saveBtn);
    expect(onSaveMock).toHaveBeenCalledWith('Full Body');
  });
});
