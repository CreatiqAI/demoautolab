import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { logAdminAction, getCurrentAdmin } from '@/lib/adminAudit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Wallet, Loader2, Banknote, Plus, Upload, ExternalLink, CheckCircle2,
  Clock, AlertTriangle, Ban, Briefcase,
} from 'lucide-react';

interface VendorRow {
  id: string;
  business_name: string;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  commission_rate: number;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
}

interface PendingRow {
  vendor_id: string;
  pending_net: number;
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
  paid_by: string | null;
  payment_reference: string | null;
  payment_slip_url: string | null;
  notes: string | null;
  created_at: string;
}

const formatRM = (n: number) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(Number(n) || 0);

const formatDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// Default to last calendar month: returns { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
const lastCalendarMonth = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: iso(start), end: iso(end) };
};

const payoutStatusBadge = (status: PayoutRow['status']) => {
  switch (status) {
    case 'PAID':
      return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle2 className="h-3 w-3 mr-1" />Paid</Badge>;
    case 'PENDING':
      return <Badge className="bg-amber-100 text-amber-700 border-amber-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    case 'HOLD':
      return <Badge className="bg-orange-100 text-orange-700 border-orange-300"><AlertTriangle className="h-3 w-3 mr-1" />On hold</Badge>;
    case 'CANCELLED':
      return <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Cancelled</Badge>;
  }
};

export default function VendorPayouts() {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [pendingRows, setPendingRows] = useState<PendingRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate-payout dialog state
  const [genOpen, setGenOpen] = useState(false);
  const [genVendorId, setGenVendorId] = useState<string>('');
  const [genPeriodStart, setGenPeriodStart] = useState<string>(lastCalendarMonth().start);
  const [genPeriodEnd, setGenPeriodEnd] = useState<string>(lastCalendarMonth().end);
  const [generating, setGenerating] = useState(false);

  // Mark-as-paid dialog state
  const [paidPayout, setPaidPayout] = useState<PayoutRow | null>(null);
  const [paidOpen, setPaidOpen] = useState(false);
  const [paidFile, setPaidFile] = useState<File | null>(null);
  const [paidReference, setPaidReference] = useState('');
  const [paidNotes, setPaidNotes] = useState('');
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    void loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      // Admins are anonymous to Postgres (localStorage auth), so the RLS-scoped
      // ledger/payout tables return nothing on a direct select. These SECURITY
      // DEFINER RPCs expose the admin-wide aggregates/list instead.
      const [{ data: vendorData }, { data: pendingData }, { data: payoutData }] = await Promise.all([
        supabase
          .from('vendors' as any)
          .select('id, business_name, bank_name, bank_account_name, bank_account_number, commission_rate, status')
          .eq('status', 'APPROVED')
          .order('business_name', { ascending: true }),
        supabase.rpc('admin_vendor_pending_balances' as any),
        supabase.rpc('admin_list_vendor_payouts' as any, { p_limit: 500 }),
      ]);
      setVendors(((vendorData as any[] | null) ?? []) as VendorRow[]);
      setPendingRows(((pendingData as any[] | null) ?? []) as PendingRow[]);
      setPayouts(((payoutData as any[] | null) ?? []) as PayoutRow[]);
    } finally {
      setLoading(false);
    }
  };

  // Pending balance per vendor: net unpaid total from the admin RPC.
  const pendingByVendor = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of pendingRows) {
      map.set(r.vendor_id, Number(r.pending_net || 0));
    }
    return map;
  }, [pendingRows]);

  const vendorNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of vendors) m.set(v.id, v.business_name);
    return m;
  }, [vendors]);

  const openGenerateDialog = () => {
    const lm = lastCalendarMonth();
    setGenPeriodStart(lm.start);
    setGenPeriodEnd(lm.end);
    setGenVendorId(vendors[0]?.id ?? '');
    setGenOpen(true);
  };

  const handleGenerate = async () => {
    if (!genVendorId) {
      toast({ title: 'Pick a vendor', variant: 'destructive' });
      return;
    }
    if (!genPeriodStart || !genPeriodEnd) {
      toast({ title: 'Pick a period', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.rpc('admin_generate_vendor_payout' as any, {
        p_vendor_id: genVendorId,
        p_period_start: genPeriodStart,
        p_period_end: genPeriodEnd,
      } as any);
      if (error) throw error;
      const payoutId = (data as unknown as string) ?? null;
      void logAdminAction({
        action: 'payout.generate',
        entityType: 'vendor_payout',
        entityId: payoutId,
        entityLabel: vendorNameById.get(genVendorId) ?? null,
        after: { vendorId: genVendorId, periodStart: genPeriodStart, periodEnd: genPeriodEnd },
      });
      toast({
        title: 'Payout generated',
        description: `${vendorNameById.get(genVendorId) ?? 'Vendor'} · ${genPeriodStart} → ${genPeriodEnd}`,
        variant: 'success',
      });
      setGenOpen(false);
      await loadAll();
    } catch (err: any) {
      toast({
        title: 'Could not generate payout',
        description: err?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const openMarkPaidDialog = (payout: PayoutRow) => {
    setPaidPayout(payout);
    setPaidFile(null);
    setPaidReference(payout.payment_reference ?? '');
    setPaidNotes(payout.notes ?? '');
    setPaidOpen(true);
  };

  const handleMarkPaid = async () => {
    if (!paidPayout) return;
    if (!paidFile) {
      toast({ title: 'Payment slip required', description: 'Upload the bank slip to record this payout.', variant: 'destructive' });
      return;
    }
    if (!paidReference.trim()) {
      toast({ title: 'Bank reference required', variant: 'destructive' });
      return;
    }
    setMarking(true);
    try {
      // 1. Upload slip
      const fileExt = paidFile.name.split('.').pop() || 'pdf';
      const filePath = `${paidPayout.vendor_id}/${paidPayout.id}_${Date.now()}.${fileExt}`;
      const { error: upErr } = await supabase.storage
        .from('vendor-payout-slips')
        .upload(filePath, paidFile, { contentType: paidFile.type, upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('vendor-payout-slips').getPublicUrl(filePath);

      // 2. Update payout row
      const admin = getCurrentAdmin();
      const { error: updErr } = await supabase
        .from('vendor_payouts' as any)
        .update({
          status: 'PAID',
          paid_at: new Date().toISOString(),
          paid_by: admin?.id ?? null,
          payment_reference: paidReference.trim(),
          payment_slip_url: publicUrl,
          notes: paidNotes.trim() || null,
        } as any)
        .eq('id', paidPayout.id);
      if (updErr) throw updErr;

      void logAdminAction({
        action: 'payout.mark-paid',
        entityType: 'vendor_payout',
        entityId: paidPayout.id,
        entityLabel: vendorNameById.get(paidPayout.vendor_id) ?? null,
        before: { status: paidPayout.status },
        after: {
          status: 'PAID',
          payoutId: paidPayout.id,
          vendorId: paidPayout.vendor_id,
          reference: paidReference.trim(),
        },
      });

      toast({
        title: 'Payout marked as paid',
        description: `${vendorNameById.get(paidPayout.vendor_id) ?? 'Vendor'} · ${formatRM(Number(paidPayout.net_payable))}`,
        variant: 'success',
      });
      setPaidOpen(false);
      await loadAll();
    } catch (err: any) {
      toast({ title: 'Failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setMarking(false);
    }
  };

  // Counts
  const totalPendingAcrossVendors = useMemo(
    () => Array.from(pendingByVendor.values()).reduce((s, v) => s + v, 0),
    [pendingByVendor],
  );
  const totalUnpaidPayouts = payouts.filter((p) => p.status === 'PENDING').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading vendor payouts…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-7 w-7" />
            Vendor Payouts
          </h2>
          <p className="text-muted-foreground">
            Monthly settlement: aggregate ledger rows into payouts and record bank transfers.
          </p>
        </div>
        <Button onClick={openGenerateDialog} className="bg-lime-600 hover:bg-lime-700">
          <Plus className="h-4 w-4 mr-2" />
          Generate payout
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5" /> Total pending balance
            </CardDescription>
            <CardTitle className="text-2xl">{formatRM(totalPendingAcrossVendors)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Across {Array.from(pendingByVendor.keys()).filter((id) => (pendingByVendor.get(id) ?? 0) > 0).length} vendor(s)
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Payouts awaiting payment
            </CardDescription>
            <CardTitle className="text-2xl">{totalUnpaidPayouts}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Generated, not yet transferred
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> Active vendors
            </CardDescription>
            <CardTitle className="text-2xl">{vendors.length}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            With APPROVED status
          </CardContent>
        </Card>
      </div>

      {/* Pending balance per vendor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending balance per vendor</CardTitle>
          <CardDescription>Net unpaid amount in the ledger for each active vendor.</CardDescription>
        </CardHeader>
        <CardContent>
          {vendors.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No approved vendors yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Bank account</TableHead>
                    <TableHead className="text-right">Pending balance</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((v) => {
                    const pending = pendingByVendor.get(v.id) ?? 0;
                    return (
                      <TableRow key={v.id}>
                        <TableCell>
                          <div className="font-medium">{v.business_name}</div>
                          <div className="text-xs text-muted-foreground">{v.commission_rate}% commission</div>
                        </TableCell>
                        <TableCell>
                          {v.bank_name ? (
                            <div className="text-sm">
                              <div>{v.bank_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {v.bank_account_name} · ****{(v.bank_account_number ?? '').slice(-4)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-amber-600">No bank on file</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {pending > 0 ? formatRM(pending) : <span className="text-muted-foreground font-normal">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pending <= 0}
                            onClick={() => {
                              const lm = lastCalendarMonth();
                              setGenVendorId(v.id);
                              setGenPeriodStart(lm.start);
                              setGenPeriodEnd(lm.end);
                              setGenOpen(true);
                            }}
                          >
                            Generate
                          </Button>
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

      {/* Payouts list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All payouts</CardTitle>
          <CardDescription>Every generated payout across all vendors. Mark as paid after bank transfer.</CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No payouts generated yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Net payable</TableHead>
                    <TableHead>Paid on</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Slip</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {vendorNameById.get(p.vendor_id) ?? <code className="text-xs">{p.vendor_id.slice(0, 8)}</code>}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDate(p.period_start)} – {formatDate(p.period_end)}
                      </TableCell>
                      <TableCell>{payoutStatusBadge(p.status)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatRM(Number(p.gross_sales))}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-green-700">
                        {formatRM(Number(p.net_payable))}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(p.paid_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.payment_reference ? (
                          <code className="text-xs">{p.payment_reference}</code>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.payment_slip_url ? (
                          <Button asChild variant="ghost" size="sm">
                            <a href={p.payment_slip_url} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status === 'PENDING' && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => openMarkPaidDialog(p)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Mark Paid
                          </Button>
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

      {/* Generate payout dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate vendor payout</DialogTitle>
            <DialogDescription>
              Aggregates all unpaid ledger rows for the selected vendor in the chosen period into a new payout.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gen-vendor">Vendor</Label>
              <Select value={genVendorId} onValueChange={setGenVendorId}>
                <SelectTrigger id="gen-vendor">
                  <SelectValue placeholder="Select a vendor…" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.business_name}
                      {(pendingByVendor.get(v.id) ?? 0) > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({formatRM(pendingByVendor.get(v.id) ?? 0)} pending)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="gen-start">Period start</Label>
                <Input
                  id="gen-start"
                  type="date"
                  value={genPeriodStart}
                  onChange={(e) => setGenPeriodStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gen-end">Period end</Label>
                <Input
                  id="gen-end"
                  type="date"
                  value={genPeriodEnd}
                  onChange={(e) => setGenPeriodEnd(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Default range is the last calendar month. Only ledger rows not already attached to a payout will be included.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)} disabled={generating}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={generating} className="bg-lime-600 hover:bg-lime-700">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark-as-paid dialog */}
      <Dialog open={paidOpen} onOpenChange={setPaidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark payout as paid</DialogTitle>
            <DialogDescription>
              {paidPayout && (
                <>
                  {vendorNameById.get(paidPayout.vendor_id) ?? 'Vendor'} ·{' '}
                  <span className="font-semibold text-green-700">{formatRM(Number(paidPayout.net_payable))}</span> ·{' '}
                  {formatDate(paidPayout.period_start)} – {formatDate(paidPayout.period_end)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paid-slip">Payment slip <span className="text-red-500">*</span></Label>
              <Input
                id="paid-slip"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setPaidFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">PNG, JPG or PDF · max 10 MB</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid-ref">Bank reference <span className="text-red-500">*</span></Label>
              <Input
                id="paid-ref"
                value={paidReference}
                onChange={(e) => setPaidReference(e.target.value)}
                placeholder="e.g. MBB-20260504-001234"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid-notes">Notes (optional)</Label>
              <Textarea
                id="paid-notes"
                rows={2}
                value={paidNotes}
                onChange={(e) => setPaidNotes(e.target.value)}
                placeholder="Internal notes — not shown to vendor."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaidOpen(false)} disabled={marking}>
              Cancel
            </Button>
            <Button onClick={handleMarkPaid} disabled={marking} className="bg-green-600 hover:bg-green-700">
              {marking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Confirm payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
