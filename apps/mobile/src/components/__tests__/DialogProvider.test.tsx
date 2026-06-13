import React, { useState } from 'react';
import { Animated, Pressable, Text } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { DialogProvider, ThemeProvider, useDialog } from '@fitness-tracker/ui';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.setTimeout(20_000);

const createMockAnimation = (): Animated.CompositeAnimation => ({
  start: jest.fn((callback?: Animated.EndCallback) => callback?.({ finished: true })),
  stop: jest.fn(),
  reset: jest.fn(),
});

const DialogHarness = () => {
  const { showActionSheet, showConfirm } = useDialog();
  const [result, setResult] = useState('idle');

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void showConfirm({
            title: 'Leave workout?',
            message: 'Your unfinished sets stay available if you resume later.',
            confirmLabel: 'Leave',
            cancelLabel: 'Stay',
          }).then((confirmed) => {
            setResult(confirmed ? 'confirmed' : 'cancelled');
          });
        }}
      >
        <Text>Open Confirm</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void showActionSheet({
            title: 'Template actions',
            actions: [
              { label: 'Rename', value: 'rename', variant: 'secondary' },
              { label: 'Delete', value: 'delete', variant: 'danger' },
            ],
          }).then((action) => {
            setResult(action ?? 'dismissed');
          });
        }}
      >
        <Text>Open Actions</Text>
      </Pressable>

      <Text testID="dialog-result">{result}</Text>
    </>
  );
};

describe('DialogProvider', () => {
  beforeEach(() => {
    jest.spyOn(Animated, 'parallel').mockImplementation(() => createMockAnimation());
    jest.spyOn(Animated, 'timing').mockImplementation(() => createMockAnimation());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves confirm actions without native alerts', async () => {
    const { getByText, getByTestId } = render(
      <ThemeProvider>
        <DialogProvider>
          <DialogHarness />
        </DialogProvider>
      </ThemeProvider>,
    );

    fireEvent.press(getByText('Open Confirm'));

    expect(getByText('Leave workout?')).toBeTruthy();
    fireEvent.press(getByText('Leave'));

    await waitFor(() => {
      expect(getByTestId('dialog-result').props.children).toBe('confirmed');
    });
  });

  it('resolves action sheet choices', async () => {
    const { getByText, getByTestId } = render(
      <ThemeProvider>
        <DialogProvider>
          <DialogHarness />
        </DialogProvider>
      </ThemeProvider>,
    );

    fireEvent.press(getByText('Open Actions'));

    expect(getByText('Template actions')).toBeTruthy();
    fireEvent.press(getByText('Delete'));

    await waitFor(() => {
      expect(getByTestId('dialog-result').props.children).toBe('delete');
    });
  });
});
