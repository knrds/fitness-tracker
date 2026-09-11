import { useCoachStore } from '../coachStore';
import {
  beginScopeChange,
  completeScopeChange,
  selectStoragePartition,
} from '../../data/storageScope';
import { withoutStorageWrites } from '../../data/storageTransaction';

const mockStream = jest.fn();
jest.mock('../../utils/coachApi', () => ({
  streamCoachResponse: () => mockStream(),
  checkConnectivity: async () => true,
}));

it('ignores old streamed coach content and preserves the next account request state', async () => {
  let release!: () => void;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const response = new Promise<void>((resolve) => {
    release = resolve;
  });
  mockStream.mockImplementation(async function* () {
    entered();
    await response;
    yield 'A private response';
  });
  await useCoachStore.persist.rehydrate();
  const sending = useCoachStore.getState().sendMessage('A private request');
  await started;
  const generation = beginScopeChange();
  selectStoragePartition('account:B', generation);
  completeScopeChange(generation);
  withoutStorageWrites(() =>
    useCoachStore.setState({ messages: [], isSending: true, error: null }),
  );
  release();
  await sending;
  expect(useCoachStore.getState().messages).toEqual([]);
  expect(useCoachStore.getState().isSending).toBe(true);
  expect(useCoachStore.getState().error).toBeNull();
});
