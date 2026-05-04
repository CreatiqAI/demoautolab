import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { logAdminAction } from '@/lib/adminAudit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Briefcase, Search, Loader2, CheckCircle2, Ban, RotateCcw, Mail, Phone, MapPin,
  Building2, CreditCard, FileText, AlertTriangle, Clock,
} from 'lucide-react';

interface VendorRow {
  id: string;
  user_id: string | null;
  business_name: string;
  business_registration_no: string | null;
  tax_id: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  description: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  is_sst_registered: boolean;
  commission_rate: number;
  default_shipping_fee: number;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
  applied_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
}

const formatDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const statusBadge = (status: VendorRow['status']) => {
  switch (status) {
    case 'APPROVED':
      return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
    case 'PENDING':
      return <Badge className="bg-amber-100 text-amber-700 border-amber-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    case 'SUSPENDED':
      return <Badge className="bg-orange-100 text-orange-700 border-orange-300"><AlertTriangle className="h-3 w-3 mr-1" />Suspended</Badge>;
    case 'REJECTED':
      return <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Rejected</Badge>;
  }
};

export default function Vendors() {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'pending' | 'approved' | 'inactive'>('pending');

  // Drawer
  const [drawerVendor, setDrawerVendor] = useState<VendorRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Reject dialog
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Suspend dialog
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('vendors' as any)
        .select('*')
        .order('created_at', { ascending: false });
      setVendors((data as any[] | null) ?? []);
    } finally {
      setLoading(false);
    }
  };

  // Patch a vendor row in local state without refetch
  const patch = (id: string, p: Partial<VendorRow>) => {
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, ...p } : v)));
    setDrawerVendor((prev) => (prev && prev.id === id ? { ...prev, ...p } : prev));
  };

  const filtered = vendors.filter((v) => {
    if (tab === 'pending' && v.status !== 'PENDING') return false;
    if (tab === 'approved' && v.status !== 'APPROVED') return false;
    if (tab === 'inactive' && v.status !== 'SUSPENDED' && v.status !== 'REJECTED') return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        v.business_name.toLowerCase().includes(s) ||
        v.contact_email?.toLowerCase().includes(s) ||
        v.contact_phone?.toLowerCase().includes(s) ||
        v.business_registration_no?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const counts = {
    pending: vendors.filter((v) => v.status === 'PENDING').length,
    approved: vendors.filter((v) => v.status === 'APPROVED').length,
    inactive: vendors.filter((v) => v.status === 'SUSPENDED' || v.status === 'REJECTED').length,
  };

  const openDrawer = (vendor: VendorRow) => {
    setDrawerVendor(vendor);
    setDrawerOpen(true);
  };

  const handleApprove = async () => {
    if (!drawerVendor) return;
    setActionInProgress(true);
    try {
      const { error } = await supabase
        .from('vendors' as any)
        .update({
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
          rejection_reason: null,
        } as any)
        .eq('id', drawerVendor.id);
      if (error) throw error;
      patch(drawerVendor.id, { status: 'APPROVED', approved_at: new Date().toISOString(), rejection_reason: null });
      void logAdminAction({
        action: 'vendor.approve',
        entityType: 'vendor',
        entityId: drawerVendor.id,
        entityLabel: drawerVendor.business_name,
        before: { status: drawerVendor.status },
        after: { status: 'APPROVED' },
      });
      toast({
        title: 'Vendor approved',
        description: `${drawerVendor.business_name} can now access the vendor console.`,
        variant: 'success',
      });
    } catch (err: any) {
      toast({ title: 'Approval failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async () => {
    if (!drawerVendor) return;
    setRejecting(true);
    try {
      const { error } = await supabase
        .from('vendors' as any)
        .update({
          status: 'REJECTED',
          rejection_reason: rejectReason || null,
        } as any)
        .eq('id', drawerVendor.id);
      if (error) throw error;
      patch(drawerVendor.id, { status: 'REJECTED', rejection_reason: rejectReason || null });
      void logAdminAction({
        action: 'vendor.reject',
        entityType: 'vendor',
        entityId: drawerVendor.id,
        entityLabel: drawerVendor.business_name,
        before: { status: drawerVendor.status },
        after: { status: 'REJECTED' },
        notes: rejectReason || null,
      });
      toast({ title: 'Vendor rejected', variant: 'success' });
      setRejectOpen(false);
      setRejectReason('');
    } catch (err: any) {
      toast({ title: 'Reject failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setRejecting(false);
    }
  };

  const handleSuspend = async () => {
    if (!drawerVendor) return;
    setSuspending(true);
    try {
      const { error } = await supabase
        .from('vendors' as any)
        .update({
          status: 'SUSPENDED',
          rejection_reason: suspendReason || null,
        } as any)
        .eq('id', drawerVendor.id);
      if (error) throw error;
      patch(drawerVendor.id, { status: 'SUSPENDED', rejection_reason: suspendReason || null });
      void logAdminAction({
        action: 'vendor.suspend',
        entityType: 'vendor',
        entityId: drawerVendor.id,
        entityLabel: drawerVendor.business_name,
        before: { status: drawerVendor.status },
        after: { status: 'SUSPENDED' },
        notes: suspendReason || null,
      });
      toast({ title: 'Vendor suspended', variant: 'success' });
      setSuspendOpen(false);
      setSuspendReason('');
    } catch (err: any) {
      toast({ title: 'Suspend failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setSuspending(false);
    }
  };

  const handleReactivate = async (vendor: VendorRow) => {
    try {
      const { error } = await supabase
        .from('vendors' as any)
        .update({ status: 'APPROVED', rejection_reason: null } as any)
        .eq('id', vendor.id);
      if (error) throw error;
      patch(vendor.id, { status: 'APPROVED', rejection_reason: null });
      void logAdminAction({
        action: 'vendor.reactivate',
        entityType: 'vendor',
        entityId: vendor.id,
        entityLabel: vendor.business_name,
        before: { status: vendor.status },
        after: { status: 'APPROVED' },
      });
      toast({ title: 'Vendor reactivated', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Briefcase className="h-7 w-7" />
          Vendors
        </h2>
        <p className="text-muted-foreground">External business partners selling on the platform.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor directory</CardTitle>
          <CardDescription>Approve applications, manage active vendors, view sales.</CardDescription>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-2">
            <TabsList>
              <TabsTrigger value="pending">Pending<Badge variant="secondary" className="ml-2">{counts.pending}</Badge></TabsTrigger>
              <TabsTrigger value="approved">Active<Badge variant="secondary" className="ml-2">{counts.approved}</Badge></TabsTrigger>
              <TabsTrigger value="inactive">Inactive<Badge variant="secondary" className="ml-2">{counts.inactive}</Badge></TabsTrigger>
              <TabsTrigger value="all">All<Badge variant="secondary" className="ml-2">{vendors.length}</Badge></TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative max-w-sm mt-3">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search business, email, phone, SSM…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {tab === 'pending' && 'No pending applications.'}
              {tab === 'approved' && 'No active vendors yet.'}
              {tab === 'inactive' && 'No suspended or rejected vendors.'}
              {tab === 'all' && (search ? 'No vendors match your search.' : 'No vendors yet.')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((v) => (
                    <TableRow key={v.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openDrawer(v)}>
                      <TableCell>
                        <div className="font-medium">{v.business_name}</div>
                        {v.business_registration_no && (
                          <div className="text-xs text-muted-foreground">SSM: {v.business_registration_no}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {v.contact_person && <div>{v.contact_person}</div>}
                          {v.contact_email && <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{v.contact_email}</div>}
                          {v.contact_phone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{v.contact_phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(v.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(v.applied_at)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {(v.status === 'SUSPENDED' || v.status === 'REJECTED') && (
                          <Button variant="ghost" size="sm" onClick={() => handleReactivate(v)} title="Reactivate" className="text-green-600 hover:bg-green-50">
                            <RotateCcw className="h-4 w-4" />
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

      {/* Drawer with full vendor detail + approval actions */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl lg:max-w-2xl overflow-y-auto">
          {drawerVendor && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 flex-wrap">
                  {drawerVendor.business_name}
                  {statusBadge(drawerVendor.status)}
                </SheetTitle>
                <SheetDescription>
                  Vendor ID: <code className="text-xs">{drawerVendor.id}</code> · Applied {formatDate(drawerVendor.applied_at)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Business identity */}
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" />Business identity
                  </div>
                  {drawerVendor.business_registration_no && (
                    <Row label="SSM / Registration">{drawerVendor.business_registration_no}</Row>
                  )}
                  {drawerVendor.tax_id && <Row label="Tax ID">{drawerVendor.tax_id}</Row>}
                  <Row label="SST registered">{drawerVendor.is_sst_registered ? 'Yes' : 'No'}</Row>
                  {drawerVendor.description && <Row label="Description">{drawerVendor.description}</Row>}
                </div>

                {/* Contact */}
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Contact</div>
                  {drawerVendor.contact_person && <Row label="Contact person">{drawerVendor.contact_person}</Row>}
                  {drawerVendor.contact_phone && <Row label="Phone" icon={Phone}>{drawerVendor.contact_phone}</Row>}
                  {drawerVendor.contact_email && <Row label="Email" icon={Mail}>{drawerVendor.contact_email}</Row>}
                </div>

                {/* Address */}
                {(drawerVendor.address || drawerVendor.city) && (
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />Address
                    </div>
                    <div className="text-sm">{drawerVendor.address}</div>
                    <div className="text-xs text-muted-foreground">
                      {[drawerVendor.postcode, drawerVendor.city, drawerVendor.state].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                )}

                {/* Banking */}
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                    <CreditCard className="h-3 w-3" />Bank account (for payouts)
                  </div>
                  {drawerVendor.bank_name ? (
                    <>
                      <Row label="Bank">{drawerVendor.bank_name}</Row>
                      <Row label="Account holder">{drawerVendor.bank_account_name}</Row>
                      <Row label="Account number"><code>{drawerVendor.bank_account_number}</code></Row>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">No bank details on file.</p>
                  )}
                </div>

                {/* Commercial */}
                <div className="rounded-lg border p-4 space-y-2 bg-purple-50/30">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Commercial terms</div>
                  <Row label="Commission rate">{drawerVendor.commission_rate}%</Row>
                  <Row label="Default shipping fee">RM {drawerVendor.default_shipping_fee.toFixed(2)}</Row>
                </div>

                {/* Past rejection / suspension reason */}
                {drawerVendor.rejection_reason && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-1">
                    <div className="text-xs font-semibold text-orange-800 uppercase flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />Last admin note
                    </div>
                    <p className="text-sm text-orange-900">{drawerVendor.rejection_reason}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {drawerVendor.status === 'PENDING' && (
                    <>
                      <Button onClick={handleApprove} disabled={actionInProgress} className="bg-green-600 hover:bg-green-700">
                        {actionInProgress ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                        Approve
                      </Button>
                      <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setRejectOpen(true)}>
                        <Ban className="h-4 w-4 mr-2" />Reject
                      </Button>
                    </>
                  )}
                  {drawerVendor.status === 'APPROVED' && (
                    <Button variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => setSuspendOpen(true)}>
                      <Ban className="h-4 w-4 mr-2" />Suspend
                    </Button>
                  )}
                  {(drawerVendor.status === 'SUSPENDED' || drawerVendor.status === 'REJECTED') && (
                    <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleReactivate(drawerVendor)}>
                      <RotateCcw className="h-4 w-4 mr-2" />Reactivate
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Reject confirmation */}
      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this application?</AlertDialogTitle>
            <AlertDialogDescription>
              The applicant will see your reason on their status page. They can re-apply later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="reject-reason">Reason (recommended)</Label>
            <Textarea id="reject-reason" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Could not verify business registration number" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void handleReject(); }} disabled={rejecting} className="bg-red-600 hover:bg-red-700">
              {rejecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
              Reject application
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend confirmation */}
      <AlertDialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend this vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              They will lose access to the vendor console immediately. Their products remain in the catalog unless you
              manually hide them. Reactivate any time from the directory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="suspend-reason">Reason (recommended)</Label>
            <Textarea id="suspend-reason" rows={3} value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="e.g. Multiple unfulfilled orders" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suspending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void handleSuspend(); }} disabled={suspending} className="bg-orange-600 hover:bg-orange-700">
              {suspending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
              Suspend vendor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon?: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-gray-400 mt-1 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-sm font-medium text-gray-900 break-words">{children}</div>
      </div>
    </div>
  );
}
