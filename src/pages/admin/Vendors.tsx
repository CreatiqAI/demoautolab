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
  Building2, CreditCard, FileText, AlertTriangle, Clock, Plus, Copy, Eye, EyeOff,
  KeyRound, AtSign, Trash2,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { getCurrentAdmin } from '@/lib/adminAudit';

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
  const [tab, setTab] = useState<'all' | 'approved' | 'inactive'>('approved');

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

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Create-vendor dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    business_name: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    business_registration_no: '',
    description: '',
    commission_rate: '8',
  });
  // After successful creation, show credentials once for admin to copy
  const [createdCreds, setCreatedCreds] = useState<{ username: string; password: string } | null>(null);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let out = '';
    const arr = new Uint32Array(12);
    crypto.getRandomValues(arr);
    for (let i = 0; i < arr.length; i++) out += chars[arr[i] % chars.length];
    setCreateForm((f) => ({ ...f, password: out }));
  };

  const resetCreateForm = () => {
    setCreateForm({
      username: '',
      password: '',
      business_name: '',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
      business_registration_no: '',
      description: '',
      commission_rate: '8',
    });
    setShowPwd(false);
  };

  const handleCreateVendor = async () => {
    const admin = getCurrentAdmin();
    if (!admin) {
      toast({ title: 'Not signed in', description: 'Admin session missing — please re-login.', variant: 'destructive' });
      return;
    }
    if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(createForm.username.trim().toLowerCase())) {
      toast({ title: 'Invalid username', description: '3–32 chars; lowercase letters, digits, _ or -; must start with a letter or digit.', variant: 'destructive' });
      return;
    }
    if (createForm.password.length < 8) {
      toast({ title: 'Password too short', description: 'Use at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (!createForm.business_name.trim() || !createForm.contact_person.trim() || !createForm.contact_email.trim()) {
      toast({ title: 'Missing fields', description: 'Business name, contact person and contact email are required.', variant: 'destructive' });
      return;
    }

    setCreateBusy(true);
    try {
      const commission = Number(createForm.commission_rate);
      const { data, error } = await supabase.functions.invoke('admin-create-vendor', {
        body: {
          admin_id: admin.id,
          username: createForm.username.trim().toLowerCase(),
          password: createForm.password,
          business_name: createForm.business_name.trim(),
          contact_person: createForm.contact_person.trim(),
          contact_email: createForm.contact_email.trim(),
          contact_phone: createForm.contact_phone.trim() || null,
          business_registration_no: createForm.business_registration_no.trim() || null,
          description: createForm.description.trim() || null,
          commission_rate: isNaN(commission) ? 8 : commission,
        },
      });
      if (error || !(data as any)?.success) {
        const msg = (data as any)?.message ?? error?.message ?? 'Could not create vendor.';
        toast({ title: 'Create failed', description: msg, variant: 'destructive' });
        setCreateBusy(false);
        return;
      }

      // Audit log (non-blocking)
      try {
        await logAdminAction({
          action: 'vendor.create',
          entityType: 'vendor',
          entityId: (data as any).vendor_id,
          entityLabel: createForm.business_name.trim(),
          after: {
            username: createForm.username.trim().toLowerCase(),
            commission_rate: Number(createForm.commission_rate),
          },
        });
      } catch { /* swallow */ }

      // Show credentials once for admin to copy & share manually
      setCreatedCreds({
        username: createForm.username.trim().toLowerCase(),
        password: createForm.password,
      });
      void load();
    } catch (err: any) {
      toast({ title: 'Create failed', description: err?.message ?? 'Unexpected error.', variant: 'destructive' });
    } finally {
      setCreateBusy(false);
    }
  };

  const closeCreateDialog = () => {
    setCreateOpen(false);
    setCreatedCreds(null);
    resetCreateForm();
  };

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

  const handleDelete = async () => {
    if (!drawerVendor) return;
    const admin = getCurrentAdmin();
    if (!admin) {
      toast({ title: 'Not signed in', description: 'Admin session missing — please re-login.', variant: 'destructive' });
      return;
    }
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-vendor', {
        body: { admin_id: admin.id, vendor_id: drawerVendor.id },
      });
      if (error || !(data as any)?.success) {
        const msg = (data as any)?.message ?? error?.message ?? 'Could not delete vendor.';
        toast({ title: 'Delete failed', description: msg, variant: 'destructive' });
        setDeleting(false);
        return;
      }

      void logAdminAction({
        action: 'vendor.delete',
        entityType: 'vendor',
        entityId: drawerVendor.id,
        entityLabel: drawerVendor.business_name,
        before: { status: drawerVendor.status, username: (drawerVendor as any).username ?? null },
        after: null,
      });

      toast({
        title: 'Vendor deleted',
        description: `${drawerVendor.business_name} and its login have been removed.`,
        variant: 'success',
      });
      setVendors((prev) => prev.filter((v) => v.id !== drawerVendor.id));
      setDeleteOpen(false);
      setDrawerOpen(false);
      setDrawerVendor(null);
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err?.message ?? 'Unexpected error.', variant: 'destructive' });
    } finally {
      setDeleting(false);
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="h-7 w-7" />
            Vendors
          </h2>
          <p className="text-muted-foreground">External business partners selling on the platform.</p>
        </div>
        <Button onClick={() => { setCreateOpen(true); setCreatedCreds(null); }}>
          <Plus className="h-4 w-4 mr-2" />
          New vendor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor directory</CardTitle>
          <CardDescription>Manage admin-issued partner accounts.</CardDescription>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-2">
            <TabsList>
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
              {tab === 'approved' && 'No active vendors yet. Click "New vendor" to issue your first partner account.'}
              {tab === 'inactive' && 'No suspended or rejected vendors.'}
              {tab === 'all' && (search ? 'No vendors match your search.' : 'No vendors yet.')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
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
                        {(v as any).username ? (
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{(v as any).username}</code>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
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
                      <TableCell className="text-sm text-muted-foreground">{formatDate(v.created_at)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="sm" onClick={() => openDrawer(v)} title="View / edit" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(v.status === 'SUSPENDED' || v.status === 'REJECTED') && (
                            <Button variant="ghost" size="sm" onClick={() => handleReactivate(v)} title="Reactivate" className="h-8 w-8 p-0 text-green-600 hover:bg-green-50">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          {v.status === 'APPROVED' && (
                            <Button variant="ghost" size="sm" onClick={() => { setDrawerVendor(v); setSuspendOpen(true); }} title="Suspend" className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-50">
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => { setDrawerVendor(v); setDeleteOpen(true); }} title="Delete" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
                  {/* Permanent delete — pushed to the right; only available if no
                      ledger / payout / active fulfilment history exists. */}
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />Delete account
                  </Button>
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

      {/* Permanently delete vendor */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this vendor account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{drawerVendor?.business_name ?? 'this vendor'}</strong>:
              their login credentials, components, and vendor record. Their products will remain in the
              catalog with no seller attached (admin can clean those up separately).
              <br /><br />
              <strong className="text-red-700">This cannot be undone.</strong> If they have any sales
              history or payouts, suspend them instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void handleDelete(); }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create vendor dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) closeCreateDialog(); else setCreateOpen(true); }}>
        <DialogContent className="max-w-2xl">
          {createdCreds ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Vendor account created
                </DialogTitle>
                <DialogDescription>
                  Share these credentials with the partner. We can't show the password again — copy it now.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                  <CredentialRow label="Username" value={createdCreds.username} />
                  <CredentialRow label="Password" value={createdCreds.password} mono />
                  <CredentialRow label="Login URL" value={`${window.location.origin}/auth?tab=partner`} />
                </div>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                  <strong>Important:</strong> Save these credentials before closing. The password won't be visible again.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={closeCreateDialog}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create new vendor
                </DialogTitle>
                <DialogDescription>
                  Issue a partner account. They'll log in at /auth → Partner tab with the username and password you set here.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-1">
                {/* Credentials */}
                <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <KeyRound className="h-3 w-3" /> Login credentials
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cv-username">Username <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <AtSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          id="cv-username"
                          value={createForm.username}
                          onChange={(e) => setCreateForm({ ...createForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                          placeholder="soundstream"
                          className="pl-7 font-mono text-sm"
                          maxLength={32}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Lowercase letters, digits, _ or -. 3–32 chars.</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="cv-password">Password <span className="text-red-500">*</span></Label>
                        <button type="button" onClick={generatePassword} className="text-[11px] text-primary hover:underline">
                          Generate
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="cv-password"
                          type={showPwd ? 'text' : 'password'}
                          value={createForm.password}
                          onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                          placeholder="Minimum 8 characters"
                          className="pr-9 font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business identity */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" /> Business
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cv-biz">Business name <span className="text-red-500">*</span></Label>
                    <Input id="cv-biz" value={createForm.business_name} onChange={(e) => setCreateForm({ ...createForm, business_name: e.target.value })} placeholder="e.g. SoundStream Auto Sdn Bhd" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cv-cp">Contact person <span className="text-red-500">*</span></Label>
                      <Input id="cv-cp" value={createForm.contact_person} onChange={(e) => setCreateForm({ ...createForm, contact_person: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cv-comm">Commission %</Label>
                      <Input id="cv-comm" type="number" min={0} max={100} step={0.01} value={createForm.commission_rate} onChange={(e) => setCreateForm({ ...createForm, commission_rate: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cv-email">Contact email <span className="text-red-500">*</span></Label>
                      <Input id="cv-email" type="email" value={createForm.contact_email} onChange={(e) => setCreateForm({ ...createForm, contact_email: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cv-phone">Contact phone</Label>
                      <Input id="cv-phone" type="tel" value={createForm.contact_phone} onChange={(e) => setCreateForm({ ...createForm, contact_phone: e.target.value })} placeholder="+60 12-345 6789" />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="cv-ssm">SSM / Registration no.</Label>
                      <Input id="cv-ssm" value={createForm.business_registration_no} onChange={(e) => setCreateForm({ ...createForm, business_registration_no: e.target.value })} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="cv-desc">Notes / description</Label>
                      <Textarea id="cv-desc" rows={2} value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Anything internal admin should know about this partner." />
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Vendor will start as <strong>APPROVED</strong>. Address and bank details can be filled later in vendor settings.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeCreateDialog} disabled={createBusy}>Cancel</Button>
                <Button onClick={handleCreateVendor} disabled={createBusy}>
                  {createBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Create vendor
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CredentialRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const { toast } = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Copied', description: label, variant: 'success' });
    } catch {
      toast({ title: 'Copy failed', description: 'Select and copy manually.', variant: 'destructive' });
    }
  };
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-sm break-all ${mono ? 'font-mono' : ''}`}>{value}</div>
      </div>
      <Button variant="ghost" size="sm" onClick={copy} className="flex-shrink-0">
        <Copy className="h-3.5 w-3.5" />
      </Button>
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
