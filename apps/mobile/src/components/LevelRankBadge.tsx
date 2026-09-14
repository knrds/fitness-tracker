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
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
}

export function LevelRankBadge({
  level,
  size = 'md',
  style,
  imageStyle,
  accessible = true,
  accessibilityLabel,
  accessibilityRole = 'image',
}: LevelRankBadgeProps) {
  const rankInfo = getRankForLevel(level);
  const dimension = typeof size === 'number' ? size : SIZE_MAP[size] ?? SIZE_MAP.md;

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
            width: dimension,
            height: dimension,
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
    backgroundColor: 'transparent',
  },
  image: {
    backgroundColor: 'transparent',
  },
});
