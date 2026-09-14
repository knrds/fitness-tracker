import { Theme, useThemeStyles, withAlpha } from '@fitness-tracker/ui';
import { LevelEmblem } from '../LevelProgress';
import { getRankForLevel } from '../../utils/level';
import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ACHIEVEMENTS } from '@fitness-tracker/domain';
import { useTheme } from '@fitness-tracker/ui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useAchievementStore } from '../../stores/achievementStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useI18n } from '../../i18n';

const ConfettiParticle = ({ index }: { index: number }) => {
  const theme = useTheme();
  const startX = Math.random() * 320 - 160;
  const endX = startX + (Math.random() * 120 - 60);
  const startY = -60;
  const endY = 460 + Math.random() * 240;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      Math.random() * 800,
      withTiming(1, {
        duration: 2500 + Math.random() * 1200,
        easing: Easing.out(Easing.quad),
      }),
    );
  }, [progress]);

  const animStyle = useAnimatedStyle(() => {
    const x = startX + (endX - startX) * progress.value;
    const y = startY + (endY - startY) * progress.value;
    const rotate = `${progress.value * 360 * (index % 2 === 0 ? 1 : -1)}deg`;
    const scale = 0.6 + (1 - progress.value) * 0.7;
    const opacity = 1 - progress.value;

    return {
      position: 'absolute',
      transform: [{ translateX: x }, { translateY: y }, { rotate }, { scale }],
      opacity,
    };
  });

  const colors = theme.chart.series;
  const color = colors[index % colors.length];

  return (
    <Animated.View
      style={[
        animStyle,
        {
          width: index % 3 === 0 ? 8 : 12,
          height: index % 3 === 0 ? 12 : 8,
          backgroundColor: color,
          borderRadius: index % 2 === 0 ? 0 : 4,
        },
      ]}
    />
  );
};

const ConfettiRain = () => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: 18 }).map((_, idx) => (
        <ConfettiParticle key={idx} index={idx} />
      ))}
    </View>
  );
};

export const AchievementCelebration = () => {
  const reducedMotion = useReducedMotion();
  const { newlyUnlocked, levelUpTo, clearCelebrations } = useAchievementStore();
  const { lastFinishedSession } = useWorkoutStore();
  const { language, formatAchievement } = useI18n();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);

  const isVisible = (newlyUnlocked.length > 0 || levelUpTo !== null) && !lastFinishedSession;

  useEffect(() => {
    if (isVisible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} animationType="fade" transparent onRequestClose={clearCelebrations}>
      <Pressable style={styles.overlay} onPress={clearCelebrations}>
        {/* Render interactive confetti overlay */}
        {!reducedMotion && <ConfettiRain />}
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {levelUpTo !== null && (
              <View style={styles.levelUpContainer}>
                <View style={styles.emblemWrapper}>
                  <LevelEmblem level={levelUpTo} size={80} />
                </View>
                <Text
                  style={[styles.title, { color: theme.colors.text, ...theme.typography.heading }]}
                >
                  {language === 'de' ? 'Levelaufstieg!' : 'Level Up'}
                </Text>
                <Text style={[styles.levelValue, { color: theme.colors.primary }]}>
                  {language === 'de' ? `STUFE ${levelUpTo}` : `LEVEL ${levelUpTo}`}
                </Text>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: 14,
                    fontFamily: 'SpaceGrotesk_600SemiBold',
                    marginTop: 2,
                    marginBottom: 4,
                  }}
                >
                  {language === 'de' ? 'Rang' : 'Rank'} {getRankForLevel(levelUpTo).rank} · {getRankForLevel(levelUpTo).title}
                </Text>
                <Text style={[styles.desc, { color: theme.colors.muted }]}>
                  {language === 'de'
                    ? 'Deine Hingabe zahlt sich aus. Weiter so!'
                    : 'Your dedication is paying off. Keep crushing it.'}
                </Text>
              </View>
            )}

            {levelUpTo !== null && newlyUnlocked.length > 0 && (
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            )}

            {newlyUnlocked.length > 0 && (
              <View style={styles.achievementsContainer}>
                <Text
                  style={[styles.title, { color: theme.colors.text, ...theme.typography.heading }]}
                >
                  {language === 'de' ? 'Erfolg freigeschaltet' : 'Achievement Unlocked'}
                </Text>
                {newlyUnlocked.map((id) => {
                  const ach = ACHIEVEMENTS.find((a) => a.id === id);
                  if (!ach) return null;
                  const localized = formatAchievement(ach);
                  return (
                    <View
                      key={id}
                      style={[
                        styles.achCard,
                        {
                          backgroundColor: theme.colors.background,
                          borderColor: theme.colors.warning,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.achIcon,
                          { backgroundColor: withAlpha(theme.colors.warning, 0.12) },
                        ]}
                      >
                        <Ionicons
                          name={ach.icon as React.ComponentProps<typeof Ionicons>['name']}
                          size={28}
                          color={theme.colors.warning}
                        />
                      </View>
                      <View style={styles.achInfo}>
                        <Text style={[styles.achName, { color: theme.colors.text }]}>
                          {localized.name}
                        </Text>
                        <Text style={[styles.achDesc, { color: theme.colors.muted }]}>
                          {localized.description}
                        </Text>
                        <Text style={[styles.achReward, { color: theme.colors.warning }]}>
                          +{ach.xpReward} XP
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={language === 'de' ? 'Erfolge schließen' : 'Close celebrations'}
            style={[
              styles.button,
              { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
            ]}
            onPress={clearCelebrations}
          >
            <Text
              style={[
                styles.buttonText,
                { color: theme.colors.onPrimary, ...theme.typography.button },
              ]}
            >
              {language === 'de' ? 'Weiter' : "Let's Go"}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      borderWidth: 1,
      width: '100%',
      maxWidth: 400,
      maxHeight: '80%',
      padding: 24,
    },
    scrollContent: {
      alignItems: 'center',
    },
    levelUpContainer: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    emblemWrapper: {
      marginBottom: 16,
    },
    iconBadge: {
      width: 88,
      height: 88,
      borderRadius: 44,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 22,
      textAlign: 'center',
      marginBottom: 8,
    },
    levelValue: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 32,
      letterSpacing: 1,
      marginBottom: 8,
    },
    desc: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 14,
      textAlign: 'center',
      paddingHorizontal: 8,
      lineHeight: 20,
    },
    divider: {
      height: 1,
      width: '90%',
      marginVertical: 20,
    },
    achievementsContainer: {
      width: '100%',
      alignItems: 'center',
    },
    achCard: {
      flexDirection: 'row',
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      marginTop: 12,
      width: '100%',
      alignItems: 'center',
    },
    achIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    achInfo: {
      flex: 1,
    },
    achName: {
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 16,
      marginBottom: 4,
    },
    achDesc: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 13,
      marginBottom: 6,
    },
    achReward: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 12,
    },
    button: {
      height: 52,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
    },
    buttonText: {
      fontSize: 15,
    },
  });
