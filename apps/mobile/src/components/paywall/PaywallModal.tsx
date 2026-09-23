import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, withAlpha } from '@fitness-tracker/ui';

import { useI18n } from '../../i18n';
import { usePaywallStore } from '../../stores/paywallStore';

export interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  allowDismiss?: boolean;
}

export function PaywallModal({
  visible,
  onClose,
  onSuccess,
  allowDismiss = true,
}: PaywallModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const {
    context,
    selectedPackage,
    packages,
    isPurchasing,
    isRestoring,
    error,
    selectPackage,
    purchaseSelected,
    restorePurchases,
    clearStatus,
  } = usePaywallStore();

  const currentPkg = packages[selectedPackage];

  const handlePurchase = async () => {
    const ok = await purchaseSelected();
    if (ok) {
      onSuccess?.();
      onClose();
    }
  };

  const handleRestore = async () => {
    const ok = await restorePurchases();
    if (ok) {
      Alert.alert(t('paywall.restore'), t('paywall.restoreSuccess'));
      onSuccess?.();
      onClose();
    } else {
      Alert.alert(t('paywall.restore'), error || t('paywall.restoreNotFound'));
    }
  };

  const openTerms = () => {
    Alert.alert(
      t('paywall.terms'),
      'Nutzungsbedingungen (AGB) werden vor kommerziellem Release juristisch bereitgestellt. [LEGAL_REVIEW_REQUIRED]',
    );
  };

  const openPrivacy = () => {
    Alert.alert(
      t('paywall.privacy'),
      'Datenschutzerklärung wird vor kommerziellem Release juristisch bereitgestellt. [LEGAL_REVIEW_REQUIRED]',
    );
  };

  const isCoachContext = context === 'coach';

  const benefits = isCoachContext
    ? [
        { icon: 'sparkles-outline', text: 'Persönlicher AI Trainingscoach (Fast & Plan Mode)' },
        { icon: 'calendar-outline', text: 'Individuelle Trainingspläne & Periodisierung' },
        { icon: 'trending-up-outline', text: 'Echtzeit-Trainingsanalyse & Progression' },
        { icon: 'shield-checkmark-outline', text: 'Alle EVARO Pro-Funktionen uneingeschränkt enthalten' },
      ]
    : [
        { icon: 'barbell-outline', text: t('paywall.benefitPlans') },
        { icon: 'sparkles-outline', text: t('paywall.benefitCoach') },
        { icon: 'trending-up-outline', text: t('paywall.benefitAnalytics') },
        { icon: 'cloud-done-outline', text: t('paywall.benefitSync') },
      ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={allowDismiss ? onClose : undefined}
      testID="paywall-modal"
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header Bar with optional Close */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
          <View style={{ width: 44 }} />
          <View style={styles.badgePill}>
            <Ionicons name="sparkles" size={14} color={theme.colors.accent} />
            <Text style={[styles.badgeText, { color: theme.colors.accent }]}>
              {isCoachContext ? 'EVARO COACH' : 'EVARO PRO'}
            </Text>
          </View>
          {allowDismiss ? (
            <Pressable
              style={styles.closeBtn}
              onPress={() => {
                clearStatus();
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              testID="close-paywall-btn"
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 16 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Headline & Subtitle */}
          <View style={styles.headerBox}>
            <Text
              style={[
                styles.title,
                { color: theme.colors.text, ...theme.typography.heading },
              ]}
            >
              {isCoachContext ? 'EVARO Coach' : t('paywall.title')}
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: theme.colors.muted, ...theme.typography.body },
              ]}
            >
              {isCoachContext
                ? 'Training, das sich an dich anpasst. Inklusive aller Pro-Features.'
                : t('paywall.subtitle')}
            </Text>
          </View>

          {/* Value Reveal / Benefits */}
          <View
            style={[
              styles.benefitsCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {benefits.map((b, idx) => (
              <View key={idx} style={styles.benefitRow}>
                <View
                  style={[
                    styles.benefitIconBox,
                    { backgroundColor: withAlpha(theme.colors.primary, 0.12) },
                  ]}
                >
                  <Ionicons
                    name={b.icon as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={theme.colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.benefitText,
                    { color: theme.colors.text, ...theme.typography.body },
                  ]}
                >
                  {b.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Pricing Options */}
          <View style={styles.plansSection}>
            {/* Annual Plan (Featured) */}
            <Pressable
              style={[
                styles.planCard,
                {
                  backgroundColor:
                    selectedPackage === 'annual'
                      ? withAlpha(theme.colors.primary, 0.08)
                      : theme.colors.surface,
                  borderColor:
                    selectedPackage === 'annual'
                      ? theme.colors.primary
                      : theme.colors.border,
                  borderWidth: selectedPackage === 'annual' ? 2 : 1,
                },
              ]}
              onPress={() => selectPackage('annual')}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedPackage === 'annual' }}
              testID="annual-plan-btn"
            >
              <View style={styles.planHeaderRow}>
                <View style={styles.planNameGroup}>
                  <Text
                    style={[
                      styles.planName,
                      { color: theme.colors.text, ...theme.typography.subheading },
                    ]}
                  >
                    {t('paywall.annualTitle')}
                  </Text>
                  <View
                    style={[
                      styles.featuredTag,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.featuredTagText,
                        { color: theme.colors.background },
                      ]}
                    >
                      {t('paywall.annualBadge')}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={
                    selectedPackage === 'annual'
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={22}
                  color={
                    selectedPackage === 'annual'
                      ? theme.colors.primary
                      : theme.colors.muted
                  }
                />
              </View>

              {/* Primary Price: Actual total billed price */}
              <Text
                style={[
                  styles.actualPrice,
                  { color: theme.colors.text, ...theme.typography.heading },
                ]}
                testID="annual-primary-price"
              >
                {packages.annual.priceString}
              </Text>

              {/* Secondary Comparison: Transparent per-month note */}
              {packages.annual.monthlyEquivalentString ? (
                <Text
                  style={[
                    styles.monthlyEquivalent,
                    { color: theme.colors.accent, ...theme.typography.caption },
                  ]}
                  testID="annual-monthly-equivalent"
                >
                  {packages.annual.monthlyEquivalentString}
                </Text>
              ) : null}
            </Pressable>

            {/* Monthly Plan */}
            <Pressable
              style={[
                styles.planCard,
                {
                  backgroundColor:
                    selectedPackage === 'monthly'
                      ? withAlpha(theme.colors.primary, 0.08)
                      : theme.colors.surface,
                  borderColor:
                    selectedPackage === 'monthly'
                      ? theme.colors.primary
                      : theme.colors.border,
                  borderWidth: selectedPackage === 'monthly' ? 2 : 1,
                },
              ]}
              onPress={() => selectPackage('monthly')}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedPackage === 'monthly' }}
              testID="monthly-plan-btn"
            >
              <View style={styles.planHeaderRow}>
                <Text
                  style={[
                    styles.planName,
                    { color: theme.colors.text, ...theme.typography.subheading },
                  ]}
                >
                  {t('paywall.monthlyTitle')}
                </Text>
                <Ionicons
                  name={
                    selectedPackage === 'monthly'
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={22}
                  color={
                    selectedPackage === 'monthly'
                      ? theme.colors.primary
                      : theme.colors.muted
                  }
                />
              </View>

              {/* Primary Price: Actual monthly price */}
              <Text
                style={[
                  styles.actualPrice,
                  { color: theme.colors.text, ...theme.typography.heading },
                ]}
                testID="monthly-primary-price"
              >
                {packages.monthly.priceString}
              </Text>
              <Text
                style={[
                  styles.monthlyEquivalent,
                  { color: theme.colors.muted, ...theme.typography.caption },
                ]}
              >
                {t('paywall.monthlyNote')}
              </Text>
            </Pressable>
          </View>

          {/* Error notice if any */}
          {error ? (
            <View
              style={[
                styles.errorCard,
                { backgroundColor: withAlpha(theme.colors.error, 0.1) },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={theme.colors.error}
              />
              <Text
                style={[styles.errorText, { color: theme.colors.error }]}
                testID="paywall-error-text"
              >
                {error}
              </Text>
            </View>
          ) : null}

          {/* Primary CTA Button */}
          <Pressable
            style={[
              styles.ctaButton,
              { backgroundColor: theme.colors.primary },
              isPurchasing && { opacity: 0.8 },
            ]}
            onPress={handlePurchase}
            disabled={isPurchasing}
            accessibilityRole="button"
            testID="paywall-cta-btn"
          >
            {isPurchasing ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <Text
                style={[
                  styles.ctaButtonText,
                  { color: theme.colors.background, ...theme.typography.button },
                ]}
              >
                {selectedPackage === 'annual' && currentPkg.trialDays > 0
                  ? t('paywall.ctaTrial').replace('{price}', currentPkg.priceString)
                  : t('paywall.ctaSubscribe').replace('{price}', currentPkg.priceString)}
              </Text>
            )}
          </Pressable>

          {/* Mandatory StoreKit Legal Disclaimers (Terms of Renewal / Cancellation) */}
          <View style={styles.legalNoticeContainer}>
            <Text
              style={[
                styles.legalNoticeText,
                { color: theme.colors.muted, ...theme.typography.caption },
              ]}
              testID="paywall-legal-disclaimer"
            >
              {selectedPackage === 'annual'
                ? t('paywall.legalDisclaimer')
                : t('paywall.legalMonthlyDisclaimer')}
            </Text>
          </View>

          {/* Restore Purchases & Legal Links */}
          <View style={styles.footerLinks}>
            <Pressable
              onPress={handleRestore}
              disabled={isRestoring}
              accessibilityRole="button"
              testID="restore-purchases-btn"
            >
              <Text
                style={[
                  styles.linkText,
                  { color: theme.colors.primary, ...theme.typography.caption },
                ]}
              >
                {isRestoring ? t('paywall.restoring') : t('paywall.restore')}
              </Text>
            </Pressable>

            <Text style={[styles.bulletSep, { color: theme.colors.muted }]}>•</Text>

            <Pressable onPress={openTerms} accessibilityRole="button" testID="terms-btn">
              <Text
                style={[
                  styles.linkText,
                  { color: theme.colors.muted, ...theme.typography.caption },
                ]}
              >
                {t('paywall.terms')}
              </Text>
            </Pressable>

            <Text style={[styles.bulletSep, { color: theme.colors.muted }]}>•</Text>

            <Pressable
              onPress={openPrivacy}
              accessibilityRole="button"
              testID="privacy-btn"
            >
              <Text
                style={[
                  styles.linkText,
                  { color: theme.colors.muted, ...theme.typography.caption },
                ]}
              >
                {t('paywall.privacy')}
              </Text>
            </Pressable>
          </View>

          {/* Continue Free Option */}
          {allowDismiss ? (
            <Pressable
              style={styles.continueFreeBtn}
              onPress={() => {
                clearStatus();
                onClose();
              }}
              accessibilityRole="button"
              testID="continue-free-btn"
            >
              <Text
                style={[
                  styles.continueFreeText,
                  { color: theme.colors.muted, ...theme.typography.bodySmall },
                ]}
              >
                {t('paywall.continueFree')}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 1,
  },
  closeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  title: {
    fontSize: 26,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  benefitsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
  },
  plansSection: {
    gap: 12,
    marginBottom: 16,
  },
  planCard: {
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planNameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: {
    fontSize: 16,
  },
  featuredTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  featuredTagText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  actualPrice: {
    fontSize: 22,
    marginTop: 4,
  },
  monthlyEquivalent: {
    fontSize: 12,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
  },
  ctaButton: {
    minHeight: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  ctaButtonText: {
    fontSize: 15,
  },
  legalNoticeContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  legalNoticeText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  linkText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  bulletSep: {
    fontSize: 12,
  },
  continueFreeBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  continueFreeText: {
    fontSize: 13,
  },
});
