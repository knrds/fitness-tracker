import { useTheme } from '@fitness-tracker/ui';
import React, { useId } from 'react';
import Svg, { Path, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { MuscleGroup } from '@fitness-tracker/domain';
import { bodyFront } from './bodyFront';
import { bodyBack } from './bodyBack';

const muscles: Record<string, MuscleGroup> = {
  chest: MuscleGroup.Chest,
  abs: MuscleGroup.Abs,
  obliques: MuscleGroup.Obliques,
  biceps: MuscleGroup.Biceps,
  triceps: MuscleGroup.Triceps,
  trapezius: MuscleGroup.Traps,
  'upper-back': MuscleGroup.Lats,
  'lower-back': MuscleGroup.LowerBack,
  forearm: MuscleGroup.Forearms,
  gluteal: MuscleGroup.Glutes,
  hamstring: MuscleGroup.Hamstrings,
  quadriceps: MuscleGroup.Quads,
  calves: MuscleGroup.Calves,
};
export function AnatomyFigure({
  side = 'front',
  height = 400,
  color,
  onSelect,
}: {
  side?: 'front' | 'back';
  height?: number;
  color: (muscle: MuscleGroup) => string;
  onSelect?: (muscle: MuscleGroup) => void;
}) {
  const theme = useTheme();
  const gradientId = `anatomy${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg
      width="100%"
      height={height}
      viewBox={side === 'front' ? '25 80 675 1300' : '749 80 675 1300'}
      accessibilityLabel={`Muskelkarte ${side === 'front' ? 'Vorderseite' : 'Rückseite'}`}
    >
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0" stopColor={theme.anatomy.light} />
          <Stop offset="0.5" stopColor={theme.anatomy.base} />
          <Stop offset="1" stopColor={theme.anatomy.base} />
        </LinearGradient>
        <RadialGradient id={`${gradientId}halo`} cx="50%" cy="42%" rx="52%" ry="60%">
          <Stop offset="0" stopColor={theme.colors.secondary} stopOpacity="0.2" />
          <Stop offset="1" stopColor={theme.colors.secondary} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect
        x={side === 'front' ? 25 : 749}
        y={80}
        width={675}
        height={1300}
        fill={`url(#${gradientId}halo)`}
      />
      {(side === 'front' ? bodyFront : bodyBack).map((part) => {
        const muscle =
          part.slug === 'deltoids'
            ? side === 'front'
              ? MuscleGroup.FrontDelts
              : MuscleGroup.RearDelts
            : muscles[part.slug];
        return [
          ...(part.path.common ?? []),
          ...(part.path.left ?? []),
          ...(part.path.right ?? []),
        ].map((path, index) => (
          <Path
            key={`${part.slug}-${index}`}
            d={path}
            fill={muscle ? color(muscle) : `url(#${gradientId})`}
            stroke={theme.anatomy.outline}
            strokeOpacity={0.45}
            strokeWidth={2.4}
            {...(muscle && onSelect ? { onPress: () => onSelect(muscle) } : {})}
          />
        ));
      })}
    </Svg>
  );
}
