import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Alert,
  SafeAreaView,
  Animated,
  Platform,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { BodyMetric, BodyMeasurements } from '@fitness-tracker/domain';
import { useBodyMetricStore } from '../../src/stores/bodyMetricStore';
import { useProfileStore } from '../../src/stores/profileStore';
import { useTheme, Card, Modal, Input } from '@fitness-tracker/ui';

export default function BodyTrackingScreen() {
  const theme = useTheme();
  const { addMetric, getMetricHistory, getLatestMetric } = useBodyMetricStore();
  const { profile } = useProfileStore();
  const isImperial = profile.preferredUnits === 'imperial';

  const [activeChartTab, setActiveChartTab] = useState<'weight' | 'fat'>('weight');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{
    date: string;
    value: string;
  } | null>(null);

  const chartFadeAnim = React.useRef(new Animated.Value(0)).current;
  const chartSlideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    setSelectedPoint(null);
    chartFadeAnim.setValue(0);
    chartSlideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(chartFadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(chartSlideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [activeChartTab]);

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
    if (
      !weight.trim() &&
      !bodyFat.trim() &&
      !chest.trim() &&
      !waist.trim() &&
      !hips.trim() &&
      !arms.trim() &&
      !legs.trim()
    ) {
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
      if (isNaN(wVal) || wVal <= 0)
        return Alert.alert('Error', 'Weight must be a positive number.');
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
    const hasMeasurements =
      chest.trim() || waist.trim() || hips.trim() || arms.trim() || legs.trim();
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
        <Card padding="lg" style={{ alignItems: 'center' }}>
          <Text
            style={[
              {
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 16,
                marginBottom: 4,
              },
            ]}
          >
            Not enough data
          </Text>
          <Text style={[{ color: theme.colors.muted, ...theme.typography.body }]}>
            Log at least 2 data points.
          </Text>
        </Card>
      );
    }

    const data = {
      labels: history.slice(-6).map((h) => {
        const d = new Date(h.recordedAt);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      datasets: [
        {
          data: history.slice(-6).map((h) => {
            if (activeChartTab === 'weight') {
              const kg = h.weightKg || 0;
              return isImperial ? kg * 2.20462 : kg;
            } else {
              return h.bodyFatPercentage || 0;
            }
          }),
          color: () => theme.colors.primary,
          strokeWidth: 2,
        },
      ],
    };

    return (
      <Animated.View
        style={[
          styles.chartContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.muted,
            opacity: chartFadeAnim,
            transform: [{ translateY: chartSlideAnim }],
          },
        ]}
      >
        <Text
          style={[
            styles.chartTitle,
            {
              color: theme.colors.text,
              ...theme.typography.heading,
              fontSize: 16,
              marginBottom: 4,
            },
          ]}
        >
          {activeChartTab === 'weight' ? 'Weight History' : 'Body Fat History'}
        </Text>

        {selectedPoint ? (
          <View
            style={[
              styles.tooltipContainer,
              { backgroundColor: theme.colors.background, borderColor: theme.colors.primary },
            ]}
          >
            <Ionicons name="stats-chart" size={16} color={theme.colors.primary} />
            <Text style={[styles.tooltipText, { color: theme.colors.text }]}>
              <Text style={{ fontFamily: 'SpaceGrotesk_700Bold' }}>{selectedPoint.date}</Text>:{' '}
              <Text style={{ color: theme.colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }}>
                {selectedPoint.value}
              </Text>
            </Text>
            <Pressable onPress={() => setSelectedPoint(null)} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={theme.colors.muted} />
            </Pressable>
          </View>
        ) : (
          <Text style={[styles.chartTipText, { color: theme.colors.muted }]}>
            💡 Tap any point on the chart to see details
          </Text>
        )}

        <LineChart
          data={data}
          width={screenWidth - 32}
          height={200}
          withInnerLines={false}
          withOuterLines={false}
          onDataPointClick={({ index }) => {
            const slicedHistory = history.slice(-6);
            const item = slicedHistory[index];
            if (item) {
              const dateStr = new Date(item.recordedAt).toLocaleDateString();
              let valStr = '';
              if (activeChartTab === 'weight') {
                const w = item.weightKg
                  ? isImperial
                    ? item.weightKg * 2.20462
                    : item.weightKg
                  : 0;
                valStr = `${w.toFixed(1)} ${isImperial ? 'lbs' : 'kg'}`;
              } else {
                valStr = `${(item.bodyFatPercentage || 0).toFixed(1)}%`;
              }
              setSelectedPoint({
                date: dateStr,
                value: valStr,
              });
            }
          }}
          chartConfig={{
            backgroundColor: theme.colors.surface,
            backgroundGradientFrom: theme.colors.surface,
            backgroundGradientTo: theme.colors.surface,
            decimalPlaces: 1,
            color: () => theme.colors.primary,
            labelColor: () => theme.colors.muted,
            propsForDots: {
              r: '5',
              strokeWidth: '2',
              stroke: theme.colors.surface,
            },
          }}
          bezier
          style={styles.chart}
        />
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <Text
          style={[styles.headerTitle, { color: theme.colors.text, ...theme.typography.heading }]}
        >
          BODY METRICS
        </Text>
        <Pressable
          style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
          onPress={() => setModalVisible(true)}
          testID="add-metric-btn"
        >
          <Ionicons name="add" size={24} color={theme.colors.background} />
        </Pressable>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Latest Overview Cards */}
        <View style={styles.overviewRow}>
          <Card style={styles.overviewCard} padding="md">
            <Ionicons
              name="scale-outline"
              size={24}
              color={theme.colors.muted}
              style={styles.cardIcon}
            />
            <Text
              style={[styles.cardLabel, { color: theme.colors.muted, ...theme.typography.caption }]}
            >
              CURRENT WEIGHT
            </Text>
            <Text
              style={[
                styles.cardValue,
                { color: theme.colors.text, ...theme.typography.heading, fontSize: 24 },
              ]}
            >
              {displayWeight(latest?.weightKg)}
            </Text>
          </Card>
          <Card style={styles.overviewCard} padding="md">
            <Ionicons
              name="water-outline"
              size={24}
              color={theme.colors.muted}
              style={styles.cardIcon}
            />
            <Text
              style={[styles.cardLabel, { color: theme.colors.muted, ...theme.typography.caption }]}
            >
              BODY FAT
            </Text>
            <Text
              style={[
                styles.cardValue,
                { color: theme.colors.text, ...theme.typography.heading, fontSize: 24 },
              ]}
            >
              {latest?.bodyFatPercentage ? latest.bodyFatPercentage.toFixed(1) + '%' : '--'}
            </Text>
          </Card>
        </View>

        {/* Charts Section */}
        <View style={styles.chartToggleContainer}>
          <Pressable
            style={[
              styles.toggleBtn,
              activeChartTab === 'weight' && {
                borderBottomColor: theme.colors.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveChartTab('weight')}
          >
            <Text
              style={[
                styles.toggleText,
                {
                  color: activeChartTab === 'weight' ? theme.colors.primary : theme.colors.muted,
                  ...theme.typography.caption,
                },
              ]}
            >
              WEIGHT
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.toggleBtn,
              activeChartTab === 'fat' && {
                borderBottomColor: theme.colors.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveChartTab('fat')}
          >
            <Text
              style={[
                styles.toggleText,
                {
                  color: activeChartTab === 'fat' ? theme.colors.primary : theme.colors.muted,
                  ...theme.typography.caption,
                },
              ]}
            >
              BODY FAT
            </Text>
          </Pressable>
        </View>

        {renderChart()}

        {/* Measurements Section */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.text, ...theme.typography.heading, fontSize: 20 },
          ]}
        >
          LATEST MEASUREMENTS
        </Text>
        <Card padding="md" style={styles.measurementsList}>
          {[
            { label: 'Chest', val: latest?.measurements?.chest },
            { label: 'Waist', val: latest?.measurements?.waist },
            { label: 'Hips', val: latest?.measurements?.hips },
            { label: 'Arms', val: latest?.measurements?.leftArm },
            { label: 'Legs', val: latest?.measurements?.leftThigh },
          ].map((item, idx, arr) => (
            <View
              key={item.label}
              style={[
                styles.measurementItem,
                idx < arr.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.muted,
                },
              ]}
            >
              <Text style={[{ color: theme.colors.muted, ...theme.typography.body }]}>
                {item.label}
              </Text>
              <Text
                style={[{ color: theme.colors.text, ...theme.typography.body, fontWeight: 'bold' }]}
              >
                {displayMeasurement(item.val)}
              </Text>
            </View>
          ))}
        </Card>
      </ScrollView>

      {/* Input Modal */}
      <Modal
        visible={modalVisible}
        title="Log Body Metrics"
        onClose={() => setModalVisible(false)}
        primaryActionTitle="Save Entry"
        onPrimaryAction={handleSave}
        secondaryActionTitle="Cancel"
        onSecondaryAction={() => setModalVisible(false)}
      >
        <ScrollView style={styles.modalForm} contentContainerStyle={styles.modalFormContent}>
          <Input
            label="Date (YYYY-MM-DD)"
            value={dateStr}
            onChangeText={setDateStr}
            placeholder="e.g. 2026-06-02"
          />

          <View style={styles.inputGrid}>
            <View style={styles.gridField}>
              <Input
                label={`Weight (${isImperial ? 'lbs' : 'kg'})`}
                value={weight}
                onChangeText={setWeight}
                placeholder="e.g. 80"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.gridField}>
              <Input
                label="Body Fat %"
                value={bodyFat}
                onChangeText={setBodyFat}
                placeholder="e.g. 15"
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text
            style={[
              styles.sectionDivider,
              { color: theme.colors.primary, ...theme.typography.caption },
            ]}
          >
            CIRCUMFERENCES ({isImperial ? 'INCHES' : 'CM'})
          </Text>

          <View style={styles.inputGrid}>
            <View style={styles.gridField}>
              <Input
                label="Chest"
                value={chest}
                onChangeText={setChest}
                placeholder="Chest"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.gridField}>
              <Input
                label="Waist"
                value={waist}
                onChangeText={setWaist}
                placeholder="Waist"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGrid}>
            <View style={styles.gridField}>
              <Input
                label="Hips"
                value={hips}
                onChangeText={setHips}
                placeholder="Hips"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.gridField}>
              <Input
                label="Arms"
                value={arms}
                onChangeText={setArms}
                placeholder="Arms"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGrid}>
            <View style={styles.gridField}>
              <Input
                label="Legs"
                value={legs}
                onChangeText={setLegs}
                placeholder="Legs"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.gridField} />
          </View>
        </ScrollView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
  },
  headerTitle: {},
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  overviewCard: {
    flex: 1,
  },
  cardIcon: {
    marginBottom: 8,
  },
  cardLabel: {
    marginBottom: 4,
  },
  cardValue: {},
  chartToggleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  toggleBtn: {
    marginRight: 24,
    paddingVertical: 8,
  },
  toggleText: {},
  chartContainer: {
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 24,
  },
  chart: {
    borderRadius: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  measurementsList: {},
  measurementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalForm: {
    maxHeight: 400,
  },
  modalFormContent: {},
  inputGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  gridField: {
    flex: 1,
  },
  sectionDivider: {
    marginTop: 20,
    marginBottom: 12,
  },
  chartTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    marginBottom: 6,
    textAlign: 'center',
  },
  tooltipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
    width: '90%',
  },
  tooltipText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    flex: 1,
  },
  chartTipText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    marginTop: 6,
    marginBottom: 4,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
