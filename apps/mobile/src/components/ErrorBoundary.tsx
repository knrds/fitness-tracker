import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorId: string | null;
}

/**
 * Global & Scoped React Error Boundary.
 * Prevents blank white screens on unhandled JavaScript exceptions.
 * Never displays raw stack traces or internal secrets to end users.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: null,
    };
  }

  static getDerivedStateFromError(_error: Error): State {
    const randomHex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase();
    return {
      hasError: true,
      errorId: `ERR-${randomHex}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log sanitized error information without leaking PII
    logger.error(`[ErrorBoundary] Caught unexpected UI error (${this.state.errorId}):`, {
      name: error.name,
      message: error.message,
      componentStack: errorInfo.componentStack?.slice(0, 500),
    });

    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.props.onReset?.();
    this.setState({
      hasError: false,
      errorId: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container} testID="error-boundary-fallback">
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="warning-outline" size={36} color="#FF5252" />
            </View>

            <Text style={styles.title}>Etwas ist unerwartet schiefgelaufen</Text>
            <Text style={styles.subtitle}>
              Ein unerwarteter Fehler ist aufgetreten. Deine Trainingsdaten auf diesem Gerät sind sicher.
            </Text>

            {this.state.errorId ? (
              <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>Referenz-ID:</Text>
                <Text style={styles.codeValue}>{this.state.errorId}</Text>
              </View>
            ) : null}

            <View style={styles.buttonContainer}>
              <Pressable
                style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                onPress={this.handleRetry}
                accessibilityRole="button"
                accessibilityLabel="App neu laden"
                testID="error-boundary-retry-button"
              >
                <Ionicons name="refresh" size={18} color="#0D0F12" style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>Erneut versuchen</Text>
              </Pressable>
            </View>

            <Text style={styles.supportNote}>
              Besteht das Problem weiterhin? Kontaktiere bitte den EVARO-Support unter Angabe der Referenz-ID.
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F12',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#16191E',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262B33',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : undefined,
  },
  subtitle: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2128',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 24,
  },
  codeLabel: {
    fontSize: 12,
    color: '#757575',
    marginRight: 6,
  },
  codeValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#00F0FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#0D0F12',
    fontSize: 15,
    fontWeight: '700',
  },
  supportNote: {
    fontSize: 12,
    color: '#616161',
    textAlign: 'center',
    lineHeight: 16,
  },
});
