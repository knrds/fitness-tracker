import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '../ErrorBoundary';
import { logger } from '../../utils/logger';

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// Component that throws on demand
const ProblemChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Explosive runtime render error: secret_key_123');
  }
  return <Text testID="child-content">Normal Content</Text>;
};

describe('ErrorBoundary UI Recovery & Exception Handling', () => {
  // Suppress console.error in React for expected error test throws
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Test 1: Renders children normally when no exception occurs', () => {
    const { getByTestId } = render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByTestId('child-content')).toBeTruthy();
  });

  test('Test 2: Catches exception and renders graceful fallback without raw secrets or stack traces', () => {
    const onErrorSpy = jest.fn();

    const { getByTestId, queryByTestId, queryByText } = render(
      <ErrorBoundary onError={onErrorSpy}>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    // Child is unmounted, fallback is rendered
    expect(queryByTestId('child-content')).toBeNull();
    expect(getByTestId('error-boundary-fallback')).toBeTruthy();
    expect(getByTestId('error-boundary-retry-button')).toBeTruthy();

    // Verify raw exception string (e.g. secret_key_123) is NEVER displayed to end user
    expect(queryByText(/secret_key_123/)).toBeNull();

    // Verify onError was called
    expect(onErrorSpy).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  test('Test 3: Retry button resets error state', () => {
    let shouldThrow = true;
    const onResetSpy = jest.fn();

    const { getByTestId, rerender, queryByTestId } = render(
      <ErrorBoundary onReset={onResetSpy}>
        <ProblemChild shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    expect(getByTestId('error-boundary-fallback')).toBeTruthy();

    // Fix error state
    shouldThrow = false;
    rerender(
      <ErrorBoundary onReset={onResetSpy}>
        <ProblemChild shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    // Press retry
    fireEvent.press(getByTestId('error-boundary-retry-button'));

    expect(onResetSpy).toHaveBeenCalledTimes(1);
    expect(queryByTestId('error-boundary-fallback')).toBeNull();
    expect(getByTestId('child-content')).toBeTruthy();
  });

  test('Test 4: Renders custom fallback when supplied via props', () => {
    const customFallback = <Text testID="custom-fallback-node">Custom Crash UI</Text>;

    const { getByTestId } = render(
      <ErrorBoundary fallback={customFallback}>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByTestId('custom-fallback-node')).toBeTruthy();
  });
});
