import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, withAlpha } from '@fitness-tracker/ui';
import { usePaywallStore, PaywallSource } from '../../stores/paywallStore';
import { monetizationAnalytics } from '../../services/monetizationAnalytics';
import { useI18n } from '../../i18n';

export interface LockedFeatureModalProps {
  visible: boolean;
  featureTitle: string;
  featureDescription: string;
  featureIcon?: keyof typeof Ionicons.glyphMap;
  requiredTier?: 'pro' | 'coach';
  source?: PaywallSource;
  onClose: () => void;
  onOpenPaywall?: () => void;
}

export function LockedFeatureModal({
  visible,
  featureTitle,
  featureDescription,
  featureIcon = 'lock-closed',
  requiredTier = 'pro',
  source = 'general',
  onClose,
  onOpenPaywall,
}: LockedFeatureModalProps) {
  const theme = useTheme();
  const { t } = useI18n();

  const handleOpenPaywall = () => {
    monetizationAnalytics.track('locked_feature_clicked', {
      tier: requiredTier,
      feature_source: featureTitle,
      paywall_source: source,
    });
    usePaywallStore.getState().setContext(requiredTier, source);
    onClose();
    onOpenPaywall?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="locked-feature-modal"
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Feature Badge */}
          <View style={styles.topRow}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: withAlpha(theme.colors.primary, 0.15) },
              ]}
            >
              <Ionicons name={featureIcon} size={24} color={theme.colors.primary} />
            </View>
            <View
              style={[
                styles.tierBadge,
                { backgroundColor: withAlpha(theme.colors.accent, 0.2) },
              ]}
            >
              <Text style={[styles.tierBadgeText, { color: theme.colors.accent }]}>
                {requiredTier === 'coach' ? 'COACH' : 'PRO'}
              </Text>
            </View>
          </View>

          {/* Title & Description */}
          <Text
            style={[
              styles.title,
              { color: theme.colors.text, ...theme.typography.heading },
            ]}
          >
            {featureTitle}
          </Text>
          <Text
            style={[
              styles.description,
              { color: theme.colors.muted, ...theme.typography.body },
            ]}
          >
            {featureDescription}
          </Text>

          {/* Actions */}
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.dismissButton, { borderColor: theme.colors.border }]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              testID="locked-feature-dismiss"
            >
              <Text maxFontSizeMultiplier={1.4} style={[styles.dismissText, { color: theme.colors.muted }]}>
                {t('common.notNow') || 'Nicht jetzt'}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.upgradeButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleOpenPaywall}
              accessibilityRole="button"
              accessibilityLabel={`${requiredTier.toUpperCase()} ${t('paywall.view') || 'ansehen'}`}
              testID="locked-feature-upgrade"
            >
              <Text maxFontSizeMultiplier={1.4} style={[styles.upgradeText, { color: theme.colors.background }]}>
                {requiredTier === 'coach' ? 'Coach ansehen' : 'Pro ansehen'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dismissButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
  },
  upgradeButton: {
    flex: 1.3,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
