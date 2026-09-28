import { useTheme } from '@fitness-tracker/ui';
import React, { useId } from 'react';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
  Line,
  Circle,
  G,
} from 'react-native-svg';
import { MuscleGroup, type MuscleRegion } from '@fitness-tracker/domain';
import { useI18n } from '../../i18n';
import { bodyFront } from './bodyFront';
import { bodyBack } from './bodyBack';
import { bodyFemaleFront } from './bodyFemaleFront';
import { bodyFemaleBack } from './bodyFemaleBack';
import { AnatomyAccents } from './AnatomyAccents';

export type AnatomyBodyVariant = 'male' | 'female';

const muscles: Record<string, MuscleRegion> = {
  chest: MuscleGroup.Chest,
  neck: MuscleGroup.Neck,
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
  tibialis: MuscleGroup.Calves,
  adductors: 'adductors',
};
export function AnatomyFigure({
  side = 'front',
  height = 400,
  bodyVariant = 'male',
  color,
  onSelect,
}: {
  side?: 'front' | 'back';
  height?: number;
  bodyVariant?: AnatomyBodyVariant;
  color: (muscle: MuscleRegion) => string;
  onSelect?: (muscle: MuscleRegion) => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const gradientId = `anatomy${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const xray = theme.premium?.heatmapVariant === 'xray';
  const female = bodyVariant === 'female';
  const parts = female
    ? side === 'front'
      ? bodyFemaleFront
      : bodyFemaleBack
    : side === 'front'
      ? bodyFront
      : bodyBack;
  // Source vectors use different canvases. One transform contains both paint and touch paths.
  const bodyTransform = female
    ? `translate(${side === 'front' ? 91 : 115.45} 100) scale(0.85)`
    : undefined;
  const detailTransform = side === 'back' ? `translate(${female ? 823 : 724} 0)` : undefined;
  return (
    <Svg
      width="100%"
      height={height}
      viewBox={side === 'front' ? '25 80 675 1300' : '749 80 675 1300'}
      accessibilityRole="image"
      testID={`anatomy-${theme.premium?.heatmapVariant ?? 'standard'}`}
      accessibilityLabel={t('workout.muscleMap').replace(
        '{side}',
        side === 'front' ? t('muscles.front') : t('muscles.back'),
      )}
    >
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0" stopColor={xray ? '#A4B5E8' : theme.anatomy.light} />
          <Stop offset="0.5" stopColor={theme.anatomy.base} />
          <Stop offset="1" stopColor={xray ? '#222741' : theme.anatomy.base} />
        </LinearGradient>
        <RadialGradient id={`${gradientId}halo`} cx="50%" cy="42%" rx="52%" ry="60%">
          <Stop offset="0" stopColor={theme.colors.secondary} stopOpacity="0.2" />
          <Stop offset="1" stopColor={theme.colors.secondary} stopOpacity="0" />
        </RadialGradient>
        {theme.premium && theme.premium.heatmapVariant !== 'xray' && (
          <LinearGradient id={`${gradientId}material`} x1="0%" y1="0%" x2="95%" y2="85%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.22} />
            <Stop offset="0.35" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="0.8" stopColor={theme.premium.shadow} stopOpacity={0.08} />
            <Stop offset="1" stopColor={theme.premium.highlight} stopOpacity={0.14} />
          </LinearGradient>
        )}
      </Defs>
      <Rect
        x={side === 'front' ? 25 : 749}
        y={80}
        width={675}
        height={1300}
        fill={`url(#${gradientId}halo)`}
      />
      {xray && (
        <G
          pointerEvents="none"
          transform={side === 'back' ? 'translate(724 0)' : undefined}
          stroke="#869DE7"
          fill="none"
        >
          <Path
            d="M 150 150 H 90 V 280 M 580 150 H 640 V 280 M 90 1150 V 1280 H 150 M 640 1150 V 1280 H 580"
            strokeWidth={3}
            opacity={0.6}
          />
          {[320, 520, 720, 920, 1120].map((y) => (
            <Path key={y} d={`M 90 ${y} H 108 M 622 ${y} H 640`} opacity={0.5} strokeWidth={2} />
          ))}
          <EllipseGuide />
        </G>
      )}
      <G transform={bodyTransform} testID={`anatomy-body-${bodyVariant}-${side}`}>
        {theme.premium && theme.premium.heatmapVariant !== 'xray' && (
          <AnatomyAccents
            variant={theme.premium.heatmapVariant}
            female={female}
            side={side}
            transform={detailTransform}
            highlight={theme.premium.highlight}
            outline={theme.anatomy.outline}
            shadow={theme.premium.shadow}
            layer="backdrop"
          />
        )}
        {parts.map((part) => {
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
            <G key={`${part.slug}-${index}`}>
              {xray && (
                <Path
                  d={path}
                  fill="none"
                  stroke={muscle ? color(muscle) : theme.premium!.highlight}
                  strokeWidth={12}
                  opacity={0.14}
                  pointerEvents="none"
                />
              )}
              <Path
                key={`${part.slug}-${index}`}
                testID={`anatomy-region-${part.slug}-${index}`}
                d={path}
                fill={muscle ? color(muscle) : `url(#${gradientId})`}
                stroke={theme.anatomy.outline}
                strokeOpacity={theme.premium?.heatmapVariant === 'xray' ? 0.85 : 0.45}
                strokeWidth={theme.premium?.heatmapVariant === 'xray' ? 4 : 2.4}
                {...(muscle && onSelect ? { onPress: () => onSelect(muscle) } : {})}
              />
              {theme.premium && theme.premium.heatmapVariant !== 'xray' && (
                <Path d={path} fill={`url(#${gradientId}material)`} pointerEvents="none" />
              )}
            </G>
          ));
        })}
        {theme.premium && theme.premium.heatmapVariant !== 'xray' && (
          <AnatomyAccents
            variant={theme.premium.heatmapVariant}
            female={female}
            side={side}
            transform={detailTransform}
            highlight={theme.premium.highlight}
            outline={theme.anatomy.outline}
            shadow={theme.premium.shadow}
          />
        )}
        {xray && (
          <G
            pointerEvents="none"
            testID="anatomy-cyborg-detail"
            transform={detailTransform}
            fill="none"
            stroke="#ADDDF2"
            opacity={0.6}
          >
            <Path
              d={
                female
                  ? 'M 320 268 V 605 M 308 302 H 332 M 308 325 H 332 M 308 440 H 332 M 308 466 H 332 M 308 492 H 332 M 308 518 H 332 M 308 544 H 332 M 308 570 H 332'
                  : 'M 360 260 L 360 628 M 347 304 H 373 M 347 325 H 373 M 348 445 H 372 M 348 467 H 372 M 348 490 H 372 M 348 514 H 372 M 348 538 H 372 M 348 562 H 372 M 348 586 H 372'
              }
              strokeWidth={3}
            />
            <Path
              d={
                female
                  ? 'M 245 330 L 262 345 L 289 352 M 395 330 L 378 345 L 351 352 M 190 382 L 174 443 L 169 487 M 450 382 L 466 443 L 471 487 M 254 713 L 275 876 M 386 713 L 365 876 M 277 1010 L 266 1155 M 363 1010 L 374 1155'
                  : 'M 278 346 L 291 360 L 324 369 M 441 346 L 429 360 L 397 369 M 238 400 L 216 473 L 195 518 M 483 400 L 505 473 L 526 518 M 300 722 L 298 878 M 421 722 L 425 878 M 292 988 L 281 1122 M 432 988 L 443 1122'
              }
              strokeWidth={3}
            />
            {(female
              ? [
                  [211, 325],
                  [429, 325],
                  [163, 505],
                  [477, 505],
                  [283, 951],
                  [357, 951],
                ]
              : [
                  [246, 347],
                  [478, 347],
                  [188, 552],
                  [535, 552],
                  [298, 948],
                  [427, 948],
                ]
            ).map(([x, y]) => (
              <G key={`${x}-${y}`}>
                <Circle cx={x} cy={y} r={14} strokeWidth={3} />
                <Circle cx={x} cy={y} r={5} fill="#ADDDF2" stroke="none" />
              </G>
            ))}
            <Path
              d={female ? 'M 295 165 H 345 M 307 197 H 333' : 'M 334 175 H 389 M 345 207 H 377'}
              strokeWidth={4}
            />
          </G>
        )}
      </G>
      {theme.premium?.heatmapVariant === 'xray' &&
        [250, 450, 650, 850, 1050, 1250].map((y) => (
          <Line
            key={y}
            x1={side === 'front' ? 80 : 804}
            x2={side === 'front' ? 650 : 1374}
            y1={y}
            y2={y}
            stroke={theme.premium!.highlight}
            strokeOpacity={0.14}
            strokeWidth={1}
            pointerEvents="none"
          />
        ))}
    </Svg>
  );
}

function EllipseGuide() {
  return (
    <Path
      d="M 206 1320 C 260 1295 465 1295 520 1320 C 465 1345 260 1345 206 1320 Z"
      strokeWidth={2}
      opacity={0.3}
    />
  );
}
