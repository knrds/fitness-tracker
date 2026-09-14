import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@fitness-tracker/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LEVEL_RANKS, RANK_ICONS, getRankForLevel } from '../utils/level';
import { LevelRankBadge } from './LevelRankBadge';

export interface BattlePassModalProps {
  visible: boolean;
  onClose: () => void;
  level: number;
  xp: number;
}

const RANK_REWARDS: Record<
  number,
  { perk: string; badgeTitle: string; description: string; rewardTag: string }
> = {
  1: {
    badgeTitle: 'Bronze Medaillon',
    perk: 'Glacier Core & Amber Forge Themes',
    rewardTag: '2x Themes & Basis Konfetti',
    description: 'Dein Einstieg: 2 Farbwelten und der klassische Workout-Konfetti-Effekt.',
  },
  2: {
    badgeTitle: 'Silber Medaillon',
    perk: 'Neues Theme: Arctic Lab (Light Mode)',
    rewardTag: 'Light Mode I',
    description: 'Schaltet das strahlend weiße, reflexionsarme Arctic-Design für dein Training frei.',
  },
  3: {
    badgeTitle: 'Gold Medaillon',
    perk: 'Theme: Volt Verde + Feier-Effekt: Cyber Neon',
    rewardTag: 'Theme & Effekt',
    description: 'Bio-Signal Mint Farbwelt und futuristischer Laser-Rain-Effekt beim Workout-Abschluss.',
  },
  4: {
    badgeTitle: 'Platin Medaillon',
    perk: 'Neues Theme: Solar Dune (Light Mode)',
    rewardTag: 'Light Mode II',
    description: 'Warmes Sandstein- und Bernsteingold-Design mit perfektem Lesekomfort bei Sonnenlicht.',
  },
  5: {
    badgeTitle: 'Smaragd Medaillon',
    perk: 'Neues Theme: Telemetry Cyber',
    rewardTag: 'Dark Cyber Theme',
    description: 'Elektrisierendes Chartreuse auf tiefem Midnight Navy.',
  },
  6: {
    badgeTitle: 'Rubin Medaillon',
    perk: 'Theme: Volt Ember + Feier-Effekt: Champion Gold',
    rewardTag: 'Theme & Effekt',
    description: 'Kupfernes Flammen-Design und glänzender Goldmünzen-Regen bei Workout-Abschluss.',
  },
  7: {
    badgeTitle: 'Saphir Medaillon',
    perk: 'Neues Theme: Alpine Mist (Light Mode)',
    rewardTag: 'Light Mode III',
    description: 'Kristallklares Studio-Weiß mit kontraststarkem Electric-Indigo-Akzent.',
  },
  8: {
    badgeTitle: 'Obsidian Veteran',
    perk: 'Theme: Avionics Stealth + Veteran Status',
    rewardTag: 'Stealth Theme',
    description: 'Militärisches Zink- und Säure-Lime-Design für gestählte Athleten.',
  },
  9: {
    badgeTitle: 'Titan Champion',
    perk: 'Theme: Royal Titanium + Feier-Effekt: Supernova Starlight',
    rewardTag: 'Theme & Effekt',
    description: 'Champagner-Goldenes Luxus-Design und galaktische Diamant-Sterne bei Workout-Abschluss.',
  },
  10: {
    badgeTitle: 'VOLT Master',
    perk: 'VOLT Master Medaillon + Höchster Legenden-Status',
    rewardTag: 'Höchste Auszeichnung',
    description: 'Die ultimative Meisterschaft. Du hast die Spitze des Eisens erklommen.',
  },
};

export function BattlePassModal({ visible, onClose, level, xp }: BattlePassModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const c = theme.colors;
  const currentRankInfo = getRankForLevel(level);
  const scrollRef = useRef<ScrollView>(null);

  const xpInCurrentLevel = xp % 500;
  const xpNeededForNextLevel = 500 - xpInCurrentLevel;
  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / 500) * 100));

  // Auto-scroll to active rank when opened
  useEffect(() => {
    if (visible) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const activeIndex = LEVEL_RANKS.findIndex(
        (r) => level >= r.minLevel && level <= r.maxLevel,
      );
      if (activeIndex > 0) {
        setTimeout(() => {
          scrollRef.current?.scrollTo({
            y: Math.max(0, activeIndex * 210 - 20),
            animated: true,
          });
        }, 300);
      }
    }
  }, [visible, level]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: c.overlay }]}>
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: c.background,
              borderColor: c.border,
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Top Bar with Title & Close Button */}
          <View style={styles.topBar}>
            <View>
              <View style={styles.passHeaderTag}>
                <Ionicons name="flash" size={13} color={c.primary} />
                <Text style={[styles.passHeaderTagText, { color: c.primary }]}>
                  VOLT SEASON 1: ASCEND
                </Text>
              </View>
              <Text style={[styles.modalTitle, { color: c.text }]}>LEVEL-PASS</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Schließen"
              onPress={onClose}
              hitSlop={12}
              style={[styles.closeBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <Ionicons name="close" size={22} color={c.muted} />
            </Pressable>
          </View>

          {/* User Current Status Hero Card */}
          <View
            style={[
              styles.currentStatusCard,
              {
                backgroundColor: c.surface,
                borderColor: c.primary,
              },
            ]}
          >
            <View style={styles.currentStatusHeader}>
              <LevelRankBadge level={level} size={58} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={styles.currentStatusBadgeRow}>
                  <Text style={[styles.currentLevelNumber, { color: c.primary }]}>
                    LEVEL {level}
                  </Text>
                  <View
                    style={[
                      styles.currentRankPill,
                      { backgroundColor: c.primary + '25', borderColor: c.primary },
                    ]}
                  >
                    <Text style={[styles.currentRankPillText, { color: c.primary }]}>
                      RANG {currentRankInfo.rank}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.currentRankTitle, { color: c.text }]}>
                  {currentRankInfo.title}
                </Text>

                <Text style={[styles.currentXpSubtitle, { color: c.muted }]}>
                  {xp.toLocaleString()} XP Gesamt · Noch {xpNeededForNextLevel} XP bis Level{' '}
                  {level + 1}
                </Text>
              </View>
            </View>

            {/* Level XP Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarBg,
                  { backgroundColor: c.surfaceElevated || c.border },
                ]}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progressPercent}%`, backgroundColor: c.primary },
                  ]}
                />
              </View>
              <Text style={[styles.progressBarLabel, { color: c.muted }]}>
                {xpInCurrentLevel} / 500 XP
              </Text>
            </View>
          </View>

          {/* Roadmap Track Title */}
          <View style={styles.trackSectionHeader}>
            <Text style={[styles.trackSectionTitle, { color: c.text }]}>RÄNGE & BELOHNUNGEN</Text>
            <Text style={[styles.trackSectionSubtitle, { color: c.muted }]}>
              Level 1 bis 50+
            </Text>
          </View>

          {/* Scrollable Battle Pass Track */}
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {LEVEL_RANKS.map((tier, index) => {
              const isCurrentRank = level >= tier.minLevel && level <= tier.maxLevel;
              const isCompletedRank = level > tier.maxLevel;
              const isLockedRank = level < tier.minLevel;
              const rewards = RANK_REWARDS[tier.rank];
              const iconSource = RANK_ICONS[tier.rank];

              // Levels within this rank
              const rankLevels: number[] = [];
              for (let lvl = tier.minLevel; lvl <= tier.maxLevel; lvl++) {
                rankLevels.push(lvl);
              }

              return (
                <View key={tier.rank} style={styles.tierContainer}>
                  {/* Vertical Track Connector Line */}
                  {index < LEVEL_RANKS.length - 1 && (
                    <View
                      style={[
                        styles.connectorLine,
                        {
                          backgroundColor: isCompletedRank
                            ? c.primary
                            : isCurrentRank
                            ? c.primary + '70'
                            : c.border,
                        },
                      ]}
                    />
                  )}

                  <View
                    style={[
                      styles.tierCard,
                      {
                        backgroundColor: isCurrentRank ? c.surface : c.surface,
                        borderColor: isCurrentRank
                          ? c.primary
                          : isCompletedRank
                          ? c.primary + '50'
                          : c.border,
                        borderWidth: isCurrentRank ? 2 : 1,
                      },
                    ]}
                  >
                    {/* Header of Tier */}
                    <View style={styles.tierCardHeader}>
                      {/* Medallion Icon with circular border */}
                      <View
                        style={[
                          styles.medallionWrapper,
                          {
                            borderColor: isCurrentRank
                              ? c.primary
                              : isCompletedRank
                              ? c.primary
                              : c.border,
                            backgroundColor: c.background,
                          },
                        ]}
                      >
                        {iconSource ? (
                          <Image
                            source={iconSource}
                            style={[
                              styles.medallionImage,
                              isLockedRank && { opacity: 0.35 },
                            ]}
                            resizeMode="contain"
                          />
                        ) : null}
                        {isLockedRank && (
                          <View style={styles.lockedIconOverlay}>
                            <Ionicons name="lock-closed" size={16} color={c.muted} />
                          </View>
                        )}
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={styles.tierStatusRow}>
                          <Text
                            style={[
                              styles.tierRankLabel,
                              { color: isCurrentRank ? c.primary : c.muted },
                            ]}
                          >
                            RANG {tier.rank} · LEVEL {tier.minLevel}–{tier.maxLevel}
                          </Text>

                          {/* Status Pill */}
                          {isCompletedRank && (
                            <View
                              style={[
                                styles.statusPill,
                                { backgroundColor: c.primary + '20', borderColor: c.primary },
                              ]}
                            >
                              <Ionicons name="checkmark-circle" size={12} color={c.primary} />
                              <Text style={[styles.statusPillText, { color: c.primary }]}>
                                ERREICHT
                              </Text>
                            </View>
                          )}
                          {isCurrentRank && (
                            <View
                              style={[
                                styles.statusPill,
                                { backgroundColor: c.primary, borderColor: c.primary },
                              ]}
                            >
                              <Ionicons name="star" size={12} color={c.background} />
                              <Text style={[styles.statusPillText, { color: c.background }]}>
                                AKTUELL
                              </Text>
                            </View>
                          )}
                          {isLockedRank && (
                            <View
                              style={[
                                styles.statusPill,
                                { backgroundColor: c.surfaceElevated || c.border, borderColor: c.border },
                              ]}
                            >
                              <Ionicons name="lock-closed" size={11} color={c.muted} />
                              <Text style={[styles.statusPillText, { color: c.muted }]}>
                                AB LVL {tier.minLevel}
                              </Text>
                            </View>
                          )}
                        </View>

                        <Text
                          style={[
                            styles.tierTitle,
                            { color: isLockedRank ? c.muted : c.text },
                          ]}
                        >
                          {tier.title}
                        </Text>
                      </View>
                    </View>

                    {/* Reward description */}
                    {rewards && (
                      <View
                        style={[
                          styles.rewardBox,
                          {
                            backgroundColor: isCurrentRank
                              ? c.primary + '12'
                              : isCompletedRank
                              ? c.background
                              : c.background,
                            borderColor: isCurrentRank ? c.primary + '40' : c.border,
                          },
                        ]}
                      >
                        <View style={styles.rewardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                            <Ionicons
                              name={isCompletedRank ? 'checkmark-circle' : isCurrentRank ? 'gift' : 'ribbon-outline'}
                              size={16}
                              color={isCurrentRank ? c.primary : isCompletedRank ? '#57DFAB' : c.muted}
                            />
                            <Text
                              style={[
                                styles.rewardTitle,
                                { color: isLockedRank ? c.muted : c.text },
                              ]}
                            >
                              {rewards.perk}
                            </Text>
                          </View>
                          {rewards.rewardTag && (
                            <View
                              style={[
                                styles.rewardTagBadge,
                                {
                                  backgroundColor: isCompletedRank
                                    ? '#57DFAB20'
                                    : isCurrentRank
                                    ? c.primary + '20'
                                    : c.surfaceElevated || c.background,
                                  borderColor: isCompletedRank
                                    ? '#57DFAB'
                                    : isCurrentRank
                                    ? c.primary
                                    : c.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.rewardTagText,
                                  {
                                    color: isCompletedRank
                                      ? '#57DFAB'
                                      : isCurrentRank
                                      ? c.primary
                                      : c.muted,
                                  },
                                ]}
                              >
                                {isCompletedRank ? `${rewards.rewardTag} ✓` : rewards.rewardTag}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.rewardDesc, { color: c.muted }]}>
                          {rewards.description}
                        </Text>
                      </View>
                    )}

                    {/* Individual Level Milestones */}
                    <View style={styles.levelPillsRow}>
                      {rankLevels.map((lvl) => {
                        const isDone = level > lvl;
                        const isCurrentLvl = level === lvl;

                        return (
                          <View
                            key={lvl}
                            style={[
                              styles.levelStepPill,
                              {
                                backgroundColor: isCurrentLvl
                                  ? c.primary + '20'
                                  : isDone
                                  ? c.primary + '10'
                                  : c.surfaceElevated || c.background,
                                borderColor: isCurrentLvl
                                  ? c.primary
                                  : isDone
                                  ? c.primary + '40'
                                  : c.border,
                              },
                            ]}
                          >
                            {isDone ? (
                              <Ionicons name="checkmark" size={11} color={c.primary} />
                            ) : isCurrentLvl ? (
                              <Ionicons name="radio-button-on" size={11} color={c.primary} />
                            ) : (
                              <Ionicons name="lock-closed-outline" size={10} color={c.muted} />
                            )}
                            <Text
                              style={[
                                styles.levelStepText,
                                {
                                  color: isCurrentLvl
                                    ? c.primary
                                    : isDone
                                    ? c.primary
                                    : c.muted,
                                  fontWeight: isCurrentLvl ? '700' : '500',
                                },
                              ]}
                            >
                              L{lvl}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  passHeaderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  passHeaderTagText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentStatusCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  currentStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentStatusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  currentLevelNumber: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
  currentRankPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  currentRankPillText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  currentRankTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 2,
  },
  currentXpSubtitle: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
  },
  progressBarContainer: {
    marginTop: 14,
    gap: 6,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  progressBarLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'right',
  },
  trackSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  trackSectionTitle: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 1,
  },
  trackSectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  tierContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  connectorLine: {
    position: 'absolute',
    left: 31,
    top: 60,
    bottom: -18,
    width: 2,
    zIndex: 0,
  },
  tierCard: {
    borderRadius: 14,
    padding: 14,
    zIndex: 1,
  },
  tierCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medallionWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  medallionImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  lockedIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  tierRankLabel: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
  tierTitle: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  rewardBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardTitle: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    flex: 1,
  },
  rewardDesc: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 15,
    paddingLeft: 22,
  },
  levelPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  levelStepPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  rewardTagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  rewardTagText: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.4,
  },
  levelStepText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
});
