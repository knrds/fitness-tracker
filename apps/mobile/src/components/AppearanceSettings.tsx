import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { createTheme, useTheme, withAlpha } from '@fitness-tracker/ui';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useProfileStore, CelebrationEffect } from '../stores/profileStore';
import { useAchievementStore } from '../stores/achievementStore';
import {
  COLORWAY_REWARDS,
  CELEBRATION_REWARDS,
  isColorwayUnlocked,
  isCelebrationUnlocked,
  RewardColorwayConfig,
  RewardCelebrationConfig,
} from '../utils/rewards';
import { BattlePassModal } from './BattlePassModal';
import { WorkoutCelebrationOverlay } from './workout/WorkoutCelebrationOverlay';

export function AppearanceSettings() {
  const theme = useTheme();
  const { profile, updateProfile } = useProfileStore();
  const { level, xp } = useAchievementStore();
  const [battlePassVisible, setBattlePassVisible] = useState(false);
  const [previewEffect, setPreviewEffect] = useState<CelebrationEffect | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const activeColorway = profile.colorway ?? 'glacier';
  const activeCelebration = profile.celebrationEffect ?? 'classic';

  const lightThemes = COLORWAY_REWARDS.filter((c) => c.isLight);
  const darkThemes = COLORWAY_REWARDS.filter((c) => !c.isLight);

  const handleSelectColorway = (item: RewardColorwayConfig) => {
    const unlocked = isColorwayUnlocked(item.id, level);
    if (!unlocked) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Design gesperrt',
        `Das Theme "${item.name}" wird ab Level ${item.requiredLevel} (Rang ${item.requiredRank}) freigeschaltet.\n\nMöchtest du dir den Level-Pass ansehen?`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Level-Pass öffnen',
            onPress: () => setBattlePassVisible(true),
          },
        ],
      );
      return;
    }

    void Haptics.selectionAsync();
    updateProfile({ colorway: item.id });
  };

  const handleSelectCelebration = (item: RewardCelebrationConfig) => {
    const unlocked = isCelebrationUnlocked(item.id, level);
    if (!unlocked) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Effekt gesperrt',
        `Der Feier-Effekt "${item.name}" wird ab Level ${item.requiredLevel} (Rang ${item.requiredRank}) freigeschaltet.\n\nMöchtest du dir den Level-Pass ansehen?`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Level-Pass öffnen',
            onPress: () => setBattlePassVisible(true),
          },
        ],
      );
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProfile({ celebrationEffect: item.id });

    // Trigger preview burst
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    setPreviewEffect(item.id);
    previewTimerRef.current = setTimeout(() => {
      setPreviewEffect(null);
    }, 2400);
  };

  const renderColorwayCard = (option: RewardColorwayConfig) => {
    const preview = createTheme(option.id);
    const isSelected = option.id === activeColorway;
    const isUnlocked = isColorwayUnlocked(option.id, level);

    return (
      <Pressable
        key={option.id}
        accessibilityRole="radio"
        accessibilityLabel={`${option.name} colorway`}
        accessibilityState={{ checked: isSelected, disabled: !isUnlocked }}
        aria-checked={isSelected}
        onPress={() => handleSelectColorway(option)}
        style={({ pressed }) => [
          styles.themeCard,
          {
            backgroundColor: isSelected
              ? withAlpha(theme.colors.primary, 0.08)
              : theme.colors.surface,
            borderColor: isSelected
              ? theme.colors.primary
              : isUnlocked
              ? theme.colors.border
              : theme.colors.border,
            opacity: !isUnlocked ? 0.72 : pressed ? 0.82 : 1,
          },
        ]}
      >
        {/* Top Meta: Name & Mode / Lock Badge */}
        <View style={styles.cardTopRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.themeName,
              {
                color: isSelected ? theme.colors.primary : isUnlocked ? theme.colors.text : theme.colors.muted,
              },
            ]}
          >
            {option.name}
          </Text>
          {isUnlocked ? (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: option.isLight
                    ? withAlpha('#0284C7', 0.15)
                    : withAlpha(theme.colors.muted, 0.15),
                  borderColor: option.isLight
                    ? withAlpha('#0284C7', 0.4)
                    : withAlpha(theme.colors.muted, 0.3),
                },
              ]}
            >
              <Ionicons
                name={option.isLight ? 'sunny-outline' : 'moon-outline'}
                size={10}
                color={option.isLight ? '#0284C7' : theme.colors.muted}
              />
              <Text
                style={[
                  styles.badgeText,
                  { color: option.isLight ? '#0284C7' : theme.colors.muted },
                ]}
              >
                {option.isLight ? 'LIGHT' : 'DARK'}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.badge,
                styles.lockBadge,
                {
                  backgroundColor: withAlpha(theme.colors.warning, 0.12),
                  borderColor: withAlpha(theme.colors.warning, 0.4),
                },
              ]}
            >
              <Ionicons name="lock-closed" size={10} color={theme.colors.warning} />
              <Text style={[styles.badgeText, { color: theme.colors.warning }]}>
                LVL {option.requiredLevel}
              </Text>
            </View>
          )}
        </View>

        {/* Live Miniature UI Mockup */}
        <View
          style={[
            styles.mockupContainer,
            {
              backgroundColor: preview.colors.background,
              borderColor: preview.colors.border,
            },
          ]}
        >
          {/* Mini Navigation Bar Header */}
          <View
            style={[
              styles.miniHeader,
              {
                backgroundColor: preview.colors.surfaceElevated,
                borderBottomColor: preview.colors.border,
              },
            ]}
          >
            <View style={[styles.miniDot, { backgroundColor: preview.colors.primary }]} />
            <View
              style={[
                styles.miniLine,
                { backgroundColor: preview.colors.border, width: 44 },
              ]}
            />
            <View
              style={[
                styles.miniCircle,
                { backgroundColor: preview.colors.border },
              ]}
            />
          </View>

          {/* Mini Card in Preview */}
          <View
            style={[
              styles.miniCard,
              {
                backgroundColor: preview.colors.surface,
                borderColor: preview.colors.border,
              },
            ]}
          >
            <View style={{ gap: 4, flex: 1 }}>
              <View
                style={[
                  styles.miniLine,
                  { backgroundColor: preview.colors.text, width: 36, height: 4 },
                ]}
              />
              <View
                style={[
                  styles.miniLine,
                  { backgroundColor: preview.colors.muted, width: 24, height: 3 },
                ]}
              />
            </View>
            <View
              style={[
                styles.miniButton,
                { backgroundColor: preview.colors.primary },
              ]}
            >
              <Ionicons
                name="flash"
                size={8}
                color={preview.colors.onPrimary || '#FFFFFF'}
              />
            </View>
          </View>

          {/* Swatch palette dots */}
          <View style={styles.swatchRow}>
            {[
              preview.colors.primary,
              preview.colors.secondary,
              preview.colors.tertiary,
            ].map((color, idx) => (
              <View
                key={idx}
                style={[styles.swatchDot, { backgroundColor: color }]}
              />
            ))}
          </View>
        </View>

        {/* Bottom Description & Status Indicator */}
        <View style={styles.cardBottomRow}>
          <Text
            numberOfLines={1}
            style={[styles.themeDesc, { color: isUnlocked ? theme.colors.muted : theme.colors.muted }]}
          >
            {option.subtitle}
          </Text>
          {isSelected ? (
            <Ionicons name="checkmark-circle" color={theme.colors.primary} size={18} />
          ) : !isUnlocked ? (
            <Ionicons name="lock-closed-outline" color={theme.colors.warning} size={16} />
          ) : (
            <Ionicons name="ellipse-outline" color={theme.colors.muted} size={18} />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Section Header with Link to Level Pass */}
      <View style={styles.headerRow}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Ionicons name="color-palette-outline" size={16} color={theme.colors.primary} />
            <Text style={[theme.typography.label, { color: theme.colors.primary }]}>
              THEMES &amp; FARBWELTEN
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Level Pass öffnen"
            onPress={() => setBattlePassVisible(true)}
            style={[
              styles.battlePassBtn,
              { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.primary + '40' },
            ]}
          >
            <Ionicons name="flash" size={12} color={theme.colors.primary} />
            <Text style={[styles.battlePassBtnText, { color: theme.colors.primary }]}>
              LEVEL-PASS (LVL {level}) ↗
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          11 exklusive Farbwelten · Schalte neue Themes & Effekte über deinen Level-Pass frei
        </Text>
      </View>

      {/* Group 1: Light Themes (Helle Farbwelten) */}
      <View style={styles.subgroup}>
        <View style={styles.subgroupHeader}>
          <Ionicons name="sunny" size={13} color="#0284C7" />
          <Text style={[styles.subgroupTitle, { color: theme.colors.text }]}>
            LIGHT MODES (HELLE THEMES)
          </Text>
        </View>
        <View style={styles.grid}>{lightThemes.map(renderColorwayCard)}</View>
      </View>

      {/* Group 2: Dark Themes (Dunkle Farbwelten) */}
      <View style={styles.subgroup}>
        <View style={styles.subgroupHeader}>
          <Ionicons name="moon" size={13} color={theme.colors.primary} />
          <Text style={[styles.subgroupTitle, { color: theme.colors.text }]}>
            DARK MODES (DUNKLE THEMES)
          </Text>
        </View>
        <View style={styles.grid}>{darkThemes.map(renderColorwayCard)}</View>
      </View>

      {/* Group 3: Workout Celebration Rewards */}
      <View style={[styles.subgroup, { marginTop: 12 }]}>
        <View style={styles.subgroupHeader}>
          <Ionicons name="sparkles" size={14} color={theme.colors.primary} />
          <Text style={[styles.subgroupTitle, { color: theme.colors.text }]}>
            WORKOUT-FEIER EFFEKTE (CELEBRATIONS)
          </Text>
        </View>
        <Text style={[styles.celebrationSubtitle, { color: theme.colors.muted }]}>
          Wähle deinen Animationseffekt für abgeschlossene Workouts. Tippe zum Testen!
        </Text>

        <View style={styles.celebrationList}>
          {CELEBRATION_REWARDS.map((eff) => {
            const isSelected = eff.id === activeCelebration;
            const isUnlocked = isCelebrationUnlocked(eff.id, level);

            return (
              <Pressable
                key={eff.id}
                accessibilityRole="radio"
                accessibilityLabel={eff.name}
                accessibilityState={{ checked: isSelected, disabled: !isUnlocked }}
                aria-checked={isSelected}
                onPress={() => handleSelectCelebration(eff)}
                style={({ pressed }) => [
                  styles.celebrationCard,
                  {
                    backgroundColor: isSelected
                      ? withAlpha(theme.colors.primary, 0.08)
                      : theme.colors.surface,
                    borderColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.border,
                    opacity: !isUnlocked ? 0.7 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                {/* Swatch indicator row */}
                <View style={styles.celebrationLeft}>
                  <View style={styles.swatchCluster}>
                    {eff.previewColors.map((color, i) => (
                      <View
                        key={i}
                        style={[
                          styles.celebrationDot,
                          { backgroundColor: color, shadowColor: color, shadowOpacity: 0.5, shadowRadius: 3 },
                        ]}
                      />
                    ))}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={[
                          styles.celebrationName,
                          { color: isSelected ? theme.colors.primary : theme.colors.text },
                        ]}
                      >
                        {eff.name}
                      </Text>
                      {!isUnlocked && (
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: withAlpha(theme.colors.warning, 0.12),
                              borderColor: withAlpha(theme.colors.warning, 0.4),
                            },
                          ]}
                        >
                          <Ionicons name="lock-closed" size={9} color={theme.colors.warning} />
                          <Text style={[styles.badgeText, { color: theme.colors.warning }]}>
                            LVL {eff.requiredLevel}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.celebrationDesc, { color: theme.colors.muted }]}>
                      {eff.description}
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name={isSelected ? 'checkmark-circle' : !isUnlocked ? 'lock-closed-outline' : 'ellipse-outline'}
                  color={isSelected ? theme.colors.primary : !isUnlocked ? theme.colors.warning : theme.colors.muted}
                  size={20}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Live Preview Overlay when tapping a celebration effect */}
      {previewEffect && <WorkoutCelebrationOverlay effect={previewEffect} />}

      {/* Battle Pass Popup */}
      <BattlePassModal
        visible={battlePassVisible}
        onClose={() => setBattlePassVisible(false)}
        level={level}
        xp={xp}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    marginBottom: 24,
  },
  headerRow: {
    gap: 6,
    marginBottom: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  battlePassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  battlePassBtnText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
  },
  subgroup: {
    gap: 8,
  },
  subgroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  subgroupTitle: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeCard: {
    flex: 1,
    minWidth: 155,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  themeName: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  lockBadge: {
    gap: 2,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
  mockupContainer: {
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    padding: 6,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  miniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: 4,
    borderBottomWidth: 0.5,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniLine: {
    height: 3,
    borderRadius: 1.5,
  },
  miniCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 5,
    borderRadius: 6,
    borderWidth: 0.5,
    marginVertical: 2,
  },
  miniButton: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  swatchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  themeDesc: {
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 14,
    flex: 1,
  },
  celebrationSubtitle: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    marginBottom: 4,
  },
  celebrationList: {
    gap: 8,
  },
  celebrationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  celebrationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  swatchCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 24,
    height: 24,
    gap: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  celebrationName: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  celebrationDesc: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 15,
  },
});
