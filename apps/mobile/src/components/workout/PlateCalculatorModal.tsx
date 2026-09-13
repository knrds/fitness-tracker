import { Theme, useThemeStyles } from '@fitness-tracker/ui';
import { KeyboardDoneAccessory } from './KeyboardDoneAccessory';
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@fitness-tracker/ui';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { useProfileStore } from '../../stores/profileStore';

interface Props {
  visible: boolean;
  initialWeightKg: number;
  onClose: () => void;
}

interface PlateCount {
  weight: number;
  count: number;
}

// Realistic gym plate colors (kept on purpose), tuned for a dark background.
const PLATE_METADATA: Record<
  number,
  { color: string; labelColor: string; height: number; width: number }
> = {
  25: { color: '#ef4444', labelColor: '#ffffff', height: 80, width: 22 },
  20: { color: '#3b82f6', labelColor: '#ffffff', height: 74, width: 20 },
  15: { color: '#eab308', labelColor: '#0f172a', height: 68, width: 18 },
  10: { color: '#22c55e', labelColor: '#ffffff', height: 60, width: 16 },
  5: { color: '#e2e8f0', labelColor: '#0f172a', height: 50, width: 14 },
  2.5: { color: '#64748b', labelColor: '#ffffff', height: 42, width: 12 },
  1.25: { color: '#94a3b8', labelColor: '#0f172a', height: 34, width: 10 },
};

export const PlateCalculatorModal = ({ visible, initialWeightKg, onClose }: Props) => {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { profile } = useProfileStore();
  const isImperial = profile.preferredUnits === 'imperial';

  const [inputWeight, setInputWeight] = useState('');

  useEffect(() => {
    if (visible) {
      if (initialWeightKg > 0) {
        const displayVal = isImperial ? initialWeightKg * 2.20462 : initialWeightKg;
        setInputWeight(displayVal.toFixed(1).replace(/\.0$/, ''));
      } else {
        setInputWeight('');
      }
    }
  }, [visible, initialWeightKg, isImperial]);

  const targetWeightKg = parseFloat(inputWeight)
    ? isImperial
      ? parseFloat(inputWeight) / 2.20462
      : parseFloat(inputWeight)
    : 0;

  const calculatePlates = (weightKg: number): PlateCount[] => {
    const barbell = 20;
    if (weightKg <= barbell) return [];

    let perSide = (weightKg - barbell) / 2;
    const plates = [20, 15, 10, 5, 2.5, 1.25];
    const result: PlateCount[] = [];

    for (const plate of plates) {
      const count = Math.floor(perSide / plate);
      if (count > 0) {
        result.push({ weight: plate, count });
        perSide = perSide % plate;
      }
    }
    return result;
  };

  const platesPerSide = calculatePlates(targetWeightKg);

  const visualPlates: number[] = [];
  platesPerSide.forEach((item) => {
    for (let i = 0; i < item.count; i++) {
      visualPlates.push(item.weight);
    }
  });
  visualPlates.sort((a, b) => b - a);
  const visualizerScale = Math.max(0.72, Math.min(1, 8 / Math.max(8, visualPlates.length)));

  const AVAILABLE_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

  const handleAddPlate = (plateWeight: number) => {
    const currentWeight = parseFloat(inputWeight) || 0;
    const baseKg = isImperial ? currentWeight / 2.20462 : currentWeight;
    const base = baseKg < 20 ? 20 : baseKg;
    const newWeightKg = base + 2 * plateWeight;
    const displayVal = isImperial ? newWeightKg * 2.20462 : newWeightKg;
    setInputWeight(displayVal.toFixed(1).replace(/\.0$/, ''));
  };

  const handleRemovePlate = (plateWeight: number) => {
    const currentWeight = parseFloat(inputWeight) || 0;
    const baseKg = isImperial ? currentWeight / 2.20462 : currentWeight;
    if (baseKg > 20) {
      const newWeightKg = Math.max(20, baseKg - 2 * plateWeight);
      const displayVal = isImperial ? newWeightKg * 2.20462 : newWeightKg;
      setInputWeight(displayVal.toFixed(1).replace(/\.0$/, ''));
    }
  };

  const renderPlate = (weight: number, key: string) => {
    const meta = PLATE_METADATA[weight] || {
      color: '#94a3b8',
      labelColor: '#0f172a',
      height: 40,
      width: 12,
    };
    return (
      <Pressable
        key={key}
        onPress={() => handleRemovePlate(weight)}
        style={[
          styles.plateBlock,
          {
            height: meta.height,
            width: meta.width,
            borderColor: 'rgba(0,0,0,0.25)',
            position: 'relative',
            overflow: 'hidden',
          },
        ]}
      >
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
          <Defs>
            <LinearGradient id={`grad-${weight}-${key}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={meta.color} stopOpacity="1" />
              <Stop offset="30%" stopColor="#ffffff" stopOpacity="0.35" />
              <Stop offset="70%" stopColor={meta.color} stopOpacity="1" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
            </LinearGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill={`url(#grad-${weight}-${key})`}
            rx={3}
            ry={3}
          />
        </Svg>
        <Text
          style={[
            styles.plateLabel,
            { color: meta.labelColor, fontSize: meta.width < 14 ? 6 : 8, zIndex: 1 },
          ]}
        >
          {weight}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text, ...theme.typography.heading }]}>
              Plate Calculator
            </Text>
            <Pressable onPress={onClose} hitSlop={15}>
              <Ionicons name="close" size={24} color={theme.colors.muted} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyScrollContent}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.barbellAlert,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.primary + '33',
                },
              ]}
            >
              <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.barbellAlertText, { color: theme.colors.text }]}>
                Calculations are based on a standard{' '}
                <Text style={{ color: theme.colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }}>
                  20 kg (44 lbs)
                </Text>{' '}
                barbell.
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.colors.muted }]}>Target Weight</Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  value={inputWeight}
                  onChangeText={setInputWeight}
                  placeholder="0.0"
                  keyboardType="numeric"
                  inputAccessoryViewID="keyboardDoneAccessory"
                  returnKeyType="done"
                  placeholderTextColor={theme.colors.muted}
                  autoFocus
                />
                <Text style={[styles.unitText, { color: theme.colors.muted }]}>
                  {isImperial ? 'lbs' : 'kg'}
                </Text>
              </View>
            </View>

            {/* Load Plates Row */}
            <View style={styles.addPlatesContainer}>
              <Text style={[styles.inputLabel, { color: theme.colors.muted }]}>
                Load Plates (per side)
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.platesScroll}
              >
                {AVAILABLE_PLATES.map((weight) => {
                  const meta = PLATE_METADATA[weight] || {
                    color: '#94a3b8',
                    labelColor: '#ffffff',
                  };
                  const displayWeight = isImperial ? weight * 2.20462 : weight;
                  const formattedWeight = displayWeight.toFixed(1).replace(/\.0$/, '');
                  return (
                    <Pressable
                      key={weight}
                      style={[styles.addPlateChip, { backgroundColor: meta.color }]}
                      onPress={() => handleAddPlate(weight)}
                    >
                      <Text style={[styles.addPlateChipText, { color: meta.labelColor }]}>
                        +{formattedWeight} {isImperial ? 'lb' : 'kg'}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  style={[styles.resetBarBtn, { borderColor: theme.colors.border }]}
                  onPress={() => setInputWeight(isImperial ? '44' : '20')}
                >
                  <Ionicons name="refresh-outline" size={16} color={theme.colors.accent} />
                  <Text style={[styles.resetBarBtnText, { color: theme.colors.accent }]}>
                    Clear
                  </Text>
                </Pressable>
              </ScrollView>
            </View>

            {targetWeightKg > 20 && (
              <View
                style={[
                  styles.visualizerContainer,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                ]}
              >
                <View style={[styles.visualizerInner, { transform: [{ scale: visualizerScale }] }]}>
                  <View style={styles.barbellSleeve} />
                  <View style={[styles.platesWrapper, { flexDirection: 'row-reverse' }]}>
                    {visualPlates.map((weight, idx) => renderPlate(weight, `left-${idx}`))}
                  </View>
                  <View style={styles.barbellCollar} />
                  <View style={styles.barbellCenter} />
                  <View style={styles.barbellCollar} />
                  <View style={[styles.platesWrapper, { flexDirection: 'row' }]}>
                    {visualPlates.map((weight, idx) => renderPlate(weight, `right-${idx}`))}
                  </View>
                  <View style={styles.barbellSleeve} />
                </View>
              </View>
            )}

            <ScrollView style={styles.summaryList} indicatorStyle="white">
              {targetWeightKg <= 20 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
                    {targetWeightKg > 0
                      ? 'Barbell only (20 kg / 44 lbs).'
                      : 'Enter a weight greater than 20 kg.'}
                  </Text>
                </View>
              ) : (
                <View style={styles.summaryContainer}>
                  <Text style={[styles.summaryHeader, { color: theme.colors.muted }]}>
                    Plates per side (Tap to remove)
                  </Text>
                  {platesPerSide.map((item, idx) => {
                    const displayWeight = isImperial ? item.weight * 2.20462 : item.weight;
                    const formattedWeight = displayWeight.toFixed(1).replace(/\.0$/, '');
                    return (
                      <Pressable
                        key={idx}
                        style={styles.summaryRow}
                        onPress={() => handleRemovePlate(item.weight)}
                      >
                        <View
                          style={[
                            styles.colorIndicator,
                            { backgroundColor: PLATE_METADATA[item.weight]?.color || '#94a3b8' },
                          ]}
                        />
                        <Text style={[styles.summaryText, { color: theme.colors.text }]}>
                          <Text style={styles.boldText}>{item.count}×</Text> {item.weight} kg{' '}
                          {isImperial ? `(${formattedWeight} lbs)` : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </ScrollView>

          <Pressable
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
            ]}
            onPress={onClose}
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: theme.colors.background, ...theme.typography.button },
              ]}
            >
              Done
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
      <KeyboardDoneAccessory />
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      borderWidth: 1,
      padding: 24,
      maxHeight: '88%',
    },
    bodyScroll: {
      width: '100%',
    },
    bodyScrollContent: {
      paddingBottom: 8,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    title: {
      fontSize: 20,
    },
    subtitle: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 13,
      marginBottom: 20,
      lineHeight: 18,
    },
    inputContainer: {
      marginBottom: 20,
    },
    inputLabel: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 12,
      textTransform: 'uppercase',
      marginBottom: 8,
      letterSpacing: 1,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
    },
    input: {
      flex: 1,
      paddingVertical: 12,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 20,
      fontVariant: ['tabular-nums'],
    },
    unitText: {
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 16,
      marginLeft: 8,
    },
    visualizerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 100,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 20,
      paddingHorizontal: 8,
      overflow: 'hidden',
    },
    visualizerInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    barbellSleeve: {
      width: 18,
      height: 12,
      backgroundColor: '#6B6E78',
      borderRadius: 3,
    },
    barbellCollar: {
      width: 8,
      height: 38,
      backgroundColor: '#8A8D96',
      borderRadius: 2,
      zIndex: 2,
    },
    barbellCenter: {
      flex: 1,
      height: 8,
      backgroundColor: '#8A8D96',
      minWidth: 40,
    },
    platesWrapper: {
      alignItems: 'center',
      gap: 1,
      zIndex: 1,
    },
    plateBlock: {
      borderRadius: 4,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    plateLabel: {
      fontWeight: '800',
      textAlign: 'center',
    },
    summaryList: {
      maxHeight: 160,
      marginBottom: 20,
    },
    emptyState: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    emptyText: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 14,
    },
    summaryContainer: {
      paddingVertical: 4,
    },
    summaryHeader: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    colorIndicator: {
      width: 12,
      height: 12,
      borderRadius: 3,
      marginRight: 10,
    },
    summaryText: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 14,
    },
    boldText: {
      fontFamily: 'SpaceGrotesk_700Bold',
    },
    actionButton: {
      height: 52,
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtonText: {
      fontSize: 15,
    },
    barbellAlert: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      marginBottom: 16,
      gap: 8,
    },
    barbellAlertText: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 13,
      flex: 1,
    },
    addPlatesContainer: {
      marginBottom: 20,
    },
    platesScroll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    addPlateChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 64,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      elevation: 2,
    },
    addPlateChipText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 12,
    },
    resetBarBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 4,
      backgroundColor: theme.colors.primarySubtle,
    },
    resetBarBtnText: {
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 12,
    },
  });
