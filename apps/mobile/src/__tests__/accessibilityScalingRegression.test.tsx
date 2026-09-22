import React from 'react';
import { render } from '@testing-library/react-native';
import { Button, ThemeProvider } from '@fitness-tracker/ui';
import { LockedFeatureModal } from '../components/paywall/LockedFeatureModal';

describe('Accessibility & Large Text Scaling Regression (Task 09.05)', () => {
  it('applies maxFontSizeMultiplier on Button to safeguard against extreme layout clipping', () => {
    const { getByText } = render(
      <ThemeProvider>
        <Button title="Weiter" onPress={() => {}} />
      </ThemeProvider>,
    );
    const textElement = getByText('Weiter');
    expect(textElement.props.maxFontSizeMultiplier).toBe(1.5);
  });

  it('safeguards action buttons in LockedFeatureModal with maxFontSizeMultiplier', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <LockedFeatureModal
          visible={true}
          featureTitle="Templates"
          featureDescription="Template unlock"
          requiredTier="pro"
          onClose={() => {}}
        />
      </ThemeProvider>,
    );

    const dismissButton = getByTestId('locked-feature-dismiss');
    const dismissText = dismissButton.findByType('Text');
    expect(dismissText.props.maxFontSizeMultiplier).toBe(1.4);

    const upgradeButton = getByTestId('locked-feature-upgrade');
    const upgradeText = upgradeButton.findByType('Text');
    expect(upgradeText.props.maxFontSizeMultiplier).toBe(1.4);
  });
});
