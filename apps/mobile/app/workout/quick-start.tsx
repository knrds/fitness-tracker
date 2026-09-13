import { Theme, useThemeStyles } from '@fitness-tracker/ui';
import { scopedAlert as Alert } from '../../src/utils/scopedAlert';
import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { isIOS } from '../../src/utils/platform';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@fitness-tracker/ui';
import { useProgramStore } from '../../src/stores/programStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { WorkoutTemplate } from '@fitness-tracker/domain';

export default function QuickStartScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { templates, deleteTemplate } = useProgramStore();
  const { exercises: allExercises } = useExerciseStore();
  const { status: activeWorkoutStatus, startWorkout, startWorkoutFromTemplate } = useWorkoutStore();

  const handleStartEmptyWorkout = () => {
    const start = () => {
      startWorkout('Empty Workout');
      router.navigate('/workout/session');
    };

    if (activeWorkoutStatus === 'active' || activeWorkoutStatus === 'paused') {
      if (Platform.OS === 'web') {
        if (typeof globalThis !== 'undefined' && 'confirm' in globalThis) {
          const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
          if (
            confirmFn?.(
              'An active workout is already in progress. Do you want to discard it and start a new empty workout?',
            )
          ) {
            start();
          }
        }
      } else {
        Alert.alert(
          'Workout In Progress',
          'An active workout is already in progress. Do you want to discard it and start a new empty workout?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Discard & Start', style: 'destructive', onPress: start },
          ],
        );
      }
    } else {
      start();
    }
  };

  const handleStartTemplate = (template: WorkoutTemplate) => {
    const start = () => {
      startWorkoutFromTemplate(template);
      router.navigate('/workout/session');
    };

    if (activeWorkoutStatus === 'active' || activeWorkoutStatus === 'paused') {
      if (Platform.OS === 'web') {
        if (typeof globalThis !== 'undefined' && 'confirm' in globalThis) {
          const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
          if (
            confirmFn?.(
              'An active workout is already in progress. Do you want to discard it and start this template instead?',
            )
          ) {
            start();
          }
        }
      } else {
        Alert.alert(
          'Workout In Progress',
          'An active workout is already in progress. Do you want to discard it and start this template instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Discard & Start', style: 'destructive', onPress: start },
          ],
        );
      }
    } else {
      start();
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (Platform.OS === 'web') {
      if (typeof globalThis !== 'undefined' && 'confirm' in globalThis) {
        const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
        if (confirmFn?.('Are you sure you want to delete this template?')) {
          deleteTemplate(templateId);
        }
      }
    } else {
      Alert.alert('Delete Template', 'Are you sure you want to delete this template?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(templateId) },
      ]);
    }
  };

  const renderTemplateItem = ({ item }: { item: WorkoutTemplate }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <View style={styles.templateActions}>
            <Pressable
              style={[styles.actionBtn, styles.startBtn]}
              onPress={() => handleStartTemplate(item)}
            >
              <Text style={styles.startBtnText}>Start</Text>
            </Pressable>
            <Pressable
              style={styles.actionBtn}
              onPress={() =>
                router.push(
                  `/programs/template-builder?templateId=${item.id}` as unknown as Parameters<
                    typeof router.push
                  >[0],
                )
              }
            >
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => handleDeleteTemplate(item.id)}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </Pressable>
          </View>
        </View>

        {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}

        <View style={styles.exercisePreview}>
          {item.exercises.map((ex, idx) => {
            const exerciseDetail = allExercises.find((e) => e.id === ex.exerciseId);
            return (
              <Text key={ex.id || idx} style={styles.exerciseText}>
                • {ex.targetSets}x {exerciseDetail?.name || 'Unknown Exercise'}
              </Text>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={15} style={styles.backBtn}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.primary}
            style={{ alignSelf: 'center' }}
          />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Quick Start</Text>
          <Text style={[styles.headerSub, { color: theme.colors.muted }]}>
            Start an empty workout or choose a template below.
          </Text>
        </View>
      </View>

      <Pressable style={styles.emptyWorkoutBtn} onPress={handleStartEmptyWorkout}>
        <Text style={styles.emptyWorkoutBtnText}>+ Start Empty Workout</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Templates</Text>

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        renderItem={renderTemplateItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No templates saved yet.</Text>
            <Text style={styles.emptySubtext}>
              Save templates at the end of workouts, or add them via Programs.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 16,
      paddingTop: isIOS ? 50 : 48,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      borderBottomWidth: 1,
      paddingBottom: 16,
      gap: 12,
    },
    backBtn: {
      padding: 4,
    },
    headerTextContainer: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 22,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.text,
    },
    headerSub: {
      fontSize: 13,
      fontFamily: 'Manrope_500Medium',
      color: theme.colors.muted,
      marginTop: 2,
    },
    emptyWorkoutBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 24,
    },
    emptyWorkoutBtnText: {
      color: theme.colors.background,
      fontSize: 16,
      fontFamily: 'SpaceGrotesk_700Bold',
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.primary,
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    list: {
      paddingBottom: 24,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    cardTitle: {
      fontSize: 18,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.text,
      flex: 1,
      marginRight: 12,
    },
    templateActions: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    actionBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    startBtn: {
      backgroundColor: theme.colors.primary,
    },
    startBtnText: {
      color: theme.colors.background,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 14,
    },
    editBtnText: {
      color: theme.colors.primary,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 14,
    },
    deleteBtnText: {
      color: theme.colors.error,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 14,
    },
    cardDesc: {
      fontSize: 14,
      fontFamily: 'Manrope_500Medium',
      color: theme.colors.muted,
      marginBottom: 12,
    },
    exercisePreview: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    exerciseText: {
      fontSize: 14,
      fontFamily: 'Manrope_500Medium',
      color: theme.colors.text,
      marginBottom: 4,
    },
    emptyContainer: {
      alignItems: 'center',
      marginTop: 40,
      padding: 24,
    },
    emptyText: {
      fontSize: 16,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      fontFamily: 'Manrope_500Medium',
      color: theme.colors.muted,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
