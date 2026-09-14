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
    useProgramStore.setState({ programs: [], templates: [], customFolders: [] });
  });

  it('creates a new program', () => {
    useProgramStore.getState().createProgram({ name: 'Test Program', durationWeeks: 8 });
    const state = useProgramStore.getState();
    expect(state.programs.length).toBe(1);
    expect(state.programs[0]!.name).toBe('Test Program');
    expect(state.programs[0]!.durationWeeks).toBe(8);
  });
  it('prepends new programs and templates while preserving the existing manual order', () => {
    for (const name of ['A', 'B', 'C']) {
      useProgramStore.getState().createProgram({ name });
      useProgramStore.getState().createTemplate({ name });
    }
    const state = useProgramStore.getState();
    useProgramStore.getState().updateProgramsOrder([...state.programs].reverse());
    useProgramStore.getState().updateTemplatesOrder([...state.templates].reverse());
    useProgramStore.getState().createProgram({ name: 'New' });
    useProgramStore.getState().createTemplate({ name: 'New' });
    expect(useProgramStore.getState().programs.map((item) => item.name)).toEqual([
      'New',
      'A',
      'B',
      'C',
    ]);
    expect(useProgramStore.getState().templates.map((item) => item.name)).toEqual([
      'New',
      'A',
      'B',
      'C',
    ]);
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

  it('manages custom folders and template folder assignments', () => {
    const store = useProgramStore.getState();
    store.createFolder('PPL ARNOLD');
    store.createFolder('Upper Lower 5 Split');
    expect(useProgramStore.getState().customFolders).toEqual(['PPL ARNOLD', 'Upper Lower 5 Split']);

    // Duplicate folder should not be added
    useProgramStore.getState().createFolder('ppl arnold');
    expect(useProgramStore.getState().customFolders).toHaveLength(2);

    // Create templates with and without folder
    useProgramStore.getState().createTemplate({
      id: 't-arnold-1',
      name: 'Pull 1',
      folder: 'PPL ARNOLD',
    });
    useProgramStore.getState().createTemplate({
      id: 't-arnold-2',
      name: 'Push 2',
      folder: 'PPL ARNOLD',
    });
    useProgramStore.getState().createTemplate({
      id: 't-unassigned',
      name: 'Quick Warmup',
    });

    expect(useProgramStore.getState().templates.find((t) => t.id === 't-arnold-1')?.folder).toBe(
      'PPL ARNOLD',
    );
    expect(useProgramStore.getState().templates.find((t) => t.id === 't-unassigned')?.folder).toBeUndefined();

    // Assign template to a folder
    useProgramStore.getState().setTemplateFolder('t-unassigned', 'Upper Lower 5 Split');
    expect(useProgramStore.getState().templates.find((t) => t.id === 't-unassigned')?.folder).toBe(
      'Upper Lower 5 Split',
    );

    // Rename folder should update customFolders and assigned templates
    useProgramStore.getState().renameFolder('PPL ARNOLD', 'Arnold Classic Split');
    expect(useProgramStore.getState().customFolders).toContain('Arnold Classic Split');
    expect(useProgramStore.getState().customFolders).not.toContain('PPL ARNOLD');
    expect(useProgramStore.getState().templates.find((t) => t.id === 't-arnold-1')?.folder).toBe(
      'Arnold Classic Split',
    );

    // Delete folder removes folder and unassigns its templates
    useProgramStore.getState().deleteFolder('Arnold Classic Split');
    expect(useProgramStore.getState().customFolders).not.toContain('Arnold Classic Split');
    expect(useProgramStore.getState().templates.find((t) => t.id === 't-arnold-1')?.folder).toBeUndefined();
  });

  it('handles folder creation, deletion, and renaming case-insensitively without leaving ghost folders', () => {
    const store = useProgramStore.getState();
    store.createFolder('Test');
    expect(useProgramStore.getState().customFolders).toEqual(['Test']);

    // Prevent duplicate folder creation regardless of case or whitespace
    store.createFolder(' test ');
    store.createFolder('TEST');
    expect(useProgramStore.getState().customFolders).toEqual(['Test']);

    // Assign template to 'test'
    store.createTemplate({ id: 't-test-1', name: 'Workout 1', folder: 'test' });
    expect(useProgramStore.getState().templates.find((t) => t.id === 't-test-1')?.folder).toBe('Test');

    // Delete folder with different casing and whitespace
    store.deleteFolder('  test  ');
    expect(useProgramStore.getState().customFolders).toEqual([]);
    expect(useProgramStore.getState().templates.find((t) => t.id === 't-test-1')?.folder).toBeUndefined();

    // Re-create folder 'Test' and rename with case variation
    store.createFolder('Test');
    store.setTemplateFolder('t-test-1', 'Test');
    store.renameFolder('test', 'Test 2');
    expect(useProgramStore.getState().customFolders).toEqual(['Test 2']);
    expect(useProgramStore.getState().templates.find((t) => t.id === 't-test-1')?.folder).toBe('Test 2');

    // Clean up
    store.deleteFolder('TEST 2');
    expect(useProgramStore.getState().customFolders).toEqual([]);
    expect(useProgramStore.getState().templates.find((t) => t.id === 't-test-1')?.folder).toBeUndefined();
  });
});
