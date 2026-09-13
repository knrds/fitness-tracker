import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { MuscleGroup } from '@fitness-tracker/domain';
import { useTheme } from '@fitness-tracker/ui';
import { AnatomyFigure } from './anatomy/AnatomyFigure';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

type Measurement = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  muscles: MuscleGroup[];
};
export function MeasurementMap({ fields, unit }: { fields: Measurement[]; unit: string }) {
  const theme = useTheme();
  const [selected, setSelected] = useState(0);
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = reduced ? 1 : 0.65;
    opacity.value = withTiming(1, { duration: reduced ? 0 : 180 });
  }, [selected, reduced, opacity]);
  const figureStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const field = fields[selected] ?? fields[0];
  if (!field) return null;
  return (
    <View style={{ width: '100%', gap: 12 }}>
      <Animated.View style={figureStyle}>
        <AnatomyFigure
          side={field.muscles.includes(MuscleGroup.Glutes) ? 'back' : 'front'}
          height={290}
          color={(muscle) =>
            field.muscles.includes(muscle)
              ? theme.colors.tertiary
              : fields.some((item) => item.value && item.muscles.includes(muscle))
                ? theme.colors.secondary
                : theme.anatomy.base
          }
          onSelect={(muscle) => {
            const index = fields.findIndex((item) => item.muscles.includes(muscle));
            if (index >= 0) setSelected(index);
          }}
        />
      </Animated.View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {fields.map((item, index) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityState={{ selected: index === selected }}
            onPress={() => setSelected(index)}
            style={{
              minHeight: 48,
              flexGrow: 1,
              padding: 10,
              borderRadius: 12,
              backgroundColor:
                index === selected ? theme.colors.primarySubtle : theme.colors.surface,
              borderWidth: 1,
              borderColor: index === selected ? theme.colors.primary : theme.colors.border,
            }}
          >
            <Text style={{ color: theme.colors.muted, fontSize: 11 }}>{item.label}</Text>
            <Text style={{ color: theme.colors.text, fontSize: 14 }}>
              {item.value ? `${item.value} ${unit}` : 'Eintragen'}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
        Umfang messen, nicht Durchmesser. Bei Armen und Beinen gilt der Eintrag für beide Seiten.
      </Text>
      <TextInput
        key={field.label}
        accessibilityLabel={`${field.label} Umfang in ${unit}`}
        value={field.value}
        onChangeText={field.onChange}
        placeholder={`${field.label} (${unit})`}
        placeholderTextColor={theme.colors.muted}
        keyboardType="decimal-pad"
        inputAccessoryViewID="keyboardDoneAccessory"
        returnKeyType="done"
        style={{
          minHeight: 48,
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.primary,
          color: theme.colors.text,
          fontSize: 18,
          marginBottom: 16,
        }}
      />
    </View>
  );
}
