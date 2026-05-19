/**
 * SellerInvoice — print-friendly invoice for one seller's slice of an order.
 *
 * Renders the same printable invoice layout already used by MyOrders /
 * admin Orders, but parameterised so the same component can render either:
 *   - the full combined invoice (no `slice` provided),
 *   - the AutoLab slice of a multi-seller order, or
 *   - a single vendor's slice of a multi-seller order.
 *
 * Print is performed by the *parent* (window.print() on the modal that
 * wraps this component), keeping behaviour identical to the legacy modal.
 */

import { ringgitToWords, type InvoiceSlice } from '@/lib/orderInvoices';

export type InvoiceOrderShape = {
  order_no: string;
  customer_name: string | null;
  customer_phone?: string | null;
  delivery_address?: any;
  payment_state?: string | null;
  created_at: string;
  total: number | null;
  order_items: Array<{
    id: string;
    component_sku: string | null;
    component_name: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    vendor_id?: string | null;
  }>;
};

interface SellerInvoiceProps {
  /** The original order (for customer info, order_no, dates) */
  order: InvoiceOrderShape;
  /**
   * The seller's slice of the order. When omitted, the invoice falls back to
   * the original combined view: every item, the order's `total`, and AutoLab
   * as the seller. This preserves the legacy "combined invoice" behaviour.
   */
  slice?: InvoiceSlice;
}

/**
 * Pure presentational component — no event handlers, no dialogs. Wrap it in
 * a modal/print container in the consuming page.
 */
export function SellerInvoice({ order, slice }: SellerInvoiceProps) {
  // Either render the slice (per-seller) or fall back to the full combined invoice.
  const isVendorSlice = slice?.isVendor === true;
  const sellerName = slice?.sellerName ?? 'AutoLab';
  const itemsToRender = slice?.items ?? order.order_items ?? [];
  const itemsSubtotal =
    slice?.itemsSubtotal ??
    itemsToRender.reduce((s, i) => s + (Number(i.total_price) || 0), 0);
  const shippingFee = slice?.shippingFee ?? 0;
  const tax = slice?.tax ?? 0;
  const voucherDiscount = slice?.voucherDiscount ?? 0;
  const total = slice?.total ?? Number(order.total ?? itemsSubtotal);

  // Header company info — vendor invoices show the vendor's name; AutoLab
  // (or the legacy combined view) uses the AutoLab address block.
  const showAutolabBranding = !isVendorSlice;

  const minRows = 12;
  const fillerCount = Math.max(0, minRows - itemsToRender.length);

  const dateStr = new Date(order.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      style={{
        padding: '10px',
        fontFamily: 'Arial, sans-serif',
        width: '100%',
        margin: '0 auto',
        fontSize: '9px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '95vh',
      }}
    >
      {/* Top header */}
      <div style={{ flex: '0 0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <div>
            {showAutolabBranding ? (
              <>
                <h2 style={{ margin: '0', fontSize: '16px' }}>AUTO LABS SDN BHD</h2>
                <p style={{ margin: '2px 0', fontSize: '9px' }}>
                  17, Jalan 7/95B, Cheras Utama
                </p>
                <p style={{ margin: '2px 0', fontSize: '9px' }}>
                  56100 Cheras, Wilayah Persekutuan Kuala Lumpur
                </p>
                <p style={{ margin: '2px 0', fontSize: '9px' }}>Tel: 03-4297 7668</p>
              </>
            ) : (
              <>
                <h2 style={{ margin: '0', fontSize: '16px' }}>
                  {sellerName.toUpperCase()}
                </h2>
                <p style={{ margin: '2px 0', fontSize: '9px' }}>
                  Marketplace seller on AutoLab
                </p>
                <p style={{ margin: '2px 0', fontSize: '9px' }}>
                  Sold &amp; fulfilled by {sellerName}
                </p>
              </>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                border: '1px solid #000',
                padding: '5px 15px',
                display: 'inline-block',
              }}
            >
              <h2 style={{ margin: '0', textAlign: 'center', fontSize: '14px' }}>
                INVOICE
              </h2>
              <p style={{ margin: '3px 0', fontSize: '9px' }}>
                <strong>Order ID: </strong>
                {order.order_no}
              </p>
              {slice && (
                <p style={{ margin: '3px 0', fontSize: '9px' }}>
                  <strong>Seller: </strong>
                  {sellerName}
                </p>
              )}
            </div>
            <p style={{ margin: '5px 0 2px', fontSize: '9px' }}>
              <strong>Date: </strong>
              {dateStr}
            </p>
            <p style={{ margin: '2px 0', fontSize: '9px' }}>
              <strong>A/C Code: </strong>DMKT78C
            </p>
            <p style={{ margin: '2px 0', fontSize: '9px' }}>
              {order.payment_state === 'SUCCESS' ? (
                <>
                  <strong>Term: </strong>Cash /{' '}
                  <span style={{ textDecoration: 'line-through' }}>Credit</span>
                </>
              ) : (
                <>
                  <strong>Term: </strong>
                  <span style={{ textDecoration: 'line-through' }}>Cash</span> / Credit
                </>
              )}
            </p>
            <p style={{ margin: '2px 0', fontSize: '9px' }}>
              <strong>Salesman: </strong>TECH
            </p>
            <p style={{ margin: '2px 0', fontSize: '9px' }}>
              <strong>Served By: </strong>
              {isVendorSlice ? sellerName : 'HTL'}
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <p style={{ margin: '2px 0', fontSize: '9px' }}>
            <strong>Bill To: </strong>
            {order.customer_name}
          </p>
          <p style={{ margin: '2px 0', fontSize: '9px' }}>
            {order.delivery_address?.address || 'No address provided'}
          </p>
          <p style={{ margin: '2px 0', fontSize: '9px' }}>
            <strong>Attention: </strong>
            {order.customer_name}
          </p>
          <p style={{ margin: '2px 0', fontSize: '9px' }}>
            <strong>Tel: </strong>
            {order.customer_phone || 'N/A'}
          </p>
        </div>
      </div>

      {/* Items table */}
      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '5px',
          }}
        >
          <thead>
            <tr>
              <td colSpan={8} style={{ borderTop: '1px solid #000', padding: '0' }} />
            </tr>
            <tr>
              <th
                style={{
                  padding: '3px',
                  textAlign: 'left',
                  fontSize: '9px',
                  fontWeight: 'bold',
                }}
              >
                No.
              </th>
              <th
                style={{
                  padding: '3px',
                  textAlign: 'left',
                  fontSize: '9px',
                  fontWeight: 'bold',
                }}
              >
                Stock Code
              </th>
              <th
                style={{
                  padding: '3px',
                  textAlign: 'left',
                  fontSize: '9px',
                  fontWeight: 'bold',
                }}
              >
                Description
              </th>
              <th
                style={{
                  padding: '3px',
                  textAlign: 'center',
                  fontSize: '9px',
                  fontWeight: 'bold',
                }}
              >
                Qty
              </th>
              <th
                style={{
                  padding: '3px',
                  textAlign: 'center',
                  fontSize: '9px',
                  fontWeight: 'bold',
                }}
              >
                U.O.M
              </th>
              <th
                style={{
                  padding: '3px',
                  textAlign: 'right',
                  fontSize: '9px',
                  fontWeight: 'bold',
                }}
              >
                Unit Price
              </th>
              <th
                style={{
                  padding: '3px',
                  textAlign: 'right',
                  fontSize: '9px',
                  fontWeight: 'bold',
                }}
              >
                Discount
              </th>
              <th
                style={{
                  padding: '3px',
                  textAlign: 'right',
                  fontSize: '9px',
                  fontWeight: 'bold',
                }}
              >
                Amount
              </th>
            </tr>
            <tr>
              <td
                colSpan={8}
                style={{ borderBottom: '1px solid #000', padding: '0' }}
              />
            </tr>
          </thead>
          <tbody>
            {itemsToRender.map((item, index) => (
              <tr key={item.id}>
                <td style={{ fontSize: '9px', padding: '2px 3px' }}>{index + 1}</td>
                <td style={{ fontSize: '9px', padding: '2px 3px' }}>
                  {item.component_sku}
                </td>
                <td style={{ fontSize: '9px', padding: '2px 3px' }}>
                  {item.component_name}
                </td>
                <td
                  style={{ fontSize: '9px', textAlign: 'center', padding: '2px 3px' }}
                >
                  {item.quantity}
                </td>
                <td
                  style={{ fontSize: '9px', textAlign: 'center', padding: '2px 3px' }}
                >
                  Unit
                </td>
                <td
                  style={{ fontSize: '9px', textAlign: 'right', padding: '2px 3px' }}
                >
                  RM {Number(item.unit_price).toFixed(2)}
                </td>
                <td
                  style={{ fontSize: '9px', textAlign: 'center', padding: '2px 3px' }}
                />
                <td
                  style={{ fontSize: '9px', textAlign: 'right', padding: '2px 3px' }}
                >
                  RM {Number(item.total_price).toFixed(2)}
                </td>
              </tr>
            ))}
            {Array.from({ length: fillerCount }, (_, i) => (
              <tr key={`filler-${i}`}>
                <td colSpan={8} style={{ fontSize: '9px', padding: '2px 3px' }}>
                  &nbsp;
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals + footer */}
      <div style={{ flex: '0 0 auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '5px',
          }}
        >
          <tbody>
            {/* Per-slice breakdown (only when we actually have a slice) */}
            {slice && (
              <>
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: 'right',
                      padding: '3px',
                      fontSize: '9px',
                    }}
                  >
                    Subtotal
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '3px',
                      fontSize: '9px',
                    }}
                  >
                    RM {itemsSubtotal.toFixed(2)}
                  </td>
                </tr>
                {shippingFee > 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: 'right',
                        padding: '3px',
                        fontSize: '9px',
                      }}
                    >
                      Shipping / Delivery
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        padding: '3px',
                        fontSize: '9px',
                      }}
                    >
                      RM {shippingFee.toFixed(2)}
                    </td>
                  </tr>
                )}
                {tax > 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: 'right',
                        padding: '3px',
                        fontSize: '9px',
                      }}
                    >
                      SST
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        padding: '3px',
                        fontSize: '9px',
                      }}
                    >
                      RM {tax.toFixed(2)}
                    </td>
                  </tr>
                )}
                {voucherDiscount > 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: 'right',
                        padding: '3px',
                        fontSize: '9px',
                      }}
                    >
                      Voucher discount
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        padding: '3px',
                        fontSize: '9px',
                      }}
                    >
                      − RM {voucherDiscount.toFixed(2)}
                    </td>
                  </tr>
                )}
              </>
            )}
            <tr>
              <td
                colSpan={7}
                style={{
                  textAlign: 'right',
                  padding: '3px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                }}
              >
                TOTAL
              </td>
              <td
                style={{
                  textAlign: 'right',
                  padding: '3px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  borderTop: '1px solid #000',
                }}
              >
                RM {Number(total).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '5px' }}>
          <hr
            style={{ borderTop: '1px solid #000', borderBottom: 'none', margin: '0' }}
          />
          <p
            style={{ fontSize: '10px', margin: '5px 0', fontWeight: 'bold' }}
          >
            RINGGIT MALAYSIA {ringgitToWords(Number(total) || 0)} ONLY
          </p>
          <p style={{ fontSize: '9px', marginTop: '5px' }}>Note:</p>
          <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '8px' }}>
            {showAutolabBranding ? (
              <>
                <li>
                  Please issue all payment in the name of{' '}
                  <strong>AUTO LABS SDN BHD</strong>
                </li>
                <li>
                  All items remain the property of the company until fully paid
                </li>
                <li>No return or exchange of goods after inspection</li>
                <li>All prices are subject to 10% service tax</li>
                <li>
                  Stock borrowed for more than seven (7) days will be billed in
                  full of <strong>AUTO LABS SDN BHD</strong>
                </li>
              </>
            ) : (
              <>
                <li>
                  This invoice covers items sold &amp; fulfilled by{' '}
                  <strong>{sellerName}</strong>.
                </li>
                <li>
                  AutoLab platform fees, taxes and any voucher discounts are
                  billed separately on the AutoLab invoice for this order.
                </li>
                <li>
                  All items remain the property of <strong>{sellerName}</strong> until
                  fully paid.
                </li>
                <li>
                  Returns &amp; exchanges are handled directly by{' '}
                  <strong>{sellerName}</strong>.
                </li>
              </>
            )}
          </ol>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '20px',
          }}
        >
          <div>
            <p
              style={{
                borderTop: '1px solid #000',
                display: 'inline-block',
                paddingTop: '3px',
                fontSize: '9px',
              }}
            >
              Received By
            </p>
          </div>
          <div>
            <p
              style={{
                borderTop: '1px solid #000',
                display: 'inline-block',
                paddingTop: '3px',
                fontSize: '9px',
              }}
            >
              Company Chop &amp; Signature
            </p>
          </div>
        </div>
        <div
          style={{
            textAlign: 'center',
            marginTop: '10px',
            fontStyle: 'italic',
            fontSize: '8px',
          }}
        >
          <p>
            This is a computer generated copy.
            <br />
            No signature is required.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SellerInvoice;
