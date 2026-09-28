import React from 'react';
import { View, Text } from 'react-native';
import { Theme, PremiumSurface, PremiumMotif } from '@fitness-tracker/ui';

/** Real shared materials, with deliberately illustrative (not user) chart samples. */
export function PremiumThemePreview({ theme }: { theme: Theme }) {
  const spec = theme.premium;
  if (!spec) return null;
  return (
    <View
      testID={`preview-${spec.surfaceVariant}`}
      pointerEvents="none"
      style={{
        backgroundColor: theme.colors.background,
        borderRadius: 16,
        padding: 12,
        gap: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 54 }}>
        <PremiumMotif spec={spec} size={40} />
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 9,
            fontWeight: '700',
            flex: 1,
            letterSpacing: 0.6,
            lineHeight: 14,
          }}
        >
          {spec.signature}
        </Text>
      </View>
      <View
        style={{
          height: 78,
          borderRadius: spec.cardRadius,
          overflow: 'hidden',
          padding: 10,
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 4,
        }}
      >
        <PremiumSurface colors={spec.surfaceGradient} radius={spec.cardRadius} material={spec} />
        <View style={{ flex: 1, gap: 5 }}>
          <View
            style={{ height: 4, width: '75%', backgroundColor: theme.colors.text, borderRadius: 3 }}
          />
          <View
            style={{
              height: 3,
              width: '50%',
              backgroundColor: theme.colors.muted,
              borderRadius: 3,
            }}
          />
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
            {spec.heat.map((color) => (
              <View
                key={color}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: spec.calendarVariant === 'coffee-ring' ? 7 : 4,
                  backgroundColor: color,
                }}
              />
            ))}
          </View>
        </View>
        {[18, 27, 22, 38].map((height, i) => (
          <View
            key={i}
            style={{
              width: 9,
              height,
              backgroundColor: spec.heat[i],
              borderRadius: 5,
              borderTopWidth: 1,
              borderTopColor: spec.highlight,
            }}
          />
        ))}
      </View>
      <View
        style={{
          height: 34,
          borderRadius: spec.buttonRadius,
          borderWidth: 1,
          borderColor: spec.highlight,
          overflow: 'hidden',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <PremiumSurface colors={spec.buttonGradient} radius={spec.buttonRadius} />
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 11 }}>EVARO COACH →</Text>
      </View>
    </View>
  );
}
