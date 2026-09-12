import { useCoachStore } from '../coachStore';

// Mock coachApi functions
const mockStreamCoachResponse = jest.fn();
const mockCheckConnectivity = jest.fn().mockResolvedValue(true);

jest.mock('../../utils/coachApi', () => ({
  streamCoachResponse: (...args: unknown[]) => mockStreamCoachResponse(...args),
  checkConnectivity: () => mockCheckConnectivity(),
}));

describe('coachStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCoachStore.setState({
      messages: [],
      isSending: false,
      isOnline: true,
      error: null,
    });
  });

  it('should initialize with empty messages', () => {
    const state = useCoachStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.isSending).toBe(false);
    expect(state.isOnline).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should add user and assistant messages, and stream response', async () => {
    // Set up mock stream generator with delays so it doesn't resolve immediately
    async function* mockStream() {
      await new Promise((resolve) => setTimeout(resolve, 5));
      yield 'Hallo!';
      await new Promise((resolve) => setTimeout(resolve, 5));
      yield 'Wie kann ich';
      await new Promise((resolve) => setTimeout(resolve, 5));
      yield 'Wie kann ich dir helfen?';
    }
    mockStreamCoachResponse.mockReturnValue(mockStream());

    const storePromise = useCoachStore.getState().sendMessage('Hallo Coach!');

    // Wait a tick for the async call to checkConnectivity to resolve and set isSending to true
    await new Promise((resolve) => setTimeout(resolve, 0));

    const intermediateState = useCoachStore.getState();
    expect(intermediateState.isSending).toBe(true);
    expect(intermediateState.messages.length).toBe(2);
    expect(intermediateState.messages[0]?.role).toBe('user');
    expect(intermediateState.messages[0]?.content).toBe('Hallo Coach!');
    expect(intermediateState.messages[1]?.role).toBe('assistant');
    expect(intermediateState.messages[1]?.content).toBe('...');

    await storePromise;

    // After resolution, isSending should be false and content fully populated
    const finalState = useCoachStore.getState();
    expect(finalState.isSending).toBe(false);
    expect(finalState.messages.length).toBe(2);
    expect(finalState.messages[1]?.content).toBe('Wie kann ich dir helfen?');
  });

  it('should handle streaming failures gracefully', async () => {
    mockStreamCoachResponse.mockImplementation(() => {
      throw new Error('API failure');
    });

    await useCoachStore.getState().sendMessage('Force failure');

    const state = useCoachStore.getState();
    expect(state.isSending).toBe(false);
    expect(state.error).toBe('API failure');
    expect(state.messages.length).toBe(1);
    expect(state.messages[0]?.content).toBe('Force failure');
  });

  it('should clear chat history correctly', () => {
    useCoachStore.setState({
      messages: [
        { id: '1', role: 'user', content: 'Hi', createdAt: new Date() },
        { id: '2', role: 'assistant', content: 'Hello', createdAt: new Date() },
      ],
      error: 'Stale error',
    });

    useCoachStore.getState().clearChatHistory();

    const state = useCoachStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.error).toBeNull();
  });
});
