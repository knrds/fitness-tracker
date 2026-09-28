import React from 'react';
import { G, Path, Circle, Ellipse, Rect } from 'react-native-svg';

/** Accessories stay outside muscle hit regions; coordinates match each source figure. */
export function AnatomyAccents({
  variant,
  female,
  side,
  transform,
  highlight,
  layer = 'foreground',
}: {
  variant: 'enamel' | 'espresso' | 'ink';
  female: boolean;
  side: 'front' | 'back';
  transform?: string | undefined;
  highlight: string;
  outline: string;
  shadow: string;
  layer?: 'backdrop' | 'foreground';
}) {
  const center = female ? 320 : 362;
  const handY = female ? 705 : 748;
  const leftHand = female ? 65 : 96;
  const rightHand = female ? 579 : 637;
  const rear = side === 'back';
  if (layer === 'backdrop')
    return variant === 'enamel' ? (
      <G pointerEvents="none" testID="anatomy-cape" transform={transform}>
        <Path
          d={`M ${center - 56} 271 Q ${center - 146} 319 ${center - 178} 470 L ${center - 188} 1090 Q ${center - 135} 1058 ${center - 110} 1120 L ${center - 80} 590 Z M ${center + 56} 271 Q ${center + 146} 319 ${center + 178} 470 L ${center + 188} 1090 Q ${center + 135} 1058 ${center + 110} 1120 L ${center + 80} 590 Z`}
          fill="#411629"
          fillOpacity={0.38}
          stroke="#9B526D"
          strokeOpacity={0.55}
          strokeWidth={3}
        />
        <Path
          d={`M ${center - 65} 300 Q ${center - 130} 492 ${center - 153} 1000 M ${center + 65} 300 Q ${center + 130} 492 ${center + 153} 1000`}
          fill="none"
          stroke={highlight}
          strokeOpacity={0.22}
          strokeWidth={2}
        />
      </G>
    ) : null;
  return (
    <G
      pointerEvents="none"
      testID={`anatomy-detail-${variant}-${side}`}
      transform={transform}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {variant === 'enamel' && !rear && (
        <G transform={`translate(${center} 0)`}>
          <Path
            d="M -41 249 L -51 274 Q -37 293 -14 304 M 41 249 L 51 274 Q 37 293 14 304"
            stroke={highlight}
            strokeWidth={3.5}
            opacity={0.7}
          />
          <Path
            d="M 0 285 L 7 295 L 0 305 L -7 295 Z"
            fill="#72273F"
            stroke={highlight}
            strokeWidth={2}
          />
          <G
            testID={`vampire-face-${female ? 'female' : 'male'}`}
            transform={female ? 'translate(0 -23)' : undefined}
            stroke={highlight}
            opacity={0.8}
          >
            <Path d="M -29 180 L -13 184 M 13 184 L 29 180" strokeWidth={3} />
            <Path d="M -16 214 L -13 221 L -10 214 M 10 214 L 13 221 L 16 214" strokeWidth={2.5} />
          </G>
        </G>
      )}
      {variant === 'espresso' && (
        <>
          {!female ? (
            <G transform={`translate(${center} 0)`} stroke={highlight} strokeWidth={3}>
              <Path d="M -43 118 L -38 76 Q 0 67 38 76 L 43 118 Z" fill="#573824" />
              <Ellipse cx={0} cy={119} rx={63} ry={9} fill="#573824" />
              <Path d="M -41 104 Q 0 110 41 104" stroke="#CCA17B" strokeWidth={8} />
            </G>
          ) : null}
          <G transform={rear ? `translate(${center * 2} 0) scale(-1 1)` : undefined}>
            <G
              testID="anatomy-iced-coffee"
              transform={`translate(${leftHand - 7} ${handY - 25}) scale(1.6)`}
            >
              <Path
                d="M -20 0 H 25 L 20 76 Q 2 85 -15 76 Z"
                fill="#EAD5BE"
                stroke="#956C4C"
                strokeWidth={3}
              />
              <Path d="M -16 26 H 21 L 18 74 Q 2 80 -13 74 Z" fill="#987053" />
              <Rect x={-13} y={32} width={13} height={12} rx={3} fill="#E5C9AA" />
              <Rect x={4} y={43} width={12} height={12} rx={3} fill="#E5C9AA" />
              <Path d="M 5 32 L 10 -30 L 22 -42" stroke="#A36C4B" strokeWidth={4} />
              <Ellipse
                cy={0}
                cx={2}
                rx={24}
                ry={6}
                fill="#FFF9EF"
                stroke="#956C4C"
                strokeWidth={3}
              />
            </G>
            {female ? (
              <G
                testID="anatomy-handbag"
                transform={`translate(${rightHand - 7} ${handY + 10}) scale(1.65)`}
                stroke="#805333"
                strokeWidth={3}
              >
                <Path d="M -16 35 V 17 Q 5 -14 24 17 V 35" />
                <Path d="M -29 31 H 34 L 40 101 Q 5 117 -35 101 Z" fill="#CDA77F" />
                <Path d="M -27 43 Q 5 62 32 43 M 4 51 V 65" />
                <Circle cx={4} cy={65} r={3} fill="#805333" />
              </G>
            ) : (
              <G
                testID="anatomy-cane"
                transform={`translate(${rightHand} ${handY})`}
                stroke="#785237"
                strokeWidth={8}
              >
                <Path d="M -12 22 Q -35 -12 -8 -14 Q 16 -14 16 15 V 557" />
                <Path d="M 5 558 H 28" strokeWidth={10} />
              </G>
            )}
          </G>
        </>
      )}
      {variant === 'ink' && (
        <>
          <G transform={`translate(${center} 0)`} stroke={highlight}>
            <Path d="M -27 273 Q 0 296 27 273" strokeWidth={5} />
            <Circle cx={0} cy={288} r={5} fill={highlight} />
          </G>
          <G
            testID="anatomy-cherry-basket"
            transform={`translate(${rear ? center * 2 - rightHand : rightHand} ${handY + 48}) scale(1.65)`}
          >
            <Path d="M -33 37 Q -38 -28 4 -31 Q 43 -28 39 37" stroke="#9B6B59" strokeWidth={5} />
            {[
              [-20, 27],
              [0, 19],
              [21, 28],
              [-6, 38],
              [17, 43],
            ].map(([x, y], i) => (
              <G key={i}>
                <Circle cx={x} cy={y} r={10} fill={i % 2 ? '#E14A73' : '#B52551'} />
                <Path d={`M ${x} ${y! - 9} q 2 -13 10 -17`} stroke="#715040" strokeWidth={2} />
              </G>
            ))}
            <Path
              d="M -39 42 H 44 L 31 100 Q 2 112 -28 100 Z"
              fill="#E1BAA1"
              stroke="#A87A61"
              strokeWidth={3}
            />
            <Path
              d="M -34 61 H 39 M -31 80 H 34 M -20 43 L -12 103 M 0 43 V 107 M 22 43 L 15 104"
              stroke="#BB8F73"
              strokeWidth={2}
            />
          </G>
        </>
      )}
    </G>
  );
}
