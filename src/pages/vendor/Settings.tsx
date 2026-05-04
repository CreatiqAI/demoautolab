import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useCurrentVendor } from '@/lib/vendorAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AddressAutocompleteSimple from '@/components/AddressAutocompleteSimple';
import { Settings as SettingsIcon, Save, Loader2, Building2, MapPin, CreditCard, Mail } from 'lucide-react';

const STATES = [
  'Johor','Kedah','Kelantan','Melaka','Negeri Sembilan','Pahang','Penang','Perak','Perlis',
  'Sabah','Sarawak','Selangor','Terengganu','Kuala Lumpur','Labuan','Putrajaya',
];

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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          Vendor settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update your business profile, contact details, and bank account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />Business identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="biz-name">Business name</Label>
              <Input id="biz-name" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="biz-reg">SSM / Registration no.</Label>
              <Input id="biz-reg" value={form.business_registration_no} onChange={(e) => setForm({ ...form, business_registration_no: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax-id">Tax ID</Label>
              <Input id="tax-id" value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-md border bg-gray-50">
              <div>
                <div className="text-sm font-medium">SST registered?</div>
                <p className="text-xs text-gray-500">Shown on customer invoices.</p>
              </div>
              <Switch checked={form.is_sst_registered} onCheckedChange={(v) => setForm({ ...form, is_sst_registered: v })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="biz-desc">Description</Label>
            <Textarea id="biz-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ct-person">Contact person</Label>
            <Input id="ct-person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-phone">Phone</Label>
            <Input id="ct-phone" type="tel" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ct-email">Business email</Label>
            <Input id="ct-email" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />Bank account (for payouts)
          </CardTitle>
          <CardDescription>Monthly payouts go to this account.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bank-name">Bank name</Label>
            <Input id="bank-name" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bank-account-name">Account holder</Label>
            <Input id="bank-account-name" value={form.bank_account_name} onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bank-account-number">Account number</Label>
            <Input id="bank-account-number" value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-20 flex justify-end">
        <div className="bg-white border rounded-lg shadow-lg px-4 py-2">
          <Button onClick={handleSave} disabled={saving} className="bg-lime-600 hover:bg-lime-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
