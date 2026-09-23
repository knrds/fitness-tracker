import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import {
  SupportFeedbackModal,
  buildSupportMailUrl,
  generateSupportDiagnosticPayload,
} from '../SupportFeedbackModal';

describe('SupportFeedbackModal', () => {
  let openUrlSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  });

  afterEach(() => {
    openUrlSpy.mockRestore();
  });

  it('generates privacy-compliant diagnostic payload with technical IDs only', () => {
    const payload = generateSupportDiagnosticPayload();

    expect(payload.appVersion).toBe('0.1.0-beta.6');
    expect(payload.platform).toBeDefined();
    expect(payload.osVersion).toBeDefined();
    expect(payload.diagnosticId).toMatch(/^[A-Z0-9]+$/);

    // Verify no health or sensitive keys exist in diagnostics
    expect((payload as Record<string, unknown>).workouts).toBeUndefined();
    expect((payload as Record<string, unknown>).weights).toBeUndefined();
    expect((payload as Record<string, unknown>).bodyMetrics).toBeUndefined();
    expect((payload as Record<string, unknown>).prompts).toBeUndefined();
  });

  it('builds mailto URL containing diagnostics and zero sensitive workout data', () => {
    const url = buildSupportMailUrl('de');
    expect(url).toContain('mailto:');
    expect(url).toContain('support%40evaro.app');
    expect(url).toContain('Technische%20Diagnose');
    expect(url).not.toContain('benchPress');
    expect(url).not.toContain('squat');
    expect(url).not.toContain('weightKg');
    expect(url).not.toContain('authToken');
  });

  it('renders modal content properly and triggers Linking.openURL on contact button press', () => {
    const onClose = jest.fn();
    const { getByText, getByLabelText } = render(
      <SupportFeedbackModal visible={true} onClose={onClose} language="de" />,
    );

    expect(getByText('Hilfe & Support')).toBeTruthy();
    expect(getByText('Privacy by Design')).toBeTruthy();
    expect(getByText(/Vorläufige Adresse/)).toBeTruthy();

    const contactButton = getByLabelText('Support-E-Mail verfassen');
    fireEvent.press(contactButton);

    expect(openUrlSpy).toHaveBeenCalledTimes(1);
    expect(openUrlSpy.mock.calls[0][0]).toMatch(/^mailto:/);

    const closeButton = getByLabelText('Schließen');
    fireEvent.press(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
