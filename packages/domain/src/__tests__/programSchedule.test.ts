import { describe, it, expect } from 'vitest';
import {
  getProgramScheduleStatus,
  calculateProgramWeek,
  getDayOfWeek,
} from '../schemas/programSchedule';
import { Program, WorkoutTemplate, WorkoutSession } from '../types';

const mockTemplateA: WorkoutTemplate = {
  id: 'tmpl-a',
  userId: 'user-1',
  name: 'Push A',
  exercises: [
    {
      id: 'te-1',
      exerciseId: 'ex-bench',
      order: 0,
      targetSets: 3,
      targetReps: 8,
      targetRepsMax: 10,
    },
  ],
  isArchived: false,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockTemplateB: WorkoutTemplate = {
  id: 'tmpl-b',
  userId: 'user-1',
  name: 'Pull A',
  exercises: [
    {
      id: 'te-2',
      exerciseId: 'ex-row',
      order: 0,
      targetSets: 4,
      targetReps: 10,
    },
  ],
  isArchived: false,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockProgram: Program = {
  id: 'prog-1',
  userId: 'user-1',
  name: 'Hypertrophy 4-Day',
  durationWeeks: 4,
  isActive: true,
  startedAt: new Date('2026-09-01T00:00:00.000Z'), // Tuesday (dayOfWeek: 2)
  createdAt: new Date('2026-09-01'),
  updatedAt: new Date('2026-09-01'),
  workouts: [
    // Week 1: Mon (day 1), Wed (day 3), Fri (day 5)
    { id: 'pw-1-1', templateId: 'tmpl-a', week: 1, dayOfWeek: 1, order: 0 },
    { id: 'pw-1-3', templateId: 'tmpl-b', week: 1, dayOfWeek: 3, order: 0 },
    { id: 'pw-1-5', templateId: 'tmpl-a', week: 1, dayOfWeek: 5, order: 0 },
    // Week 2
    { id: 'pw-2-1', templateId: 'tmpl-b', week: 2, dayOfWeek: 1, order: 0 },
    { id: 'pw-2-3', templateId: 'tmpl-a', week: 2, dayOfWeek: 3, order: 0 },
  ],
};

describe('programSchedule', () => {
  it('handles no active program gracefully', () => {
    const status = getProgramScheduleStatus(null, [mockTemplateA], []);
    expect(status.hasActiveProgram).toBe(false);
    expect(status.todayWorkout).toBeNull();
    expect(status.nextWorkout).toBeNull();
    expect(status.isRestDay).toBe(true);
  });

  it('handles inactive program as hasActiveProgram = false', () => {
    const inactiveProgram = { ...mockProgram, isActive: false };
    const status = getProgramScheduleStatus(inactiveProgram, [mockTemplateA], []);
    expect(status.hasActiveProgram).toBe(false);
  });

  it('detects a scheduled workout for today when not yet completed', () => {
    // 2026-09-02 was Wednesday (dayOfWeek: 3), in Week 1 of program started 2026-09-01
    const testDate = new Date('2026-09-02T10:00:00.000Z');
    const status = getProgramScheduleStatus(mockProgram, [mockTemplateA, mockTemplateB], [], testDate);

    expect(status.hasActiveProgram).toBe(true);
    expect(status.currentWeek).toBe(1);
    expect(status.isCompleted).toBe(false);
    expect(status.isRestDay).toBe(false);
    expect(status.todayWorkout?.id).toBe('pw-1-3');
    expect(status.todayTemplate?.name).toBe('Pull A');
    expect(status.nextWorkout?.id).toBe('pw-1-3'); // Today is next
  });

  it('detects a rest day and points to the next upcoming workout', () => {
    // 2026-09-03 was Thursday (dayOfWeek: 4) - no workout scheduled
    const testDate = new Date('2026-09-03T10:00:00.000Z');
    const status = getProgramScheduleStatus(mockProgram, [mockTemplateA, mockTemplateB], [], testDate);

    expect(status.isRestDay).toBe(true);
    expect(status.todayWorkout).toBeNull();
    expect(status.todayTemplate).toBeNull();
    // Next upcoming workout is Friday (day 5)
    expect(status.nextWorkout?.id).toBe('pw-1-5');
    expect(status.nextWorkoutWeek).toBe(1);
    expect(status.nextWorkoutDayOfWeek).toBe(5);
    expect(status.nextTemplate?.name).toBe('Push A');
  });

  it('marks today as completed if session already logged for today, advancing next workout', () => {
    // 2026-09-02 (Wednesday, day 3)
    const testDate = new Date('2026-09-02T18:00:00.000Z');
    const completedSession: WorkoutSession = {
      id: 'sess-1',
      userId: 'user-1',
      programId: 'prog-1',
      templateId: 'tmpl-b',
      name: 'Pull A',
      startedAt: new Date('2026-09-02T14:00:00.000Z'),
      completedAt: new Date('2026-09-02T15:00:00.000Z'),
      exercises: [],
      createdAt: new Date('2026-09-02'),
      updatedAt: new Date('2026-09-02'),
    };

    const status = getProgramScheduleStatus(
      mockProgram,
      [mockTemplateA, mockTemplateB],
      [completedSession],
      testDate,
    );

    expect(status.isTodayCompleted).toBe(true);
    expect(status.isRestDay).toBe(true); // Rest for the rest of today
    expect(status.todayWorkout?.id).toBe('pw-1-3');
    // Next upcoming workout advances to Friday (day 5)
    expect(status.nextWorkout?.id).toBe('pw-1-5');
  });

  it('advances next workout across weeks (e.g. from Friday week 1 to Monday week 2)', () => {
    // 2026-09-05 (Saturday, day 6, week 1)
    const testDate = new Date('2026-09-05T10:00:00.000Z');
    const status = getProgramScheduleStatus(mockProgram, [mockTemplateA, mockTemplateB], [], testDate);

    expect(status.isRestDay).toBe(true);
    expect(status.nextWorkout?.id).toBe('pw-2-1'); // Week 2, Day 1
    expect(status.nextWorkoutWeek).toBe(2);
    expect(status.nextWorkoutDayOfWeek).toBe(1);
  });

  it('identifies a completed program when current date exceeds durationWeeks', () => {
    // 5 weeks after 2026-09-01 -> 2026-10-10
    const testDate = new Date('2026-10-10T10:00:00.000Z');
    const status = getProgramScheduleStatus(mockProgram, [mockTemplateA, mockTemplateB], [], testDate);

    expect(status.isCompleted).toBe(true);
    expect(status.isRestDay).toBe(true);
    expect(status.nextWorkout).toBeNull();
  });

  it('gracefully handles missing / deleted templates without throwing', () => {
    // Pass empty templates array
    const testDate = new Date('2026-09-02T10:00:00.000Z');
    const status = getProgramScheduleStatus(mockProgram, [], [], testDate);

    expect(status.todayWorkout?.id).toBe('pw-1-3');
    expect(status.todayTemplate).toBeNull();
    expect(status.nextTemplate).toBeNull();
  });

  it('calculates program week correctly across month boundaries', () => {
    const start = new Date('2026-01-28');
    const now = new Date('2026-02-15');
    // 18 days difference -> 18/7 = 2.57 -> Week 3
    const week = calculateProgramWeek(start, now, 8);
    expect(week).toBe(3);
  });

  it('getDayOfWeek returns 1 for Monday through 7 for Sunday', () => {
    // 2026-09-07 was Monday
    expect(getDayOfWeek(new Date('2026-09-07'))).toBe(1);
    // 2026-09-13 was Sunday
    expect(getDayOfWeek(new Date('2026-09-13'))).toBe(7);
  });

  describe('Phase 19 – Program Home Edge Cases', () => {
    it('Program Day mit geändertem Template reflects updated template metadata', () => {
      const modifiedTemplate: WorkoutTemplate = {
        ...mockTemplateB,
        name: 'Pull A (Modified)',
      };
      const testDate = new Date('2026-09-02T10:00:00.000Z');
      const status = getProgramScheduleStatus(mockProgram, [mockTemplateA, modifiedTemplate], [], testDate);

      expect(status.todayTemplate?.name).toBe('Pull A (Modified)');
    });

    it('gelöschte Exercise Reference in template does not crash schedule computation', () => {
      const brokenTemplate: WorkoutTemplate = {
        ...mockTemplateA,
        exercises: [],
      };
      const testDate = new Date('2026-09-04T10:00:00.000Z'); // Friday
      const status = getProgramScheduleStatus(mockProgram, [brokenTemplate, mockTemplateB], [], testDate);

      expect(status.todayTemplate).toBeDefined();
      expect(status.todayTemplate?.exercises).toHaveLength(0);
    });

    it('offline / restored program progress: survives serialization roundtrip deterministically', () => {
      const serializedProgram = JSON.stringify(mockProgram);
      const restoredProgram: Program = JSON.parse(serializedProgram, (key, value) => {
        if (key === 'startedAt' || key === 'createdAt' || key === 'updatedAt') {
          return new Date(value);
        }
        return value;
      });

      const testDate = new Date('2026-09-02T10:00:00.000Z');
      const status = getProgramScheduleStatus(restoredProgram, [mockTemplateA, mockTemplateB], [], testDate);

      expect(status.hasActiveProgram).toBe(true);
      expect(status.todayWorkout?.id).toBe('pw-1-3');
    });

    it('next workout remains deterministic across multiple invocations', () => {
      const testDate = new Date('2026-09-03T10:00:00.000Z');
      const status1 = getProgramScheduleStatus(mockProgram, [mockTemplateA, mockTemplateB], [], testDate);
      const status2 = getProgramScheduleStatus(mockProgram, [mockTemplateA, mockTemplateB], [], testDate);

      expect(status1.nextWorkout?.id).toBe(status2.nextWorkout?.id);
      expect(status1.nextWorkoutWeek).toBe(status2.nextWorkoutWeek);
      expect(status1.nextWorkoutDayOfWeek).toBe(status2.nextWorkoutDayOfWeek);
    });

    it('handles rest days cleanly with todayWorkout null and explicit nextWorkout', () => {
      const restDayDate = new Date('2026-09-03T10:00:00.000Z');
      const status = getProgramScheduleStatus(mockProgram, [mockTemplateA, mockTemplateB], [], restDayDate);

      expect(status.isRestDay).toBe(true);
      expect(status.todayWorkout).toBeNull();
      expect(status.todayTemplate).toBeNull();
      expect(status.nextWorkout).not.toBeNull();
      expect(status.nextTemplate).not.toBeNull();
    });
  });
});
