/**
 * FOC (free-of-charge) bundle helpers for the cart.
 *
 * A product can ship one or more free gifts (stored in the cart as ordinary
 * line items with `normal_price === 0`) alongside one OR MORE paid "main" items
 * from the same product. The gifts are shared across all of that product's main
 * items: the number of free units scales with the COMBINED quantity of the
 * mains — matching the product page, where the gift quantity is
 * `foc_quantity × (sum of every trigger item's quantity)`.
 *
 * The cart itself stores no FOC metadata (only price === 0 marks a gift), so the
 * per-set ratio is recovered from the current quantities, which were set
 * consistently when the bundle was added. Scaling stays whole and self-correcting.
 */

import type { GroupableCartItem } from './cartGrouping';

export type CartBundle<T extends GroupableCartItem> = {
  /** Paid main items of the product; the gifts scale with their combined qty. */
  mains: T[];
  /** Shared FOC free-gift lines (normal_price === 0). */
  freebies: T[];
};

/** A display row: a plain line, a FOC bundle (mains + shared gifts), or a priced
 *  "buy the whole set" bundle (its member lines shown under one fixed price). */
export type CartRow<T extends GroupableCartItem> =
  | { kind: 'single'; item: T }
  | { kind: 'bundle'; mains: T[]; freebies: T[] }
  | { kind: 'priced-bundle'; bundleId: string; label: string; items: T[] };

export type QtyUpdate = { id: string; quantity: number };

/**
 * Whether a cart line is a free (FOC) gift. Uses the persisted `is_foc` flag,
 * falling back to price for legacy lines that predate the flag. A paid purchase
 * of a component that is *also* a gift elsewhere has is_foc === false, so it is
 * treated as a normal main, not a gift.
 */
export function isFreeGift<T extends GroupableCartItem>(item: T): boolean {
  return item.is_foc ?? item.normal_price === 0;
}

/**
 * Group a flat list of cart items into display rows. A product that has both
 * paid items and free gifts becomes one `bundle` row (all its mains + all its
 * gifts). Everything else becomes its own `single` row. First-seen order kept.
 */
export function buildCartRows<T extends GroupableCartItem>(items: T[]): CartRow<T>[] {
  const rows: CartRow<T>[] = [];

  // First, pull out priced-bundle lines (they share a bundle_id) and emit one
  // grouped row per bundle. These are excluded from the FOC/product grouping below.
  const pricedBundles = new Map<string, T[]>();
  const rest: T[] = [];
  for (const item of items) {
    const bid = item.bundle_id;
    if (bid) {
      const list = pricedBundles.get(bid) ?? [];
      list.push(item);
      pricedBundles.set(bid, list);
    } else {
      rest.push(item);
    }
  }
  for (const [bundleId, members] of pricedBundles) {
    rows.push({
      kind: 'priced-bundle',
      bundleId,
      label: members.find((m) => m.bundle_label)?.bundle_label || 'Bundle',
      items: members,
    });
  }

  const byProduct = new Map<string, T[]>();
  for (const item of rest) {
    const list = byProduct.get(item.product_name) ?? [];
    list.push(item);
    byProduct.set(item.product_name, list);
  }
  for (const list of byProduct.values()) {
    const freebies = list.filter((i) => isFreeGift(i));
    const paid = list.filter((i) => !isFreeGift(i));

    // No gifts, or nothing paid to anchor them -> plain lines.
    if (freebies.length === 0 || paid.length === 0) {
      for (const item of list) rows.push({ kind: 'single', item });
      continue;
    }

    // Only the FOC trigger(s) are the bundle's mains. Any other paid line — a
    // paid copy of a gift component, or an unrelated add-on bought from the same
    // product page — stands on its own, so its quantity never scales the gifts.
    const triggers = paid.filter((i) => i.is_foc_trigger);
    let mains: T[];
    let others: T[];
    if (triggers.length > 0) {
      mains = triggers;
      others = paid.filter((i) => !i.is_foc_trigger);
    } else {
      // Legacy / fallback rows with no explicit trigger: only pull a paid line
      // out of the bundle when it is a paid copy of one of the gift components.
      const giftSkus = new Set(freebies.map((g) => g.component_sku));
      mains = paid.filter((i) => !giftSkus.has(i.component_sku));
      others = paid.filter((i) => giftSkus.has(i.component_sku));
      if (mains.length === 0) {
        mains = paid;
        others = [];
      }
    }

    rows.push({ kind: 'bundle', mains, freebies });
    for (const item of others) rows.push({ kind: 'single', item });
  }
  return rows;
}

/** Combined "set" count of a bundle = sum of its main quantities (min 1). */
export function bundleSets<T extends GroupableCartItem>(mains: T[]): number {
  return Math.max(1, mains.reduce((sum, m) => sum + m.quantity, 0));
}

/**
 * Free units granted per set, recovered from a gift's current quantity and the
 * current total sets (so it stays whole and survives small drift).
 */
export function focPerSet(freeQty: number, sets: number): number {
  return Math.max(1, Math.round(freeQty / Math.max(1, sets)));
}

/**
 * Quantity updates to apply when one main item's quantity changes: the main
 * itself, plus every shared gift rescaled to the bundle's new combined sets.
 */
export function bundleMainQtyUpdates<T extends GroupableCartItem>(
  bundle: CartBundle<T>,
  mainId: string,
  newMainQty: number,
): QtyUpdate[] {
  const qty = Math.max(1, Math.round(newMainQty));
  const oldSets = bundleSets(bundle.mains);
  const newSets = Math.max(
    1,
    bundle.mains.reduce((sum, m) => sum + (m.id === mainId ? qty : m.quantity), 0),
  );
  const updates: QtyUpdate[] = [{ id: mainId, quantity: qty }];
  for (const f of bundle.freebies) {
    updates.push({ id: f.id, quantity: focPerSet(f.quantity, oldSets) * newSets });
  }
  return updates;
}

/**
 * Effect of removing one main item from a bundle: if other mains remain, the
 * gifts rescale to the smaller combined sets; if it was the last main, the gifts
 * are removed too (a gift can't stand alone).
 */
export function bundleMainRemoval<T extends GroupableCartItem>(
  bundle: CartBundle<T>,
  mainId: string,
): { removeIds: string[]; updates: QtyUpdate[] } {
  const remaining = bundle.mains.filter((m) => m.id !== mainId);
  if (remaining.length === 0) {
    return { removeIds: [mainId, ...bundle.freebies.map((f) => f.id)], updates: [] };
  }
  const oldSets = bundleSets(bundle.mains);
  const newSets = bundleSets(remaining);
  const updates = bundle.freebies.map((f) => ({
    id: f.id,
    quantity: focPerSet(f.quantity, oldSets) * newSets,
  }));
  return { removeIds: [mainId], updates };
}

// ---------------------------------------------------------------------------
// Priced "buy the whole set" bundles: all member lines share a bundle_id and
// move together — one price, one quantity, removed as a unit.
// ---------------------------------------------------------------------------

/** Number of bundle sets = the (equal) per-member quantity; min guards drift. */
export function pricedBundleSets<T extends GroupableCartItem>(items: T[]): number {
  if (items.length === 0) return 0;
  return Math.max(1, Math.min(...items.map((i) => i.quantity)));
}

/** Total price of one bundle row = sum of its member line prices. */
export function pricedBundleTotal<T extends GroupableCartItem>(items: T[]): number {
  return items.reduce((sum, i) => sum + (Number(i.normal_price) || 0) * (Number(i.quantity) || 0), 0);
}

/** Per-set price = the bundle total divided by the current number of sets. */
export function pricedBundleUnit<T extends GroupableCartItem>(items: T[]): number {
  const sets = pricedBundleSets(items);
  return sets > 0 ? pricedBundleTotal(items) / sets : pricedBundleTotal(items);
}

/** Qty updates to set every member of the bundle to the same new set count. */
export function pricedBundleQtyUpdates<T extends GroupableCartItem>(
  items: T[],
  newSets: number,
): QtyUpdate[] {
  const qty = Math.max(1, Math.round(newSets));
  return items.map((i) => ({ id: i.id, quantity: qty }));
}
