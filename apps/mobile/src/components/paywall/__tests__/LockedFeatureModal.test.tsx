import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@fitness-tracker/ui';
import { LockedFeatureModal } from '../LockedFeatureModal';
import { usePaywallStore } from '../../../stores/paywallStore';
import { monetizationAnalytics } from '../../../services/monetizationAnalytics';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('LockedFeatureModal UX (WP-05 / WP-06 / Section 40)', () => {
  beforeEach(() => {
    monetizationAnalytics.clear();
    usePaywallStore.setState({ context: 'pro', source: null });
  });

  it('1. Renders locked feature explanation with PRO badge and description', () => {
    const { getByText, getByTestId } = render(
      <ThemeProvider>
        <LockedFeatureModal
          visible={true}
          featureTitle="RIR & RPE Erfassung"
          featureDescription="Erfasse deine verbleibenden Wiederholungen im Tank für präzise Belastungssteuerung."
          requiredTier="pro"
          source="rir"
          onClose={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(getByTestId('locked-feature-modal')).toBeTruthy();
    expect(getByText('PRO')).toBeTruthy();
    expect(getByText('RIR & RPE Erfassung')).toBeTruthy();
    expect(
      getByText('Erfasse deine verbleibenden Wiederholungen im Tank für präzise Belastungssteuerung.'),
    ).toBeTruthy();
    expect(getByText('Pro ansehen')).toBeTruthy();
  });

  it('2. Dismisses modal without opening paywall on "Nicht jetzt" tap', () => {
    const handleClose = jest.fn();

    const { getByTestId } = render(
      <ThemeProvider>
        <LockedFeatureModal
          visible={true}
          featureTitle="Advanced Analytics"
          featureDescription="Analysiere Muskelgruppen und langfristige Volumenverläufe."
          requiredTier="pro"
          source="analytics"
          onClose={handleClose}
        />
      </ThemeProvider>,
    );

    fireEvent.press(getByTestId('locked-feature-dismiss'));
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(monetizationAnalytics.getRecordedEvents().length).toBe(0);
  });

  it('3. Renders COACH badge and routes to Coach Paywall with analytics event on tap', () => {
    const handleClose = jest.fn();
    const handleOpenPaywall = jest.fn();

    const { getByText, getByTestId } = render(
      <ThemeProvider>
        <LockedFeatureModal
          visible={true}
          featureTitle="AI Plan Mode"
          featureDescription="Lass den AI Coach individuelle Mehrwochenprogramme mit Periodisierung erstellen."
          requiredTier="coach"
          source="coach_plan"
          onClose={handleClose}
          onOpenPaywall={handleOpenPaywall}
        />
      </ThemeProvider>,
    );

    expect(getByText('COACH')).toBeTruthy();
    expect(getByText('Coach ansehen')).toBeTruthy();

    fireEvent.press(getByTestId('locked-feature-upgrade'));

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleOpenPaywall).toHaveBeenCalledTimes(1);
    expect(usePaywallStore.getState().context).toBe('coach');
    expect(usePaywallStore.getState().source).toBe('coach_plan');

    const events = monetizationAnalytics.getRecordedEvents();
    expect(events.some((e) => e.event === 'locked_feature_clicked')).toBe(true);
    expect(events[0]?.properties.tier).toBe('coach');
    expect(events[0]?.properties.feature_source).toBe('AI Plan Mode');
  });
});
