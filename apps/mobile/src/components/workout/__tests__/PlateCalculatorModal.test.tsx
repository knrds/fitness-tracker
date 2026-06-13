import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ThemeProvider } from '@fitness-tracker/ui';

import { useProfileStore } from '../../../stores/profileStore';
import { PlateCalculatorModal } from '../PlateCalculatorModal';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('react-native-svg', () => {
  const MockSvgNode = (props: { children?: unknown }) => props.children ?? null;
  return {
    __esModule: true,
    default: MockSvgNode,
    Defs: MockSvgNode,
    LinearGradient: MockSvgNode,
    Stop: MockSvgNode,
    Rect: MockSvgNode,
  };
});

describe('PlateCalculatorModal', () => {
  beforeEach(() => {
    useProfileStore.setState({
      profile: {
        displayName: 'User',
        preferredUnits: 'metric',
      },
    });
  });

  it('updates target weight when adding plates and can reset to the bar', () => {
    const { getByDisplayValue, getByText } = render(
      <ThemeProvider>
        <PlateCalculatorModal visible initialWeightKg={100} onClose={jest.fn()} />
      </ThemeProvider>,
    );

    expect(getByDisplayValue('100')).toBeTruthy();

    fireEvent.press(getByText('+10 kg'));
    expect(getByDisplayValue('120')).toBeTruthy();

    fireEvent.press(getByText('Clear'));
    expect(getByDisplayValue('20')).toBeTruthy();
  });
});
