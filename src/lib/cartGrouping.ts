/**
 * Group cart items by seller for the Shopee-style multi-seller cart/checkout UI.
 *
 * Items where `vendor_id` is null/undefined are grouped under the AutoLab
 * in-house seller. Items with a vendor_id are grouped under that vendor.
 * Each group reports its display name and a stable sortable key.
 */

export type GroupableCartItem = {
  id: string;
  component_sku: string;
  name: string;
  normal_price: number;
  quantity: number;
  product_name: string;
  component_image?: string;
  /** True when this line is a free (FOC) gift rather than a paid purchase. */
  is_foc?: boolean;
  vendor_id?: string | null;
  vendor_name?: string | null;
};

export type CartSellerGroup<T extends GroupableCartItem> = {
  /** 'autolab' for in-house, otherwise the vendor_id */
  sellerKey: string;
  /** Display name — 'AutoLab' or the vendor business_name */
  sellerName: string;
  /** True when this group is an external vendor (vendor_id present) */
  isVendor: boolean;
  /** vendor_id when isVendor is true, else null */
  vendorId: string | null;
  /** Items belonging to this seller (preserves caller's order) */
  items: T[];
  /** Sum of (normal_price * quantity) across the group's items */
  subtotal: number;
};

/**
 * Group an array of cart items by seller. Returns groups in stable order:
 * AutoLab first (when present), then vendors sorted by business_name.
 */
export function groupCartItemsBySeller<T extends GroupableCartItem>(
  items: T[]
): CartSellerGroup<T>[] {
  const groups = new Map<string, CartSellerGroup<T>>();

  for (const item of items) {
    const vendorId = item.vendor_id ?? null;
    const sellerKey = vendorId ?? 'autolab';
    const sellerName = vendorId
      ? (item.vendor_name?.trim() || 'Vendor')
      : 'AutoLab';

    let group = groups.get(sellerKey);
    if (!group) {
      group = {
        sellerKey,
        sellerName,
        isVendor: !!vendorId,
        vendorId,
        items: [],
        subtotal: 0,
      };
      groups.set(sellerKey, group);
    }
    group.items.push(item);
    group.subtotal += (Number(item.normal_price) || 0) * (Number(item.quantity) || 0);
  }

  // Stable order: AutoLab first, then vendors alphabetically by name
  return Array.from(groups.values()).sort((a, b) => {
    if (a.sellerKey === 'autolab' && b.sellerKey !== 'autolab') return -1;
    if (b.sellerKey === 'autolab' && a.sellerKey !== 'autolab') return 1;
    return a.sellerName.localeCompare(b.sellerName);
  });
}
