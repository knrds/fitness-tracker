import React, { useEffect } from 'react';
import { Image, View, Text } from 'react-native';
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
export function LevelProgress({ level, xp }: { level: number; xp: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue((xp % 500) / 500);
  useEffect(() => {
    progress.value = withTiming((xp % 500) / 500, { duration: reduced ? 0 : 450 });
  }, [xp, progress, reduced]);
  const style = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        marginVertical: 16,
        padding: 16,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.borderActive,
        backgroundColor: theme.colors.surface,
      }}
    >
      <VoltBackdrop />
      <LevelEmblem level={level} />
      <View style={{ flex: 1, gap: 7 }}>
        <Text
          style={{ color: theme.colors.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13 }}
        >
          Level {level} · {getLevelBadge(level).title}
        </Text>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 500, now: xp % 500 }}
          style={{
            height: 8,
            borderRadius: 4,
            overflow: 'hidden',
            backgroundColor: theme.colors.border,
          }}
        >
          <Animated.View
            style={[
              {
                height: 8,
                backgroundColor: theme.colors.primary,
                borderRadius: 4,
                borderTopWidth: 2,
                borderTopColor: theme.colors.tertiary,
              },
              style,
            ]}
          />
        </View>
        <Text style={{ color: theme.colors.muted, fontSize: 11, fontVariant: ['tabular-nums'] }}>
          {xp % 500} / 500 XP · {500 - (xp % 500)} bis Level {level + 1}
        </Text>
      </View>
    </View>
  );
}
