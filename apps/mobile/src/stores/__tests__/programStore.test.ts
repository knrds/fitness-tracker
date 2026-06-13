import { ProgramSchema, WorkoutTemplateSchema } from '@fitness-tracker/domain';

import { getDefaultPrograms, getDefaultTemplates, useProgramStore } from '../programStore';

let mockUuidCounter = 0;

const mockMakeUuid = () => {
  mockUuidCounter += 1;
  return `11111111-1111-4111-8111-${String(mockUuidCounter).padStart(12, '0')}`;
};

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => mockMakeUuid(),
}));

describe('programStore', () => {
  beforeEach(() => {
    mockUuidCounter = 0;
    // reset state manually since we don't have a reset function
    useProgramStore.setState({ programs: [], templates: [] });
  });

  it('creates a new program', () => {
    useProgramStore.getState().createProgram({ name: 'Test Program', durationWeeks: 8 });
    const state = useProgramStore.getState();
    expect(state.programs.length).toBe(1);
    expect(state.programs[0]!.name).toBe('Test Program');
    expect(state.programs[0]!.durationWeeks).toBe(8);
  });

  it('updates an existing program', () => {
    useProgramStore.getState().createProgram({ id: 'p1', name: 'Old Name' });
    useProgramStore.getState().updateProgram('p1', { name: 'New Name' });
    const state = useProgramStore.getState();
    expect(state.programs[0]!.name).toBe('New Name');
  });

  it('sets a program as active and inactivates others', () => {
    useProgramStore.getState().createProgram({ id: 'p1', name: 'P1' });
    useProgramStore.getState().createProgram({ id: 'p2', name: 'P2' });

    useProgramStore.getState().setActiveProgram('p1');
    expect(useProgramStore.getState().programs.find((p) => p.id === 'p1')?.isActive).toBe(true);
    expect(useProgramStore.getState().programs.find((p) => p.id === 'p2')?.isActive).toBe(false);

    useProgramStore.getState().setActiveProgram('p2');
    expect(useProgramStore.getState().programs.find((p) => p.id === 'p1')?.isActive).toBe(false);
    expect(useProgramStore.getState().programs.find((p) => p.id === 'p2')?.isActive).toBe(true);
  });

  it('creates and deletes a template', () => {
    useProgramStore.getState().createTemplate({ id: 't1', name: 'Test Template' });
    expect(useProgramStore.getState().templates.length).toBe(1);

    useProgramStore.getState().deleteTemplate('t1');
    expect(useProgramStore.getState().templates.length).toBe(0);
  });

  it('uses UUID-compatible IDs for seeded templates and programs', () => {
    getDefaultTemplates().forEach((template) => {
      expect(WorkoutTemplateSchema.safeParse(template).success).toBe(true);
    });

    getDefaultPrograms().forEach((program) => {
      expect(ProgramSchema.safeParse(program).success).toBe(true);
    });
  });
});
