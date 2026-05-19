import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCurrentVendor } from '@/lib/vendorAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  Wallet, Loader2, ArrowDownCircle, Receipt, ExternalLink, TrendingUp,
  Banknote, FileText, Calendar, CheckCircle2, Clock, Ban, AlertTriangle,
  ArrowUpCircle, Minus, Inbox,
} from 'lucide-react';

interface LedgerRow {
  id: string;
  vendor_id: string;
  order_id: string | null;
  order_item_id: string | null;
  type: 'SALE' | 'REFUND' | 'ADJUSTMENT' | 'PAYOUT';
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  net_amount: number;
  payout_id: string | null;
  notes: string | null;
  created_at: string;
}

interface PayoutRow {
  id: string;
  vendor_id: string;
  period_start: string;
  period_end: string;
  gross_sales: number;
  commission_amount: number;
  refund_deductions: number;
  net_payable: number;
  status: 'PENDING' | 'PAID' | 'HOLD' | 'CANCELLED';
  paid_at: string | null;
  payment_reference: string | null;
  payment_slip_url: string | null;
  notes: string | null;
  created_at: string;
}

const formatRM = (n: number) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(Number(n) || 0);

const formatDate = (s: string | null | undefined): string => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTime = (s: string | null | undefined): string => {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format a payout period (period_start through period_end inclusive).
 * - When the range covers exactly one calendar month → "March 2026"
 * - When same year → "1 Mar – 31 Mar 2026"
 * - Otherwise → "27 Dec 2025 – 3 Jan 2026"
 */
function formatPeriod(startIso: string | null | undefined, endIso: string | null | undefined): {
  primary: string;
  secondary: string;
} {
  if (!startIso || !endIso) return { primary: '—', secondary: '' };
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { primary: '—', secondary: '' };
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  // Detect "covers a full calendar month" (start = day 1, end >= last day of that month).
  // We treat period_end as the last day of the period (inclusive) per the typical schema.
  const isMonthStart = start.getDate() === 1;
  const lastDayOfStartMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const endsOnOrAfterMonthLast = sameMonth && end.getDate() >= lastDayOfStartMonth;

  if (isMonthStart && endsOnOrAfterMonthLast) {
    return {
      primary: start.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' }),
      secondary: `${formatDate(startIso)} – ${formatDate(endIso)}`,
    };
  }

  if (sameYear) {
    const startStr = start.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
    const endStr = end.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
    return {
      primary: `${startStr} – ${endStr}`,
      secondary: '',
    };
  }

  return {
    primary: `${formatDate(startIso)} – ${formatDate(endIso)}`,
    secondary: '',
  };
}

const currentMonthIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Build a list of the last N months (newest first) for the month picker.
// Returns [{ value: 'YYYY-MM', label: 'May 2026' }, ...]
const buildMonthOptions = (count: number): Array<{ value: string; label: string }> => {
  const out: Array<{ value: string; label: string }> = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
    out.push({ value, label });
  }
  return out;
};

// Convert "YYYY-MM" to [start, endExclusive) in local time, ISO strings.
const monthRange = (yyyymm: string): { startIso: string; endIso: string } => {
  const [y, m] = yyyymm.split('-').map(Number);
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 1, 0, 0, 0, 0);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
};

const TYPE_META: Record<LedgerRow['type'], { label: string; classes: string; Icon: typeof TrendingUp }> = {
  SALE: {
    label: 'Sale',
    classes: 'bg-green-100 text-green-700 border-green-200',
    Icon: ArrowUpCircle,
  },
  REFUND: {
    label: 'Refund',
    classes: 'bg-red-100 text-red-700 border-red-200',
    Icon: ArrowDownCircle,
  },
  ADJUSTMENT: {
    label: 'Adjustment',
    classes: 'bg-amber-100 text-amber-700 border-amber-200',
    Icon: Minus,
  },
  PAYOUT: {
    label: 'Payout',
    classes: 'bg-blue-100 text-blue-700 border-blue-200',
    Icon: Banknote,
  },
};

function TypeChip({ type }: { type: LedgerRow['type'] }) {
  const meta = TYPE_META[type];
  const Icon = meta.Icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        meta.classes,
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

const PAYOUT_STATUS_META: Record<PayoutRow['status'], { label: string; classes: string; Icon: typeof Clock }> = {
  PAID: {
    label: 'Paid',
    classes: 'bg-green-100 text-green-700 border-green-200',
    Icon: CheckCircle2,
  },
  PENDING: {
    label: 'Pending',
    classes: 'bg-amber-100 text-amber-700 border-amber-200',
    Icon: Clock,
  },
  HOLD: {
    label: 'On hold',
    classes: 'bg-orange-100 text-orange-700 border-orange-200',
    Icon: AlertTriangle,
  },
  CANCELLED: {
    label: 'Cancelled',
    classes: 'bg-gray-100 text-gray-700 border-gray-200',
    Icon: Ban,
  },
};

function PayoutStatusBadge({ status }: { status: PayoutRow['status'] }) {
  const meta = PAYOUT_STATUS_META[status];
  const Icon = meta.Icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
        meta.classes,
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

export default function VendorPayouts() {
  const { vendor } = useCurrentVendor();
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState<string>(currentMonthIso());

  useEffect(() => {
    if (!vendor?.id) return;
    void loadAll(vendor.id);
  }, [vendor?.id]);

  const loadAll = async (vendorId: string) => {
    setLoading(true);
    try {
      const [{ data: ledgerData }, { data: payoutData }] = await Promise.all([
        supabase
          .from('vendor_sales_ledger' as any)
          .select('*')
          .eq('vendor_id', vendorId)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('vendor_payouts' as any)
          .select('*')
          .eq('vendor_id', vendorId)
          .order('period_end', { ascending: false }),
      ]);
      setLedger(((ledgerData as any[] | null) ?? []) as LedgerRow[]);
      setPayouts(((payoutData as any[] | null) ?? []) as PayoutRow[]);
    } finally {
      setLoading(false);
    }
  };

  // Pending balance = sum of unpaid (payout_id IS NULL) ledger rows.
  const pendingTotals = useMemo(() => {
    const unpaid = ledger.filter((r) => !r.payout_id);
    const grossSales = unpaid
      .filter((r) => r.type === 'SALE')
      .reduce((s, r) => s + Number(r.gross_amount || 0), 0);
    const commission = unpaid
      .filter((r) => r.type === 'SALE')
      .reduce((s, r) => s + Number(r.commission_amount || 0), 0);
    const refunds = unpaid
      .filter((r) => r.type === 'REFUND')
      .reduce((s, r) => s + Math.abs(Number(r.net_amount || 0)), 0);
    const netPayable = unpaid.reduce((s, r) => s + Number(r.net_amount || 0), 0);
    return { grossSales, commission, refunds, netPayable, count: unpaid.length };
  }, [ledger]);

  // Lifetime totals
  const lifetime = useMemo(() => {
    const paid = payouts
      .filter((p) => p.status === 'PAID')
      .reduce((s, p) => s + Number(p.net_payable || 0), 0);
    return { paid, payoutCount: payouts.filter((p) => p.status === 'PAID').length };
  }, [payouts]);

  // Filter ledger rows by selected month.
  const filteredLedger = useMemo(() => {
    const { startIso, endIso } = monthRange(monthFilter);
    return ledger.filter((r) => r.created_at >= startIso && r.created_at < endIso);
  }, [ledger, monthFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading payouts…
      </div>
    );
  }

  const bankSuffix = (vendor?.bank_account_number ?? '').slice(-4);
  const commissionPct = vendor?.commission_rate ?? 8;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Payouts</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Track your earnings, pending balance, and monthly payout history.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRM(pendingTotals.netPayable)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingTotals.count > 0
                ? `${pendingTotals.count} unpaid ${pendingTotals.count === 1 ? 'entry' : 'entries'}`
                : 'All earnings settled'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross sales (unpaid)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRM(pendingTotals.grossSales)}</div>
            <p className="text-xs text-muted-foreground mt-1">Before fees and refunds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform fee</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">− {formatRM(pendingTotals.commission)}</div>
            <p className="text-xs text-muted-foreground mt-1">{commissionPct}% commission</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lifetime paid</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRM(lifetime.paid)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {lifetime.payoutCount} {lifetime.payoutCount === 1 ? 'payout' : 'payouts'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payout destination summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 text-sm">
            <Banknote className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground">
              Payouts are processed monthly to{' '}
              {vendor?.bank_name ? (
                <span className="font-medium text-foreground">
                  {vendor.bank_name}
                  {bankSuffix && <> · ****{bankSuffix}</>}
                </span>
              ) : (
                <span className="font-medium text-foreground">your bank account on file</span>
              )}
              . Refund deductions: {formatRM(pendingTotals.refunds)}.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sales drilldown */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Sales drilldown
              </CardTitle>
              <CardDescription className="mt-0.5">
                Recent ledger entries — every sale, refund, and adjustment.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="month-filter" className="text-xs whitespace-nowrap text-muted-foreground">
                <Calendar className="h-3 w-3 inline mr-1" /> Month
              </Label>
              <Select value={monthFilter} onValueChange={(v) => setMonthFilter(v || currentMonthIso())}>
                <SelectTrigger id="month-filter" className="w-44 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {buildMonthOptions(18).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLedger.length === 0 ? (
            <div className="py-12 text-center">
              <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No ledger entries for this month.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a different month from the picker above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLedger.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        <div className="font-medium">
                          {formatDate(r.created_at)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleTimeString('en-MY', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </TableCell>
                      <TableCell><TypeChip type={r.type} /></TableCell>
                      <TableCell>
                        {r.order_id ? (
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                            {r.order_id.slice(0, 8).toUpperCase()}
                          </code>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatRM(Number(r.gross_amount))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-red-600">
                        {Number(r.commission_amount) === 0 ? '—' : `− ${formatRM(Number(r.commission_amount))}`}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums font-semibold',
                          Number(r.net_amount) < 0 && 'text-red-600',
                        )}
                      >
                        {formatRM(Number(r.net_amount))}
                      </TableCell>
                      <TableCell>
                        {r.payout_id ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                            <Banknote className="h-3 w-3" />
                            In payout
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            <Clock className="h-3 w-3" />
                            Unpaid
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="h-4 w-4 text-muted-foreground" />
            Payout history
          </CardTitle>
          <CardDescription>
            Monthly payouts paid out to your bank account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="py-12 text-center">
              <Banknote className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No payouts yet</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                Your first payout will appear here once admin generates it for the current cycle.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Net paid</TableHead>
                    <TableHead>Paid on</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Slip</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((p) => {
                    const period = formatPeriod(p.period_start, p.period_end);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          <div className="font-semibold">{period.primary}</div>
                          {period.secondary && (
                            <div className="text-[11px] text-muted-foreground">
                              {period.secondary}
                            </div>
                          )}
                        </TableCell>
                        <TableCell><PayoutStatusBadge status={p.status} /></TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatRM(Number(p.gross_sales))}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right tabular-nums font-semibold',
                            p.status === 'PAID' && 'text-green-700',
                          )}
                        >
                          {formatRM(Number(p.net_payable))}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {p.paid_at ? (
                            <div>
                              <div>{formatDate(p.paid_at)}</div>
                              <div
                                className="text-[11px] text-muted-foreground"
                                title={formatDateTime(p.paid_at)}
                              >
                                {new Date(p.paid_at).toLocaleTimeString('en-MY', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.payment_reference ? (
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                              {p.payment_reference}
                            </code>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.payment_slip_url ? (
                            <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                              <a href={p.payment_slip_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                View
                              </a>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
