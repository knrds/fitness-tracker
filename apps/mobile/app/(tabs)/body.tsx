import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  TextInput, 
  Modal, 
  Dimensions, 
  Alert,
  SafeAreaView
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { BodyMetric, BodyMeasurements } from '@fitness-tracker/domain';
import { useBodyMetricStore } from '../../src/stores/bodyMetricStore';
import { useProfileStore } from '../../src/stores/profileStore';

export default function BodyTrackingScreen() {
  const { addMetric, getMetricHistory, getLatestMetric } = useBodyMetricStore();
  const { profile } = useProfileStore();
  const isImperial = profile.preferredUnits === 'imperial';

  const [activeChartTab, setActiveChartTab] = useState<'weight' | 'fat'>('weight');
  const [modalVisible, setModalVisible] = useState(false);

  // Form states
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [arms, setArms] = useState('');
  const [legs, setLegs] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0] || '');

  const latest = getLatestMetric();

  const handleSave = () => {
    if (!weight.trim() && !bodyFat.trim() && !chest.trim() && !waist.trim() && !hips.trim() && !arms.trim() && !legs.trim()) {
      return Alert.alert('Error', 'Please enter at least one metric.');
    }

    const parsedDate = new Date(dateStr + 'T12:00:00.000Z');
    if (isNaN(parsedDate.getTime())) {
      return Alert.alert('Error', 'Please enter a valid date (YYYY-MM-DD).');
    }

    const updates: Omit<BodyMetric, 'id' | 'userId' | 'createdAt'> = {
      recordedAt: parsedDate,
    };

    // Weight conversion: store canonically in kg
    if (weight.trim()) {
      const wVal = parseFloat(weight);
      if (isNaN(wVal) || wVal <= 0) return Alert.alert('Error', 'Weight must be a positive number.');
      updates.weightKg = isImperial ? wVal / 2.20462 : wVal;
    }

    // Body fat %
    if (bodyFat.trim()) {
      const bfVal = parseFloat(bodyFat);
      if (isNaN(bfVal) || bfVal < 0 || bfVal > 100) {
        return Alert.alert('Error', 'Body fat must be between 0% and 100%.');
      }
      updates.bodyFatPercentage = bfVal;
    }

    // Measurements conversion: store canonically in cm
    const hasMeasurements = chest.trim() || waist.trim() || hips.trim() || arms.trim() || legs.trim();
    if (hasMeasurements) {
      const parseMeasurement = (val: string, label: string) => {
        if (!val.trim()) return undefined;
        const num = parseFloat(val);
        if (isNaN(num) || num <= 0) {
          throw new Error(`${label} must be a positive number.`);
        }
        // If imperial, convert inches to cm. Otherwise keep as cm.
        return isImperial ? num * 2.54 : num;
      };

      try {
        const meas: BodyMeasurements = {};
        const chestVal = parseMeasurement(chest, 'Chest');
        if (chestVal !== undefined) meas.chest = chestVal;
        const waistVal = parseMeasurement(waist, 'Waist');
        if (waistVal !== undefined) meas.waist = waistVal;
        const hipsVal = parseMeasurement(hips, 'Hips');
        if (hipsVal !== undefined) meas.hips = hipsVal;
        const armsVal = parseMeasurement(arms, 'Arms');
        if (armsVal !== undefined) {
          meas.leftArm = armsVal;
          meas.rightArm = armsVal;
        }
        const legsVal = parseMeasurement(legs, 'Legs');
        if (legsVal !== undefined) {
          meas.leftThigh = legsVal;
          meas.rightThigh = legsVal;
        }
        updates.measurements = meas;
      } catch (err) {
        return Alert.alert('Error', err instanceof Error ? err.message : 'Invalid measurements.');
      }
    }

    addMetric(updates);
    
    // Clear form and close modal
    setWeight('');
    setBodyFat('');
    setChest('');
    setWaist('');
    setHips('');
    setArms('');
    setLegs('');
    setDateStr(new Date().toISOString().split('T')[0] || '');
    setModalVisible(false);
  };

  // Convert weight display values
  const displayWeight = (kg?: number) => {
    if (!kg) return '--';
    const val = isImperial ? kg * 2.20462 : kg;
    return val.toFixed(1) + (isImperial ? ' lbs' : ' kg');
  };

  // Convert measurement display values
  const displayMeasurement = (cm?: number) => {
    if (!cm) return '--';
    const val = isImperial ? cm / 2.54 : cm;
    return val.toFixed(1) + (isImperial ? ' in' : ' cm');
  };

  const renderChart = () => {
    const screenWidth = Dimensions.get('window').width;
    const history = getMetricHistory(activeChartTab);

    if (history.length < 2) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="bar-chart-outline" size={40} color="#94a3b8" style={styles.noDataIcon} />
          <Text style={styles.noDataText}>Not enough data to draw chart.</Text>
          <Text style={styles.noDataSub}>Log at least 2 data points for {activeChartTab}.</Text>
        </View>
      );
    }

    const data = {
      labels: history.slice(-6).map(h => {
        const d = new Date(h.recordedAt);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      datasets: [
        {
          data: history.slice(-6).map(h => {
            if (activeChartTab === 'weight') {
              const kg = h.weightKg || 0;
              return isImperial ? kg * 2.20462 : kg;
            } else {
              return h.bodyFatPercentage || 0;
            }
          }),
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          strokeWidth: 2,
        }
      ]
    };

    return (
      <View style={styles.chartContainer}>
        <LineChart
          data={data}
          width={screenWidth - 32}
          height={200}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#2563eb',
            }
          }}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Body Metrics</Text>
        <Pressable style={styles.addBtn} onPress={() => setModalVisible(true)} testID="add-metric-btn">
          <Ionicons name="add" size={24} color="#ffffff" />
        </Pressable>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Latest Overview Cards */}
        <View style={styles.overviewRow}>
          <View style={styles.overviewCard}>
            <Ionicons name="scale-outline" size={24} color="#3b82f6" style={styles.cardIcon} />
            <Text style={styles.cardLabel}>Current Weight</Text>
            <Text style={styles.cardValue}>{displayWeight(latest?.weightKg)}</Text>
          </View>
          <View style={styles.overviewCard}>
            <Ionicons name="trending-down-outline" size={24} color="#10b981" style={styles.cardIcon} />
            <Text style={styles.cardLabel}>Body Fat</Text>
            <Text style={styles.cardValue}>
              {latest?.bodyFatPercentage ? latest.bodyFatPercentage.toFixed(1) + '%' : '--'}
            </Text>
          </View>
        </View>

        {/* Charts Section */}
        <View style={styles.chartToggleContainer}>
          <Pressable 
            style={[styles.toggleBtn, activeChartTab === 'weight' && styles.toggleBtnActive]}
            onPress={() => setActiveChartTab('weight')}
          >
            <Text style={[styles.toggleText, activeChartTab === 'weight' && styles.toggleTextActive]}>Weight</Text>
          </Pressable>
          <Pressable 
            style={[styles.toggleBtn, activeChartTab === 'fat' && styles.toggleBtnActive]}
            onPress={() => setActiveChartTab('fat')}
          >
            <Text style={[styles.toggleText, activeChartTab === 'fat' && styles.toggleTextActive]}>Body Fat</Text>
          </Pressable>
        </View>

        {renderChart()}

        {/* Measurements Section */}
        <Text style={styles.sectionTitle}>Latest Circumferences</Text>
        <View style={styles.measurementsList}>
          <View style={styles.measurementItem}>
            <Text style={styles.measLabel}>Chest</Text>
            <Text style={styles.measValue}>{displayMeasurement(latest?.measurements?.chest)}</Text>
          </View>
          <View style={styles.measurementItem}>
            <Text style={styles.measLabel}>Waist</Text>
            <Text style={styles.measValue}>{displayMeasurement(latest?.measurements?.waist)}</Text>
          </View>
          <View style={styles.measurementItem}>
            <Text style={styles.measLabel}>Hips</Text>
            <Text style={styles.measValue}>{displayMeasurement(latest?.measurements?.hips)}</Text>
          </View>
          <View style={styles.measurementItem}>
            <Text style={styles.measLabel}>Arms</Text>
            <Text style={styles.measValue}>{displayMeasurement(latest?.measurements?.leftArm)}</Text>
          </View>
          <View style={styles.measurementItem}>
            <Text style={styles.measLabel}>Legs</Text>
            <Text style={styles.measValue}>{displayMeasurement(latest?.measurements?.leftThigh)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Input Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Body Metrics</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalForm} contentContainerStyle={styles.modalFormContent}>
              <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={dateStr}
                onChangeText={setDateStr}
                placeholder="e.g. 2026-06-02"
                placeholderTextColor="#94a3b8"
              />

              <View style={styles.inputGrid}>
                <View style={styles.gridField}>
                  <Text style={styles.inputLabel}>Weight ({isImperial ? 'lbs' : 'kg'})</Text>
                  <TextInput
                    style={styles.input}
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="e.g. 80"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.gridField}>
                  <Text style={styles.inputLabel}>Body Fat %</Text>
                  <TextInput
                    style={styles.input}
                    value={bodyFat}
                    onChangeText={setBodyFat}
                    placeholder="e.g. 15"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.sectionDivider}>Circumferences ({isImperial ? 'inches' : 'cm'})</Text>

              <View style={styles.inputGrid}>
                <View style={styles.gridField}>
                  <Text style={styles.inputLabel}>Chest</Text>
                  <TextInput
                    style={styles.input}
                    value={chest}
                    onChangeText={setChest}
                    placeholder="Chest"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.gridField}>
                  <Text style={styles.inputLabel}>Waist</Text>
                  <TextInput
                    style={styles.input}
                    value={waist}
                    onChangeText={setWaist}
                    placeholder="Waist"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGrid}>
                <View style={styles.gridField}>
                  <Text style={styles.inputLabel}>Hips</Text>
                  <TextInput
                    style={styles.input}
                    value={hips}
                    onChangeText={setHips}
                    placeholder="Hips"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.gridField}>
                  <Text style={styles.inputLabel}>Arms</Text>
                  <TextInput
                    style={styles.input}
                    value={arms}
                    onChangeText={setArms}
                    placeholder="Arms"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGrid}>
                <View style={styles.gridField}>
                  <Text style={styles.inputLabel}>Legs</Text>
                  <TextInput
                    style={styles.input}
                    value={legs}
                    onChangeText={setLegs}
                    placeholder="Legs"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.gridField} />
              </View>

              <Pressable style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Entry</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  addBtn: {
    backgroundColor: '#3b82f6',
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardIcon: {
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#334155',
  },
  chartToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  toggleTextActive: {
    color: '#0f172a',
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    marginBottom: 24,
  },
  chart: {
    borderRadius: 16,
  },
  noDataContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  noDataIcon: {
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  noDataSub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  measurementsList: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 12,
  },
  measurementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  measLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  measValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalForm: {
    padding: 16,
  },
  modalFormContent: {
    paddingBottom: 40,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  inputGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  gridField: {
    flex: 1,
  },
  sectionDivider: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
    marginTop: 20,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  saveBtn: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
