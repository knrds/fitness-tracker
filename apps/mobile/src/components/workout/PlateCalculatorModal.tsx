import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
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

const PLATE_METADATA: Record<number, { color: string; labelColor: string; height: number; width: number }> = {
  25: { color: '#ef4444', labelColor: '#ffffff', height: 80, width: 22 },
  20: { color: '#3b82f6', labelColor: '#ffffff', height: 74, width: 20 },
  15: { color: '#eab308', labelColor: '#0f172a', height: 68, width: 18 },
  10: { color: '#22c55e', labelColor: '#ffffff', height: 60, width: 16 },
  5: { color: '#f8fafc', labelColor: '#334155', height: 50, width: 14 },
  2.5: { color: '#1e293b', labelColor: '#ffffff', height: 42, width: 12 },
  1.25: { color: '#94a3b8', labelColor: '#ffffff', height: 34, width: 10 },
};

export const PlateCalculatorModal = ({ visible, initialWeightKg, onClose }: Props) => {
  const { profile } = useProfileStore();
  const isImperial = profile.preferredUnits === 'imperial';

  // State to hold the user's input weight in display units
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
    ? (isImperial ? parseFloat(inputWeight) / 2.20462 : parseFloat(inputWeight))
    : 0;

  const calculatePlates = (weightKg: number): PlateCount[] => {
    const barbell = 20; // standard 20kg barbell
    if (weightKg <= barbell) return [];

    let perSide = (weightKg - barbell) / 2;
    const plates = [25, 20, 15, 10, 5, 2.5, 1.25];
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

  // Generate visual plate list (flat list of plates to draw in order)
  const visualPlates: number[] = [];
  platesPerSide.forEach((item) => {
    for (let i = 0; i < item.count; i++) {
      visualPlates.push(item.weight);
    }
  });
  // Sort descending so largest plates are loaded closest to the collar (inside)
  visualPlates.sort((a, b) => b - a);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Plate Calculator</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={15}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Enter target weight to see the plates needed per side on a 20kg (44 lbs) bar.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Target Weight</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={inputWeight}
                onChangeText={setInputWeight}
                placeholder="0.0"
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
                autoFocus
              />
              <Text style={styles.unitText}>{isImperial ? 'lbs' : 'kg'}</Text>
            </View>
          </View>

          {/* Barbell Visualization */}
          {targetWeightKg > 20 && (
            <View style={styles.visualizerContainer}>
              {/* Left Sleeve End */}
              <View style={styles.barbellSleeveLeft} />
              
              {/* Left Plates Wrapper (right-aligned to collar) */}
              <View style={[styles.platesWrapper, { flexDirection: 'row-reverse' }]}>
                {visualPlates.map((weight, idx) => {
                  const meta = PLATE_METADATA[weight] || { color: '#cbd5e1', labelColor: '#334155', height: 40, width: 12 };
                  return (
                    <View
                      key={`left-${idx}`}
                      style={[
                        styles.plateBlock,
                        {
                          backgroundColor: meta.color,
                          height: meta.height,
                          width: meta.width,
                          borderColor: weight === 5 ? '#e2e8f0' : 'rgba(0,0,0,0.15)',
                        },
                      ]}
                    >
                      <Text style={[styles.plateLabel, { color: meta.labelColor, fontSize: meta.width < 14 ? 6 : 8 }]}>
                        {weight}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Left Collar */}
              <View style={styles.barbellCollar} />

              {/* Center Bar */}
              <View style={styles.barbellCenter} />

              {/* Right Collar */}
              <View style={styles.barbellCollar} />

              {/* Right Plates Wrapper (left-aligned to collar) */}
              <View style={[styles.platesWrapper, { flexDirection: 'row' }]}>
                {visualPlates.map((weight, idx) => {
                  const meta = PLATE_METADATA[weight] || { color: '#cbd5e1', labelColor: '#334155', height: 40, width: 12 };
                  return (
                    <View
                      key={`right-${idx}`}
                      style={[
                        styles.plateBlock,
                        {
                          backgroundColor: meta.color,
                          height: meta.height,
                          width: meta.width,
                          borderColor: weight === 5 ? '#e2e8f0' : 'rgba(0,0,0,0.15)',
                        },
                      ]}
                    >
                      <Text style={[styles.plateLabel, { color: meta.labelColor, fontSize: meta.width < 14 ? 6 : 8 }]}>
                        {weight}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Right Sleeve End */}
              <View style={styles.barbellSleeveRight} />
            </View>
          )}

          {/* Text Summary */}
          <ScrollView style={styles.summaryList}>
            {targetWeightKg <= 20 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {targetWeightKg > 0 ? 'Barbell only (20 kg / 44 lbs).' : 'Enter a weight greater than 20kg.'}
                </Text>
              </View>
            ) : (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryHeader}>Plates per side:</Text>
                {platesPerSide.map((item, idx) => {
                  const displayWeight = isImperial ? item.weight * 2.20462 : item.weight;
                  const formattedWeight = displayWeight.toFixed(1).replace(/\.0$/, '');
                  return (
                    <View key={idx} style={styles.summaryRow}>
                      <View style={[styles.colorIndicator, { backgroundColor: PLATE_METADATA[item.weight]?.color || '#94a3b8' }]} />
                      <Text style={styles.summaryText}>
                        <Text style={styles.boldText}>{item.count}x</Text> {item.weight} kg {isImperial ? `(${formattedWeight} lbs)` : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <Pressable style={styles.actionButton} onPress={onClose}>
            <Text style={styles.actionButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 18,
    color: '#0f172a',
    fontWeight: '600',
  },
  unitText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
    marginLeft: 8,
  },
  visualizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  barbellSleeveLeft: {
    width: 20,
    height: 12,
    backgroundColor: '#cbd5e1',
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  barbellSleeveRight: {
    width: 20,
    height: 12,
    backgroundColor: '#cbd5e1',
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  barbellCollar: {
    width: 8,
    height: 38,
    backgroundColor: '#94a3b8',
    borderRadius: 2,
    zIndex: 2,
  },
  barbellCenter: {
    flex: 1,
    height: 8,
    backgroundColor: '#94a3b8',
    minWidth: 40,
  },
  platesWrapper: {
    alignItems: 'center',
    gap: 1,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  plateBlock: {
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  plateLabel: {
    fontWeight: '800',
    textAlign: 'center',
  },
  summaryList: {
    maxHeight: 180,
    marginBottom: 20,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    fontStyle: 'italic',
  },
  summaryContainer: {
    paddingVertical: 4,
  },
  summaryHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
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
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  summaryText: {
    fontSize: 14,
    color: '#0f172a',
  },
  boldText: {
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
