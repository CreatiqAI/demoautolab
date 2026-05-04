import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AddressAutocompleteSimple from '@/components/AddressAutocompleteSimple';
import { Briefcase, Building2, MapPin, CreditCard, Loader2, Check, ShieldCheck } from 'lucide-react';
import { getVendorByUserId } from '@/lib/vendorAuth';

const STATES = [
  'Johor','Kedah','Kelantan','Melaka','Negeri Sembilan','Pahang','Penang','Perak','Perlis',
  'Sabah','Sarawak','Selangor','Terengganu','Kuala Lumpur','Labuan','Putrajaya',
];

interface FormState {
  business_name: string;
  business_registration_no: string;
  tax_id: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  description: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  is_sst_registered: boolean;
}

const emptyForm: FormState = {
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
};

export default function VendorApply() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // If the signed-in user already has a vendor row, route them appropriately
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!user) {
        setCheckingExisting(false);
        return;
      }
      const v = await getVendorByUserId(user.id);
      if (cancelled) return;
      if (v) {
        setExistingStatus(v.status);
      }
      setCheckingExisting(false);
      // Pre-fill contact_email with the user's auth email
      if (!cancelled && user.email) {
        setForm((prev) => ({ ...prev, contact_email: prev.contact_email || user.email! }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): string | null => {
    if (!form.business_name.trim()) return 'Business name is required.';
    if (!form.contact_person.trim()) return 'Contact person is required.';
    if (!form.contact_phone.trim()) return 'Contact phone is required.';
    if (!form.contact_email.trim()) return 'Contact email is required.';
    if (!form.address.trim() || !form.city.trim() || !form.state.trim() || !form.postcode.trim()) {
      return 'Please complete the address (street, city, state, postcode).';
    }
    if (!form.bank_name.trim() || !form.bank_account_name.trim() || !form.bank_account_number.trim()) {
      return 'Bank account details are required for monthly payouts.';
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      toast({ title: 'Missing information', description: validationError, variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({
        title: 'Please sign in first',
        description: 'You need an account so we can link your vendor profile to your login.',
        variant: 'destructive',
      });
      navigate('/auth', { state: { from: '/vendor/apply' } });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('vendors' as any).insert({
        user_id: user.id,
        business_name: form.business_name.trim(),
        business_registration_no: form.business_registration_no.trim() || null,
        tax_id: form.tax_id.trim() || null,
        contact_person: form.contact_person.trim(),
        contact_phone: form.contact_phone.trim(),
        contact_email: form.contact_email.trim(),
        description: form.description.trim() || null,
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state,
        postcode: form.postcode.trim(),
        bank_name: form.bank_name.trim(),
        bank_account_name: form.bank_account_name.trim(),
        bank_account_number: form.bank_account_number.trim(),
        is_sst_registered: form.is_sst_registered,
        status: 'PENDING',
      } as any);
      if (error) throw error;
      toast({
        title: 'Application submitted',
        description: 'Our team will review your details within 1–2 business days. You will receive an email once approved.',
        variant: 'success',
      });
      setExistingStatus('PENDING');
    } catch (err: any) {
      toast({
        title: 'Submission failed',
        description: err?.message ?? 'Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingExisting) {
    return (
      <div className="bg-gray-50 flex flex-col">
        <Header />
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-lime-600" />
        </div>
        <Footer />
      </div>
    );
  }

  // Already applied — show status, not the form
  if (existingStatus) {
    return (
      <div className="bg-gray-50 flex flex-col">
        <Header />
        <main className="container mx-auto px-3 sm:px-6 lg:px-8 py-10 min-h-[calc(100vh-80px)] flex-1">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-lime-600" />
                Application status: {existingStatus}
              </CardTitle>
              <CardDescription>
                {existingStatus === 'PENDING'
                  ? 'Your application is under review. We typically respond within 1–2 business days.'
                  : existingStatus === 'APPROVED'
                    ? 'Welcome aboard! You can access your vendor console now.'
                    : existingStatus === 'SUSPENDED'
                      ? 'Your account is currently suspended. Please contact support.'
                      : 'Your application was not approved. Contact support if you believe this is in error.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              {existingStatus === 'APPROVED' ? (
                <Button onClick={() => navigate('/vendor/dashboard')}>Go to vendor console</Button>
              ) : (
                <Button variant="outline" onClick={() => navigate('/')}>Back to home</Button>
              )}
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 flex flex-col">
      <Header />

      <main className="container mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8 min-h-[calc(100vh-80px)] flex-1">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Briefcase className="h-6 w-6" />
              Apply to sell on AutoLab
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Become a vendor partner. List your products in our catalog and reach our customer base. We charge an 8%
              platform fee per sale; net earnings paid out monthly to your bank account.
            </p>
          </div>

          {/* Sign-in nudge if not authenticated */}
          {!user && (
            <Card className="border-amber-200 bg-amber-50/60">
              <CardContent className="py-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm text-amber-900">
                  You need an AutoLab account so we can link your vendor profile to your login.
                </div>
                <Button size="sm" onClick={() => navigate('/auth', { state: { from: '/vendor/apply' } })}>
                  Sign in / Create account
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Section: Business identity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />Business identity
              </CardTitle>
              <CardDescription>How customers and AutoLab will know your business.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="biz-name">Business name <span className="text-red-500">*</span></Label>
                  <Input id="biz-name" value={form.business_name} onChange={(e) => update('business_name', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="biz-reg">SSM / Registration no.</Label>
                  <Input id="biz-reg" value={form.business_registration_no} onChange={(e) => update('business_registration_no', e.target.value)} placeholder="e.g. 202401012345" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tax-id">Tax ID (optional)</Label>
                  <Input id="tax-id" value={form.tax_id} onChange={(e) => update('tax_id', e.target.value)} />
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex-1 flex items-center justify-between p-3 rounded-md border bg-gray-50">
                    <div>
                      <div className="text-sm font-medium">SST registered?</div>
                      <p className="text-xs text-gray-500">We'll show your SST registration on customer invoices.</p>
                    </div>
                    <Switch checked={form.is_sst_registered} onCheckedChange={(v) => update('is_sst_registered', v)} />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="biz-desc">Short description</Label>
                <Textarea
                  id="biz-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Tell us about your business — what products you sell, your specialties, etc."
                />
              </div>
            </CardContent>
          </Card>

          {/* Section: Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
              <CardDescription>Used by AutoLab admin and (where appropriate) customers.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ct-person">Contact person <span className="text-red-500">*</span></Label>
                <Input id="ct-person" value={form.contact_person} onChange={(e) => update('contact_person', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ct-phone">Phone <span className="text-red-500">*</span></Label>
                <Input id="ct-phone" type="tel" value={form.contact_phone} onChange={(e) => update('contact_phone', e.target.value)} placeholder="+60 12-345 6789" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ct-email">Business email <span className="text-red-500">*</span></Label>
                <Input id="ct-email" type="email" value={form.contact_email} onChange={(e) => update('contact_email', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Section: Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />Business address
              </CardTitle>
              <CardDescription>Where you ship from. Used internally for support and dispute resolution.</CardDescription>
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
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                  <Input id="city" value={form.city} onChange={(e) => update('city', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State <span className="text-red-500">*</span></Label>
                  <Select value={form.state || undefined} onValueChange={(v) => update('state', v)}>
                    <SelectTrigger id="state"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="postcode">Postcode <span className="text-red-500">*</span></Label>
                  <Input id="postcode" value={form.postcode} onChange={(e) => update('postcode', e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section: Bank */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />Bank account (for payouts)
              </CardTitle>
              <CardDescription>
                Monthly net earnings (after 8% platform fee) are transferred to this account. You can update these details
                later in your vendor settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bank-name">Bank name <span className="text-red-500">*</span></Label>
                <Input id="bank-name" value={form.bank_name} onChange={(e) => update('bank_name', e.target.value)} placeholder="e.g. Maybank" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank-account-name">Account holder name <span className="text-red-500">*</span></Label>
                <Input id="bank-account-name" value={form.bank_account_name} onChange={(e) => update('bank_account_name', e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="bank-account-number">Account number <span className="text-red-500">*</span></Label>
                <Input id="bank-account-number" value={form.bank_account_number} onChange={(e) => update('bank_account_number', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSubmit} disabled={submitting} className="bg-lime-600 hover:bg-lime-700">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Submit application
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
