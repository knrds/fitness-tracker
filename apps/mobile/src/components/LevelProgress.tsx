import React, { useEffect } from 'react';
import { Image, View, Text, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '@fitness-tracker/ui';
import { getLevelBadge } from '../utils/level';
import levelBadges from '../../assets/level-badges.png';
import { VoltBackdrop } from './VoltBackdrop';

export function LevelEmblem({ level, size = 52 }: { level: number; size?: number }) {
  const tier = level < 10 ? 0 : level < 20 ? 1 : level < 50 ? 2 : 3;
  return (
    <View
      accessible
      accessibilityLabel={`Level ${level}: ${getLevelBadge(level).title}`}
      style={{ width: size, height: size, overflow: 'hidden', borderRadius: size / 2 }}
    >
      <Image
        source={levelBadges}
        style={{
          width: size * 2,
          height: size * 2,
          position: 'absolute',
          left: -(tier % 2) * size,
          top: -Math.floor(tier / 2) * size,
        }}
      />
    </View>
  );
}

export function LevelProgress({
  level,
  xp,
  compact = false,
  style: customStyle,
}: {
  level: number;
  xp: number;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue((xp % 500) / 500);
  useEffect(() => {
    progress.value = withTiming((xp % 500) / 500, { duration: reduced ? 0 : 450 });
  }, [xp, progress, reduced]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
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
      <LevelEmblem level={level} size={compact ? 40 : 52} />
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
            Level {level} · {getLevelBadge(level).title}
          </Text>
          {compact && (
            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 10,
                fontVariant: ['tabular-nums'],
              }}
            >
              {xp % 500} / 500 XP
            </Text>
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
          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 11,
              fontVariant: ['tabular-nums'],
            }}
          >
            {xp % 500} / 500 XP · {500 - (xp % 500)} bis Level {level + 1}
          </Text>
        )}
      </View>
    </View>
  );
}
