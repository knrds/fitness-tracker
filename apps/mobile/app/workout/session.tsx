import { WorkoutElapsedTime } from '../../src/components/workout/WorkoutElapsedTime';
import { Theme, useThemeStyles, AnimatedDisclosure } from '@fitness-tracker/ui';
import { useMeasuredReorder } from '../../src/hooks/useMeasuredReorder';
import { getStorageScope, isScopeCurrent } from '../../src/data/storageScope';
import { scopedAlert as Alert } from '../../src/utils/scopedAlert';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isIOS } from '../../src/utils/platform';

import { templateExercisesFromSession, hasTemplateChanges } from '@fitness-tracker/domain';

import { useWorkoutStore } from '../../src/stores/workoutStore';
import { SessionExerciseCard } from '../../src/components/workout/SessionExerciseCard';
import { RestTimer } from '../../src/components/workout/RestTimer';
import { ExercisePickerModal } from '../../src/components/workout/ExercisePickerModal';
import { SaveTemplateModal } from '../../src/components/workout/SaveTemplateModal';
import { useProgramStore } from '../../src/stores/programStore';
import { usePaywallStore } from '../../src/stores/paywallStore';
import {
  CAFFEINE_PRESETS,
  getCaffeineWarningLevel,
  useCaffeineStore,
} from '../../src/stores/caffeineStore';
import { useTheme, useDialog, Button, Card } from '@fitness-tracker/ui';
import { useI18n } from '../../src/i18n';

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { showConfirm } = useDialog();
  const { t, language } = useI18n();
  const insets = useSafeAreaInsets();
  const {
    status,
    name,
    exercises,
    notes,
    finishWorkout,
    addExercise,
    updateWorkoutNotes,
    resetWorkout,
    reorderExercises,
    templateId,
    setMinimized,
  } = useWorkoutStore();
  const { createTemplate, updateTemplate } = useProgramStore();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [customCaffeineMg, setCustomCaffeineMg] = useState('');
  const [caffeineExpanded, setCaffeineExpanded] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [collapsedExerciseIds, setCollapsedExerciseIds] = useState<Record<string, boolean>>({});

  const isMinimized = useWorkoutStore((s) => s.isMinimized);
  const screenFadeAnim = useRef(new Animated.Value(0)).current;
  const isMinimizingRef = useRef(false);

  useEffect(() => {
    if (!isMinimized) {
      screenFadeAnim.setValue(0);
      Animated.timing(screenFadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [isMinimized, screenFadeAnim]);

  const handleMinimize = () => {
    if (isMinimizingRef.current) return;
    isMinimizingRef.current = true;
    Animated.timing(screenFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setMinimized(true);
      router.navigate('/(tabs)/workouts');
      setTimeout(() => {
        isMinimizingRef.current = false;
      }, 300);
    });
  };

  const sorter = useMeasuredReorder(exercises, reorderExercises, {
    collapsedItemHeight: 76,
    itemGap: 16,
  });
  const {
    isEnabled: caffeineEnabled,
    currentWorkoutMg,
    addPreset,
    addCustomAmount,
    setCurrentWorkoutMg,
  } = useCaffeineStore();

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    sorter.onScroll(event);
  };

  if (status === 'idle' || status === 'finished') {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.muted, ...theme.typography.body, marginBottom: 16 }}>
          {t('workout.noActiveWorkout')}
        </Text>
        <Button title={t('common.goBack')} onPress={() => router.back()} />
      </View>
    );
  }

  const finalizeWorkout = async () => {
    if (isFinishing) return;
    setIsFinishing(true);

    let finishedSession;
    try {
      finishedSession = finishWorkout();
    } catch {
      setIsFinishing(false);
      Alert.alert(
        language === 'de' ? 'Speichern fehlgeschlagen' : 'Saving failed',
        language === 'de'
          ? 'Dein Training bleibt geöffnet. Bitte prüfe den freien Speicher und versuche den Abschluss erneut.'
          : 'Your workout remains open. Please check free space and try finishing again.',
      );
      return;
    }
    if (!finishedSession) {
      setSaveModalVisible(false);
      router.replace('/');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace('/');
  };

  const handleFinish = async () => {
    const scope = getStorageScope();
    if (isFinishing) return;
    const hasCompletedSet = exercises.some((ex) => ex.sets.some((set) => set.completed));
    if (!hasCompletedSet) {
      const discard = await showConfirm({
        title: t('workout.noSetsCompletedTitle'),
        message: t('workout.noSetsCompletedMessage'),
        confirmLabel: t('workout.discardWorkout'),
        cancelLabel: t('workout.continueWorkout'),
        destructive: true,
      });
      if (discard && isScopeCurrent(scope)) {
        resetWorkout();
        if (useWorkoutStore.getState().status === 'idle') router.replace('/');
      }
      return;
    }

    if (templateId) {
      const original = useProgramStore
        .getState()
        .templates.find((template) => template.id === templateId);
      const hasChanged = original ? hasTemplateChanges(original.exercises, exercises) : false;
      if (!hasChanged) {
        // No changes to template, just save the workout session history and exit!
        finalizeWorkout();
        return;
      }
    }

    setSaveModalVisible(true);
  };

  const handleUpdateTemplate = () => {
    if (isFinishing || !templateId) return;
    const original = useProgramStore
      .getState()
      .templates.find((template) => template.id === templateId);
    try {
      updateTemplate(templateId, {
        exercises: templateExercisesFromSession(exercises, Crypto.randomUUID, original?.exercises),
      });
      setSaveModalVisible(false);
      finalizeWorkout();
    } catch (err) {
      if (err instanceof Error && err.message === 'TEMPLATE_LOCKED') {
        usePaywallStore.getState().openPaywall('pro', 'template_limit');
      }
    }
  };

  const handleSaveTemplate = (templateName: string) => {
    if (isFinishing) return;
    try {
      createTemplate({
        name: templateName,
        exercises: templateExercisesFromSession(exercises, Crypto.randomUUID),
      });
      setSaveModalVisible(false);
      finalizeWorkout();
    } catch (err) {
      if (err instanceof Error && err.message === 'TEMPLATE_LIMIT_REACHED') {
        usePaywallStore.getState().openPaywall('pro', 'template_limit');
      }
    }
  };

  const handleSkipTemplate = () => {
    if (isFinishing) return;
    setSaveModalVisible(false);
    finalizeWorkout();
  };

  const handleAddExercise = () => {
    setPickerVisible(true);
  };

  const handleBackAction = async () => {
    const scope = getStorageScope();
    const shouldDiscard = await showConfirm({
      title: t('workout.cancelWorkoutConfirmTitle'),
      message: t('workout.cancelWorkoutConfirmMessage'),
      confirmLabel: t('workout.cancelWorkout'),
      cancelLabel: t('workout.continueWorkout'),
      destructive: true,
    });
    if (shouldDiscard && isScopeCurrent(scope)) {
      resetWorkout();
      router.replace('/');
    }
  };

  const completedSetsCount = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0,
  );
  const totalSetsCount = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const progressPercent = totalSetsCount > 0 ? (completedSetsCount / totalSetsCount) * 100 : 0;

  const caffeineWarningLevel = getCaffeineWarningLevel(currentWorkoutMg);
  const caffeineTrollText =
    currentWorkoutMg > 1500
      ? language === 'de'
        ? 'Training und weißer Monster sind offenbar ein Lifestyle. Die eingetragene Menge bitte trotzdem kurz prüfen.'
        : 'Workout and white Monster seem to be a lifestyle. Please double-check the entered amount.'
      : null;
  const caffeineWarningText =
    caffeineTrollText ??
    (caffeineWarningLevel === 'extreme'
      ? language === 'de'
        ? 'Extreme Menge. Bitte verlangsamen und ausreichend hydrieren.'
        : 'Extreme intake. Consider slowing down and hydrate.'
      : caffeineWarningLevel === 'high'
        ? language === 'de'
          ? 'Hoher Koffeintag. Achte auf Zittrigkeit und deinen Schlaf.'
          : 'High caffeine day. Keep an eye on jitters and sleep.'
        : null);

  const handleAddCustomCaffeine = () => {
    const amount = parseInt(customCaffeineMg, 10);
    if (!Number.isFinite(amount) || amount <= 0) return;
    addCustomAmount(amount);
    setCustomCaffeineMg('');
  };

  const topSafeArea = Math.max(insets.top, 12);
  const headerBodyHeight = 68;
  const headerHeight = topSafeArea + headerBodyHeight;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, opacity: screenFadeAnim },
      ]}
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Mock Dynamic Island Removed */}

      {/* Unified Header */}
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
            height: headerHeight,
            minHeight: headerHeight,
            paddingTop: topSafeArea,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
          },
        ]}
      >
        <View
          key="standard-header"
          style={[
            styles.standardHeaderContent,
            { maxWidth: 1040, width: '100%', alignSelf: 'center' },
          ]}
        >
          <View style={styles.headerLeft}>
            <Pressable
              onPress={handleBackAction}
              style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}
              accessibilityLabel={t('workout.endWorkoutA11y')}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color={theme.colors.muted} />
            </Pressable>
            <Pressable
              onPress={handleMinimize}
              style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}
              accessibilityLabel={t('workout.minimizeWorkoutA11y')}
              accessibilityRole="button"
            >
              <Ionicons name="chevron-down" size={24} color={theme.colors.primary} />
            </Pressable>
            <View style={styles.headerTitleGroup}>
              <Text
                numberOfLines={1}
                style={[
                  theme.typography.heading,
                  styles.standardTitle,
                  { color: theme.colors.text },
                ]}
              >
                {name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <WorkoutElapsedTime
                  style={[
                    styles.standardElapsed,
                    theme.typography.display,
                    { color: theme.colors.primary },
                  ]}
                />
              </View>
            </View>
          </View>
          <Button
            title={t('workout.finish')}
            variant="primary"
            onPress={handleFinish}
            style={{ minHeight: 48, paddingHorizontal: 12 }}
          />
        </View>

        {/* Progress Bar */}
        {totalSetsCount > 0 && (
          <View
            style={{
              height: 2,
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: theme.colors.border,
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                backgroundColor: theme.colors.primary,
              }}
            />
          </View>
        )}
      </View>

      <ScrollView
        ref={sorter.scrollViewRef}
        onLayout={sorter.onLayout}
        onContentSizeChange={sorter.onContentSizeChange}
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: headerHeight + 16, maxWidth: 1040, width: '100%', alignSelf: 'center' },
        ]}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
        scrollEnabled={sorter.scrollEnabled}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {caffeineEnabled && (
          <Card padding="md" style={styles.caffeineCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('workout.logCaffeineA11y')}
              accessibilityState={{ expanded: caffeineExpanded }}
              onPress={() => setCaffeineExpanded((value) => !value)}
              style={[styles.caffeineHeader, { minHeight: 44, marginBottom: 0 }]}
            >
              <View style={styles.caffeineTitleRow}>
                <Ionicons name="flash-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.caffeineTitle, { color: theme.colors.text }]}>
                  {language === 'de' ? 'Koffein' : 'Caffeine'}
                </Text>
              </View>
              <Text
                style={[
                  styles.caffeineAmount,
                  {
                    color:
                      caffeineWarningLevel === 'normal'
                        ? theme.colors.primary
                        : caffeineWarningLevel === 'high'
                          ? theme.colors.warning
                          : theme.colors.accent,
                  },
                ]}
              >
                {currentWorkoutMg} mg
              </Text>
              <Ionicons
                name={caffeineExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.colors.muted}
              />
            </Pressable>
            {caffeineWarningText && (
              <Text
                style={[
                  caffeineTrollText ? styles.caffeineTrollWarning : styles.caffeineWarning,
                  {
                    color: caffeineTrollText ? theme.colors.muted : theme.colors.accent,
                    backgroundColor: caffeineTrollText ? theme.colors.surface : 'transparent',
                  },
                ]}
              >
                {caffeineWarningText}
              </Text>
            )}
            <AnimatedDisclosure expanded={caffeineExpanded}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.caffeinePresetRow}
              >
                {CAFFEINE_PRESETS.map((preset) => (
                  <Pressable
                    key={preset.id}
                    style={[styles.caffeineChip, { borderColor: theme.colors.border }]}
                    onPress={() => addPreset(preset.id)}
                  >
                    <Text style={[styles.caffeineChipName, { color: theme.colors.text }]}>
                      {preset.name}
                    </Text>
                    <Text style={[styles.caffeineChipMeta, { color: theme.colors.muted }]}>
                      +{preset.caffeineMg} mg
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.caffeineCustomRow}>
                <TextInput
                  style={[
                    styles.caffeineInput,
                    {
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.background,
                    },
                  ]}
                  value={customCaffeineMg}
                  onChangeText={setCustomCaffeineMg}
                  placeholder="mg"
                  placeholderTextColor={theme.colors.muted}
                  keyboardType="numeric"
                  inputAccessoryViewID="keyboardDoneAccessory"
                  returnKeyType="done"
                  onSubmitEditing={handleAddCustomCaffeine}
                />
                <Pressable
                  style={[styles.caffeineSmallButton, { borderColor: theme.colors.border }]}
                  onPress={handleAddCustomCaffeine}
                >
                  <Text style={[styles.caffeineSmallButtonText, { color: theme.colors.primary }]}>
                    {language === 'de' ? 'Hinzufügen' : 'Add'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.caffeineSmallButton, { borderColor: theme.colors.border }]}
                  onPress={() => setCurrentWorkoutMg(0)}
                >
                  <Text style={[styles.caffeineSmallButtonText, { color: theme.colors.muted }]}>
                    {language === 'de' ? 'Leeren' : 'Clear'}
                  </Text>
                </Pressable>
              </View>
            </AnimatedDisclosure>
          </Card>
        )}

        {exercises.length > 0 && (
          <View style={styles.exerciseSectionHeader}>
            <Text
              style={[
                styles.exerciseSectionTitle,
                { color: theme.colors.text, ...theme.typography.heading },
              ]}
            >
              {t('workout.exercises')} ({exercises.length})
            </Text>
            {exercises.length > 1 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  isReorderMode ? t('workout.finishReorderA11y') : t('workout.reorderExercisesA11y')
                }
                onPress={() => setIsReorderMode((prev) => !prev)}
                style={[
                  styles.reorderToggleBtn,
                  {
                    backgroundColor: isReorderMode ? theme.colors.primary : theme.colors.surface,
                    borderColor: isReorderMode ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={isReorderMode ? 'checkmark' : 'swap-vertical'}
                  size={16}
                  color={isReorderMode ? theme.colors.background : theme.colors.primary}
                />
                <Text
                  style={[
                    styles.reorderToggleText,
                    {
                      color: isReorderMode ? theme.colors.background : theme.colors.primary,
                      ...theme.typography.caption,
                      fontFamily: 'SpaceGrotesk_700Bold',
                    },
                  ]}
                >
                  {isReorderMode ? t('workout.done') : t('workout.reorder')}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {isReorderMode && (
          <View
            style={[
              styles.reorderBanner,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.reorderBannerText, { color: theme.colors.muted }]}>
              {language === 'de'
                ? 'Sortiermodus aktiv: Ziehe die Übungen an den Griffen in die gewünschte Reihenfolge.'
                : 'Reorder mode active: Drag exercises by their handles into the desired order.'}
            </Text>
          </View>
        )}

        {exercises.map((ex) => {
          return (
            <Animated.View
              key={ex.id}
              onLayout={(e) => {
                if (!sorter.activeDragId) sorter.itemLayouts.current[ex.id] = e.nativeEvent.layout;
              }}
              style={[sorter.getRowStyle(ex.id)]}
            >
              <SessionExerciseCard
                sessionExercise={ex}
                collapsed={
                  isReorderMode || sorter.activeDragId !== null || !!collapsedExerciseIds[ex.id]
                }
                onToggleCollapse={() => {
                  setCollapsedExerciseIds((prev) => ({
                    ...prev,
                    [ex.id]: !prev[ex.id],
                  }));
                }}
                dragHandlers={sorter.getHandleProps(ex.id)}
              />
            </Animated.View>
          );
        })}

        <Button
          title={`+ ${t('workout.addExercise')}`}
          variant="secondary"
          onPress={handleAddExercise}
          style={{ marginBottom: 24 }}
        />

        <Card padding="md" style={styles.notesContainer}>
          <Text
            style={[
              {
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 16,
                marginBottom: 8,
              },
            ]}
          >
            {t('workout.workoutNotes')}
          </Text>
          <TextInput
            style={[styles.notesInput, { color: theme.colors.text, ...theme.typography.body }]}
            value={notes}
            onChangeText={updateWorkoutNotes}
            placeholder={t('workout.notesPlaceholder')}
            placeholderTextColor={theme.colors.muted}
            multiline
            numberOfLines={3}
          />
        </Card>
      </ScrollView>

      <RestTimer />

      <ExercisePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(ids) => ids.forEach((id) => addExercise(id))}
      />

      <SaveTemplateModal
        visible={saveModalVisible}
        defaultName={name}
        onClose={() => setSaveModalVisible(false)}
        onSave={handleSaveTemplate}
        onSkip={handleSkipTemplate}
        templateId={templateId}
        onUpdate={handleUpdateTemplate}
      />
    </Animated.View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerContainer: {
      borderBottomWidth: 1,
      paddingHorizontal: 24,
      paddingBottom: 8,
      justifyContent: 'center',
      overflow: 'visible',
    },
    hudRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      alignSelf: 'stretch',
      flex: 1,
      gap: 10,
      minHeight: 52,
    },
    hudStatsGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
      gap: 14,
    },
    hudFinishButton: {
      height: 34,
      paddingHorizontal: 12,
      flexShrink: 0,
    },
    standardHeaderContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      alignSelf: 'stretch',
      flex: 1,
      minHeight: 52,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
      paddingRight: 12,
    },
    headerTitleGroup: {
      flex: 1,
      minWidth: 0,
    },
    standardTitle: {
      fontSize: 18,
      lineHeight: 22,
    },
    standardElapsed: {
      fontSize: 20,
      lineHeight: 24,
    },
    title: {
      marginBottom: 2,
    },
    timer: {
      marginTop: 2,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 24,
      paddingBottom: 100,
    },
    caffeineCard: {
      marginBottom: 16,
    },
    caffeineHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    caffeineTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
      flex: 1,
    },
    caffeineTitle: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 14,
      textTransform: 'uppercase',
    },
    caffeineAmount: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 18,
      fontVariant: ['tabular-nums'],
    },
    caffeineWarning: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 12,
      lineHeight: 16,
      marginTop: 8,
    },
    caffeineTrollWarning: {
      alignSelf: 'flex-start',
      borderRadius: 10,
      fontFamily: 'Manrope_500Medium',
      fontSize: 12,
      lineHeight: 18,
      marginTop: 10,
      overflow: 'hidden',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    caffeinePresetRow: {
      gap: 8,
      paddingVertical: 12,
    },
    caffeineChip: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      minWidth: 104,
    },
    caffeineChipName: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 12,
    },
    caffeineChipMeta: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 11,
      marginTop: 2,
    },
    caffeineCustomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    caffeineInput: {
      borderWidth: 1,
      borderRadius: 10,
      height: 40,
      minWidth: 72,
      paddingHorizontal: 12,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 16,
      fontVariant: ['tabular-nums'],
    },
    caffeineSmallButton: {
      borderWidth: 1,
      borderRadius: 10,
      height: 40,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    caffeineSmallButtonText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 12,
      textTransform: 'uppercase',
    },
    notesContainer: {
      marginBottom: 24,
    },
    notesInput: {
      minHeight: 60,
      textAlignVertical: 'top',
      fontSize: 16,
    },
    hudCol: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    hudText: {
      fontSize: 12,
      lineHeight: 16,
      fontFamily: 'SpaceGrotesk_700Bold',
    },
    hudDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    islandContainer: {
      position: 'absolute',
      top: isIOS ? 48 : 12,
      alignSelf: 'center',
      height: 38,
      zIndex: 999999,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 10,
      overflow: 'hidden',
    },
    islandContent: {
      flex: 1,
      paddingHorizontal: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    islandCollapsedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    islandExpandedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    },
    islandLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    islandText: {
      fontSize: 12,
      lineHeight: 16,
      fontFamily: 'SpaceGrotesk_700Bold',
    },
    islandControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    islandBtn: {
      backgroundColor: theme.colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 99,
      minHeight: 44,
      justifyContent: 'center',
    },
    islandBtnText: {
      color: theme.colors.primary,
      fontSize: 10,
      fontFamily: 'SpaceGrotesk_700Bold',
    },
    exerciseSectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      marginTop: 4,
    },
    exerciseSectionTitle: {
      fontSize: 16,
      fontFamily: 'SpaceGrotesk_700Bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    reorderToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      minHeight: 44,
      minWidth: 44,
      justifyContent: 'center',
      borderRadius: 8,
      borderWidth: 1,
    },
    reorderToggleText: {
      fontSize: 13,
    },
    reorderBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 12,
    },
    reorderBannerText: {
      fontSize: 12,
      flex: 1,
      fontFamily: 'Manrope_500Medium',
    },
  });
