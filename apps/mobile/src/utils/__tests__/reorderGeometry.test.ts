import { getDropIndex, moveItem } from '../reorderGeometry';
const ids = ['a', 'b', 'c'];
const layouts = { a: { y: 0, height: 300 }, b: { y: 316, height: 90 }, c: { y: 422, height: 220 } };
it('uses actual centers of unequal cards rather than a fixed row height', () => {
  expect(getDropIndex(ids, layouts, 'a', 100)).toBe(0);
  expect(getDropIndex(ids, layouts, 'a', 220)).toBe(1);
  expect(getDropIndex(ids, layouts, 'a', 500)).toBe(2);
  expect(getDropIndex(ids, layouts, 'c', -450)).toBe(0);
});
it('clamps moves to measured list boundaries and preserves the original array', () => {
  expect(moveItem(ids, 0, 2)).toEqual(['b', 'c', 'a']);
  expect(ids).toEqual(['a', 'b', 'c']);
  expect(moveItem(ids, 0, 10)).toBe(ids);
  expect(getDropIndex(ids, layouts, 'b', 10000)).toBe(2);
});
