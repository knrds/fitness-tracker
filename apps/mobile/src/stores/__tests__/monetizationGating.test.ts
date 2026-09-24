import { useProgramStore, isTemplateEditable, isProgramEditable, isDefaultTemplateId } from '../programStore';
import { useWorkoutStore } from '../workoutStore';
import { useBodyMetricStore } from '../bodyMetricStore';
import { useCoachStore } from '../coachStore';
import { useProfileStore } from '../profileStore';
import { useExerciseStore } from '../exerciseStore';
import { entitlementService } from '../../services/entitlementService';
import { saveCoachPlan } from '../../utils/saveCoachPlan';
import { ChatMessage, CURRENT_AI_CONSENT_VERSION, EXERCISES } from '@fitness-tracker/domain';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    randomUUID: () => {
      counter += 1;
      return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
    },
  };
});

describe('Monetization Capability Integration & Direct Bypass Protection', () => {
  beforeEach(() => {
    entitlementService.setBetaBypass(false);
    entitlementService.setMockTier('free');
    useProgramStore.setState({ programs: [], templates: [], customFolders: [] });
    useWorkoutStore.setState({
      status: 'idle',
      exercises: [],
      sessionId: undefined,
      templateId: undefined,
    });
    useBodyMetricStore.setState({ metrics: [] });
    useCoachStore.setState({ messages: [], isSending: false, error: null });
    useProfileStore.setState({
      profile: {
        displayName: 'Test User',
        preferredUnits: 'metric',
        colorway: 'glacier',
        aiConsent: {
          version: CURRENT_AI_CONSENT_VERSION,
          consentedAt: new Date().toISOString(),
        },
      },
    });
    useExerciseStore.setState({
      exercises: [EXERCISES[0]!],
    });
  });

  afterAll(() => {
    entitlementService.setBetaBypass(true);
  });

  describe('Phase 2 & 11: Free Template Limit & Downgrade Preservation', () => {
    it('FREE allows three templates, but blocks the fourth at store level', () => {
      entitlementService.setMockTier('free');

      // #1 - Allowed
      useProgramStore.getState().createTemplate({
        id: 'tmpl-1',
        name: 'Template 1',
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
        exercises: [],
      });
      expect(useProgramStore.getState().templates.length).toBe(1);

      // #2 - Allowed
      useProgramStore.getState().createTemplate({
        id: 'tmpl-2',
        name: 'Template 2',
        createdAt: new Date('2026-01-02T10:00:00.000Z'),
        exercises: [],
      });
      expect(useProgramStore.getState().templates.length).toBe(2);

      useProgramStore.getState().createTemplate({ id: 'tmpl-3', name: 'Template 3', exercises: [] });
      // #4 - Blocked at store action level
      expect(() => {
        useProgramStore.getState().createTemplate({
          id: 'tmpl-4',
          name: 'Template 4',
          createdAt: new Date('2026-01-03T10:00:00.000Z'),
          exercises: [],
        });
      }).toThrow('TEMPLATE_LIMIT_REACHED');
      expect(useProgramStore.getState().templates.length).toBe(3);
    });

    it('PRO allows unlimited templates, and downgrade preserves all templates with exactly 2 editable', () => {
      // 1. User is PRO
      entitlementService.setMockTier('pro');

      for (let i = 1; i <= 8; i++) {
        useProgramStore.getState().createTemplate({
          id: `tmpl-${i}`,
          name: `Template ${i}`,
          createdAt: new Date(`2026-01-0${i}T10:00:00.000Z`),
          exercises: [],
        });
      }
      expect(useProgramStore.getState().templates.length).toBe(8);

      // In PRO, all 8 templates are editable
      for (let i = 1; i <= 8; i++) {
        expect(isTemplateEditable(`tmpl-${i}`, useProgramStore.getState().templates)).toBe(true);
        // Can update any template
        useProgramStore.getState().updateTemplate(`tmpl-${i}`, { name: `Template ${i} Updated` });
      }

      // 2. User downgrades to FREE: ZERO DELETION
      entitlementService.setMockTier('free');

      const templatesAfterDowngrade = useProgramStore.getState().templates;
      expect(templatesAfterDowngrade.length).toBe(8); // ZERO DELETION

      // Exactly the first 2 (oldest by createdAt ASC) remain editable
      expect(isTemplateEditable('tmpl-1', templatesAfterDowngrade)).toBe(true);
      expect(isTemplateEditable('tmpl-2', templatesAfterDowngrade)).toBe(true);

      // Templates #3 through #8 become read-only
      expect(isTemplateEditable('tmpl-3', templatesAfterDowngrade)).toBe(true);
      for (let i = 4; i <= 8; i++) {
        expect(isTemplateEditable(`tmpl-${i}`, templatesAfterDowngrade)).toBe(false);

        // Attempting to update a locked template in the store throws TEMPLATE_LOCKED
        expect(() => {
          useProgramStore.getState().updateTemplate(`tmpl-${i}`, { name: 'Hacked Edit' });
        }).toThrow('TEMPLATE_LOCKED');
      }

      // 3. User re-upgrades to PRO: all 8 templates become editable again
      entitlementService.setMockTier('pro');
      for (let i = 1; i <= 8; i++) {
        expect(isTemplateEditable(`tmpl-${i}`, useProgramStore.getState().templates)).toBe(true);
      }
    });

    it('Default starter templates are never counted towards custom limit and remain read-only', () => {
      entitlementService.setMockTier('free');
      const defaultId = '10000000-0000-4000-8000-000000000001';
      expect(isDefaultTemplateId(defaultId)).toBe(true);

      useProgramStore.setState({
        templates: [
          {
            id: defaultId,
            name: 'Default Full Body',
            exercises: [],
            userId: 'user-1',
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      // Default template is not editable on Free
      expect(isTemplateEditable(defaultId, useProgramStore.getState().templates)).toBe(false);

      // Free user can still create their 2 allowed custom templates
      useProgramStore.getState().createTemplate({
        id: 'custom-1',
        name: 'Custom 1',
        createdAt: new Date(),
        exercises: [],
      });
      useProgramStore.getState().createTemplate({
        id: 'custom-2',
        name: 'Custom 2',
        createdAt: new Date(),
        exercises: [],
      });
      expect(useProgramStore.getState().templates.length).toBe(3); // 1 default + 2 custom
    });
  });

  describe('Phase 3 & 11: Program Gating & Downgrade Preservation', () => {
    it('FREE allows one program and blocks a second at store level', () => {
      entitlementService.setMockTier('free');
      useProgramStore.getState().createProgram({ name: 'First free program' });
      expect(() => {
        useProgramStore.getState().createProgram({
          name: 'Hypertrophy Phase 1',
          durationWeeks: 6,
        });
      }).toThrow('PROGRAM_FEATURE_LOCKED');
    });

    it('PRO allows program creation and editing, downgrade keeps programs intact but read-only', () => {
      entitlementService.setMockTier('pro');

      useProgramStore.getState().createProgram({
        id: 'prog-1',
        name: 'PPL Pro',
        durationWeeks: 6,
        workouts: [],
      });
      expect(useProgramStore.getState().programs.length).toBe(1);
      expect(isProgramEditable()).toBe(true);

      // Downgrade to Free
      entitlementService.setMockTier('free');

      // Program is NOT deleted
      expect(useProgramStore.getState().programs.length).toBe(1);

      // Program becomes read-only
      expect(isProgramEditable('prog-1')).toBe(true);
      useProgramStore.getState().updateProgram('prog-1', { name: 'Free program update' });
      expect(() => useProgramStore.getState().createProgram({ name: 'Second free program' })).toThrow('PROGRAM_FEATURE_LOCKED');

      // Re-upgrade restores editability
      entitlementService.setMockTier('pro');
      expect(isProgramEditable()).toBe(true);
      useProgramStore.getState().updateProgram('prog-1', { name: 'PPL Pro V2' });
      expect(useProgramStore.getState().programs[0]?.name).toBe('PPL Pro V2');
    });
  });

  describe('Phase 4: RPE / RIR Direct Store Protection & History Preservation', () => {
    it('FREE sanitizes RPE and RIR on updateSet fail-closed, but keeps historical values', () => {
      useWorkoutStore.setState({
        status: 'active',
        exercises: [
          {
            id: 'se-1',
            exerciseId: 'ex-bench',
            order: 0,
            sets: [
              {
                id: 'set-hist',
                type: 'working',
                setNumber: 1,
                weight: 100,
                reps: 5,
                rpe: 9,
                rir: 1,
                completed: true,
              },
              {
                id: 'set-new',
                type: 'working',
                setNumber: 2,
                weight: 100,
                reps: 5,
                completed: false,
              },
            ],
          },
        ],
      });

      entitlementService.setMockTier('free');

      // Attempt to enter RPE and RIR on set-new
      useWorkoutStore.getState().updateSet('se-1', 'set-new', {
        weight: 105,
        reps: 5,
        rpe: 8.5,
        rir: 2,
      });

      const sets = useWorkoutStore.getState().exercises[0]?.sets ?? [];
      const updatedNewSet = sets.find((s) => s.id === 'set-new');
      expect(updatedNewSet?.weight).toBe(105);
      expect(updatedNewSet?.reps).toBe(5);
      expect(updatedNewSet?.rpe).toBeUndefined(); // STRIPPED FAIL-CLOSED
      expect(updatedNewSet?.rir).toBeUndefined(); // STRIPPED FAIL-CLOSED

      // Historical set-hist MUST preserve its RPE and RIR
      const histSet = sets.find((s) => s.id === 'set-hist');
      expect(histSet?.rpe).toBe(9);
      expect(histSet?.rir).toBe(1);

      // PRO allows entering RPE and RIR
      entitlementService.setMockTier('pro');
      useWorkoutStore.getState().updateSet('se-1', 'set-new', {
        rpe: 8.5,
        rir: 2,
      });
      const proUpdatedSet = useWorkoutStore
        .getState()
        .exercises[0]?.sets.find((s) => s.id === 'set-new');
      expect(proUpdatedSet?.rpe).toBe(8.5);
      expect(proUpdatedSet?.rir).toBe(2);
    });
  });

  describe('Phase 5: Metrics Gating & Historical Data Safety', () => {
    it('FREE allows weightKg, but strips bodyFatPercentage and measurements; throws if only premium metric passed', () => {
      entitlementService.setMockTier('free');

      // Attempt to pass weight + premium metrics: weight is saved, premium is stripped
      useBodyMetricStore.getState().addMetric({
        weightKg: 80.5,
        recordedAt: new Date(),
        bodyFatPercentage: 14.2,
        measurements: { waist: 82, chest: 104 },
      });

      const metrics = useBodyMetricStore.getState().metrics;
      expect(metrics.length).toBe(1);
      expect(metrics[0]?.weightKg).toBe(80.5);
      expect(metrics[0]?.bodyFatPercentage).toBeUndefined();
      expect(metrics[0]?.measurements).toBeUndefined();

      // Attempt to pass ONLY premium metric without weight: throws fail-closed
      expect(() => {
        useBodyMetricStore.getState().addMetric({
          recordedAt: new Date(),
          bodyFatPercentage: 14.2,
        });
      }).toThrow('PREMIUM_METRIC_LOCKED');

      // PRO allows saving all metrics
      entitlementService.setMockTier('pro');
      useBodyMetricStore.getState().addMetric({
        weightKg: 81.0,
        recordedAt: new Date(),
        bodyFatPercentage: 14.0,
        measurements: { waist: 81, chest: 105 },
      });

      const proMetrics = useBodyMetricStore.getState().metrics;
      expect(proMetrics.length).toBe(2);
      expect(proMetrics[0]?.bodyFatPercentage).toBe(14.0);
      expect(proMetrics[0]?.measurements?.waist).toBe(81);
    });
  });

  describe('Phase 7 & 11: Appearance Downgrade Preservation & Restoration', () => {
    it('Downgrade from PRO safely reverts to FREE appearance while saving selection, and restores on re-upgrade', () => {
      entitlementService.setMockTier('pro');
      useProfileStore.getState().updateProfile({ colorway: 'crimson' });
      expect(useProfileStore.getState().profile.colorway).toBe('crimson');

      // Downgrade to FREE
      entitlementService.setMockTier('free');

      // Active colorway becomes glacier (dark fallback) and savedPremiumColorway stores crimson
      expect(useProfileStore.getState().profile.colorway).toBe('glacier');
      expect(useProfileStore.getState().profile.savedPremiumColorway).toBe('crimson');

      // Re-upgrade to PRO restores crimson
      entitlementService.setMockTier('pro');
      expect(useProfileStore.getState().profile.colorway).toBe('crimson');
      expect(useProfileStore.getState().profile.savedPremiumColorway).toBeUndefined();
    });

    it('Titanium remains available to PRO and is preserved on downgrade to FREE', () => {
      entitlementService.setMockTier('coach');
      useProfileStore.getState().updateProfile({ colorway: 'titanium' });
      expect(useProfileStore.getState().profile.colorway).toBe('titanium');

      // Every ordinary premium colorway is included in PRO.
      entitlementService.setMockTier('pro');
      expect(useProfileStore.getState().profile.colorway).toBe('titanium');
      entitlementService.setMockTier('free');
      expect(useProfileStore.getState().profile.colorway).toBe('glacier');
      expect(useProfileStore.getState().profile.savedPremiumColorway).toBe('titanium');

      // Re-upgrade to COACH restores titanium
      entitlementService.setMockTier('coach');
      expect(useProfileStore.getState().profile.colorway).toBe('titanium');
    });
  });

  describe('Phase 8 & 9: Coach Access & AI Write Confirmation Guard', () => {
    it('FREE cannot send coach messages', async () => {
      entitlementService.setMockTier('free');
      await useCoachStore.getState().sendMessage('Hello coach');
      const state = useCoachStore.getState();
      expect(state.error).toContain('COACH_PREVIEW_LIMIT_REACHED');
    });

    it('PRO is blocked on Plan mode', async () => {
      entitlementService.setMockTier('pro');
      await useCoachStore.getState().sendMessage('Build plan', undefined, { mode: 'plan' });
      const state = useCoachStore.getState();
      expect(state.error).toContain('COACH_PLAN_LOCKED');
    });

    it('saveCoachPlan requires COACH tier and AI Write safety confirmation', () => {
      const defaultEx = EXERCISES[0]!;
      useExerciseStore.setState({ exercises: [defaultEx] });

      const msg: ChatMessage = {
        id: 'msg-ai-1',
        role: 'assistant',
        content: 'Generated Plan',
        createdAt: new Date(),
        plan: {
          name: 'AI Hypertrophy',
          kind: 'program',
          durationWeeks: 4,
          days: [
            {
              name: 'Day 1',
              exercises: [
                {
                  exerciseId: defaultEx.id,
                  sets: 3,
                  reps: 8,
                  repsMax: 10,
                  rir: 2,
                  restSeconds: 120,
                  notes: '',
                },
              ],
            },
          ],
        },
      };
      useCoachStore.setState({ messages: [msg] });

      // If user is FREE: throws fail-closed
      entitlementService.setMockTier('free');
      expect(() => saveCoachPlan('msg-ai-1')).toThrow('AI_WRITE_NOT_AUTHORIZED');

      // If user is PRO: throws fail-closed
      entitlementService.setMockTier('pro');
      expect(() => saveCoachPlan('msg-ai-1')).toThrow('AI_WRITE_NOT_AUTHORIZED');

      // If user is COACH: saves successfully
      entitlementService.setMockTier('coach');
      const savedIds = saveCoachPlan('msg-ai-1');
      expect(savedIds.length).toBeGreaterThan(0);
      expect(useProgramStore.getState().programs.length).toBe(1);
    });
  });
});
