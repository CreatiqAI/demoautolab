import { describe, it, expect } from 'vitest';
import {
  buildCartRows,
  bundleMainQtyUpdates,
  bundleMainRemoval,
  focPerSet,
  bundleSets,
  type CartBundle,
} from '@/lib/cartBundles';
import type { GroupableCartItem } from '@/lib/cartGrouping';

// Minimal cart-line factory for the tests.
const line = (over: Partial<GroupableCartItem> & { id: string }): GroupableCartItem => ({
  component_sku: over.id,
  name: over.id,
  normal_price: 0,
  quantity: 1,
  product_name: 'P',
  ...over,
});

describe('buildCartRows', () => {
  it('keeps a plain product as single rows', () => {
    const rows = buildCartRows([
      line({ id: 'a', normal_price: 100, product_name: 'P1' }),
      line({ id: 'b', normal_price: 50, product_name: 'P2' }),
    ]);
    expect(rows.map(r => r.kind)).toEqual(['single', 'single']);
  });

  it('groups a product with paid mains + free gifts into one bundle', () => {
    const rows = buildCartRows([
      line({ id: 'main', normal_price: 100, product_name: 'P' }),
      line({ id: 'gift', normal_price: 0, product_name: 'P' }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe('bundle');
    if (rows[0].kind === 'bundle') {
      expect(rows[0].mains.map(m => m.id)).toEqual(['main']);
      expect(rows[0].freebies.map(f => f.id)).toEqual(['gift']);
    }
  });

  it('puts TWO mains that share gifts into the same bundle', () => {
    const rows = buildCartRows([
      line({ id: 'mainA', normal_price: 100, product_name: 'P' }),
      line({ id: 'mainB', normal_price: 80, product_name: 'P' }),
      line({ id: 'gift', normal_price: 0, product_name: 'P' }),
    ]);
    expect(rows).toHaveLength(1);
    if (rows[0].kind === 'bundle') {
      expect(rows[0].mains.map(m => m.id).sort()).toEqual(['mainA', 'mainB']);
      expect(rows[0].freebies.map(f => f.id)).toEqual(['gift']);
    }
  });

  it('treats a free item with no paid sibling as a single row', () => {
    const rows = buildCartRows([line({ id: 'orphan', normal_price: 0, product_name: 'P' })]);
    expect(rows).toEqual([{ kind: 'single', item: expect.objectContaining({ id: 'orphan' }) }]);
  });

  it('classifies by is_foc, not price: a paid copy of a gift component is a main', () => {
    // Same product holds the free gift (is_foc) AND a paid copy of it the user
    // chose to buy. The paid copy must be a main, not folded into the gifts.
    const rows = buildCartRows([
      line({ id: 'casing', normal_price: 195, is_foc: false, product_name: 'P' }),
      line({ id: 'gift', normal_price: 0, is_foc: true, product_name: 'P' }),
      line({ id: 'paidGift', normal_price: 45, is_foc: false, product_name: 'P' }),
    ]);
    expect(rows).toHaveLength(1);
    if (rows[0].kind === 'bundle') {
      expect(rows[0].mains.map(m => m.id).sort()).toEqual(['casing', 'paidGift']);
      expect(rows[0].freebies.map(f => f.id)).toEqual(['gift']);
    }
  });

  it('honours is_foc over a zero price (an explicit paid 0 line is a main)', () => {
    const rows = buildCartRows([
      line({ id: 'main', normal_price: 100, is_foc: false, product_name: 'P' }),
      line({ id: 'freebie0', normal_price: 0, is_foc: false, product_name: 'P' }),
    ]);
    // No is_foc gift here, so both are mains -> two single rows.
    expect(rows.every(r => r.kind === 'single')).toBe(true);
  });
});

describe('focPerSet / bundleSets', () => {
  it('recovers the per-set ratio and rounds drift away', () => {
    expect(focPerSet(2, 1)).toBe(2);
    expect(focPerSet(6, 3)).toBe(2);
    expect(focPerSet(5, 2)).toBe(3); // round(2.5) — never below 1
    expect(focPerSet(0, 5)).toBe(1); // floor is 1
  });

  it('sums main quantities with a floor of 1', () => {
    expect(bundleSets([line({ id: 'a', quantity: 2 }), line({ id: 'b', quantity: 3 })])).toBe(5);
    expect(bundleSets([])).toBe(1);
  });
});

describe('bundleMainQtyUpdates — single main', () => {
  it('scales one gift with the main quantity', () => {
    // foc_quantity = 2 per set: main 1 -> gift 2.
    const bundle: CartBundle<GroupableCartItem> = {
      mains: [line({ id: 'main', normal_price: 100, quantity: 1 })],
      freebies: [line({ id: 'gift', quantity: 2 })],
    };
    const updates = bundleMainQtyUpdates(bundle, 'main', 3);
    expect(updates).toEqual([
      { id: 'main', quantity: 3 },
      { id: 'gift', quantity: 6 }, // 2 per set × 3 sets
    ]);
  });

  it('clamps the new quantity to a minimum of 1', () => {
    const bundle: CartBundle<GroupableCartItem> = {
      mains: [line({ id: 'main', normal_price: 100, quantity: 2 })],
      freebies: [line({ id: 'gift', quantity: 2 })],
    };
    expect(bundleMainQtyUpdates(bundle, 'main', 0)[0]).toEqual({ id: 'main', quantity: 1 });
  });
});

describe('bundleMainQtyUpdates — two mains sharing gifts', () => {
  // Product page: gift = foc_quantity × (qtyA + qtyB). Here foc_quantity = 1,
  // qtyA = 2, qtyB = 3 -> gift = 5.
  const bundle: CartBundle<GroupableCartItem> = {
    mains: [
      line({ id: 'mainA', normal_price: 100, quantity: 2 }),
      line({ id: 'mainB', normal_price: 80, quantity: 3 }),
    ],
    freebies: [line({ id: 'gift', quantity: 5 })],
  };

  it('rescales the shared gift off the COMBINED main total when A changes', () => {
    // A: 2 -> 4, so sets = 4 + 3 = 7, gift = 1 × 7 = 7.
    const updates = bundleMainQtyUpdates(bundle, 'mainA', 4);
    expect(updates).toContainEqual({ id: 'mainA', quantity: 4 });
    expect(updates).toContainEqual({ id: 'gift', quantity: 7 });
    // The other main is left untouched.
    expect(updates.find(u => u.id === 'mainB')).toBeUndefined();
  });

  it('rescales when B changes too', () => {
    // B: 3 -> 1, sets = 2 + 1 = 3, gift = 3.
    const updates = bundleMainQtyUpdates(bundle, 'mainB', 1);
    expect(updates).toContainEqual({ id: 'mainB', quantity: 1 });
    expect(updates).toContainEqual({ id: 'gift', quantity: 3 });
  });
});

describe('bundleMainRemoval', () => {
  const bundle: CartBundle<GroupableCartItem> = {
    mains: [
      line({ id: 'mainA', normal_price: 100, quantity: 2 }),
      line({ id: 'mainB', normal_price: 80, quantity: 3 }),
    ],
    freebies: [line({ id: 'gift', quantity: 5 })],
  };

  it('rescales gifts to the remaining mains when one main is removed', () => {
    // Remove A -> only B (qty 3) remains, gift = 1 × 3 = 3.
    const { removeIds, updates } = bundleMainRemoval(bundle, 'mainA');
    expect(removeIds).toEqual(['mainA']);
    expect(updates).toEqual([{ id: 'gift', quantity: 3 }]);
  });

  it('removes the gifts too when the last main is removed', () => {
    const single: CartBundle<GroupableCartItem> = {
      mains: [line({ id: 'main', normal_price: 100, quantity: 1 })],
      freebies: [line({ id: 'g1', quantity: 1 }), line({ id: 'g2', quantity: 2 })],
    };
    const { removeIds, updates } = bundleMainRemoval(single, 'main');
    expect(removeIds.sort()).toEqual(['g1', 'g2', 'main']);
    expect(updates).toEqual([]);
  });
});
