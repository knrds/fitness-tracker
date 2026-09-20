import { randomUUID } from '../uuid.web';

describe('web UUID on private HTTP previews', () => {
  const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const setCrypto = (value: unknown) =>
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value });

  afterEach(() => {
    if (originalCrypto) Object.defineProperty(globalThis, 'crypto', originalCrypto);
    else Reflect.deleteProperty(globalThis, 'crypto');
    jest.restoreAllMocks();
  });

  it('uses native browser randomUUID when available', () => {
    const uuid = '01234567-89ab-4cde-8fab-0123456789ab';
    setCrypto({ randomUUID: () => uuid });
    expect(randomUUID()).toBe(uuid);
  });

  it('creates RFC 4122 v4 IDs from secure bytes without randomUUID', () => {
    const fill = jest.fn((bytes: Uint8Array) => bytes.fill(255));
    setCrypto({ getRandomValues: fill });
    const weakRandom = jest.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Weak randomness forbidden');
    });
    expect(randomUUID()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
    expect(fill).toHaveBeenCalledTimes(1);
    expect(fill.mock.calls[0]?.[0]).toHaveLength(16);
    expect(weakRandom).not.toHaveBeenCalled();
  });

  it('preserves fresh entropy for every ID', () => {
    let counter = 0;
    setCrypto({ getRandomValues: (bytes: Uint8Array) => bytes.fill(counter++) });
    expect(randomUUID()).toBe('00000000-0000-4000-8000-000000000000');
    expect(randomUUID()).toBe('01010101-0101-4101-8101-010101010101');
  });

  it('fails closed when no cryptographic source exists', () => {
    setCrypto(undefined);
    expect(() => randomUUID()).toThrow('Secure random source unavailable');
  });

  it('propagates entropy-source failures instead of generating weak IDs', () => {
    setCrypto({
      getRandomValues: () => {
        throw new Error('entropy unavailable');
      },
    });
    expect(() => randomUUID()).toThrow('entropy unavailable');
  });
});
