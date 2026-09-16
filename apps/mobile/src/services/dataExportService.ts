import { useProfileStore, Profile } from '../stores/profileStore';
import { useHistoryStore } from '../stores/historyStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { useBodyMetricStore } from '../stores/bodyMetricStore';
import { useProgramStore } from '../stores/programStore';
import { useAchievementStore } from '../stores/achievementStore';
import { useHydrationStore } from '../stores/hydrationStore';
import { useCaffeineStore } from '../stores/caffeineStore';
import { useCoachStore } from '../stores/coachStore';
import {
  WorkoutSession,
  Exercise,
  BodyMetric,
  Program,
  WorkoutTemplate,
  ChatMessage,
} from '@fitness-tracker/domain';

export type ExportScope = 'LOCAL_EXPORT_ONLY' | 'PARTIAL_EXPORT' | 'CLOUD_SYNCHRONIZED';

export interface ExportPayload {
  schemaVersion: number;
  exportScope: ExportScope;
  disclaimer: string;
  exportedAt: string;
  profile: Partial<Profile> | null;
  workouts: WorkoutSession[];
  measurements: BodyMetric[];
  programs: Program[];
  templates: WorkoutTemplate[];
  customExercises: Exercise[];
  achievements: {
    xp: number;
    level: number;
    unlockedAchievements: Record<string, string | Date>;
    repeatCounts: Record<string, number>;
  };
  hydration: {
    dateKey: string;
    dailyGoalMl: number;
    todayIntakeMl: number;
  };
  caffeine: {
    isEnabled: boolean;
    currentWorkoutMg: number;
    lastWorkoutMg: number;
  };
  coach: {
    messageCount: number;
    messages: ChatMessage[];
  };
}

export interface ExportDataSources {
  getProfile: () => Partial<Profile> | null;
  getHistory: () => WorkoutSession[];
  getBodyMetrics: () => BodyMetric[];
  getPrograms: () => Program[];
  getTemplates: () => WorkoutTemplate[];
  getCustomExercises: () => Exercise[];
  getAchievements: () => {
    xp: number;
    level: number;
    unlockedAchievements: Record<string, string | Date>;
    repeatCounts: Record<string, number>;
  };
  getHydration: () => {
    dateKey: string;
    dailyGoalMl: number;
    todayIntakeMl: number;
  };
  getCaffeine: () => {
    isEnabled: boolean;
    currentWorkoutMg: number;
    lastWorkoutMg: number;
  };
  getCoachMessages: () => ChatMessage[];
}

const defaultDataSources: ExportDataSources = {
  getProfile: () => useProfileStore.getState().profile,
  getHistory: () => useHistoryStore.getState().sessions,
  getBodyMetrics: () => useBodyMetricStore.getState().metrics,
  getPrograms: () => useProgramStore.getState().programs,
  getTemplates: () => useProgramStore.getState().templates,
  getCustomExercises: () => useExerciseStore.getState().customExercises,
  getAchievements: () => {
    const s = useAchievementStore.getState();
    return {
      xp: s.xp,
      level: s.level,
      unlockedAchievements: s.unlockedAchievements,
      repeatCounts: s.repeatCounts,
    };
  },
  getHydration: () => {
    const s = useHydrationStore.getState();
    return {
      dateKey: s.dateKey,
      dailyGoalMl: s.dailyGoalMl,
      todayIntakeMl: s.todayIntakeMl,
    };
  },
  getCaffeine: () => {
    const s = useCaffeineStore.getState();
    return {
      isEnabled: s.isEnabled,
      currentWorkoutMg: s.currentWorkoutMg,
      lastWorkoutMg: s.lastWorkoutMg,
    };
  },
  getCoachMessages: () => useCoachStore.getState().messages,
};

/**
 * Deterministic Data Export Collector.
 * Implements DSGVO Art. 20 (Data Portability).
 *
 * Notice for Astra:
 * Currently labeled as 'LOCAL_EXPORT_ONLY'. When full cloud synchronization and
 * server-side storage are connected, this can be elevated to 'CLOUD_SYNCHRONIZED'.
 */
export class DataExportService {
  /**
   * Assembles a structured export document from local stores or custom data sources.
   */
  collectExportData(sources: ExportDataSources = defaultDataSources): ExportPayload {
    const profile = sources.getProfile();
    const workouts = sources.getHistory() ?? [];
    const measurements = sources.getBodyMetrics() ?? [];
    const programs = sources.getPrograms() ?? [];
    const templates = sources.getTemplates() ?? [];
    const customExercises = sources.getCustomExercises() ?? [];
    const achievements = sources.getAchievements();
    const hydration = sources.getHydration();
    const caffeine = sources.getCaffeine();
    const coachMessages = sources.getCoachMessages() ?? [];

    return {
      schemaVersion: 2,
      exportScope: 'LOCAL_EXPORT_ONLY',
      disclaimer:
        'This file contains locally stored user data exported under GDPR Art. 20. It reflects the data present on this device.',
      exportedAt: new Date().toISOString(),
      profile: profile ? { ...profile } : null,
      workouts: Array.isArray(workouts) ? [...workouts] : [],
      measurements: Array.isArray(measurements) ? [...measurements] : [],
      programs: Array.isArray(programs) ? [...programs] : [],
      templates: Array.isArray(templates) ? [...templates] : [],
      customExercises: Array.isArray(customExercises) ? [...customExercises] : [],
      achievements: {
        xp: achievements?.xp ?? 0,
        level: achievements?.level ?? 1,
        unlockedAchievements: { ...(achievements?.unlockedAchievements ?? {}) },
        repeatCounts: { ...(achievements?.repeatCounts ?? {}) },
      },
      hydration: {
        dateKey: hydration?.dateKey ?? '',
        dailyGoalMl: hydration?.dailyGoalMl ?? 2500,
        todayIntakeMl: hydration?.todayIntakeMl ?? 0,
      },
      caffeine: {
        isEnabled: caffeine?.isEnabled ?? false,
        currentWorkoutMg: caffeine?.currentWorkoutMg ?? 0,
        lastWorkoutMg: caffeine?.lastWorkoutMg ?? 0,
      },
      coach: {
        messageCount: coachMessages.length,
        messages: [...coachMessages],
      },
    };
  }

  /**
   * Serializes the export payload into formatted JSON string.
   */
  exportToJsonString(sources: ExportDataSources = defaultDataSources, space = 2): string {
    const payload = this.collectExportData(sources);
    return JSON.stringify(payload, null, space);
  }
}

export const dataExportService = new DataExportService();
