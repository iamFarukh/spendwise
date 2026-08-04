import type {Category} from '@pfos/shared';

import {predictCategory} from '../predict-category';

const cats: Category[] = [
  {id: 'c1', name: 'Food', icon: '', color: ''},
  {id: 'c2', name: 'Transport', icon: '', color: ''},
] as Category[];

describe('predictCategory', () => {
  it('maps a known merchant to an existing category id', () => {
    expect(predictCategory('swiggy', cats)).toBe('c1');
    expect(predictCategory('uber', cats)).toBe('c2');
  });

  it('returns undefined when no keyword or no matching user category', () => {
    expect(predictCategory('unknownshop', cats)).toBeUndefined();
    expect(predictCategory('swiggy', [])).toBeUndefined();
    expect(predictCategory(undefined, cats)).toBeUndefined();
  });
});
