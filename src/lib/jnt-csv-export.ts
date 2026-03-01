/**
 * J&T Express CSV Export Utility
 *
 * Generates CSV files in J&T Express business portal format
 * for bulk shipment booking.
 *
 * J&T Express CSV Format (Malaysia):
 * - Sender Name, Sender Phone, Sender Address
 * - Receiver Name, Receiver Phone, Receiver Address
 * - Item Description, Weight, Quantity, COD Amount
 */

export interface JNTOrderData {
  id: string;
  order_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  delivery_address: {
    address?: string;
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  total: number;
  payment_state: string;
  order_items: Array<{
    component_name: string;
    quantity: number;
    unit_price: number;
  }>;
}

export interface JNTSenderInfo {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
}

// Default sender info (Auto Labs)
export const DEFAULT_SENDER: JNTSenderInfo = {
  name: 'AUTO LABS SDN BHD',
  phone: '03-4297 7668',
  address: '17, Jalan 7/95B, Cheras Utama',
  city: 'Cheras',
  state: 'Wilayah Persekutuan Kuala Lumpur',
  postcode: '56100'
};

/**
 * Format address from order data
 */
function formatAddress(address: JNTOrderData['delivery_address']): string {
  if (!address) return '';

  if (address.address) {
    return address.address;
  }

  const parts = [
    address.street,
    address.city,
    address.state,
    address.postcode
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Get item description from order items
 */
function getItemDescription(items: JNTOrderData['order_items']): string {
  if (!items || items.length === 0) return 'Auto Parts';

  if (items.length === 1) {
    return items[0].component_name;
  }

  return `${items[0].component_name} + ${items.length - 1} more`;
}

/**
 * Calculate total quantity from order items
 */
function getTotalQuantity(items: JNTOrderData['order_items']): number {
  if (!items) return 1;
  return items.reduce((sum, item) => sum + (item.quantity || 1), 0);
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';

  const str = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generate J&T Express CSV content
 *
 * CSV Columns (J&T Malaysia Business Portal format):
 * 1. Sender Name
 * 2. Sender Phone
 * 3. Sender Address
 * 4. Sender City
 * 5. Sender State
 * 6. Sender Postcode
 * 7. Receiver Name
 * 8. Receiver Phone
 * 9. Receiver Address
 * 10. Receiver City
 * 11. Receiver State
 * 12. Receiver Postcode
 * 13. Item Description
 * 14. Weight (kg)
 * 15. Quantity
 * 16. COD Amount (0 if prepaid)
 * 17. Reference No (Order ID)
 * 18. Remarks
 */
export function generateJNTCSV(
  orders: JNTOrderData[],
  sender: JNTSenderInfo = DEFAULT_SENDER,
  estimatedWeightKg: number = 1.0
): string {
  // CSV Header
  const headers = [
    'Sender Name',
    'Sender Phone',
    'Sender Address',
    'Sender City',
    'Sender State',
    'Sender Postcode',
    'Receiver Name',
    'Receiver Phone',
    'Receiver Address',
    'Receiver City',
    'Receiver State',
    'Receiver Postcode',
    'Item Description',
    'Weight (kg)',
    'Quantity',
    'COD Amount',
    'Reference No',
    'Remarks'
  ];

  const rows: string[] = [headers.map(escapeCSV).join(',')];

  for (const order of orders) {
    const isCOD = order.payment_state !== 'SUCCESS' && order.payment_state !== 'APPROVED';
    const codAmount = isCOD ? order.total : 0;

    const receiverAddress = order.delivery_address || {};

    const row = [
      sender.name,
      sender.phone,
      sender.address,
      sender.city,
      sender.state,
      sender.postcode,
      order.customer_name,
      order.customer_phone || '',
      formatAddress(receiverAddress),
      receiverAddress.city || '',
      receiverAddress.state || '',
      receiverAddress.postcode || '',
      getItemDescription(order.order_items),
      estimatedWeightKg.toFixed(2),
      getTotalQuantity(order.order_items),
      codAmount.toFixed(2),
      order.order_no,
      `Order ${order.order_no}`
    ];

    rows.push(row.map(escapeCSV).join(','));
  }

  return rows.join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Export orders to J&T Express CSV and trigger download
 */
export function exportToJNT(
  orders: JNTOrderData[],
  sender?: JNTSenderInfo
): void {
  if (orders.length === 0) {
    throw new Error('No orders to export');
  }

  const csv = generateJNTCSV(orders, sender);
  const date = new Date().toISOString().split('T')[0];
  const filename = `JNT-Shipment-${date}-${orders.length}orders.csv`;

  downloadCSV(csv, filename);
}

/**
 * Generate Lalamove CSV format (simplified)
 * Lalamove typically uses API, but this can be used for manual booking reference
 */
export function generateLalamoveCSV(orders: JNTOrderData[]): string {
  const headers = [
    'Order ID',
    'Pickup Address',
    'Delivery Address',
    'Recipient Name',
    'Recipient Phone',
    'Item Description',
    'COD Amount'
  ];

  const rows: string[] = [headers.map(escapeCSV).join(',')];

  for (const order of orders) {
    const isCOD = order.payment_state !== 'SUCCESS' && order.payment_state !== 'APPROVED';

    const row = [
      order.order_no,
      `${DEFAULT_SENDER.address}, ${DEFAULT_SENDER.city} ${DEFAULT_SENDER.postcode}`,
      formatAddress(order.delivery_address),
      order.customer_name,
      order.customer_phone || '',
      getItemDescription(order.order_items),
      isCOD ? order.total.toFixed(2) : '0.00'
    ];

    rows.push(row.map(escapeCSV).join(','));
  }

  return rows.join('\n');
}

/**
 * Export orders to Lalamove CSV format
 */
export function exportToLalamove(orders: JNTOrderData[]): void {
  if (orders.length === 0) {
    throw new Error('No orders to export');
  }

  const csv = generateLalamoveCSV(orders);
  const date = new Date().toISOString().split('T')[0];
  const filename = `Lalamove-${date}-${orders.length}orders.csv`;

  downloadCSV(csv, filename);
}

// Type for navigator with msSaveBlob (IE support)
declare global {
  interface Navigator {
    msSaveBlob?: (blob: Blob, defaultName?: string) => boolean;
  }
}
