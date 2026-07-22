import { describe, it, expect } from 'vitest';
import {
  buildCartRows,
  bundleMainQtyUpdates,
  bundleMainRemoval,
  focPerSet,
  bundleSets,
  pricedBundleSets,
  pricedBundleTotal,
  pricedBundleUnit,
  pricedBundleQtyUpdates,
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

  it('groups lines sharing a bundle_id into one priced-bundle row', () => {
    const rows = buildCartRows([
      line({ id: 'x', normal_price: 60, bundle_id: 'B1', bundle_label: 'Set' }),
      line({ id: 'y', normal_price: 40, bundle_id: 'B1', bundle_label: 'Set' }),
      line({ id: 'z', normal_price: 25, product_name: 'Other' }),
    ]);
    const pb = rows.find(r => r.kind === 'priced-bundle');
    expect(pb).toBeTruthy();
    if (pb && pb.kind === 'priced-bundle') {
      expect(pb.label).toBe('Set');
      expect(pb.items.map(i => i.id).sort()).toEqual(['x', 'y']);
      expect(pricedBundleTotal(pb.items)).toBe(100);
      expect(pricedBundleSets(pb.items)).toBe(1);
      expect(pricedBundleUnit(pb.items)).toBe(100);
      expect(pricedBundleQtyUpdates(pb.items, 3)).toEqual([
        { id: 'x', quantity: 3 },
        { id: 'y', quantity: 3 },
      ]);
    }
    // The unrelated line stays single.
    expect(rows.some(r => r.kind === 'single')).toBe(true);
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

  it('only the trigger is a bundle main; paid copies + add-ons stand alone', () => {
    // Casing page: casing is the trigger, AL-19 is a free gift, and the user
    // also bought a paid AL-19 (same SKU) and a paid add-on. Only the casing
    // drives the bundle; the paid lines are separate single rows.
    const rows = buildCartRows([
      line({ id: 'casing', component_sku: 'K88', normal_price: 195, is_foc_trigger: true, product_name: 'P' }),
      line({ id: 'freeAL', component_sku: 'AL-19', normal_price: 0, is_foc: true, product_name: 'P' }),
      line({ id: 'paidAL', component_sku: 'AL-19', normal_price: 45, is_foc: false, product_name: 'P' }),
      line({ id: 'addon', component_sku: 'LHL-845', normal_price: 5, is_foc: false, product_name: 'P' }),
    ]);
    const bundle = rows.find(r => r.kind === 'bundle');
    expect(bundle && bundle.kind === 'bundle' && bundle.mains.map(m => m.id)).toEqual(['casing']);
    expect(bundle && bundle.kind === 'bundle' && bundle.freebies.map(f => f.id)).toEqual(['freeAL']);
    const singles = rows.filter(r => r.kind === 'single').map(r => (r as { item: { id: string } }).item.id).sort();
    expect(singles).toEqual(['addon', 'paidAL']);
  });

  it('two triggers sharing gifts are both mains; non-trigger paid is separate', () => {
    const rows = buildCartRows([
      line({ id: 'mainA', normal_price: 100, is_foc_trigger: true, product_name: 'P' }),
      line({ id: 'mainB', normal_price: 80, is_foc_trigger: true, product_name: 'P' }),
      line({ id: 'gift', normal_price: 0, is_foc: true, product_name: 'P' }),
      line({ id: 'addon', normal_price: 5, is_foc: false, product_name: 'P' }),
    ]);
    const bundle = rows.find(r => r.kind === 'bundle');
    expect(bundle && bundle.kind === 'bundle' && bundle.mains.map(m => m.id).sort()).toEqual(['mainA', 'mainB']);
    expect(rows.some(r => r.kind === 'single' && r.item.id === 'addon')).toBe(true);
  });

  it('falls back to non-gift-SKU paid lines as mains when no trigger is flagged', () => {
    // Legacy rows with no is_foc_trigger: a paid copy of the gift SKU is split
    // out, the genuine main stays the bundle main.
    const rows = buildCartRows([
      line({ id: 'casing', component_sku: 'K88', normal_price: 195, product_name: 'P' }),
      line({ id: 'freeAL', component_sku: 'AL-19', normal_price: 0, is_foc: true, product_name: 'P' }),
      line({ id: 'paidAL', component_sku: 'AL-19', normal_price: 45, product_name: 'P' }),
    ]);
    const bundle = rows.find(r => r.kind === 'bundle');
    expect(bundle && bundle.kind === 'bundle' && bundle.mains.map(m => m.id)).toEqual(['casing']);
    expect(rows.some(r => r.kind === 'single' && r.item.id === 'paidAL')).toBe(true);
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
