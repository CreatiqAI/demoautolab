/**
 * Per-seller invoice splitting for marketplace orders.
 *
 * A multi-seller order may contain items fulfilled by AutoLab (vendor_id IS NULL)
 * and/or by one or more external vendors. Each seller bills the customer for
 * their own slice. AutoLab also bears platform-level adjustments (delivery fee,
 * SST, voucher discount) on its slice; vendor slices are simple
 * "items + their shipping fee".
 *
 * The helper here is intentionally tolerant: it accepts the slightly different
 * order shapes produced by MyOrders / admin Orders / vendor Orders without
 * forcing them onto a single shared type.
 */

export type InvoiceSliceItem = {
  id: string;
  component_sku: string | null;
  component_name: string | null;
  product_context?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  vendor_id?: string | null;
};

export type InvoiceSliceFulfilment = {
  id: string;
  vendor_id: string;
  status?: string | null;
  tracking_number?: string | null;
  tracking_provider?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  shipping_fee?: number | null;
  notes?: string | null;
  vendors?: { id: string; business_name: string } | null;
} & Record<string, any>;

export type InvoiceSlice = {
  /** 'autolab' for the AutoLab-fulfilled portion, otherwise the vendor_id */
  sellerKey: string;
  /** Display name — 'AutoLab' or the vendor business_name */
  sellerName: string;
  /** True when the slice belongs to an external vendor */
  isVendor: boolean;
  /** Items belonging to this seller */
  items: InvoiceSliceItem[];
  /** Sum of total_price across the slice's items */
  itemsSubtotal: number;
  /** Shipping fee billed by this seller (vendor: per-fulfilment fee, AutoLab: platform delivery_fee) */
  shippingFee: number;
  /** Voucher / discount applied to this slice (only the AutoLab slice carries this) */
  voucherDiscount: number;
  /** SST / tax applied to this slice (only the AutoLab slice carries this) */
  tax: number;
  /** Final total billed by this seller */
  total: number;
  /** For vendor slices, the matching vendor_fulfilments row (if any) */
  fulfilment?: InvoiceSliceFulfilment;
};

export type SplittableOrder = {
  order_items?: InvoiceSliceItem[] | null;
  vendor_fulfilments?: InvoiceSliceFulfilment[] | null;
  delivery_fee?: number | null;
  shipping_fee?: number | null;
  tax?: number | null;
  voucher_discount?: number | null;
  discount?: number | null;
  total?: number | null;
  subtotal?: number | null;
} & Record<string, any>;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Split an order into one invoice slice per seller.
 *
 * Returns slices in a stable order: AutoLab first (when present), then each
 * vendor sorted by business_name.
 */
export function splitOrderBySeller(order: SplittableOrder): InvoiceSlice[] {
  const items = order?.order_items ?? [];
  const fulfilments = order?.vendor_fulfilments ?? [];

  const fulfilmentByVendor = new Map<string, InvoiceSliceFulfilment>();
  for (const f of fulfilments) {
    if (f?.vendor_id) fulfilmentByVendor.set(f.vendor_id, f);
  }

  // Group items by seller key
  const groups = new Map<string, InvoiceSliceItem[]>();
  for (const item of items) {
    const key = item?.vendor_id ? item.vendor_id : 'autolab';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  // If there are vendor fulfilments without items (rare but defensive), still
  // include them as empty slices so the vendor sees their fulfilment row.
  for (const f of fulfilments) {
    if (f?.vendor_id && !groups.has(f.vendor_id)) {
      groups.set(f.vendor_id, []);
    }
  }

  const slices: InvoiceSlice[] = [];

  // AutoLab slice (always include if AutoLab has items, even if total is zero)
  const autolabItems = groups.get('autolab') ?? [];
  if (autolabItems.length > 0) {
    const itemsSubtotal = round2(
      autolabItems.reduce((s, i) => s + (Number(i.total_price) || 0), 0),
    );
    const shippingFee = round2(
      Number(order?.delivery_fee ?? order?.shipping_fee ?? 0) || 0,
    );
    const tax = round2(Number(order?.tax ?? 0) || 0);
    const voucherDiscount = round2(
      Number(order?.voucher_discount ?? order?.discount ?? 0) || 0,
    );
    const total = round2(itemsSubtotal + shippingFee + tax - voucherDiscount);
    slices.push({
      sellerKey: 'autolab',
      sellerName: 'AutoLab',
      isVendor: false,
      items: autolabItems,
      itemsSubtotal,
      shippingFee,
      tax,
      voucherDiscount,
      total,
    });
  }

  // Vendor slices, sorted by business name for stability
  const vendorEntries = Array.from(groups.entries()).filter(
    ([k]) => k !== 'autolab',
  );
  vendorEntries.sort(([a], [b]) => {
    const an = fulfilmentByVendor.get(a)?.vendors?.business_name ?? a;
    const bn = fulfilmentByVendor.get(b)?.vendors?.business_name ?? b;
    return an.localeCompare(bn);
  });

  for (const [vendorId, vItems] of vendorEntries) {
    const fulfilment = fulfilmentByVendor.get(vendorId);
    const sellerName = fulfilment?.vendors?.business_name || 'Vendor';
    const itemsSubtotal = round2(
      vItems.reduce((s, i) => s + (Number(i.total_price) || 0), 0),
    );
    const shippingFee = round2(Number(fulfilment?.shipping_fee ?? 0) || 0);
    const total = round2(itemsSubtotal + shippingFee);
    slices.push({
      sellerKey: vendorId,
      sellerName,
      isVendor: true,
      items: vItems,
      itemsSubtotal,
      shippingFee,
      tax: 0,
      voucherDiscount: 0,
      total,
      fulfilment,
    });
  }

  return slices;
}

/** Convert a number into Malay Ringgit words (matches the existing
 *  convertToWords helpers in MyOrders / admin Orders verbatim). */
export function ringgitToWords(num: number): string {
  const ones = [
    '',
    'ONE',
    'TWO',
    'THREE',
    'FOUR',
    'FIVE',
    'SIX',
    'SEVEN',
    'EIGHT',
    'NINE',
    'TEN',
    'ELEVEN',
    'TWELVE',
    'THIRTEEN',
    'FOURTEEN',
    'FIFTEEN',
    'SIXTEEN',
    'SEVENTEEN',
    'EIGHTEEN',
    'NINETEEN',
  ];
  const tens = [
    '',
    '',
    'TWENTY',
    'THIRTY',
    'FORTY',
    'FIFTY',
    'SIXTY',
    'SEVENTY',
    'EIGHTY',
    'NINETY',
  ];

  if (num === 0) return 'ZERO';

  function convertLessThanOneThousand(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n] || '';
    const digit = n % 10;
    const ten = Math.floor(n / 10) % 10;
    const hundred = Math.floor(n / 100);
    let result = '';
    if (hundred > 0) result += (ones[hundred] || '') + ' HUNDRED ';
    const tensAndOnes = n % 100;
    if (tensAndOnes < 20 && tensAndOnes > 0) {
      result += ones[tensAndOnes] || '';
    } else {
      if (ten >= 2) result += tens[ten] || '';
      if (digit > 0) result += (ten >= 2 ? ' ' : '') + (ones[digit] || '');
    }
    return result.trim();
  }

  const wholeNum = Math.round(num);
  if (wholeNum === 0) return 'ZERO';
  const million = Math.floor(wholeNum / 1000000);
  const thousand = Math.floor((wholeNum % 1000000) / 1000);
  const remainder = wholeNum % 1000;
  let result = '';
  if (million > 0) {
    const p = convertLessThanOneThousand(million);
    if (p) result += p + ' MILLION ';
  }
  if (thousand > 0) {
    const p = convertLessThanOneThousand(thousand);
    if (p) result += p + ' THOUSAND ';
  }
  if (remainder > 0) {
    const p = convertLessThanOneThousand(remainder);
    if (p) result += p;
  }
  return result.trim() || 'ZERO';
}
