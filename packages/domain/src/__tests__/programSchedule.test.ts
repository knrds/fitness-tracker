import { afterEach, describe, it, expect, vi } from 'vitest';
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

const finishedSession = (
  startedAt: Date,
  overrides: Partial<WorkoutSession> = {},
): WorkoutSession => ({
  id: 'finished-session',
  userId: 'user-1',
  programId: mockProgram.id,
  templateId: mockTemplateA.id,
  name: mockTemplateA.name,
  startedAt,
  completedAt: new Date(startedAt.getTime() + 30 * 60 * 1000),
  exercises: [],
  createdAt: startedAt,
  updatedAt: startedAt,
  ...overrides,
});

afterEach(() => vi.unstubAllEnvs());

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
    const status = getProgramScheduleStatus(
      mockProgram,
      [mockTemplateA, mockTemplateB],
      [],
      testDate,
    );

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
    const status = getProgramScheduleStatus(
      mockProgram,
      [mockTemplateA, mockTemplateB],
      [],
      testDate,
    );

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
    const status = getProgramScheduleStatus(
      mockProgram,
      [mockTemplateA, mockTemplateB],
      [],
      testDate,
    );

    expect(status.isRestDay).toBe(true);
    expect(status.nextWorkout?.id).toBe('pw-2-1'); // Week 2, Day 1
    expect(status.nextWorkoutWeek).toBe(2);
    expect(status.nextWorkoutDayOfWeek).toBe(1);
  });

  it('keeps a completed Sunday in today and Monday in the next program week', () => {
    const program: Program = {
      ...mockProgram,
      startedAt: new Date(2026, 8, 21),
      workouts: [
        { id: 'sunday', templateId: mockTemplateA.id, week: 1, dayOfWeek: 7, order: 0 },
        { id: 'monday', templateId: mockTemplateB.id, week: 2, dayOfWeek: 1, order: 0 },
      ],
    };
    const session = finishedSession(new Date(2026, 8, 27, 10));
    const sunday = getProgramScheduleStatus(
      program,
      [mockTemplateA, mockTemplateB],
      [session],
      new Date(2026, 8, 27, 15),
    );
    expect(sunday.isTodayCompleted).toBe(true);
    expect(sunday.todayWorkout?.id).toBe('sunday');
    expect(sunday.todayTemplate?.id).toBe(mockTemplateA.id);
    expect(sunday.nextWorkout?.id).toBe('monday');
    expect(sunday.nextWorkoutWeek).toBe(2);
    expect(sunday.nextWorkoutDayOfWeek).toBe(1);

    const monday = getProgramScheduleStatus(
      program,
      [mockTemplateA, mockTemplateB],
      [session],
      new Date(2026, 8, 28, 8),
    );
    expect(monday.currentWeek).toBe(2);
    expect(monday.todayWorkout?.id).toBe('monday');
    expect(monday.isTodayCompleted).toBe(false);
  });

  it('requires a separate completed session for each same-day slot, including repeated templates', () => {
    const program: Program = {
      ...mockProgram,
      startedAt: new Date(2026, 8, 21),
      workouts: [
        { id: 'sunday-first', templateId: mockTemplateA.id, week: 1, dayOfWeek: 7, order: 0 },
        { id: 'sunday-second', templateId: mockTemplateA.id, week: 1, dayOfWeek: 7, order: 1 },
        { id: 'monday', templateId: mockTemplateB.id, week: 2, dayOfWeek: 1, order: 0 },
      ],
    };
    const first = finishedSession(new Date(2026, 8, 27, 10));
    const second = finishedSession(new Date(2026, 8, 27, 15), { id: 'second-session' });
    const date = new Date(2026, 8, 27, 18);
    const afterFirst = getProgramScheduleStatus(
      program,
      [mockTemplateA, mockTemplateB],
      [first],
      date,
    );
    expect(afterFirst.isTodayCompleted).toBe(false);
    expect(afterFirst.todayWorkout?.id).toBe('sunday-second');
    expect(afterFirst.nextWorkout?.id).toBe('sunday-second');
    const afterBoth = getProgramScheduleStatus(
      program,
      [mockTemplateA, mockTemplateB],
      [first, second],
      date,
    );
    expect(afterBoth.isTodayCompleted).toBe(true);
    expect(afterBoth.nextWorkout?.id).toBe('monday');
  });

  it('ignores in-progress, unrelated and previous-day sessions instead of trusting an equal title', () => {
    const date = new Date(2026, 8, 2, 18);
    const inProgress = finishedSession(new Date(2026, 8, 2, 10), { templateId: mockTemplateB.id });
    delete inProgress.completedAt;
    const sessions = [
      inProgress,
      finishedSession(new Date(2026, 8, 2, 10), { name: mockTemplateB.name }),
      finishedSession(new Date(2026, 8, 1, 10), { templateId: mockTemplateB.id }),
      finishedSession(new Date(2026, 8, 2, 10), {
        templateId: mockTemplateB.id,
        programId: 'another-program',
      }),
    ];
    const status = getProgramScheduleStatus(
      mockProgram,
      [mockTemplateA, mockTemplateB],
      sessions,
      date,
    );
    expect(status.isTodayCompleted).toBe(false);
    expect(status.todayTemplate?.id).toBe(mockTemplateB.id);
  });

  it.each(['America/Los_Angeles', 'Europe/Berlin', 'UTC'])(
    'matches the local Sunday, not the UTC day, in %s',
    (timezone) => {
      vi.stubEnv('TZ', timezone);
      const date = new Date(2026, 8, 27, 23, 45);
      const program = {
        ...mockProgram,
        startedAt: new Date(2026, 8, 21),
        workouts: [{ id: 'sunday', templateId: mockTemplateA.id, week: 1, dayOfWeek: 7, order: 0 }],
      };
      const status = getProgramScheduleStatus(
        program,
        [mockTemplateA],
        [finishedSession(new Date(2026, 8, 27, 23))],
        date,
      );
      expect(status.isTodayCompleted).toBe(true);
    },
  );

  it('keeps program weeks and day boundaries correct across daylight saving changes', () => {
    vi.stubEnv('TZ', 'Europe/Berlin');
    expect(calculateProgramWeek(new Date(2026, 2, 23), new Date(2026, 2, 30), 4)).toBe(2);
    const sundayProgram = (start: Date): Program => ({
      ...mockProgram,
      startedAt: start,
      workouts: [{ id: 'sunday', templateId: mockTemplateA.id, week: 1, dayOfWeek: 7, order: 0 }],
    });
    const spring = getProgramScheduleStatus(
      sundayProgram(new Date(2026, 2, 23)),
      [mockTemplateA],
      [finishedSession(new Date(2026, 2, 30, 0, 15))],
      new Date(2026, 2, 29, 23),
    );
    expect(spring.isTodayCompleted).toBe(false);
    const autumn = getProgramScheduleStatus(
      sundayProgram(new Date(2026, 9, 19)),
      [mockTemplateA],
      [finishedSession(new Date(2026, 9, 25, 23, 15))],
      new Date(2026, 9, 25, 23, 50),
    );
    expect(autumn.isTodayCompleted).toBe(true);
  });

  it('identifies a completed program when current date exceeds durationWeeks', () => {
    // 5 weeks after 2026-09-01 -> 2026-10-10
    const testDate = new Date('2026-10-10T10:00:00.000Z');
    const status = getProgramScheduleStatus(
      mockProgram,
      [mockTemplateA, mockTemplateB],
      [],
      testDate,
    );

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
      const status = getProgramScheduleStatus(
        mockProgram,
        [mockTemplateA, modifiedTemplate],
        [],
        testDate,
      );

      expect(status.todayTemplate?.name).toBe('Pull A (Modified)');
    });

    it('gelöschte Exercise Reference in template does not crash schedule computation', () => {
      const brokenTemplate: WorkoutTemplate = {
        ...mockTemplateA,
        exercises: [],
      };
      const testDate = new Date('2026-09-04T10:00:00.000Z'); // Friday
      const status = getProgramScheduleStatus(
        mockProgram,
        [brokenTemplate, mockTemplateB],
        [],
        testDate,
      );

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
      const status = getProgramScheduleStatus(
        restoredProgram,
        [mockTemplateA, mockTemplateB],
        [],
        testDate,
      );

      expect(status.hasActiveProgram).toBe(true);
      expect(status.todayWorkout?.id).toBe('pw-1-3');
    });

    it('next workout remains deterministic across multiple invocations', () => {
      const testDate = new Date('2026-09-03T10:00:00.000Z');
      const status1 = getProgramScheduleStatus(
        mockProgram,
        [mockTemplateA, mockTemplateB],
        [],
        testDate,
      );
      const status2 = getProgramScheduleStatus(
        mockProgram,
        [mockTemplateA, mockTemplateB],
        [],
        testDate,
      );

      expect(status1.nextWorkout?.id).toBe(status2.nextWorkout?.id);
      expect(status1.nextWorkoutWeek).toBe(status2.nextWorkoutWeek);
      expect(status1.nextWorkoutDayOfWeek).toBe(status2.nextWorkoutDayOfWeek);
    });

    it('handles rest days cleanly with todayWorkout null and explicit nextWorkout', () => {
      const restDayDate = new Date('2026-09-03T10:00:00.000Z');
      const status = getProgramScheduleStatus(
        mockProgram,
        [mockTemplateA, mockTemplateB],
        [],
        restDayDate,
      );

      expect(status.isRestDay).toBe(true);
      expect(status.todayWorkout).toBeNull();
      expect(status.todayTemplate).toBeNull();
      expect(status.nextWorkout).not.toBeNull();
      expect(status.nextTemplate).not.toBeNull();
    });
  });
});
