import { act, renderHook } from '@testing-library/react-native';
import { useUnsavedEditorGuard } from '../useUnsavedEditorGuard';
const mockDispatch = jest.fn();
const mockConfirm = jest.fn();
let mockBeforeRemove: (event: { data: { action: object } }) => void;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ dispatch: mockDispatch }),
  usePreventRemove: (_dirty: boolean, callback: typeof mockBeforeRemove) => { mockBeforeRemove = callback; },
}));
jest.mock('@fitness-tracker/ui', () => ({ useDialog: () => ({ showConfirm: mockConfirm }) }));
beforeEach(() => { jest.clearAllMocks(); });
it('keeps an unsaved editor on cancelled edge swipe and dispatches only after confirmation', async () => {
  renderHook(() => useUnsavedEditorGuard(true, 'de'));
  const action = { type: 'GO_BACK' };
  mockConfirm.mockResolvedValueOnce(false);
  await act(async () => { mockBeforeRemove({ data: { action } }); });
  expect(mockDispatch).not.toHaveBeenCalled();
  mockConfirm.mockResolvedValueOnce(true);
  await act(async () => { mockBeforeRemove({ data: { action } }); });
  expect(mockDispatch).toHaveBeenCalledWith(action);
});
it('deduplicates repeated back taps and lets a successful save leave without another prompt', async () => {
  let resolve!: (answer: boolean) => void;
  mockConfirm.mockImplementation(() => new Promise<boolean>(done => { resolve = done; }));
  const { result } = renderHook(() => useUnsavedEditorGuard(true, 'de'));
  const leave = jest.fn();
  let first!: Promise<void>;
  act(() => { first = result.current.requestLeave(leave); void result.current.requestLeave(leave); });
  expect(mockConfirm).toHaveBeenCalledTimes(1);
  await act(async () => { resolve(false); await first; });
  act(() => result.current.allowLeave(leave));
  expect(leave).toHaveBeenCalledTimes(1);
  expect(mockConfirm).toHaveBeenCalledTimes(1);
});
