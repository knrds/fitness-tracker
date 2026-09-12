import { parseDecimalInput } from '../decimalInput';
describe('decimal keyboard values', () => {
  it('keeps the fractional measurement on comma keyboards', () => {
    expect(parseDecimalInput('101,5')).toBe(101.5);
    expect(parseDecimalInput(' 101.5 ')).toBe(101.5);
    expect(parseDecimalInput('0')).toBe(0);
  });
  it('rejects incomplete or malformed values rather than storing a truncated value', () => {
    for (const value of ['', '10 kg', '1,2,3', 'Infinity', '-1'])
      expect(parseDecimalInput(value)).toBeNaN();
  });
});
