import React from 'react';
import {
  Image,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ImageStyle,
  AccessibilityRole,
} from 'react-native';
import { useTheme, withAlpha } from '@fitness-tracker/ui';
import { getRankForLevel } from '../utils/level';

export type LevelRankBadgeSize = 'sm' | 'md' | 'lg' | 'xl' | number;

const SIZE_MAP: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 36,
  md: 48,
  lg: 72,
  xl: 96,
};

export interface LevelRankBadgeProps {
  level: number;
  size?: LevelRankBadgeSize;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  showFrame?: boolean;
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
}

export function LevelRankBadge({
  level,
  size = 'md',
  style,
  imageStyle,
  showFrame = true,
  accessible = true,
  accessibilityLabel,
  accessibilityRole = 'image',
}: LevelRankBadgeProps) {
  const theme = useTheme();
  const rankInfo = getRankForLevel(level);
  const dimension = typeof size === 'number' ? size : SIZE_MAP[size] ?? SIZE_MAP.md;
  const radius = Math.round(dimension / 2);
  const borderWidth = Math.max(1, Math.round(dimension * 0.04));

  // Scale slightly so the shield fills the circular medal frame optically without distortion
  const imageDimension = Math.round(dimension * 1.15);

  const resolvedLabel =
    accessibilityLabel ??
    `Rank ${rankInfo.rank} (${rankInfo.title}), Level ${level} (Bereich Level ${rankInfo.minLevel}–${rankInfo.maxLevel})`;

  return (
    <View
      accessible={accessible}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={resolvedLabel}
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius: radius,
          borderWidth: showFrame ? borderWidth : 0,
          borderColor: withAlpha(theme.colors.primary, 0.4),
        },
        style,
      ]}
    >
      <Image
        source={rankInfo.icon}
        resizeMode="contain"
        style={[
          styles.image,
          {
            width: imageDimension,
            height: imageDimension,
            // Compensate optical vertical bias (+2% down) so shield is mathematically & visually centered
            transform: [{ translateY: Math.round(dimension * 0.02) }],
          },
          imageStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0c',
    overflow: 'hidden',
  },
  image: {
    backgroundColor: 'transparent',
  },
});
