import React, { useEffect, useRef, useState } from 'react';
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
import { createTheme, useTheme } from '@fitness-tracker/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LEVEL_RANKS, RANK_ICONS, getRankForLevel } from '../utils/level';
import { LevelRankBadge } from './LevelRankBadge';
import {
  getLevelRewards,
  getRemainingXpForLevel,
  getXpForLevel,
  getLevelProgress,
} from '../utils/rewards';
import { useI18n } from '../i18n';

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
    perk: 'Glacier Core (Dark) & Arctic Lab (Light) + Klassisches Konfetti',
    rewardTag: '2x Themes & Konfetti',
    description: 'Dein Einstieg: Direkt 1 Dark- und 1 Light-Theme sowie der klassische Workout-Konfetti-Effekt freigeschaltet.',
  },
  2: {
    badgeTitle: 'Silber Medaillon',
    perk: 'Theme: Solar Dune (L6) · Feier-Effekt: Inferno (L8)',
    rewardTag: 'Theme & Inferno',
    description: 'Warmes Sandstein- und Bernsteingold-Design (L6) und lodernder Inferno-Ember-Storm auf Level 8!',
  },
  3: {
    badgeTitle: 'Gold Medaillon',
    perk: 'Theme: Crimson Neon (L11) · Feier-Effekt: Cyber Neon (L13)',
    rewardTag: 'Theme & Cyber Neon',
    description: 'Rötlich-pinke Neon-Magenta Farbwelt (L11) und futuristischer Laser-Rain-Effekt auf Level 13!',
  },
  4: {
    badgeTitle: 'Platin Medaillon',
    perk: 'Neues Theme: Porcelain Rose (Light Mode)',
    rewardTag: 'Light Mode: Porcelain Rose',
    description: 'Edles Porzellan-Weiß mit kontraststarkem Korallen-Rose-Akzent auf Level 16.',
  },
  5: {
    badgeTitle: 'Smaragd Medaillon',
    perk: 'Neues Theme: EVARO Verde (Dark)',
    rewardTag: 'Theme: EVARO Verde',
    description: 'Bio-Signal Mint Farbwelt auf tiefem Obsidian-Schwarz auf Level 21.',
  },
  6: {
    badgeTitle: 'Rubin Medaillon',
    perk: 'Theme: Telemetry Cyber (L26) · Feier-Effekt: Champion Gold (L29)',
    rewardTag: 'Theme & Gold-Shower',
    description: 'Elektrisierendes Chartreuse-Navy (L26) und glänzender Goldmünzen-Regen auf Level 29!',
  },
  7: {
    badgeTitle: 'Saphir Medaillon',
    perk: 'Theme: Alpine Mist (L31) · Feier-Effekt: Quantum Matrix (L33)',
    rewardTag: 'Theme & Matrix Stream',
    description: 'Kristallklares Studio-Weiß (L31) und kaskadierende digitale Cyber-Matrix-Strahlen auf Level 33!',
  },
  8: {
    badgeTitle: 'Obsidian Veteran',
    perk: 'Theme: EVARO Ember (Dark) + Veteran Status',
    rewardTag: 'Theme: EVARO Ember',
    description: 'Kupfernes Flammen-Design für gestählte Athleten auf Level 36.',
  },
  9: {
    badgeTitle: 'Titan Champion',
    perk: 'Theme: Avionics Stealth (L41) · Feier-Effekt: Supernova (L43)',
    rewardTag: 'Theme & Supernova',
    description: 'Militärisches Zink-Stealth-Design (L41) und galaktische Diamant-Sterne auf Level 43!',
  },
  10: {
    badgeTitle: 'EVARO Master',
    perk: 'Theme: Royal Titanium (Dark) + EVARO Master Medaillon',
    rewardTag: 'Theme & Master Medaillon',
    description: 'Champagner-Goldenes Luxus-Design und die ultimative Meisterschaft des Eisens.',
  },
};

export function BattlePassModal({ visible, onClose, level, xp }: BattlePassModalProps) {
  const theme = useTheme();
  const { t, language } = useI18n();
  const insets = useSafeAreaInsets();
  const c = theme.colors;
  const currentRankInfo = getRankForLevel(level);
  const scrollRef = useRef<ScrollView>(null);
  const [inspectedLevel, setInspectedLevel] = useState<number | null>(null);

  const progressInfo = getLevelProgress(xp);
  const xpInCurrentLevel = progressInfo.xpInCurrentLevel;
  const xpNeededForNextLevel = progressInfo.remainingXp;
  const progressPercent = progressInfo.progressPercent;

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

  const handleSelectLevel = (lvl: number) => {
    void Haptics.selectionAsync();
    setInspectedLevel(lvl);
  };

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
          {/* Top Bar with Back/Close Button on Left & Centered Title */}
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              accessibilityHint={language === 'de' ? 'Schließt den Level Pass' : 'Closes the level pass'}
              onPress={onClose}
              hitSlop={15}
              style={[styles.closeBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <Ionicons name="arrow-back" size={22} color={c.text} />
            </Pressable>

            <View style={styles.topBarCenter}>
              <View style={styles.passHeaderTag}>
                <Ionicons name="flash" size={13} color={c.primary} />
                <Text style={[styles.passHeaderTagText, { color: c.primary }]}>
                  {t('rank.seasonTitle')}
                </Text>
              </View>
              <Text style={[styles.modalTitle, { color: c.text }]}>{t('rank.levelPass')}</Text>
            </View>

            <View style={styles.topBarSpacer} />
          </View>

          {/* Current Rank & XP Card (Hero Status) */}
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
                  <View style={[styles.currentRankPill, { backgroundColor: c.primary + '20' }]}>
                    <Text style={[styles.currentRankPillText, { color: c.primary }]}>
                      {t('rank.rank').toUpperCase()} {currentRankInfo.rank}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.currentRankTitle, { color: c.text }]}>
                  {currentRankInfo.title}
                </Text>

                <Text style={[styles.currentRankSubtitle, { color: c.muted }]}>
                  {t('rank.stillXpToLevel')
                    .replace('{xp}', String(xpNeededForNextLevel))
                    .replace('{level}', String(level + 1))}
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
                {xpInCurrentLevel} / {progressInfo.xpRequiredForNextLevel} XP
              </Text>
            </View>
          </View>

          {/* Roadmap Track Title & Hint */}
          <View style={styles.trackSectionHeader}>
            <View>
              <Text style={[styles.trackSectionTitle, { color: c.text }]}>{t('rank.ranksAndRewards')}</Text>
              <Text style={[styles.trackSectionSubtitle, { color: c.muted }]}>
                {t('rank.tapLevelHint')}
              </Text>
            </View>
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
                            {t('rank.rank').toUpperCase()} {tier.rank} · LEVEL {tier.minLevel}–{tier.maxLevel}
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
                                {t('rank.achieved')}
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
                                {t('rank.current')}
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
                                {t('rank.fromLvl').replace('{level}', String(tier.minLevel))}
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

                    {/* Reward description & tangible badge */}
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
                          <Ionicons
                            name="gift"
                            size={16}
                            color={isCurrentRank ? c.primary : isCompletedRank ? '#57DFAB' : c.muted}
                          />
                          <Text
                            style={[
                              styles.rewardTitle,
                              { color: isCurrentRank ? c.primary : isCompletedRank ? '#57DFAB' : c.text },
                            ]}
                          >
                            {rewards.perk}
                          </Text>
                          {rewards.rewardTag && (
                            <View
                              style={[
                                styles.rewardTagBadge,
                                {
                                  backgroundColor: isCompletedRank
                                    ? '#57DFAB20'
                                    : isCurrentRank
                                    ? c.primary + '25'
                                    : c.surfaceElevated || c.border,
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

                    {/* Individual Level Milestones (Interactive Chips) */}
                    <View style={styles.levelPillsRow}>
                      {rankLevels.map((lvl) => {
                        const isDone = level > lvl;
                        const isCurrentLvl = level === lvl;
                        const lvlPayload = getLevelRewards(lvl);
                        const hasSpecialReward = lvlPayload.hasRewards || lvl === tier.minLevel;

                        return (
                          <Pressable
                            key={lvl}
                            accessibilityRole="button"
                            accessibilityLabel={t('rank.showLevelDetails').replace('{level}', String(lvl))}
                            onPress={() => handleSelectLevel(lvl)}
                            style={({ pressed }) => [
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
                                opacity: pressed ? 0.75 : 1,
                              },
                            ]}
                          >
                            {hasSpecialReward ? (
                              <Ionicons
                                name="gift-outline"
                                size={11}
                                color={isCurrentLvl || isDone ? c.primary : '#FFB84D'}
                              />
                            ) : isDone ? (
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
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Level Detail Inspection Modal */}
          {inspectedLevel !== null && (() => {
            const targetRank = getRankForLevel(inspectedLevel);
            const targetXp = getXpForLevel(inspectedLevel);
            const missingXp = getRemainingXpForLevel(inspectedLevel, xp);
            const isUnlocked = level >= inspectedLevel;
            const lvlRewards = getLevelRewards(inspectedLevel);
            const isRankStart = inspectedLevel === targetRank.minLevel;
            const rankReward = RANK_REWARDS[targetRank.rank];

            return (
              <Modal
                visible={true}
                transparent
                animationType="fade"
                onRequestClose={() => setInspectedLevel(null)}
              >
                <View style={[styles.detailOverlay, { backgroundColor: c.overlay }]}>
                  <Pressable
                    style={styles.detailBackdrop}
                    accessibilityRole="button"
                    accessibilityLabel={t('rank.closeBackdrop')}
                    onPress={() => setInspectedLevel(null)}
                  />
                  <View
                    style={[
                      styles.detailSheet,
                      {
                        backgroundColor: c.surface,
                        borderColor: c.border,
                      },
                    ]}
                  >
                    {/* Sheet Top Bar */}
                    <View style={styles.detailHeader}>
                      <View style={styles.detailHeaderLeft}>
                        <Image
                          source={RANK_ICONS[targetRank.rank]}
                          style={styles.detailMedallionThumb}
                          resizeMode="contain"
                        />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <View style={styles.detailLevelBadgeRow}>
                            <Text style={[styles.detailLevelTitle, { color: c.text }]}>
                              LEVEL {inspectedLevel}
                            </Text>
                            <View
                              style={[
                                styles.statusPill,
                                {
                                  backgroundColor: isUnlocked
                                    ? '#57DFAB20'
                                    : c.surfaceElevated || c.border,
                                  borderColor: isUnlocked ? '#57DFAB' : c.border,
                                },
                              ]}
                            >
                              <Ionicons
                                name={isUnlocked ? 'checkmark-circle' : 'lock-closed'}
                                size={11}
                                color={isUnlocked ? '#57DFAB' : c.muted}
                              />
                              <Text
                                style={[
                                  styles.statusPillText,
                                  { color: isUnlocked ? '#57DFAB' : c.muted },
                                ]}
                              >
                                {isUnlocked ? t('rank.unlocked') : t('rank.locked')}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.detailRankSubtitle, { color: c.muted }]}>
                            {t('rank.rank')} {targetRank.rank}: {targetRank.title}
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('common.close')}
                        onPress={() => setInspectedLevel(null)}
                        style={[
                          styles.closeBtn,
                          {
                            width: 32,
                            height: 32,
                            backgroundColor: c.background,
                            borderColor: c.border,
                          },
                        ]}
                      >
                        <Ionicons name="close" size={18} color={c.muted} />
                      </Pressable>
                    </View>

                    {/* XP Progress to this Level */}
                    <View
                      style={[
                        styles.detailXpBox,
                        {
                          backgroundColor: c.background,
                          borderColor: isUnlocked ? '#57DFAB40' : c.primary + '40',
                        },
                      ]}
                    >
                      <View style={styles.detailXpHeader}>
                        <Text style={[styles.detailXpLabel, { color: c.muted }]}>
                          {t('rank.experienceStatus')}
                        </Text>
                        <Text
                          style={[
                            styles.detailXpTarget,
                            { color: isUnlocked ? '#57DFAB' : c.primary },
                          ]}
                        >
                          {targetXp.toLocaleString(language === 'de' ? 'de-DE' : 'en-US')} {t('rank.totalXp')}
                        </Text>
                      </View>

                      {isUnlocked ? (
                        <View style={styles.detailXpCompletedRow}>
                          <Ionicons name="checkmark-circle" size={16} color="#57DFAB" />
                          <Text style={[styles.detailXpCompletedText, { color: c.text }]}>
                            {t('rank.alreadyReachedProgress')}{' '}
                            <Text style={{ color: c.primary, fontWeight: '700' }}>
                              {xp.toLocaleString(language === 'de' ? 'de-DE' : 'en-US')} XP
                            </Text>
                          </Text>
                        </View>
                      ) : (
                        <View>
                          <View style={styles.detailMissingXpRow}>
                            <Text style={[styles.detailMissingXpNum, { color: c.primary }]}>
                              {t('rank.xpNeeded').replace(
                                '{xp}',
                                missingXp.toLocaleString(language === 'de' ? 'de-DE' : 'en-US'),
                              )}
                            </Text>
                            <Text style={[styles.detailMissingWorkouts, { color: c.muted }]}>
                              {t('rank.approxWorkouts').replace(
                                '{count}',
                                String(Math.ceil(missingXp / 150)),
                              )}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.detailProgressBarBg,
                              { backgroundColor: c.surfaceElevated || c.border },
                            ]}
                          >
                            <View
                              style={[
                                styles.detailProgressBarFill,
                                {
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      targetXp > 0 ? (xp / targetXp) * 100 : 0,
                                    ),
                                  )}%`,
                                  backgroundColor: c.primary,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Rewards or Milestone Information */}
                    {lvlRewards.hasRewards || isRankStart ? (
                      <View style={styles.detailRewardsSection}>
                        <Text style={[styles.detailSectionTitle, { color: c.text }]}>
                          {t('rank.rewardsAtLevel').replace('{level}', String(inspectedLevel))}
                        </Text>

                        {/* Colorway Rewards (Miniature View) */}
                        {lvlRewards.colorways.map((cw) => {
                          const preview = createTheme(cw.id);
                          return (
                            <View
                              key={cw.id}
                              style={[
                                styles.miniPreviewCard,
                                {
                                  backgroundColor: preview.colors.background,
                                  borderColor: preview.colors.border,
                                },
                              ]}
                            >
                              <View style={styles.miniThemeColorStrip}>
                                <View
                                  style={[
                                    styles.miniThemeTile,
                                    {
                                      backgroundColor: preview.colors.surface,
                                      borderColor: preview.colors.border,
                                    },
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.miniThemeAccentDot,
                                      { backgroundColor: preview.colors.primary },
                                    ]}
                                  />
                                  <Text
                                    style={[
                                      styles.miniThemeMockText,
                                      { color: preview.colors.textPrimary },
                                    ]}
                                  >
                                    Aa
                                  </Text>
                                </View>
                              </View>

                              <View style={styles.miniThemeInfo}>
                                <View style={styles.miniBadgeRow}>
                                  <Text
                                    style={[
                                      styles.miniItemTitle,
                                      { color: preview.colors.textPrimary },
                                    ]}
                                  >
                                    {cw.name}
                                  </Text>
                                  <View
                                    style={[
                                      styles.miniPillTag,
                                      {
                                        backgroundColor:
                                          preview.colors.primary + '25',
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.miniPillTagText,
                                        { color: preview.colors.primary },
                                      ]}
                                    >
                                      {cw.isLight ? t('rank.lightTheme') : t('rank.darkTheme')}
                                    </Text>
                                  </View>
                                </View>
                                <Text
                                  style={[
                                    styles.miniItemSubtitle,
                                    { color: preview.colors.textSecondary },
                                  ]}
                                >
                                  {cw.subtitle}
                                </Text>
                              </View>
                            </View>
                          );
                        })}

                        {/* Celebration Effect Rewards (Miniature View) */}
                        {lvlRewards.celebrations.map((eff) => (
                          <View
                            key={eff.id}
                            style={[
                              styles.miniPreviewCard,
                              {
                                backgroundColor: c.background,
                                borderColor: c.border,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.miniEffectIconBox,
                                { backgroundColor: eff.previewColors[0] + '20' },
                              ]}
                            >
                              <Ionicons
                                name="sparkles"
                                size={20}
                                color={eff.previewColors[0]}
                              />
                            </View>

                            <View style={styles.miniThemeInfo}>
                              <View style={styles.miniBadgeRow}>
                                <Text style={[styles.miniItemTitle, { color: c.text }]}>
                                  {eff.name}
                                </Text>
                                <View
                                  style={[
                                    styles.miniPillTag,
                                    { backgroundColor: eff.previewColors[0] + '25' },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.miniPillTagText,
                                      { color: eff.previewColors[0] },
                                    ]}
                                  >
                                    {t('rank.workoutEffect')}
                                  </Text>
                                </View>
                              </View>
                              <Text
                                style={[styles.miniItemSubtitle, { color: c.muted }]}
                              >
                                {eff.description}
                              </Text>
                              <View style={styles.miniColorDotsRow}>
                                {eff.previewColors.map((color, idx) => (
                                  <View
                                    key={idx}
                                    style={[
                                      styles.miniColorDot,
                                      { backgroundColor: color },
                                    ]}
                                  />
                                ))}
                              </View>
                            </View>
                          </View>
                        ))}

                        {/* Rank Medallion Reward (when entering a new rank) */}
                        {isRankStart && (
                          <View
                            style={[
                              styles.miniPreviewCard,
                              {
                                backgroundColor: c.background,
                                borderColor: c.border,
                              },
                            ]}
                          >
                            <Image
                              source={RANK_ICONS[targetRank.rank]}
                              style={styles.miniMedallionImage}
                              resizeMode="contain"
                            />
                            <View style={styles.miniThemeInfo}>
                              <View style={styles.miniBadgeRow}>
                                <Text
                                  style={[styles.miniItemTitle, { color: c.text }]}
                                >
                                  {rankReward?.badgeTitle ??
                                    `Rang ${targetRank.rank} Medaillon`}
                                </Text>
                                <View
                                  style={[
                                    styles.miniPillTag,
                                    { backgroundColor: c.primary + '25' },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.miniPillTagText,
                                      { color: c.primary },
                                    ]}
                                  >
                                    {t('rank.rankMedallion')}
                                  </Text>
                                </View>
                              </View>
                              <Text
                                style={[styles.miniItemSubtitle, { color: c.muted }]}
                              >
                                {t('rank.newRank').replace('{title}', targetRank.title)}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    ) : (
                      /* No Reward Level Info */
                      <View
                        style={[
                          styles.noRewardCard,
                          {
                            backgroundColor: c.background,
                            borderColor: c.border,
                          },
                        ]}
                      >
                        <View style={styles.noRewardHeader}>
                          <View
                            style={[
                              styles.noRewardIconBox,
                              { backgroundColor: c.primary + '15' },
                            ]}
                          >
                            <Ionicons
                              name="barbell-outline"
                              size={22}
                              color={c.primary}
                            />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.noRewardTitle, { color: c.text }]}>
                              {t('rank.milestoneAscent')}
                            </Text>
                            <Text
                              style={[styles.noRewardDesc, { color: c.muted }]}
                            >
                              {t('rank.milestoneDesc')
                                .replace('{level}', String(inspectedLevel))
                                .replace(
                                  '{nextRank}',
                                  String(
                                    targetRank.rank +
                                      (inspectedLevel === targetRank.maxLevel ? 1 : 0),
                                  ),
                                )}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.noRewardBottomRow,
                            {
                              backgroundColor: c.surfaceElevated || c.surface,
                              borderColor: c.border,
                            },
                          ]}
                        >
                          <Text
                            style={[styles.noRewardStatusLabel, { color: c.muted }]}
                          >
                            {isUnlocked
                              ? t('rank.levelStatus')
                              : t('rank.upToLevel').replace('{level}', String(inspectedLevel))}
                          </Text>
                          <Text
                            style={[
                              styles.noRewardStatusValue,
                              { color: isUnlocked ? '#57DFAB' : c.primary },
                            ]}
                          >
                            {isUnlocked
                              ? language === 'de'
                                ? 'Bereits gemeistert ✓'
                                : 'Already mastered ✓'
                              : language === 'de'
                              ? `Noch ${missingXp.toLocaleString('de-DE')} XP`
                              : `${missingXp.toLocaleString('en-US')} XP remaining`}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Dismiss Button */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('rank.closeDetail')}
                      onPress={() => setInspectedLevel(null)}
                      style={[
                        styles.detailCloseButton,
                        { backgroundColor: c.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailCloseButtonText,
                          { color: c.background },
                        ]}
                      >
                        {t('common.done')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Modal>
            );
          })()}
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
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarSpacer: {
    width: 44,
    height: 44,
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
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  },
  currentRankPillText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
  currentRankTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.3,
  },
  currentRankSubtitle: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    marginTop: 2,
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
    height: '100%',
    borderRadius: 4,
  },
  progressBarLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    textAlign: 'right',
  },
  trackSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  trackSectionTitle: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 1,
  },
  trackSectionSubtitle: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  tierContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  connectorLine: {
    position: 'absolute',
    left: 31,
    top: 60,
    bottom: -18,
    width: 2,
    zIndex: 1,
  },
  tierCard: {
    borderRadius: 16,
    padding: 14,
    zIndex: 2,
  },
  tierCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medallionWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  medallionImage: {
    width: 40,
    height: 40,
  },
  lockedIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    paddingVertical: 6,
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

  // Detail Modal Styles
  detailOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  detailSheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailMedallionThumb: {
    width: 44,
    height: 44,
  },
  detailLevelBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  detailLevelTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
  detailRankSubtitle: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
  },
  detailXpBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  detailXpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailXpLabel: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.8,
  },
  detailXpTarget: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  detailXpCompletedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  detailXpCompletedText: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    flex: 1,
  },
  detailMissingXpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  detailMissingXpNum: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  detailMissingWorkouts: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
  },
  detailProgressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  detailProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  detailRewardsSection: {
    marginBottom: 16,
    gap: 10,
  },
  detailSectionTitle: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  miniPreviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniThemeColorStrip: {
    marginRight: 10,
  },
  miniThemeTile: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  miniThemeAccentDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  miniThemeMockText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  miniThemeInfo: {
    flex: 1,
  },
  miniBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  miniItemTitle: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  miniItemSubtitle: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
  },
  miniPillTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniPillTagText: {
    fontSize: 8,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
  miniEffectIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  miniColorDotsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  miniColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  miniMedallionImage: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  noRewardCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  noRewardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noRewardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noRewardTitle: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 2,
  },
  noRewardDesc: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 16,
  },
  noRewardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  noRewardStatusLabel: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  noRewardStatusValue: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  detailCloseButton: {
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCloseButtonText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
});
