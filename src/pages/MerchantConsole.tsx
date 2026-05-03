import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AddressAutocompleteSimple from '@/components/AddressAutocompleteSimple';
import {
  Store,
  CreditCard,
  Upload,
  Save,
  Lock,
  Check,
  X as XIcon,
  Image as ImageIcon,
  Eye,
  Clock,
  Gift,
  MapPin,
  Phone,
  Mail,
  Package,
  Calendar,
  Settings,
  AlertTriangle,
  Loader2,
  Globe,
} from 'lucide-react';

type TabType = 'dashboard' | 'profile' | 'subscription';

interface PartnershipData {
  id: string;
  merchant_id: string;
  business_name: string;
  business_type: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  description: string;
  services_offered: string[];
  subscription_plan: string;
  subscription_status: string;
  subscription_start_date: string;
  subscription_end_date: string;
  total_views: number;
  is_featured: boolean;
  admin_approved: boolean;
  is_publicly_listed: boolean;
  logo_url: string | null;
  cover_image_url: string | null;
  shop_photos: string[];
}

const BUSINESS_CATEGORIES = [
  'Auto Accessories Shop',
  'Performance Workshop',
  'Tinting Specialist',
  'Car Care Center',
  'Car Audio Specialist',
  'General Workshop',
];

const STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang',
  'Penang', 'Perak', 'Perlis', 'Sabah', 'Sarawak', 'Selangor',
  'Terengganu', 'Kuala Lumpur', 'Labuan', 'Putrajaya',
];

const SERVICES = [
  'Installation Service', 'Repair & Maintenance', 'Consultation',
  'Product Sourcing', 'Warranty Service', 'Custom Orders',
  'Delivery Available', 'Car Wash',
];

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 5;

interface ProfileFormState {
  business_name: string;
  business_type: string;
  description: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  services_offered: string[];
}

const emptyProfileFormState: ProfileFormState = {
  business_name: '',
  business_type: '',
  description: '',
  contact_phone: '',
  contact_email: '',
  address: '',
  city: '',
  state: '',
  postcode: '',
  services_offered: [],
};

function profileStateFromPartnership(p: PartnershipData | null): ProfileFormState {
  if (!p) return emptyProfileFormState;
  return {
    business_name: p.business_name ?? '',
    business_type: p.business_type ?? '',
    description: p.description ?? '',
    contact_phone: p.contact_phone ?? '',
    contact_email: p.contact_email ?? '',
    address: p.address ?? '',
    city: p.city ?? '',
    state: p.state ?? '',
    postcode: p.postcode ?? '',
    services_offered: p.services_offered ?? [],
  };
}

export default function MerchantConsole() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [partnership, setPartnership] = useState<PartnershipData | null>(null);
  const [isMerchant, setIsMerchant] = useState(false);

  // Profile form state lives at the parent level so it survives tab switches.
  // Previously it lived inside ProfileTab; switching tabs would unmount the
  // component and discard unsaved input — confusing UX. Now switching tabs
  // just hides the form, the values stay until the user saves or refreshes.
  const [profileFormData, setProfileFormData] = useState<ProfileFormState>(
    () => profileStateFromPartnership(partnership)
  );
  const [profileShopPhotos, setProfileShopPhotos] = useState<string[]>([]);
  const [profileIsPubliclyListed, setProfileIsPubliclyListed] = useState<boolean>(false);
  // True when the form has been "rehydrated" from a freshly-fetched
  // partnership and is safe to overwrite from the prop. We only sync the
  // local state from partnership ONCE — subsequent prop changes (from
  // refetch after save) only touch the listing flag, never blow away the
  // user's typing.
  const profileHydrated = useRef(false);

  useEffect(() => {
    if (!partnership) return;
    if (!profileHydrated.current) {
      setProfileFormData(profileStateFromPartnership(partnership));
      setProfileShopPhotos(partnership.shop_photos ?? []);
      setProfileIsPubliclyListed(partnership.is_publicly_listed ?? false);
      profileHydrated.current = true;
    }
  }, [partnership]);

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: Store },
    { id: 'profile' as TabType, label: 'Business Profile', icon: Settings },
    { id: 'subscription' as TabType, label: 'Subscription', icon: CreditCard },
  ];

  useEffect(() => {
    void checkMerchantAndFetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (partnership?.subscription_end_date) {
      const isExpired = new Date(partnership.subscription_end_date) < new Date();
      if (isExpired) setActiveTab('subscription');
    }
  }, [partnership]);

  const checkMerchantAndFetchData = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      setLoading(true);
      const { data: profile } = await supabase
        .from('customer_profiles')
        .select('customer_type, id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.customer_type !== 'merchant') {
        toast({ title: 'Access Denied', description: 'This area is only for merchant accounts.', variant: 'destructive' });
        navigate('/');
        return;
      }

      if (profile?.id) {
        const { data: partnershipData } = await supabase
          .from('premium_partnerships' as any)
          .select('*')
          .eq('merchant_id', profile.id)
          .maybeSingle();
        if (!partnershipData || (partnershipData as any).subscription_plan !== 'panel') {
          toast({
            title: 'Panel Access Only',
            description: 'The Merchant Console is only available for Panel merchants. Your merchant info is in Settings.',
            variant: 'destructive',
          });
          navigate('/settings');
          return;
        }
        setPartnership(partnershipData as any);
      }
      setIsMerchant(true);
    } catch {
      // swallowed; UI shows nothing useful here
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 flex flex-col">
        <Header />
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center flex-1">
          <div className="text-center">
            <Store className="h-12 w-12 animate-pulse mx-auto mb-4 text-lime-600" />
            <p className="text-gray-500">Loading Merchant Console...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  if (!isMerchant) return null;

  const subscriptionExpired = partnership?.subscription_end_date
    ? new Date(partnership.subscription_end_date) < new Date()
    : false;
  const subscriptionActive = partnership?.subscription_status === 'ACTIVE' && partnership?.admin_approved;

  return (
    <div className="bg-gray-50 flex flex-col">
      <Header />

      <main className="container mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8 min-h-[calc(100vh-80px)] flex-1">
        {/* Page header — single source of truth for title + status */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Merchant Console</h1>
            <p className="text-sm text-gray-500 mt-1">
              {partnership?.business_name ?? 'Your business'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={subscriptionActive && !subscriptionExpired ? 'default' : 'secondary'}
              className={
                subscriptionExpired
                  ? 'bg-red-100 text-red-700 border-red-300'
                  : subscriptionActive
                    ? 'bg-green-100 text-green-700 border-green-300'
                    : ''
              }
            >
              {subscriptionExpired ? 'Expired' : subscriptionActive ? 'Active' : 'Pending'}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {partnership?.subscription_plan ?? 'No plan'}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-6 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`group inline-flex items-center gap-2 px-1 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-lime-600 text-lime-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        {activeTab === 'dashboard' && <DashboardTab partnership={partnership} />}
        {/* Profile tab is hidden, not unmounted, so unsaved input survives
            tab switches. Display flips off when not active. */}
        <div hidden={activeTab !== 'profile'}>
          <ProfileTab
            partnership={partnership}
            onUpdate={() => {
              // After save, re-allow rehydration from the next fetched
              // partnership so the form picks up any server-side
              // normalisation (e.g. trimmed whitespace).
              profileHydrated.current = false;
              void checkMerchantAndFetchData();
            }}
            formData={profileFormData}
            setFormData={setProfileFormData}
            shopPhotos={profileShopPhotos}
            setShopPhotos={setProfileShopPhotos}
            isPubliclyListed={profileIsPubliclyListed}
            setIsPubliclyListed={setProfileIsPubliclyListed}
          />
        </div>
        {activeTab === 'subscription' && <SubscriptionTab partnership={partnership} />}
      </main>

      <Footer />
    </div>
  );
}

// ===========================================================================
// Dashboard tab
// ===========================================================================
function DashboardTab({ partnership }: { partnership: PartnershipData | null }) {
  const daysRemaining = partnership?.subscription_end_date
    ? Math.ceil((new Date(partnership.subscription_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const stats = [
    { label: 'Profile Views', value: partnership?.total_views ?? 0, icon: Eye, hint: 'Total views' },
    { label: 'Services', value: partnership?.services_offered?.length ?? 0, icon: Package, hint: 'Listed services' },
    { label: 'Gallery Photos', value: partnership?.shop_photos?.length ?? 0, icon: ImageIcon, hint: 'Uploaded images' },
    { label: 'Subscription', value: daysRemaining !== null ? `${daysRemaining}d` : '—', icon: Calendar, hint: 'Days remaining' },
  ];

  return (
    <div className="space-y-6">
      {/* Pending banner */}
      {partnership && !partnership.admin_approved && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-orange-900 mb-1">Pending admin approval</h3>
                <p className="text-sm text-orange-700">
                  Your subscription is being reviewed. Your shop will be visible once approved (1-2 business days).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(({ label, value, icon: Icon, hint }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">{label}</CardDescription>
              <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500">{hint}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-column info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row icon={MapPin} label="Address">
              <div>{partnership?.address || <span className="text-gray-400">Not set</span>}</div>
              {(partnership?.city || partnership?.state || partnership?.postcode) && (
                <div className="text-xs text-gray-500">
                  {[partnership?.city, partnership?.state, partnership?.postcode].filter(Boolean).join(', ')}
                </div>
              )}
            </Row>
            <Row icon={Phone} label="Phone">
              {partnership?.contact_phone || <span className="text-gray-400">Not set</span>}
            </Row>
            <Row icon={Mail} label="Email">
              <span className="break-all">{partnership?.contact_email || <span className="text-gray-400">Not set</span>}</span>
            </Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />Subscription Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Plan">
              <Badge variant="outline" className="capitalize">{partnership?.subscription_plan || 'No plan'}</Badge>
            </Row>
            <Row label="Status">
              <Badge
                className={
                  partnership?.admin_approved && partnership?.subscription_status === 'ACTIVE'
                    ? 'bg-green-100 text-green-700 border-green-300'
                    : 'bg-amber-100 text-amber-700 border-amber-300'
                }
              >
                {partnership?.admin_approved && partnership?.subscription_status === 'ACTIVE' ? 'Active' : 'Pending'}
              </Badge>
            </Row>
            {partnership?.subscription_end_date && (
              <Row label="Valid until">
                {new Date(partnership.subscription_end_date).toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Row>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon?: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 mb-0.5">{label}</div>
        <div className="text-sm font-medium text-gray-900">{children}</div>
      </div>
    </div>
  );
}

// ===========================================================================
// Profile tab
// ===========================================================================
function ProfileTab({
  partnership,
  onUpdate,
  formData,
  setFormData,
  shopPhotos,
  setShopPhotos,
  isPubliclyListed,
  setIsPubliclyListed,
}: {
  partnership: PartnershipData | null;
  onUpdate: () => void;
  formData: ProfileFormState;
  setFormData: (next: ProfileFormState | ((prev: ProfileFormState) => ProfileFormState)) => void;
  shopPhotos: string[];
  setShopPhotos: (next: string[] | ((prev: string[]) => string[])) => void;
  isPubliclyListed: boolean;
  setIsPubliclyListed: (next: boolean) => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const photoCount = shopPhotos.length;
  const minMet = photoCount >= MIN_PHOTOS;

  const toggleService = (service: string) => {
    setFormData((prev) => ({
      ...prev,
      services_offered: prev.services_offered.includes(service)
        ? prev.services_offered.filter((s) => s !== service)
        : [...prev.services_offered, service],
    }));
  };

  const handleSave = async () => {
    if (!partnership?.id) return;
    if (!minMet) {
      toast({
        title: 'Need more photos',
        description: `Please upload at least ${MIN_PHOTOS} photos before saving.`,
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('premium_partnerships' as any)
        .update({
          ...formData,
          shop_photos: shopPhotos,
          cover_image_url: shopPhotos[0] ?? null,
          is_publicly_listed: isPubliclyListed,
        })
        .eq('id', partnership.id);
      if (error) throw error;
      toast({ title: 'Profile saved', description: 'Your business profile has been updated.', variant: 'success' });
      onUpdate();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section: Photos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />Shop Photos
          </CardTitle>
          <CardDescription>
            Upload {MIN_PHOTOS}–{MAX_PHOTOS} photos of your shop. The first photo is used as the cover image on Find Shops.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShopPhotosGrid
            value={shopPhotos}
            onChange={setShopPhotos}
            partnershipId={partnership?.id}
            min={MIN_PHOTOS}
            max={MAX_PHOTOS}
          />
          {!minMet && (
            <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>You have {photoCount} photo{photoCount === 1 ? '' : 's'}. {MIN_PHOTOS - photoCount} more required before you can save.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section: Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business Identity</CardTitle>
          <CardDescription>How customers find and recognize your shop.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="business_name">Shop Name</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder="e.g. AutoLab Petaling Jaya"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="business_type">Category</Label>
              <Select
                value={formData.business_type || undefined}
                onValueChange={(v) => setFormData({ ...formData, business_type: v })}
              >
                <SelectTrigger id="business_type">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tell customers about your shop, your specialties, and what makes you stand out."
            />
            <div className="text-xs text-gray-500">{formData.description.length}/500 characters</div>
          </div>
        </CardContent>
      </Card>

      {/* Section: Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
          <CardDescription>How customers can reach your shop directly.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact_phone">Phone</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+60 12-345 6789"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_email">Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="shop@example.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section: Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Location</CardTitle>
          <CardDescription>Where your shop is. Used in Find Shops listings and directions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Places autocomplete. When the merchant picks a Google
              suggestion the second `components` arg is populated with
              structured city / state / postcode pulled from
              address_components — we auto-fill those fields below so the
              merchant doesn't have to retype them. They remain editable
              as a fallback. */}
          <AddressAutocompleteSimple
            value={formData.address}
            onChange={(address, components) =>
              setFormData((prev) => {
                const next: ProfileFormState = { ...prev, address };
                if (components?.city) next.city = components.city;
                if (components?.state && STATES.includes(components.state)) {
                  next.state = components.state;
                }
                if (components?.postcode) next.postcode = components.postcode;
                return next;
              })
            }
            placeholder="Type address like 'Nadayu28' or 'KLCC'..."
            label="Street address"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Select
                value={formData.state || undefined}
                onValueChange={(v) => setFormData({ ...formData, state: v })}
              >
                <SelectTrigger id="state">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                placeholder="47301"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section: Public Listing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />Public Listing
          </CardTitle>
          <CardDescription>
            Control whether your shop appears on the public Find Shops page. Off by default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 p-4 rounded-md border bg-gray-50">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">
                Show on Find Shops
              </div>
              <p className="text-xs text-gray-500 mt-1">
                When enabled, your business appears at <code className="px-1 rounded bg-white border">/find-shops</code> for customers to discover. Your panel subscription must be active.
              </p>
              {!isPubliclyListed && (
                <p className="text-xs text-amber-700 mt-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  Currently hidden from the public listing.
                </p>
              )}
            </div>
            <Switch
              checked={isPubliclyListed}
              onCheckedChange={setIsPubliclyListed}
              aria-label="Show on Find Shops"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section: Services */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Services Offered</CardTitle>
          <CardDescription>Pick everything that applies. Shown on your Find Shops listing.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {SERVICES.map((service) => {
              const checked = formData.services_offered.includes(service);
              return (
                <label
                  key={service}
                  className={`flex items-center gap-2 cursor-pointer p-2.5 border rounded-md transition-colors ${
                    checked ? 'border-lime-500 bg-lime-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleService(service)}
                  />
                  <span className="text-sm">{service}</span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sticky save bar */}
      <div className="sticky bottom-4 z-20 flex justify-end">
        <div className="bg-white border rounded-lg shadow-lg px-4 py-2 flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden sm:inline">
            {minMet ? 'Ready to save.' : `Need at least ${MIN_PHOTOS} photos.`}
          </span>
          <Button
            onClick={handleSave}
            disabled={saving || !minMet}
            className="bg-lime-600 hover:bg-lime-700"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// ShopPhotosGrid — multi-image upload (2-5 slots, first = cover)
// ===========================================================================
function ShopPhotosGrid({
  value,
  onChange,
  partnershipId,
  min,
  max,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  partnershipId?: string;
  min: number;
  max: number;
}) {
  const { toast } = useToast();
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!partnershipId) {
      toast({ title: 'Save profile first', description: 'Cannot upload photos until your partnership exists.', variant: 'destructive' });
      return null;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Only image files are allowed.', variant: 'destructive' });
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Image must be smaller than 5MB.', variant: 'destructive' });
      return null;
    }
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `shop-photos/${partnershipId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('premium-partners').upload(path, file, { upsert: true });
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return null;
    }
    const { data } = supabase.storage.from('premium-partners').getPublicUrl(path);
    return data.publicUrl;
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIdx(idx);
    const url = await uploadFile(file);
    setUploadingIdx(null);
    if (!url) return;
    if (idx < value.length) {
      // Replace existing
      const next = [...value];
      next[idx] = url;
      onChange(next);
    } else {
      onChange([...value, url]);
    }
    e.target.value = '';
  };

  const removeAt = (idx: number) => {
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
  };

  // Render `max` slots: filled slots show image + actions, empty slots show upload tile.
  const slotCount = max;
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: slotCount }).map((_, idx) => {
          const url = value[idx];
          const isUploading = uploadingIdx === idx;
          if (url) {
            return (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border bg-gray-50 group">
                <img src={url} alt={`Shop ${idx + 1}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <Badge className="absolute top-1.5 left-1.5 bg-lime-600 text-white text-[10px]">
                    Cover
                  </Badge>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="cursor-pointer p-1.5 rounded-full bg-white text-gray-700 hover:bg-lime-50">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onPick(e, idx)}
                      disabled={isUploading}
                    />
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </label>
                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    disabled={isUploading}
                    className="p-1.5 rounded-full bg-white text-red-600 hover:bg-red-50"
                    title="Remove"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          }
          // Empty slot
          const isFirstEmpty = idx === value.length;
          const beyondMax = idx >= max;
          if (beyondMax) return null;
          return (
            <label
              key={idx}
              className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
                isFirstEmpty
                  ? 'border-lime-400 bg-lime-50/40 hover:border-lime-600 text-lime-700'
                  : 'border-gray-200 bg-gray-50/60 hover:border-gray-400 text-gray-400'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPick(e, idx)}
                disabled={isUploading}
              />
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <Upload className="h-6 w-6 mb-1" />
                  <span className="text-xs">Photo {idx + 1}</span>
                  {idx < min && <span className="text-[10px] text-amber-600 mt-0.5">Required</span>}
                </>
              )}
            </label>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        {value.length}/{max} photos · Drag the cover photo into slot 1 by removing and re-uploading. Max 5MB per photo.
      </div>
    </div>
  );
}

// ===========================================================================
// Subscription tab
// ===========================================================================
function SubscriptionTab({ partnership }: { partnership: PartnershipData | null }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const currentPlan = partnership?.subscription_plan || 'none';
  const isActive = partnership?.subscription_status === 'ACTIVE' && partnership?.admin_approved;
  const endDate = partnership?.subscription_end_date ? new Date(partnership.subscription_end_date) : null;
  const startDate = partnership?.subscription_start_date ? new Date(partnership.subscription_start_date) : null;
  const isExpired = endDate ? endDate < new Date() : false;

  // Days remaining + total period length, used to draw a progress bar.
  const daysRemaining = endDate
    ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const periodTotalDays = startDate && endDate
    ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    : null;
  const periodElapsed = periodTotalDays && daysRemaining !== null
    ? Math.max(0, Math.min(periodTotalDays, periodTotalDays - daysRemaining))
    : null;
  const progressPct = periodTotalDays && periodElapsed !== null
    ? Math.min(100, Math.round((periodElapsed / periodTotalDays) * 100))
    : null;

  const handleRenewSubscription = (plan: 'professional' | 'panel') => {
    if (!user || !partnership) return;
    const amount = plan === 'professional' ? 99 : 350;
    navigate('/payment-gateway', {
      state: {
        orderData: {
          orderId: `SUB-${partnership.id}-${Date.now()}`,
          orderNumber: `RENEWAL-${partnership.id.slice(0, 8).toUpperCase()}`,
          total: amount,
          paymentMethod: '',
          customerName: partnership.business_name,
          customerEmail: partnership.contact_email,
        },
        isSubscriptionRenewal: true,
        subscriptionPlan: plan,
        partnershipId: partnership.id,
      },
    });
  };

  // Status palette for the summary card / status badge
  const statusPalette = isExpired
    ? { ring: 'border-red-200', bg: 'bg-red-50/60', accent: 'text-red-700', dot: 'bg-red-500', label: 'Expired' }
    : isActive
      ? { ring: 'border-emerald-200', bg: 'bg-emerald-50/60', accent: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Active' }
      : { ring: 'border-amber-200', bg: 'bg-amber-50/60', accent: 'text-amber-700', dot: 'bg-amber-500', label: 'Pending' };

  return (
    <div className="space-y-6">
      {/* Active subscription summary — informative hero */}
      {partnership && currentPlan !== 'none' && (
        <Card className={`${statusPalette.ring} ${statusPalette.bg}`}>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* Plan + status */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current plan</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-semibold capitalize">{currentPlan}</span>
                  {currentPlan === 'panel' && (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                      <Sparkles className="h-3 w-3 mr-1" />Authorized
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusPalette.dot}`} />
                  <span className={statusPalette.accent + ' font-medium'}>{statusPalette.label}</span>
                  {!isActive && !isExpired && <span className="text-gray-500">— admin review</span>}
                </div>
              </div>

              {/* Period info */}
              <div className="space-y-2 md:border-l md:pl-6">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Period</div>
                <div className="text-sm text-gray-900">
                  {startDate ? startDate.toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                  <span className="text-gray-400 mx-1.5">→</span>
                  {endDate ? endDate.toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                </div>
                {progressPct !== null && (
                  <div className="space-y-1">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isExpired ? 'bg-red-500' : progressPct >= 85 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      {isExpired
                        ? `Expired ${Math.abs(daysRemaining ?? 0)} days ago`
                        : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`}
                    </div>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="space-y-2 md:border-l md:pl-6 md:flex md:flex-col md:justify-center">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Renewal</div>
                {isExpired ? (
                  <>
                    <p className="text-xs text-gray-600">Reactivate to keep your shop publicly visible.</p>
                    <Button
                      size="sm"
                      onClick={() => handleRenewSubscription(currentPlan as 'professional' | 'panel')}
                      className="bg-lime-600 hover:bg-lime-700 w-fit"
                    >
                      Renew now
                    </Button>
                  </>
                ) : isActive && daysRemaining !== null && daysRemaining <= 30 ? (
                  <>
                    <p className="text-xs text-gray-600">Subscription ending soon — renew to avoid gaps.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRenewSubscription(currentPlan as 'professional' | 'panel')}
                      className="w-fit"
                    >
                      Renew early
                    </Button>
                  </>
                ) : isActive ? (
                  <p className="text-xs text-gray-600">Auto-renewal not enabled. We'll remind you 30 days before expiry.</p>
                ) : (
                  <p className="text-xs text-gray-600">Awaiting admin approval. You'll be notified when active.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan cards */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Available plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Professional */}
          <PlanCard
            tone="light"
            name="Professional"
            tagline="Essential B2B features"
            price={99}
            period="year"
            isCurrent={currentPlan === 'professional'}
            recommended={false}
            perks={[
              { type: 'on', label: 'B2B merchant pricing' },
              { type: 'on', label: 'Installation guides library' },
              { type: 'gift', label: 'RM 50 welcome voucher' },
              { type: 'off', label: 'Find Shops public listing' },
            ]}
            cta={{
              label: currentPlan === 'professional' ? 'Current plan' : 'Subscribe',
              disabled: currentPlan === 'professional',
              onClick: () => toast({ title: 'Contact admin', description: 'Please contact our team to subscribe.' }),
            }}
          />

          {/* Panel */}
          <PlanCard
            tone="dark"
            name="Panel"
            subname="Authorized"
            tagline="Top-tier visibility for authorized shops"
            price={350}
            period="month"
            isCurrent={currentPlan === 'panel'}
            recommended
            inviteOnly
            perks={[
              { type: 'on', label: 'Everything in Professional' },
              { type: 'on', label: 'Featured Find Shops listing', highlight: true },
              { type: 'on', label: 'Authorized Panel badge', highlight: true },
              { type: 'on', label: 'Priority support' },
            ]}
            cta={{
              label: currentPlan === 'panel' ? 'Current plan' : 'By invitation only',
              disabled: true,
              icon: 'lock',
            }}
          />
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Need to change plan or have billing questions?{' '}
          <a href="mailto:sales@autolab.my" className="text-lime-700 hover:underline">Contact our team</a>.
        </p>
      </div>
    </div>
  );
}

interface PlanCardProps {
  tone: 'light' | 'dark';
  name: string;
  subname?: string;
  tagline: string;
  price: number;
  period: 'year' | 'month';
  isCurrent: boolean;
  recommended?: boolean;
  inviteOnly?: boolean;
  perks: Array<{ type: 'on' | 'off' | 'gift'; label: string; highlight?: boolean }>;
  cta: {
    label: string;
    disabled: boolean;
    onClick?: () => void;
    icon?: 'lock';
  };
}

function PlanCard({ tone, name, subname, tagline, price, period, isCurrent, recommended, inviteOnly, perks, cta }: PlanCardProps) {
  const isDark = tone === 'dark';
  return (
    <Card
      className={`relative overflow-hidden transition-all ${
        isDark
          ? 'bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white border-gray-800'
          : 'bg-white'
      } ${isCurrent ? (isDark ? 'ring-2 ring-amber-400 shadow-lg' : 'ring-2 ring-lime-500 shadow-lg') : ''}`}
    >
      {/* Top corner ribbon — Recommended (when not current) or Current */}
      {isCurrent ? (
        <div className="absolute top-0 right-0">
          <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
            isDark ? 'bg-amber-500 text-white' : 'bg-lime-600 text-white'
          } rounded-bl-md`}>
            Current plan
          </div>
        </div>
      ) : recommended ? (
        <div className="absolute top-0 right-0">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide bg-amber-400 text-gray-900 rounded-bl-md">
            Recommended
          </div>
        </div>
      ) : null}

      <CardHeader className="space-y-1.5 pb-4">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{name}</span>
          {subname && (
            <span className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-amber-400' : 'text-gray-500'}`}>
              {subname}
            </span>
          )}
        </div>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tagline}</p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>RM</span>
          <span className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{price}</span>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/{period}</span>
        </div>

        {/* Perks */}
        <ul className="space-y-2">
          {perks.map((perk, idx) => {
            const Icon = perk.type === 'gift' ? Gift : perk.type === 'off' ? XIcon : Check;
            const iconClass =
              perk.type === 'off'
                ? isDark ? 'text-gray-500' : 'text-gray-400'
                : perk.type === 'gift'
                  ? isDark ? 'text-amber-400' : 'text-lime-600'
                  : isDark ? 'text-amber-400' : 'text-lime-600';
            const textClass =
              perk.type === 'off'
                ? isDark ? 'text-gray-500 line-through' : 'text-gray-400 line-through'
                : isDark
                  ? perk.highlight ? 'text-white font-medium' : 'text-gray-200'
                  : 'text-gray-700';
            return (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconClass}`} />
                <span className={textClass}>{perk.label}</span>
              </li>
            );
          })}
        </ul>

        {/* CTA */}
        <Button
          disabled={cta.disabled}
          onClick={cta.onClick}
          className={`w-full ${
            isCurrent
              ? isDark ? 'bg-white/10 hover:bg-white/10 text-white cursor-default' : 'bg-lime-50 hover:bg-lime-50 text-lime-700 cursor-default border border-lime-200'
              : isDark
                ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
                : 'bg-lime-600 hover:bg-lime-700 text-white'
          }`}
        >
          {cta.icon === 'lock' && <Lock className="h-4 w-4 mr-2" />}
          {isCurrent && <Check className="h-4 w-4 mr-2" />}
          {cta.label}
        </Button>

        {inviteOnly && !isCurrent && (
          <p className="text-[11px] text-gray-400 text-center -mt-2">
            By invitation only — admin promotes selected merchants.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

