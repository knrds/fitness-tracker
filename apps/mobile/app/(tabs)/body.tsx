import { CustomExerciseModal } from '../../src/components/exercises/CustomExerciseModal';
import { SegmentedControl, AnimatedDisclosure } from '@fitness-tracker/ui';
import { useReducedMotion } from 'react-native-reanimated';
import { MeasurementMap } from '../../src/components/MeasurementMap';
import { VoltBackdrop } from '../../src/components/VoltBackdrop';
import { WaterVessel } from '../../src/components/WaterVessel';
import { parseDecimalInput } from '../../src/utils/decimalInput';
import { useFocusScroll } from '../../src/hooks/useFocusScroll';
import { scopedAlert as Alert } from '../../src/utils/scopedAlert';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  Animated,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import {
  BodyMetric,
  BodyMeasurements,
  formatDateLocal,
  MuscleGroup,
} from '@fitness-tracker/domain';
import { useBodyMetricStore } from '../../src/stores/bodyMetricStore';
import { useProfileStore } from '../../src/stores/profileStore';
import { useHydrationStore } from '../../src/stores/hydrationStore';
import { useTheme, Card, Modal, Input, withAlpha } from '@fitness-tracker/ui';
import {
  KeyboardDoneAccessory,
  KEYBOARD_DONE_ID,
} from '../../src/components/workout/KeyboardDoneAccessory';
import { DatePickerModal } from '../../src/components/DatePickerModal';
import { useI18n } from '../../src/i18n';
import { entitlementService } from '../../src/services/entitlementService';
import { usePaywallStore } from '../../src/stores/paywallStore';

import ExercisesScreen from './exercises';

type BodyTab = 'metrics' | 'exercises';
type BodyWidgetKey = 'weight' | 'height' | 'bodyFat' | 'bmi';

const BODY_WIDGET_FACTS: Record<
  BodyWidgetKey,
  {
    title: { de: string; en: string };
    icon: React.ComponentProps<typeof Ionicons>['name'];
    facts: { de: string[]; en: string[] };
  }
> = {
  weight: {
    title: { de: 'KÖRPERGEWICHT & TRENDS', en: 'BODY WEIGHT & TRENDS' },
    icon: 'scale-outline',
    facts: {
      de: [
        'Das Tagesgewicht kann durch Wasserhaushalt, Natriumzufuhr und Verdauung um 1–2 kg schwanken.',
        'Für verlässliche Trends ist ein wöchentlicher gleitender Durchschnitt aussagekräftiger als einzelne Tageswerte.',
        'Wiege dich idealerweise morgens nüchtern nach dem Aufstehen für maximale Vergleichbarkeit.',
      ],
      en: [
        'Daily body weight can fluctuate by 1–2 kg due to water retention, sodium intake, and digestion.',
        'For reliable trends, a weekly moving average is far more informative than isolated daily weigh-ins.',
        'Weigh yourself consistently in the morning after waking up for optimal comparability.',
      ],
    },
  },
  height: {
    title: { de: 'KÖRPERGRÖSSE & HEBEL', en: 'HEIGHT & LEVERAGES' },
    icon: 'body-outline',
    facts: {
      de: [
        'Durch Entlastung der Bandscheiben über Nacht bist du morgens ca. 1–2 cm größer als am Abend.',
        'Für Trainings- und Hebelberechnungen sollte eine einheitliche Standardangabe verwendet werden.',
        'Körpergröße und Gliedmaßenproportionen bestimmen deine individuellen biomechanischen Hebelverhältnisse.',
      ],
      en: [
        'Spinal decompression overnight makes you roughly 1–2 cm taller in the morning than in the evening.',
        'Use a consistent standard measurement for training volume and leverage calculations.',
        'Height and limb proportions directly influence your natural biomechanical leverages.',
      ],
    },
  },
  bodyFat: {
    title: { de: 'KÖRPERFETT-MESSUNG', en: 'BODY FAT METRICS' },
    icon: 'water-outline',
    facts: {
      de: [
        'Verschiedene Messmethoden (BIA-Waage, Caliper, DEXA) können messbedingt voneinander abweichen.',
        'Langfristige Trendlinien und der Taillenumfang sind oft aussagekräftiger als einzelne Momentaufnahmen.',
        'Im Krafttraining schützt eine ausreichende Proteinzufuhr während einer Reduktionsphase deine Muskelmasse.',
      ],
      en: [
        'Different measurement methods (bioimpedance scales, calipers, DEXA) can show substantial variance.',
        'Long-term trendlines and waist circumference give a much clearer picture than single readings.',
        'Adequate protein intake during a caloric deficit helps preserve lean muscle tissue in resistance training.',
      ],
    },
  },
  bmi: {
    title: { de: 'BMI EINORDNUNG', en: 'BMI CONTEXT' },
    icon: 'pulse-outline',
    facts: {
      de: [
        'Der BMI setzt Körpergewicht und Körpergröße ins Verhältnis, unterscheidet aber nicht zwischen Fett- und Muskelmasse.',
        'Bei intensiv trainierenden Personen mit hoher Muskelmasse hat der BMI allein nur eingeschränkte Aussagekraft.',
        'Kombiniere den BMI stets mit Kraftwerten, Spiegelbild und Taillenumfang für eine realistische Einschätzung.',
      ],
      en: [
        'BMI relates body weight to height, but cannot distinguish between lean muscle mass and fat tissue.',
        'In heavily muscled strength athletes, BMI alone has limited applicability.',
        'Combine BMI with strength benchmarks, visual progress, and waist measurements for an accurate assessment.',
      ],
    },
  },
};

export default function BodyTrackingScreen() {
  const reducedMotion = useReducedMotion();
  const scrollRef = useFocusScroll();
  const theme = useTheme();
  const { t, language } = useI18n();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: BodyTab }>();
  const { metrics, addMetric, getMetricHistory, getLatestMetric } = useBodyMetricStore();
  const { profile } = useProfileStore();
  const { dailyGoalMl, todayIntakeMl, addWater, removeWater, setDailyGoal, resetToday } =
    useHydrationStore();
  const isImperial = profile.preferredUnits === 'imperial';

  const [activeChartTab, setActiveChartTab] = useState<'weight' | 'fat'>('weight');
  const [modalVisible, setModalVisible] = useState(false);
  const [customExerciseVisible, setCustomExerciseVisible] = useState(false);
  const [hydrationSettingsExpanded, setHydrationSettingsExpanded] = useState(false);
  const [activeBodyTab, setActiveBodyTab] = useState<BodyTab>(
    params.tab === 'exercises' ? 'exercises' : 'metrics',
  );
  const [activeBodyWidget, setActiveBodyWidget] = useState<BodyWidgetKey | null>(null);
  const [bodyFactIndex, setBodyFactIndex] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState<{
    date: string;
    value: string;
  } | null>(null);

  React.useEffect(() => {
    if (params.tab === 'exercises') {
      setActiveBodyTab('exercises');
    } else if (params.tab === 'metrics') {
      setActiveBodyTab('metrics');
    }
  }, [params.tab]);

  const chartFadeAnim = React.useRef(new Animated.Value(0)).current;
  const chartSlideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    setSelectedPoint(null);
    chartFadeAnim.setValue(0);
    chartSlideAnim.setValue(8);
    Animated.parallel([
      Animated.timing(chartFadeAnim, {
        toValue: 1,
        duration: reducedMotion ? 0 : 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(chartSlideAnim, {
        toValue: 0,
        duration: reducedMotion ? 0 : 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [activeChartTab, reducedMotion]);

  // Form states
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [arms, setArms] = useState('');
  const [legs, setLegs] = useState('');
  const [dateStr, setDateStr] = useState(formatDateLocal(new Date()));
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [hydrationGoalInput, setHydrationGoalInput] = useState(String(dailyGoalMl));

  const latest = getLatestMetric();
  const recentMetrics = metrics.slice(0, 8);
  const currentWeightKg = latest?.weightKg ?? profile.weightKg;
  const currentHeightCm = profile.heightCm;
  const bmi = React.useMemo(() => {
    if (!currentWeightKg || !currentHeightCm || currentHeightCm <= 0) return null;
    const hM = currentHeightCm / 100;
    return (currentWeightKg / (hM * hM)).toFixed(1);
  }, [currentWeightKg, currentHeightCm]);

  const hydrationProgress = dailyGoalMl > 0 ? Math.min(1, todayIntakeMl / dailyGoalMl) : 0;
  const hydrationPercent = Math.round(hydrationProgress * 100);
  const hydrationFact =
    language === 'de'
      ? hydrationPercent >= 100
        ? 'Dein Wasserspeicher ist voll. Deine Zellen feiern leise ein Fest.'
        : hydrationPercent >= 70
          ? 'Hydration im grünen Bereich. Deine Organe klatschen bereits Beifall.'
          : hydrationPercent >= 35
            ? 'Auf halbem Weg: Noch kein Heldenstatus, aber definitiv keine Wüstentour.'
            : 'Starte mit einem Glas. Das am meisten unterschätzte Leistungs-Supplement ist immer noch Wasser.'
      : hydrationPercent >= 100
        ? 'Your water meter is full. Tiny cellular high-fives are happening quietly.'
        : hydrationPercent >= 70
          ? 'Hydration is in the green zone. Your next set of organs is probably applauding politely.'
          : hydrationPercent >= 35
            ? 'Halfway-ish hydration: not heroic yet, but definitely no desert arc today.'
            : 'Start with one glass. The most underrated performance supplement is still boring old water.';

  const handleSaveHydrationGoal = () => {
    const nextGoal = parseInt(hydrationGoalInput, 10);
    if (!Number.isFinite(nextGoal) || nextGoal < 250) {
      return Alert.alert(
        t('common.error'),
        language === 'en'
          ? 'Hydration goal must be at least 250 ml.'
          : 'Das Trinkziel muss mindestens 250 ml betragen.',
      );
    }
    setDailyGoal(nextGoal);
    setHydrationGoalInput(String(nextGoal));
  };

  const handleSave = () => {
    if (
      !weight.trim() &&
      !height.trim() &&
      !bodyFat.trim() &&
      !chest.trim() &&
      !waist.trim() &&
      !hips.trim() &&
      !arms.trim() &&
      !legs.trim()
    ) {
      return Alert.alert(
        t('common.error'),
        language === 'en'
          ? 'Please enter at least one metric.'
          : 'Bitte trage mindestens einen Messwert ein.',
      );
    }

    const parsedDate = new Date(`${dateStr}T12:00:00`);
    if (isNaN(parsedDate.getTime()) || formatDateLocal(parsedDate) !== dateStr) {
      return Alert.alert(
        t('common.error'),
        language === 'en'
          ? 'Please enter a valid date (YYYY-MM-DD).'
          : 'Bitte ein gültiges Datum (JJJJ-MM-TT) eingeben.',
      );
    }
    if (parsedDate.getTime() > Date.now()) {
      return Alert.alert(
        t('common.error'),
        language === 'en'
          ? 'Measurement date cannot be in the future.'
          : 'Das Messdatum darf nicht in der Zukunft liegen.',
      );
    }

    const updates: Omit<BodyMetric, 'id' | 'userId' | 'createdAt'> = {
      recordedAt: parsedDate,
    };

    // Height conversion: update profile canonically in cm
    if (height.trim()) {
      const hVal = parseDecimalInput(height);
      if (isNaN(hVal) || hVal <= 0)
        return Alert.alert(
          t('common.error'),
          language === 'en'
            ? 'Height must be a positive number.'
            : 'Die Größe muss eine positive Zahl sein.',
        );
      const canonicalHeight = isImperial ? hVal * 2.54 : hVal;
      useProfileStore.getState().updateProfile({ heightCm: canonicalHeight });
    }

    // Weight conversion: store canonically in kg and keep profileStore in sync
    if (weight.trim()) {
      const wVal = parseDecimalInput(weight);
      if (isNaN(wVal) || wVal <= 0)
        return Alert.alert(
          t('common.error'),
          language === 'en'
            ? 'Weight must be a positive number.'
            : 'Das Gewicht muss eine positive Zahl sein.',
        );
      const canonicalWeight = isImperial ? wVal / 2.20462 : wVal;
      updates.weightKg = canonicalWeight;
      useProfileStore.getState().updateProfile({ weightKg: canonicalWeight });
    }

    // Body fat %
    if (bodyFat.trim()) {
      const bfVal = parseDecimalInput(bodyFat);
      if (isNaN(bfVal) || bfVal < 0 || bfVal > 100) {
        return Alert.alert(
          t('common.error'),
          language === 'en'
            ? 'Body fat must be between 0% and 100%.'
            : 'Der Körperfettanteil muss zwischen 0 % und 100 % liegen.',
        );
      }
      updates.bodyFatPercentage = bfVal;
    }

    // Measurements conversion: store canonically in cm
    const hasMeasurements =
      chest.trim() || waist.trim() || hips.trim() || arms.trim() || legs.trim();
    if (hasMeasurements) {
      const parseMeasurement = (val: string, label: string) => {
        if (!val.trim()) return undefined;
        const num = parseDecimalInput(val);
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
        return Alert.alert(
          t('common.error'),
          err instanceof Error
            ? err.message
            : language === 'en'
              ? 'Invalid measurements.'
              : 'Ungültige Körpermaße.',
        );
      }
    }

    const hasAdvanced =
      updates.bodyFatPercentage !== undefined || updates.measurements !== undefined;
    if (hasAdvanced && !entitlementService.canUseAdvancedMetrics()) {
      usePaywallStore.getState().openPaywall('pro', 'metric');
      if (updates.weightKg === undefined) {
        return;
      }
    }

    if (
      updates.weightKg !== undefined ||
      updates.bodyFatPercentage !== undefined ||
      updates.measurements !== undefined
    ) {
      addMetric(updates);
    }

    // Clear form and close modal
    setWeight('');
    setHeight('');
    setBodyFat('');
    setChest('');
    setWaist('');
    setHips('');
    setArms('');
    setLegs('');
    setDateStr(formatDateLocal(new Date()));
    setModalVisible(false);
  };

  const handleToggleBodyWidget = (widget: BodyWidgetKey) => {
    if (activeBodyWidget === widget) {
      setActiveBodyWidget(null);
    } else {
      const langKey = language === 'en' ? 'en' : 'de';
      const count = BODY_WIDGET_FACTS[widget].facts[langKey].length;
      const nextIdx = Math.floor(Math.random() * count);
      setBodyFactIndex(nextIdx);
      setActiveBodyWidget(widget);
    }
  };

  const renderBodyFactPanel = (widgetKey: BodyWidgetKey) => {
    const widgetData = BODY_WIDGET_FACTS[widgetKey];
    const langKey = language === 'en' ? 'en' : 'de';
    const facts = widgetData.facts[langKey];
    const currentFact = facts[bodyFactIndex % facts.length];

    return (
      <Card
        key={`fact-${widgetKey}`}
        padding="md"
        style={[
          styles.bodyFactCard,
          {
            borderColor: withAlpha(theme.colors.primary, 0.35),
            backgroundColor: withAlpha(theme.colors.surface, 0.95),
          },
        ]}
        testID={`body-fact-${widgetKey}`}
      >
        <View style={styles.bodyFactHeader}>
          <View style={styles.bodyFactHeaderLeft}>
            <Ionicons name={widgetData.icon} size={16} color={theme.colors.primary} />
            <Text style={[styles.bodyFactTitle, { color: theme.colors.primary }]}>
              {widgetData.title[langKey]}
            </Text>
          </View>
          <Pressable
            onPress={() => setActiveBodyWidget(null)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={language === 'en' ? 'Close info' : 'Info schließen'}
          >
            <Ionicons name="close" size={18} color={theme.colors.muted} />
          </Pressable>
        </View>
        <Text style={[styles.bodyFactText, { color: theme.colors.text }]}>
          {currentFact}
        </Text>
        <Pressable
          onPress={() => {
            setBodyFactIndex((prev) => (prev + 1) % facts.length);
          }}
          style={styles.bodyFactCycleBtn}
          accessibilityRole="button"
          accessibilityLabel={language === 'en' ? 'Next fact' : 'Nächster Fakt'}
        >
          <Ionicons name="sparkles-outline" size={13} color={theme.colors.muted} />
          <Text style={[styles.bodyFactCycleText, { color: theme.colors.muted }]}>
            {language === 'en' ? 'Tap for another tip' : 'Tippen für weiteren Hinweis'}
          </Text>
        </Pressable>
      </Card>
    );
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
    const history = getMetricHistory(activeChartTab);

    if (history.length < 2) {
      return (
        <Card padding="lg" style={{ alignItems: 'center', marginBottom: 24 }}>
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
            {t('body.notEnoughData')}
          </Text>
          <Text style={[{ color: theme.colors.muted, ...theme.typography.body }]}>
            {t('body.logAtLeastTwo')}
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

    const chartWidth = Math.max(180, Math.min(screenWidth - 112, 600));

    return (
      <Animated.View
        style={[
          styles.chartContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 }}>
            <Ionicons name="information-circle-outline" size={13} color={theme.colors.muted} />
            <Text style={[styles.chartTipText, { color: theme.colors.muted }]}>
              {t('body.chartTip')}
            </Text>
          </View>
        )}

        <LineChart
          data={data}
          width={chartWidth}
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
    <View style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.background, paddingTop: Math.max(insets.top, 16) },
        ]}
      >
        <Text
          style={[styles.headerTitle, { color: theme.colors.text, ...theme.typography.heading }]}
        >
          {t('nav.body')}
        </Text>
        {(
          <Pressable
            style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => activeBodyTab === 'metrics' ? setModalVisible(true) : setCustomExerciseVisible(true)}
            accessibilityRole="button" accessibilityLabel={language === 'de' ? 'Hinzufügen' : 'Add'}
            testID="add-metric-btn"
          >
            <Ionicons name="add" size={24} color={theme.colors.background} />
          </Pressable>
        )}
      </View>

      <CustomExerciseModal visible={customExerciseVisible} onClose={() => setCustomExerciseVisible(false)} />
      <SegmentedControl
        label={language === 'en' ? 'Body views' : 'Körperansichten'}
        value={activeBodyTab}
        onChange={setActiveBodyTab}
        options={[
          { value: 'metrics', label: language === 'en' ? 'Metrics' : 'Metriken' },
          { value: 'exercises', label: language === 'en' ? 'Exercises' : 'Übungen' },
        ]}
      />
      {activeBodyTab === 'metrics' ? (
        <ScrollView
          ref={scrollRef}
          style={styles.container}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 20, 100) },
          ]}
        >
          {/* Latest Overview Cards */}
          <View style={styles.overviewRow}>
            <Card
              style={[
                styles.overviewCard,
                activeBodyWidget === 'weight' && {
                  borderColor: theme.colors.primary,
                  backgroundColor: withAlpha(theme.colors.primary, 0.08),
                },
              ]}
              padding="md"
              onPress={() => handleToggleBodyWidget('weight')}
              accessibilityRole="button"
              accessibilityLabel={`${t('body.weight')}: ${displayWeight(currentWeightKg)}. ${
                activeBodyWidget === 'weight'
                  ? language === 'en'
                    ? 'Collapse info'
                    : 'Info einklappen'
                  : language === 'en'
                    ? 'Tap for info'
                    : 'Tippen für Info'
              }`}
              accessibilityState={{ expanded: activeBodyWidget === 'weight' }}
              testID="body-widget-weight"
            >
              <View style={styles.cardHeaderRow}>
                <Ionicons
                  name="scale-outline"
                  size={24}
                  color={activeBodyWidget === 'weight' ? theme.colors.primary : theme.colors.muted}
                  style={styles.cardIcon}
                />
                <Ionicons
                  name={activeBodyWidget === 'weight' ? 'chevron-up' : 'information-circle-outline'}
                  size={16}
                  color={activeBodyWidget === 'weight' ? theme.colors.primary : theme.colors.muted}
                />
              </View>
              <Text
                style={[
                  styles.cardLabel,
                  { color: theme.colors.muted, ...theme.typography.caption },
                ]}
              >
                {t('body.weight')}
              </Text>
              <Text
                style={[
                  styles.cardValue,
                  { color: theme.colors.text, ...theme.typography.heading, fontSize: 24 },
                ]}
              >
                {displayWeight(currentWeightKg)}
              </Text>
            </Card>

            <Card
              style={[
                styles.overviewCard,
                activeBodyWidget === 'height' && {
                  borderColor: theme.colors.primary,
                  backgroundColor: withAlpha(theme.colors.primary, 0.08),
                },
              ]}
              padding="md"
              onPress={() => handleToggleBodyWidget('height')}
              accessibilityRole="button"
              accessibilityLabel={`${language === 'en' ? 'Height' : 'Größe'}: ${
                currentHeightCm
                  ? isImperial
                    ? `${(currentHeightCm / 2.54).toFixed(1)} in`
                    : `${currentHeightCm.toFixed(0)} cm`
                  : '--'
              }. ${
                activeBodyWidget === 'height'
                  ? language === 'en'
                    ? 'Collapse info'
                    : 'Info einklappen'
                  : language === 'en'
                    ? 'Tap for info'
                    : 'Tippen für Info'
              }`}
              accessibilityState={{ expanded: activeBodyWidget === 'height' }}
              testID="body-widget-height"
            >
              <View style={styles.cardHeaderRow}>
                <Ionicons
                  name="body-outline"
                  size={24}
                  color={activeBodyWidget === 'height' ? theme.colors.primary : theme.colors.muted}
                  style={styles.cardIcon}
                />
                <Ionicons
                  name={activeBodyWidget === 'height' ? 'chevron-up' : 'information-circle-outline'}
                  size={16}
                  color={activeBodyWidget === 'height' ? theme.colors.primary : theme.colors.muted}
                />
              </View>
              <Text
                style={[
                  styles.cardLabel,
                  { color: theme.colors.muted, ...theme.typography.caption },
                ]}
              >
                {language === 'en' ? 'Height' : 'Größe'}
              </Text>
              <Text
                style={[
                  styles.cardValue,
                  { color: theme.colors.text, ...theme.typography.heading, fontSize: 24 },
                ]}
              >
                {currentHeightCm
                  ? isImperial
                    ? `${(currentHeightCm / 2.54).toFixed(1)} in`
                    : `${currentHeightCm.toFixed(0)} cm`
                  : '--'}
              </Text>
            </Card>
          </View>

          {(activeBodyWidget === 'weight' || activeBodyWidget === 'height') &&
            renderBodyFactPanel(activeBodyWidget)}

          <View
            style={[
              styles.overviewRow,
              {
                marginTop:
                  activeBodyWidget === 'weight' || activeBodyWidget === 'height' ? 0 : -10,
              },
            ]}
          >
            <Card
              style={[
                styles.overviewCard,
                activeBodyWidget === 'bodyFat' && {
                  borderColor: theme.colors.primary,
                  backgroundColor: withAlpha(theme.colors.primary, 0.08),
                },
              ]}
              padding="md"
              onPress={() => handleToggleBodyWidget('bodyFat')}
              accessibilityRole="button"
              accessibilityLabel={`${t('body.bodyFat')}: ${
                latest?.bodyFatPercentage ? latest.bodyFatPercentage.toFixed(1) + '%' : '--'
              }. ${
                activeBodyWidget === 'bodyFat'
                  ? language === 'en'
                    ? 'Collapse info'
                    : 'Info einklappen'
                  : language === 'en'
                    ? 'Tap for info'
                    : 'Tippen für Info'
              }`}
              accessibilityState={{ expanded: activeBodyWidget === 'bodyFat' }}
              testID="body-widget-bodyFat"
            >
              <View style={styles.cardHeaderRow}>
                <Ionicons
                  name="water-outline"
                  size={24}
                  color={activeBodyWidget === 'bodyFat' ? theme.colors.primary : theme.colors.muted}
                  style={styles.cardIcon}
                />
                <Ionicons
                  name={activeBodyWidget === 'bodyFat' ? 'chevron-up' : 'information-circle-outline'}
                  size={16}
                  color={activeBodyWidget === 'bodyFat' ? theme.colors.primary : theme.colors.muted}
                />
              </View>
              <Text
                style={[
                  styles.cardLabel,
                  { color: theme.colors.muted, ...theme.typography.caption },
                ]}
              >
                {t('body.bodyFat')}
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

            <Card
              style={[
                styles.overviewCard,
                activeBodyWidget === 'bmi' && {
                  borderColor: theme.colors.primary,
                  backgroundColor: withAlpha(theme.colors.primary, 0.08),
                },
              ]}
              padding="md"
              onPress={() => handleToggleBodyWidget('bmi')}
              accessibilityRole="button"
              accessibilityLabel={`BMI: ${bmi !== null ? bmi : '--'}. ${
                activeBodyWidget === 'bmi'
                  ? language === 'en'
                    ? 'Collapse info'
                    : 'Info einklappen'
                  : language === 'en'
                    ? 'Tap for info'
                    : 'Tippen für Info'
              }`}
              accessibilityState={{ expanded: activeBodyWidget === 'bmi' }}
              testID="body-widget-bmi"
            >
              <View style={styles.cardHeaderRow}>
                <Ionicons
                  name="pulse-outline"
                  size={24}
                  color={activeBodyWidget === 'bmi' ? theme.colors.primary : theme.colors.muted}
                  style={styles.cardIcon}
                />
                <Ionicons
                  name={activeBodyWidget === 'bmi' ? 'chevron-up' : 'information-circle-outline'}
                  size={16}
                  color={activeBodyWidget === 'bmi' ? theme.colors.primary : theme.colors.muted}
                />
              </View>
              <Text
                style={[
                  styles.cardLabel,
                  { color: theme.colors.muted, ...theme.typography.caption },
                ]}
              >
                BMI
              </Text>
              <Text
                style={[
                  styles.cardValue,
                  { color: theme.colors.text, ...theme.typography.heading, fontSize: 24 },
                ]}
              >
                {bmi !== null ? bmi : '--'}
              </Text>
            </Card>
          </View>

          {(activeBodyWidget === 'bodyFat' || activeBodyWidget === 'bmi') &&
            renderBodyFactPanel(activeBodyWidget)}

          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.text, ...theme.typography.heading, fontSize: 20 },
            ]}
          >
            {t('body.quickEntry')}
          </Text>
          <Card padding="md" style={styles.quickEntryCard}>
            <View style={styles.quickEntryRow}>
              <Pressable
                onPress={() => setDatePickerVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={
                  language === 'de' ? `Messdatum: ${dateStr}` : `Measurement Date: ${dateStr}`
                }
                style={[
                  styles.dateTriggerBtn,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                  },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={theme.colors.primary}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.dateTriggerText, { color: theme.colors.text }]}>
                  {dateStr}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={theme.colors.muted}
                  style={{ marginLeft: 'auto' }}
                />
              </Pressable>
            </View>
            <View style={styles.quickEntryRow}>
              <TextInput
                style={[
                  styles.quickInput,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                  },
                ]}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder={`${language === 'en' ? 'Weight' : 'Gewicht'} ${isImperial ? 'lbs' : 'kg'}`}
                placeholderTextColor={theme.colors.muted}
                inputAccessoryViewID={KEYBOARD_DONE_ID}
              />
              <TextInput
                style={[
                  styles.quickInput,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                  },
                ]}
                value={bodyFat}
                onChangeText={setBodyFat}
                keyboardType="numeric"
                placeholder={`${language === 'en' ? 'Body fat' : 'Körperfett'} %`}
                placeholderTextColor={theme.colors.muted}
                inputAccessoryViewID={KEYBOARD_DONE_ID}
              />
            </View>
            <View style={styles.quickActions}>
              <Pressable
                style={[styles.quickSaveBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleSave}
              >
                <Text style={[styles.quickSaveText, { color: theme.colors.background }]}>
                  {language === 'en' ? 'Save Today' : 'Heute speichern'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.quickDetailsBtn, { borderColor: theme.colors.border }]}
                onPress={() => setModalVisible(true)}
              >
                <Text style={[styles.quickDetailsText, { color: theme.colors.primary }]}>
                  {language === 'en' ? 'More Metrics' : 'Weitere Messwerte'}
                </Text>
              </Pressable>
            </View>
          </Card>

          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.text, ...theme.typography.heading, fontSize: 20 },
            ]}
          >
            {t('body.hydration')}
          </Text>
          <Card padding="md" style={styles.hydrationCard}>
            <VoltBackdrop />
            <View style={styles.hydrationHeader}>
              <View>
                <Text style={[styles.hydrationLabel, { color: theme.colors.muted }]}>{t('body.today')}</Text>
                <Text style={[styles.hydrationValue, { color: theme.colors.text }]}>
                  {todayIntakeMl.toLocaleString()} / {dailyGoalMl.toLocaleString()} ml
                </Text>
              </View>
              <Text style={[styles.hydrationPercent, { color: theme.colors.primary }]}>
                {hydrationPercent}%
              </Text>
            </View>
            <WaterVessel progress={hydrationProgress} />
            <View style={styles.hydrationButtons}>
              {[250, 500, 1000].map((amount) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${amount} Milliliter Wasser hinzufügen`}
                  key={amount}
                  style={[styles.hydrationButton, { borderColor: theme.colors.border }]}
                  onPress={() => addWater(amount)}
                >
                  <Text style={[styles.hydrationButtonText, { color: theme.colors.primary }]}>
                    +{amount === 1000 ? '1 L' : `${amount} ml`}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Trinkziel und Korrekturen"
              accessibilityState={{ expanded: hydrationSettingsExpanded }}
              onPress={() => setHydrationSettingsExpanded((value) => !value)}
              style={{
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <Text style={{ color: theme.colors.muted }}>{t('body.hydrationSettings')}</Text>
              <Ionicons
                name={hydrationSettingsExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.colors.muted}
              />
            </Pressable>
            <AnimatedDisclosure expanded={hydrationSettingsExpanded}>
              <View style={styles.hydrationButtons}>
                {' '}
                <Pressable
                  style={[styles.hydrationButton, { borderColor: theme.colors.border }]}
                  onPress={resetToday}
                >
                  <Text style={[styles.hydrationButtonText, { color: theme.colors.accent }]}>
                    Reset
                  </Text>
                </Pressable>
                {[
                  { amount: 250, label: '-250 ml' },
                  { amount: 500, label: '-500 ml' },
                  { amount: 1000, label: '-1 L' },
                ].map((item) => (
                  <Pressable
                    key={`minus-${item.amount}`}
                    style={[styles.hydrationButton, { borderColor: theme.colors.border }]}
                    onPress={() => removeWater(item.amount)}
                  >
                    <Text style={[styles.hydrationButtonText, { color: theme.colors.muted }]}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.goalRow}>
                <TextInput
                  style={[
                    styles.goalInput,
                    {
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.background,
                    },
                  ]}
                  value={hydrationGoalInput}
                  onChangeText={setHydrationGoalInput}
                  keyboardType="numeric"
                  placeholder={language === 'en' ? 'Goal ml' : 'Ziel ml'}
                  placeholderTextColor={theme.colors.muted}
                  onSubmitEditing={handleSaveHydrationGoal}
                  returnKeyType="done"
                  inputAccessoryViewID={KEYBOARD_DONE_ID}
                />
                <Pressable
                  style={[styles.goalButton, { borderColor: theme.colors.border }]}
                  onPress={handleSaveHydrationGoal}
                >
                  <Text style={[styles.goalButtonText, { color: theme.colors.primary }]}>
                    {t('body.saveGoal')}
                  </Text>
                </Pressable>
              </View>
            </AnimatedDisclosure>
            <View style={[styles.hydrationFactBox, { borderColor: theme.colors.border }]}>
              <Text style={[styles.hydrationFactTitle, { color: theme.colors.primary }]}>
                {language === 'en' ? 'Daily note' : 'Tagesnotiz'}
              </Text>
              <Text style={[styles.hydrationFactText, { color: theme.colors.text }]}>
                {hydrationFact}
              </Text>
            </View>
          </Card>

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
                {t('workout.weight').toUpperCase()}
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
                {t('body.bodyFat')}
              </Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Körperfett erklärt"
            style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            onPress={() =>
              Alert.alert(
                t('body.understandingBodyFat'),
                t('body.bodyFatExplanation'),
              )
            }
          >
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.muted }}>
              {language === 'en' ? 'What does body fat percentage mean?' : 'Was bedeutet mein Körperfettanteil?'}
            </Text>
          </Pressable>
          {renderChart()}

          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 20,
                marginTop: 24,
              },
            ]}
          >
            {language === 'en' ? 'PROGRESSION HISTORY' : 'VERLAUFSHISTORIE'}
          </Text>
          <Card padding="md" style={styles.progressionCard}>
            {recentMetrics.length === 0 ? (
              <Text style={[styles.progressionEmpty, { color: theme.colors.muted }]}>
                {language === 'en'
                  ? "Log today's metrics to start your progression timeline."
                  : 'Trage heutige Messwerte ein, um deine Verlaufs-Timeline zu starten.'}
              </Text>
            ) : (
              recentMetrics.map((metric, index) => {
                const previous = recentMetrics[index + 1];
                const weightDelta =
                  metric.weightKg !== undefined && previous?.weightKg !== undefined
                    ? metric.weightKg - previous.weightKg
                    : null;
                const fatDelta =
                  metric.bodyFatPercentage !== undefined &&
                  previous?.bodyFatPercentage !== undefined
                    ? metric.bodyFatPercentage - previous.bodyFatPercentage
                    : null;
                const displayWeightDelta =
                  weightDelta !== null
                    ? `${weightDelta >= 0 ? '+' : ''}${(isImperial
                        ? weightDelta * 2.20462
                        : weightDelta
                      ).toFixed(1)} ${isImperial ? 'lbs' : 'kg'}`
                    : '--';
                const displayFatDelta =
                  fatDelta !== null ? `${fatDelta >= 0 ? '+' : ''}${fatDelta.toFixed(1)}%` : '--';

                return (
                  <View
                    key={metric.id}
                    style={[
                      styles.progressionRow,
                      index < recentMetrics.length - 1 && {
                        borderBottomColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.progressionDateCol}>
                      <Text style={[styles.progressionDate, { color: theme.colors.text }]}>
                        {new Intl.DateTimeFormat('en-US', {
                          month: 'short',
                          day: 'numeric',
                        }).format(metric.recordedAt)}
                      </Text>
                      <Text style={[styles.progressionSub, { color: theme.colors.muted }]}>
                        {metric.weightKg ? displayWeight(metric.weightKg) : (language === 'en' ? 'No weight' : 'Kein Gewicht')}
                      </Text>
                    </View>
                    <View style={styles.progressionDeltaCol}>
                      <Text
                        style={[
                          styles.progressionDelta,
                          {
                            color:
                              weightDelta === null
                                ? theme.colors.muted
                                : weightDelta <= 0
                                  ? theme.colors.success
                                  : theme.colors.warning,
                          },
                        ]}
                      >
                        {displayWeightDelta}
                      </Text>
                      <Text style={[styles.progressionSub, { color: theme.colors.muted }]}>
                        {t('body.bodyFat')} {displayFatDelta}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </Card>

          {/* Measurements Section */}
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.text, ...theme.typography.heading, fontSize: 20 },
            ]}
          >
            {t('body.circumferences')}
          </Text>
          <Card padding="md" style={styles.measurementsList}>
            {[
              { label: t('body.chest'), val: latest?.measurements?.chest },
              { label: t('body.waist'), val: latest?.measurements?.waist },
              { label: t('body.hips'), val: latest?.measurements?.hips },
              { label: t('body.arms'), val: latest?.measurements?.leftArm },
              { label: t('body.legs'), val: latest?.measurements?.leftThigh },
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
                  style={[
                    { color: theme.colors.text, ...theme.typography.body, fontWeight: 'bold' },
                  ]}
                >
                  {displayMeasurement(item.val)}
                </Text>
              </View>
            ))}
          </Card>
        </ScrollView>
      ) : (
        <ExercisesScreen embedded />

      )}

      {/* Input Modal */}
      <Modal
        visible={modalVisible}
        title={t('body.addMetric')}
        onClose={() => setModalVisible(false)}
        primaryActionTitle={t('common.save')}
        onPrimaryAction={handleSave}
        secondaryActionTitle={t('common.cancel')}
        onSecondaryAction={() => setModalVisible(false)}
      >
        <ScrollView style={styles.modalForm} contentContainerStyle={styles.modalFormContent}>
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.modalLabel, { color: theme.colors.text }]}>
              {language === 'en' ? 'Date' : 'Datum'}
            </Text>
            <Pressable
              onPress={() => setDatePickerVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={
                language === 'de' ? `Messdatum: ${dateStr}` : `Measurement Date: ${dateStr}`
              }
              style={[
                styles.dateTriggerBtn,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background,
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={theme.colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.dateTriggerText, { color: theme.colors.text }]}>
                {dateStr}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={theme.colors.muted}
                style={{ marginLeft: 'auto' }}
              />
            </Pressable>
          </View>

          <View style={styles.inputGrid}>
            <View style={styles.gridField}>
              <Input
                label={`${t('settings.weight')} (${isImperial ? 'lbs' : 'kg'})`}
                value={weight}
                onChangeText={setWeight}
                placeholder={language === 'en' ? 'e.g. 80' : 'z. B. 80'}
                keyboardType="numeric"
                inputAccessoryViewID={KEYBOARD_DONE_ID}
              />
            </View>
            <View style={styles.gridField}>
              <Input
                label={`${language === 'en' ? 'Height' : 'Größe'} (${isImperial ? 'in' : 'cm'})`}
                value={height}
                onChangeText={setHeight}
                placeholder={
                  profile.heightCm
                    ? isImperial
                      ? (profile.heightCm / 2.54).toFixed(1)
                      : profile.heightCm.toFixed(0)
                    : language === 'en'
                      ? 'e.g. 180'
                      : 'z. B. 180'
                }
                keyboardType="numeric"
                inputAccessoryViewID={KEYBOARD_DONE_ID}
              />
            </View>
          </View>

          <View style={styles.inputGrid}>
            <View style={styles.gridField}>
              <Input
                label={`${t('body.bodyFat')} %`}
                value={bodyFat}
                onChangeText={setBodyFat}
                placeholder={language === 'en' ? 'e.g. 15' : 'z. B. 15'}
                keyboardType="numeric"
                inputAccessoryViewID={KEYBOARD_DONE_ID}
              />
            </View>
          </View>

          <Text
            style={[
              styles.sectionDivider,
              { color: theme.colors.primary, ...theme.typography.caption },
            ]}
          >
            {t('body.circumferences')} ({isImperial ? t('body.inches').toUpperCase() : t('body.cm').toUpperCase()})
          </Text>

          <MeasurementMap
            unit={isImperial ? 'in' : 'cm'}
            fields={[
              { label: t('body.chest'), value: chest, onChange: setChest, muscles: [MuscleGroup.Chest] },
              {
                label: t('body.waist'),
                value: waist,
                onChange: setWaist,
                muscles: [MuscleGroup.Abs, MuscleGroup.Obliques],
              },
              { label: t('body.hips'), value: hips, onChange: setHips, muscles: [MuscleGroup.Glutes] },
              {
                label: t('body.arms'),
                value: arms,
                onChange: setArms,
                muscles: [MuscleGroup.Biceps, MuscleGroup.Triceps],
              },
              {
                label: t('body.legs'),
                value: legs,
                onChange: setLegs,
                muscles: [MuscleGroup.Quads, MuscleGroup.Hamstrings],
              },
            ]}
          />
        </ScrollView>
      </Modal>
      <DatePickerModal
        visible={datePickerVisible}
        value={dateStr}
        onConfirm={(iso) => setDateStr(iso)}
        onClose={() => setDatePickerVisible(false)}
        language={language}
        title={language === 'en' ? 'Measurement Date' : 'Messdatum'}
        maxDate={new Date()}
        defaultToToday={true}
      />
      <KeyboardDoneAccessory />
    </View>
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
    paddingBottom: 16,
    minHeight: 54,
  },
  headerTitle: {},
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnPlaceholder: {
    width: 38,
    height: 38,
  },
  bodyTabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 3,
    gap: 3,
  },
  bodyTabButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bodyTabText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bodyFactCard: {
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  bodyFactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bodyFactHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bodyFactTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  bodyFactText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  bodyFactCycleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  bodyFactCycleText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  quickEntryCard: {
    marginBottom: 24,
  },
  quickEntryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  quickInput: {
    flex: 1,
    minWidth: 0,
    width: 0,
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  dateTriggerBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTriggerText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  modalLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quickSaveBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickSaveText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  quickDetailsBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickDetailsText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  hydrationCard: {
    marginBottom: 24,
  },
  hydrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  hydrationLabel: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    letterSpacing: 1,
  },
  hydrationValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  hydrationPercent: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  hydrationTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 14,
  },
  hydrationFill: {
    height: '100%',
    borderRadius: 5,
  },
  hydrationButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  hydrationButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hydrationButtonText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  goalInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  goalButton: {
    borderWidth: 1,
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalButtonText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  hydrationFactBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  hydrationFactTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 6,
  },
  hydrationFactText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
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
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  chart: {
    borderRadius: 16,
  },
  progressionCard: {
    marginBottom: 24,
  },
  progressionEmpty: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  progressionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 12,
    gap: 12,
  },
  progressionDateCol: {
    flex: 1,
    minWidth: 0,
  },
  progressionDeltaCol: {
    alignItems: 'flex-end',
  },
  progressionDate: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
  progressionDelta: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  progressionSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginTop: 2,
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
