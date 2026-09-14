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
import { getRankForLevel } from '../utils/level';
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
  const reduced = useReducedMotion();
  const rankInfo = getRankForLevel(level);
  const progress = useSharedValue((xp % 500) / 500);

  useEffect(() => {
    progress.value = withTiming((xp % 500) / 500, { duration: reduced ? 0 : 450 });
  }, [xp, progress, reduced]);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

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
            Level {level} · Rank {rankInfo.rank} ({rankInfo.title})
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
                {xp % 500} / 500 XP
              </Text>
              {onPress && (
                <Ionicons name="chevron-forward" size={12} color={theme.colors.muted} />
              )}
            </View>
          )}
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 500, now: xp % 500 }}
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
              {xp % 500} / 500 XP · {500 - (xp % 500)} bis Level {level + 1}
            </Text>
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: 10.5,
                fontFamily: 'SpaceGrotesk_500Medium',
              }}
            >
              {rankInfo.nextRankLevel !== null
                ? `Rank ${rankInfo.rank} (Lvl ${rankInfo.minLevel}–${rankInfo.maxLevel}) · Nächster Rank bei Level ${rankInfo.nextRankLevel}`
                : `Max Rank ${rankInfo.rank} (VOLT Master) erreicht`}
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
        accessibilityLabel={`Level ${level} ${rankInfo.title}, Level-Pass ansehen`}
        onPress={onPress}
      >
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
}
