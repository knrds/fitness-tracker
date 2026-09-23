import React, { useEffect } from 'react';
import { View, Text, StyleProp, ViewStyle, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '@fitness-tracker/ui';
import { getLevelProgress } from '@fitness-tracker/domain';
import { getRankForLevel } from '../utils/level';
import { useI18n } from '../i18n';
import { LevelRankBadge } from './LevelRankBadge';
import { VoltBackdrop } from './VoltBackdrop';

export function LevelEmblem({ level, size = 52 }: { level: number; size?: number }) {
  return <LevelRankBadge level={level} size={size} />;
}

export function LevelProgress({
  level,
  xp,
  compact = false,
  style: customStyle,
  onPress,
}: {
  level: number;
  xp: number;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const rankInfo = getRankForLevel(level);
  const progressInfo = getLevelProgress(xp);

  const normalizedRatio = progressInfo.progressPercent / 100;
  const progress = useSharedValue(normalizedRatio);

  useEffect(() => {
    progress.value = withTiming(normalizedRatio, { duration: reduced ? 0 : 450 });
  }, [normalizedRatio, progress, reduced]);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const rankSubtext =
    rankInfo.nextRankLevel !== null
      ? t('rank.nextRankAtLevel')
          .replace('{rank}', String(rankInfo.rank))
          .replace('{min}', String(rankInfo.minLevel))
          .replace('{max}', String(rankInfo.maxLevel))
          .replace('{next}', String(rankInfo.nextRankLevel))
      : t('rank.maxRankReached').replace('{rank}', String(rankInfo.rank));

  const cardContent = (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: compact ? 10 : 12,
          alignItems: 'center',
          marginVertical: compact ? 0 : 16,
          padding: compact ? 12 : 16,
          borderRadius: compact ? theme.radius.md : theme.radius.lg,
          borderWidth: 1,
          borderColor: compact ? theme.colors.border : theme.colors.borderActive,
          backgroundColor: theme.colors.surface,
          overflow: 'hidden',
        },
        customStyle,
      ]}
    >
      {!compact && <VoltBackdrop />}
      <LevelRankBadge level={level} size={compact ? 44 : 56} />
      <View style={{ flex: 1, gap: compact ? 4 : 7 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontFamily: 'SpaceGrotesk_600SemiBold',
              fontSize: compact ? 12 : 13,
            }}
          >
            Level {level} · {t('rank.rank')} {rankInfo.rank} ({rankInfo.title})
          </Text>
          {compact && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text
                style={{
                  color: theme.colors.muted,
                  fontSize: 10,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {progressInfo.xpInCurrentLevel} / {progressInfo.xpRequiredForNextLevel} XP
              </Text>
              {onPress && (
                <Ionicons name="chevron-forward" size={12} color={theme.colors.muted} />
              )}
            </View>
          )}
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: progressInfo.xpRequiredForNextLevel,
            now: progressInfo.xpInCurrentLevel,
          }}
          style={{
            height: compact ? 6 : 8,
            borderRadius: compact ? 3 : 4,
            overflow: 'hidden',
            backgroundColor: theme.colors.border,
          }}
        >
          <Animated.View
            style={[
              {
                height: compact ? 6 : 8,
                backgroundColor: theme.colors.primary,
                borderRadius: compact ? 3 : 4,
                borderTopWidth: compact ? 1 : 2,
                borderTopColor: theme.colors.tertiary,
              },
              barStyle,
            ]}
          />
        </View>
        {!compact && (
          <View style={{ gap: 2 }}>
            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 11,
                fontVariant: ['tabular-nums'],
              }}
            >
              {progressInfo.xpInCurrentLevel} / {progressInfo.xpRequiredForNextLevel} XP ·{' '}
              {progressInfo.remainingXp} {t('rank.toLevel')} {level + 1}
            </Text>
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: 10.5,
                fontFamily: 'SpaceGrotesk_500Medium',
              }}
            >
              {rankSubtext}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('rank.currentLevelStatus')
          .replace('{level}', String(level))
          .replace('{title}', rankInfo.title)}
        onPress={onPress}
      >
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
}
