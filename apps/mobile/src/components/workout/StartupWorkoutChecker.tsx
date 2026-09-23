import React, { useEffect, useState } from 'react';
import { Platform, Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useTheme } from '@fitness-tracker/ui';
import { useWorkoutStore } from '../../stores/workoutStore';
import { getResumeWorkoutDecision } from '../../utils/resumeWorkoutGuard';
import { inspectStartupState } from '../../utils/startup-recovery';
import { useI18n } from '../../i18n';

export function StartupWorkoutChecker() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, resetWorkout, resumeWorkout } = useWorkoutStore();
  const [modalVisible, setModalVisible] = useState(false);
  const theme = useTheme();
  const { t } = useI18n();

  useEffect(() => {
    return inspectStartupState(useWorkoutStore.persist, () => {
      const decision = getResumeWorkoutDecision(useWorkoutStore.getState());
      if (decision === 'prompt') setModalVisible(true);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleUnload = () => {
        const currentStatus = useWorkoutStore.getState().status;
        if (currentStatus === 'active') {
          useWorkoutStore.getState().pauseWorkout();
        }
      };
      const win = globalThis as unknown as {
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      };
      const add = win.addEventListener;
      const remove = win.removeEventListener;
      if (typeof add === 'function' && typeof remove === 'function') {
        add('beforeunload', handleUnload);
        return () => {
          remove('beforeunload', handleUnload);
        };
      }
    }
  }, []);

  return (
    <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <Text
            style={[styles.modalTitle, { color: theme.colors.text, ...theme.typography.heading }]}
          >
            {t('workout.unfinishedWorkoutTitle')}
          </Text>
          <Text
            style={[styles.modalMessage, { color: theme.colors.muted, ...theme.typography.body }]}
          >
            {t('workout.unfinishedWorkoutMessage')}
          </Text>
          <View style={styles.modalActions}>
            <Pressable
              style={[
                styles.modalBtn,
                { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
              ]}
              onPress={() => {
                if (status === 'paused') {
                  resumeWorkout();
                }
                setModalVisible(false);
                useWorkoutStore.getState().setMinimized(false);
                if (pathname !== '/workout/session') router.navigate('/workout/session');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('workout.resumeWorkout')}
            >
              <Text
                style={[
                  styles.modalBtnText,
                  { color: theme.colors.background, ...theme.typography.button },
                ]}
              >
                {t('workout.resumeWorkout')}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.modalBtn,
                {
                  backgroundColor: 'transparent',
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  borderRadius: theme.radius.md,
                },
              ]}
              onPress={() => {
                resetWorkout();
                setModalVisible(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('workout.discardAndStartNew')}
            >
              <Text
                style={[
                  styles.modalBtnText,
                  { color: theme.colors.accent, ...theme.typography.button },
                ]}
              >
                {t('workout.discardAndStartNew')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    borderWidth: 1,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActions: {
    width: '100%',
    gap: 12,
  },
  modalBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 48,
  },
  modalBtnText: {
    fontSize: 15,
  },
});
