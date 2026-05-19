import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useCurrentVendor, type VendorStatus } from '@/lib/vendorAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AddressAutocompleteSimple from '@/components/AddressAutocompleteSimple';
import { cn } from '@/lib/utils';
import {
  Save,
  Loader2,
  Building2,
  MapPin,
  CreditCard,
  Mail,
  ShieldCheck,
  Clock,
  Ban,
  AlertTriangle,
  Lock,
  Percent,
} from 'lucide-react';

const STATES = [
  'Johor','Kedah','Kelantan','Melaka','Negeri Sembilan','Pahang','Penang','Perak','Perlis',
  'Sabah','Sarawak','Selangor','Terengganu','Kuala Lumpur','Labuan','Putrajaya',
];

const STATUS_META: Record<VendorStatus, { label: string; classes: string; Icon: typeof ShieldCheck }> = {
  APPROVED: {
    label: 'Approved',
    classes: 'bg-green-100 text-green-800 border-green-200',
    Icon: ShieldCheck,
  },
  PENDING: {
    label: 'Pending review',
    classes: 'bg-amber-100 text-amber-800 border-amber-200',
    Icon: Clock,
  },
  SUSPENDED: {
    label: 'Suspended',
    classes: 'bg-orange-100 text-orange-800 border-orange-200',
    Icon: AlertTriangle,
  },
  REJECTED: {
    label: 'Rejected',
    classes: 'bg-red-100 text-red-700 border-red-200',
    Icon: Ban,
  },
};

function StatusPill({ status }: { status: VendorStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.Icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
        meta.classes,
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

interface SectionProps {
  icon: typeof Building2;
  title: string;
  description?: string;
  helper?: React.ReactNode;
  children: React.ReactNode;
}

function SectionCard({ icon: Icon, title, description, helper, children }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {helper && <div className="mt-1.5">{helper}</div>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export default function VendorSettings() {
  const { vendor, refetch } = useCurrentVendor();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    business_name: '',
    business_registration_no: '',
    tax_id: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    description: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    is_sst_registered: false,
  });

  useEffect(() => {
    if (!vendor) return;
    setForm({
      business_name: vendor.business_name ?? '',
      business_registration_no: vendor.business_registration_no ?? '',
      tax_id: vendor.tax_id ?? '',
      contact_person: vendor.contact_person ?? '',
      contact_phone: vendor.contact_phone ?? '',
      contact_email: vendor.contact_email ?? '',
      description: vendor.description ?? '',
      address: vendor.address ?? '',
      city: vendor.city ?? '',
      state: vendor.state ?? '',
      postcode: vendor.postcode ?? '',
      bank_name: vendor.bank_name ?? '',
      bank_account_name: vendor.bank_account_name ?? '',
      bank_account_number: vendor.bank_account_number ?? '',
      is_sst_registered: vendor.is_sst_registered ?? false,
    });
  }, [vendor?.id]);

  const handleSave = async () => {
    if (!vendor?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('vendors' as any)
        .update(form as any)
        .eq('id', vendor.id);
      if (error) throw error;
      toast({ title: 'Settings saved', variant: 'success' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
          {vendor?.status && <StatusPill status={vendor.status} />}
        </div>
        <p className="text-sm text-muted-foreground mt-1.5">
          {vendor?.business_name ? (
            <>
              Manage <span className="font-medium text-foreground">{vendor.business_name}</span>'s
              business profile, contact details, and payout account.
            </>
          ) : (
            'Update your business profile, contact details, and bank account.'
          )}
        </p>
      </div>

      {/* Commission summary strip */}
      {typeof vendor?.commission_rate === 'number' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-3 sm:gap-5">
              <div className="flex items-center gap-2.5">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Commission rate
                  </div>
                  <div className="text-sm font-semibold tabular-nums">
                    {Number(vendor.commission_rate).toFixed(2)}% per sale
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground flex-1 min-w-[200px]">
                Set by AutoLab admin. Deducted from gross sales each payout cycle.
                Contact support if you believe this should be adjusted.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <SectionCard
        icon={Building2}
        title="Business identity"
        description="How your business appears to customers and on invoices."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="biz-name">Business name</Label>
            <Input
              id="biz-name"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              placeholder="Acme Auto Sdn. Bhd."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="biz-reg">SSM / Registration no.</Label>
            <Input
              id="biz-reg"
              value={form.business_registration_no}
              onChange={(e) => setForm({ ...form, business_registration_no: e.target.value })}
              placeholder="e.g. 202301234567"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tax-id">Tax ID</Label>
            <Input
              id="tax-id"
              value={form.tax_id}
              onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="flex items-center justify-between gap-3 p-3 rounded-md border">
            <div className="min-w-0">
              <div className="text-sm font-medium">SST registered?</div>
              <p className="text-xs text-muted-foreground">Shown on customer invoices.</p>
            </div>
            <Switch
              checked={form.is_sst_registered}
              onCheckedChange={(v) => setForm({ ...form, is_sst_registered: v })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="biz-desc">Description</Label>
          <Textarea
            id="biz-desc"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="A short description of your business — what you sell, who you serve, what makes you stand out."
          />
        </div>
      </SectionCard>

      <SectionCard
        icon={Mail}
        title="Contact"
        description="Where AutoLab and customers can reach you about orders."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ct-person">Contact person</Label>
            <Input
              id="ct-person"
              value={form.contact_person}
              onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
              placeholder="Full name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-phone">Phone</Label>
            <Input
              id="ct-phone"
              type="tel"
              value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              placeholder="+60 12-345 6789"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ct-email">Business email</Label>
            <Input
              id="ct-email"
              type="email"
              value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              placeholder="hello@yourbusiness.com"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={MapPin}
        title="Address"
        description="Used for shipping origin and on tax invoices."
      >
        <AddressAutocompleteSimple
          value={form.address}
          onChange={(address, components) => {
            setForm((prev) => {
              const next = { ...prev, address };
              if (components?.city) next.city = components.city;
              if (components?.state && STATES.includes(components.state)) next.state = components.state;
              if (components?.postcode) next.postcode = components.postcode;
              return next;
            });
          }}
          label="Street address"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">State</Label>
            <Select value={form.state || undefined} onValueChange={(v) => setForm({ ...form, state: v })}>
              <SelectTrigger id="state"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postcode">Postcode</Label>
            <Input id="postcode" value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={CreditCard}
        title="Bank account"
        description="Where AutoLab deposits your monthly payouts."
        helper={
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            Encrypted at rest · used only for monthly payouts
          </span>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bank-name">Bank name</Label>
            <Input
              id="bank-name"
              value={form.bank_name}
              onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
              placeholder="e.g. Maybank"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bank-account-name">Account holder</Label>
            <Input
              id="bank-account-name"
              value={form.bank_account_name}
              onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })}
              placeholder="As shown on your bank statement"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bank-account-number">Account number</Label>
            <Input
              id="bank-account-number"
              value={form.bank_account_number}
              onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
              className="font-mono tracking-wide"
              placeholder="1234567890"
            />
          </div>
        </div>
      </SectionCard>

      {/* Save bar */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save changes
        </Button>
      </div>
    </div>
  );
}
