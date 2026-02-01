import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  Store,
  CreditCard,
  Search,
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
  ExternalLink,
  Settings,
  Users,
  DollarSign
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
  logo_url: string | null;
  cover_image_url: string | null;
  shop_photos: string[];
}

const MerchantConsole = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [partnership, setPartnership] = useState<PartnershipData | null>(null);
  const [isMerchant, setIsMerchant] = useState(false);

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: Store },
    { id: 'profile' as TabType, label: 'Business Profile', icon: Settings },
    { id: 'subscription' as TabType, label: 'Subscription', icon: CreditCard },
  ];

  useEffect(() => {
    checkMerchantAndFetchData();
  }, [user]);

  // Auto-open Subscription tab if subscription is expired
  useEffect(() => {
    if (partnership?.subscription_end_date) {
      const isExpired = new Date(partnership.subscription_end_date) < new Date();
      if (isExpired) {
        setActiveTab('subscription');
      }
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
        .single();

      if (profile?.customer_type !== 'merchant') {
        toast({
          title: 'Access Denied',
          description: 'This area is only for merchant accounts.',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }

      setIsMerchant(true);

      if (profile?.id) {
        const { data: partnershipData } = await supabase
          .from('premium_partnerships' as any)
          .select('*')
          .eq('merchant_id', profile.id)
          .single();

        setPartnership(partnershipData as any);
      }
    } catch (error) {
      console.error('Error fetching merchant data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <Store className="h-12 w-12 animate-pulse mx-auto mb-4 text-lime-600" />
            <p className="text-gray-500">Loading Merchant Console...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isMerchant) {
    return null;
  }

  const handleTabClick = (tab: TabType, locked: boolean) => {
    if (locked) {
      toast({
        title: 'Subscription Required',
        description: 'Installation Guides require Professional or Panel subscription.',
        variant: 'destructive'
      });
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="flex-1">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Merchant Console</h1>
            <p className="text-sm text-gray-500 mt-1">{partnership?.business_name}</p>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant={
                partnership?.subscription_status === 'ACTIVE' && partnership?.admin_approved
                  ? 'default'
                  : 'secondary'
              } className="text-xs">
                {partnership?.subscription_status === 'ACTIVE' && partnership?.admin_approved ? 'Active' : 'Pending'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {partnership?.subscription_plan || 'No Plan'}
              </Badge>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id, item.locked || false)}
                    className={`group inline-flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      isActive
                        ? 'border-lime-600 text-lime-700'
                        : item.locked
                        ? 'border-transparent text-gray-300 cursor-not-allowed'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {item.locked ? <Lock className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'dashboard' && <DashboardTab partnership={partnership} />}
            {activeTab === 'profile' && <ProfileTab partnership={partnership} onUpdate={checkMerchantAndFetchData} />}
            {activeTab === 'subscription' && <SubscriptionTab partnership={partnership} onUpdate={checkMerchantAndFetchData} />}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

// Dashboard Tab
const DashboardTab = ({ partnership }: { partnership: PartnershipData | null }) => {
  const getDaysRemaining = () => {
    if (!partnership?.subscription_end_date) return null;
    const endDate = new Date(partnership.subscription_end_date);
    const now = new Date();
    return Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysRemaining();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {partnership?.business_name || 'Merchant'}!</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your business and track your performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Profile Views</CardDescription>
            <CardTitle className="text-2xl">{partnership?.total_views || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">Total views</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Services</CardDescription>
            <CardTitle className="text-2xl">{partnership?.services_offered?.length || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">Listed services</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Gallery Photos</CardDescription>
            <CardTitle className="text-2xl">{partnership?.shop_photos?.length || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">Uploaded images</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Subscription</CardDescription>
            <CardTitle className="text-2xl">{daysRemaining !== null ? `${daysRemaining}d` : 'N/A'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">Days remaining</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{partnership?.address || 'Not set'}</p>
                <p className="text-xs text-gray-500">{partnership?.city}, {partnership?.state} {partnership?.postcode}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{partnership?.contact_phone || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 break-all">{partnership?.contact_email || 'Not set'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-2">Current Plan</p>
              <Badge className="text-xs">{partnership?.subscription_plan || 'No Plan'}</Badge>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Status</p>
              <Badge variant={
                partnership?.admin_approved && partnership?.subscription_status === 'ACTIVE'
                  ? 'default'
                  : 'secondary'
              } className="text-xs">
                {partnership?.admin_approved && partnership?.subscription_status === 'ACTIVE' ? 'Active' : 'Pending'}
              </Badge>
            </div>
            {partnership?.subscription_end_date && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Valid Until</p>
                <p className="text-sm font-medium">
                  {new Date(partnership.subscription_end_date).toLocaleDateString('en-MY', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Banner */}
      {partnership && !partnership.admin_approved && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-orange-900 mb-1">Pending Admin Approval</h3>
                <p className="text-sm text-orange-700">
                  Your subscription is being reviewed. Your shop will be visible once approved (1-2 business days).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Profile Tab
const ProfileTab = ({ partnership, onUpdate }: { partnership: PartnershipData | null, onUpdate: () => void }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [shopPhotos, setShopPhotos] = useState<string[]>(partnership?.shop_photos || []);
  const [formData, setFormData] = useState({
    business_name: partnership?.business_name || '',
    business_type: partnership?.business_type || '',
    description: partnership?.description || '',
    contact_phone: partnership?.contact_phone || '',
    contact_email: partnership?.contact_email || '',
    address: partnership?.address || '',
    city: partnership?.city || '',
    state: partnership?.state || '',
    postcode: partnership?.postcode || '',
    services_offered: partnership?.services_offered || [],
  });

  const SERVICES = [
    'Installation Service', 'Repair & Maintenance', 'Consultation', 'Product Sourcing',
    'Warranty Service', 'Custom Orders', 'Delivery Available', 'Car Wash'
  ];

  const handleServiceToggle = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services_offered: prev.services_offered.includes(service)
        ? prev.services_offered.filter(s => s !== service)
        : [...prev.services_offered, service]
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !partnership?.id) return;

    const file = e.target.files[0];

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid File', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Image must be less than 5MB', variant: 'destructive' });
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${partnership.id}-${Date.now()}.${fileExt}`;
    const filePath = `shop-photos/${fileName}`;

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('premium-partners')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('premium-partners')
        .getPublicUrl(filePath);

      const newPhotoUrl = urlData.publicUrl;
      const updatedPhotos = [newPhotoUrl, ...shopPhotos.filter(p => p !== newPhotoUrl)];
      setShopPhotos(updatedPhotos);

      const { error: updateError } = await supabase
        .from('premium_partnerships' as any)
        .update({ shop_photos: updatedPhotos, cover_image_url: newPhotoUrl })
        .eq('id', partnership.id);

      if (updateError) throw updateError;

      toast({ title: 'Success', description: 'Image uploaded successfully!' });
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!partnership?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('premium_partnerships' as any)
        .update({ ...formData, shop_photos: shopPhotos })
        .eq('id', partnership.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Profile updated successfully!' });
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const displayImage = shopPhotos?.[0] || partnership?.cover_image_url;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Business Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your shop information and listing details</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Storefront Image</label>
              <label className="aspect-[4/3] bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-lime-600 group relative overflow-hidden">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                {displayImage ? (
                  <img src={displayImage} alt="Storefront" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <ImageIcon className="w-10 h-10 mb-2" />
                    <span className="text-xs">No image</span>
                  </div>
                )}
                <div className={`absolute inset-0 bg-black/50 ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity flex items-center justify-center`}>
                  {uploading ? (
                    <div className="text-white text-xs">Uploading...</div>
                  ) : (
                    <div className="flex flex-col items-center text-white">
                      <Upload className="w-6 h-6 mb-1" />
                      <span className="text-xs">Upload Image</span>
                    </div>
                  )}
                </div>
              </label>

              {shopPhotos && shopPhotos.length > 1 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">Gallery ({shopPhotos.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {shopPhotos.slice(0, 6).map((photo, idx) => (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                        <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Form */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Shop Name</label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                  <select
                    value={formData.business_type}
                    onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                  >
                    <option value="">Select Category</option>
                    <option value="Auto Accessories Shop">Auto Accessories Shop</option>
                    <option value="Performance Workshop">Performance Workshop</option>
                    <option value="Tinting Specialist">Tinting Specialist</option>
                    <option value="Car Care Center">Car Care Center</option>
                    <option value="Car Audio Specialist">Car Audio Specialist</option>
                    <option value="General Workshop">General Workshop</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                  placeholder="Tell customers about your business..."
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                  >
                    <option value="">Select</option>
                    {['Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Penang', 'Perak', 'Perlis', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 'Kuala Lumpur', 'Labuan', 'Putrajaya'].map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Postcode</label>
                  <input
                    type="text"
                    value={formData.postcode}
                    onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Services Offered</label>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICES.map(service => (
                    <label key={service} className="flex items-center gap-2 cursor-pointer p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.services_offered.includes(service)}
                        onChange={() => handleServiceToggle(service)}
                        className="w-4 h-4 text-lime-600 border-gray-300 rounded focus:ring-lime-500"
                      />
                      <span className="text-xs">{service}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-lime-600 hover:bg-lime-700">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Subscription Tab
const SubscriptionTab = ({ partnership }: { partnership: PartnershipData | null }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const currentPlan = partnership?.subscription_plan || 'none';
  const isActive = partnership?.subscription_status === 'ACTIVE' && partnership?.admin_approved;

  // Check if subscription is expired
  const isExpired = partnership?.subscription_end_date
    ? new Date(partnership.subscription_end_date) < new Date()
    : false;
  const isPending = !partnership?.admin_approved && partnership?.subscription_status !== 'EXPIRED';

  const handleRenewSubscription = async (plan: 'professional' | 'panel') => {
    if (!user || !partnership) return;

    const amount = plan === 'professional' ? 99 : 350;
    const period = plan === 'professional' ? 'year' : 'month';

    // Navigate to payment gateway with subscription renewal data
    navigate('/payment-gateway', {
      state: {
        orderData: {
          orderId: `SUB-${partnership.id}-${Date.now()}`,
          orderNumber: `RENEWAL-${partnership.id.slice(0, 8).toUpperCase()}`,
          total: amount,
          paymentMethod: '',
          customerName: partnership.business_name,
          customerEmail: partnership.contact_email
        },
        isSubscriptionRenewal: true,
        subscriptionPlan: plan,
        partnershipId: partnership.id
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="text-sm text-gray-500 mt-1">Choose the plan that fits your business needs</p>
      </div>

      {partnership && currentPlan !== 'none' && (
        <Card className={
          isExpired
            ? 'border-red-200 bg-red-50'
            : isActive
            ? 'border-lime-200 bg-lime-50'
            : 'border-orange-200 bg-orange-50'
        }>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Current Plan: {currentPlan}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {isExpired
                    ? `Expired on ${new Date(partnership.subscription_end_date).toLocaleDateString('en-MY')}`
                    : isActive
                    ? `Active until ${new Date(partnership.subscription_end_date).toLocaleDateString('en-MY')}`
                    : 'Pending admin approval'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isExpired ? 'destructive' : isActive ? 'default' : 'secondary'}>
                  {isExpired ? 'Expired' : isActive ? 'Active' : 'Pending'}
                </Badge>
                {isExpired && (
                  <Button
                    size="sm"
                    onClick={() => handleRenewSubscription(currentPlan as 'professional' | 'panel')}
                    className="bg-lime-600 hover:bg-lime-700"
                  >
                    Renew Now
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Professional */}
        <Card className={currentPlan === 'professional' ? 'border-lime-500' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle>Professional</CardTitle>
              {currentPlan === 'professional' && <Badge>Current</Badge>}
            </div>
            <CardDescription>Essential features for B2B merchants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <span className="text-3xl font-bold">RM 99</span>
              <span className="text-gray-500 text-sm">/year</span>
            </div>
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-lime-600" />
                <span>B2B Merchant Pricing</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-lime-600" />
                <span>Installation Guides Library</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Gift className="w-4 h-4 text-lime-600" />
                <span>RM50 Welcome Voucher</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <XIcon className="w-4 h-4" />
                <span>Find Shops listing</span>
              </div>
            </div>
            <Button
              disabled={currentPlan === 'professional'}
              className="w-full bg-lime-600 hover:bg-lime-700"
              onClick={() => toast({ title: 'Contact Admin', description: 'Please contact our team to subscribe' })}
            >
              {currentPlan === 'professional' ? 'Current Plan' : 'Subscribe'}
            </Button>
          </CardContent>
        </Card>

        {/* Panel */}
        <Card className={`${currentPlan === 'panel' ? 'border-purple-500' : ''} bg-gray-900 text-white`}>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-white">Panel (Authorized)</CardTitle>
              {currentPlan === 'panel' ? (
                <Badge className="bg-purple-500">Current</Badge>
              ) : (
                <Badge variant="outline" className="text-white border-white/20">Invite Only</Badge>
              )}
            </div>
            <CardDescription className="text-gray-300">Top 100 authorized shops</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <span className="text-3xl font-bold text-white">RM 350</span>
              <span className="text-gray-400 text-sm">/month</span>
            </div>
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-200">
                <Check className="w-4 h-4 text-purple-400" />
                <span>Everything in Professional</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white font-medium">
                <Check className="w-4 h-4 text-purple-400" />
                <span>Featured Find Shops listing</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white font-medium">
                <Check className="w-4 h-4 text-purple-400" />
                <span>Authorized Panel Badge</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-200">
                <Check className="w-4 h-4 text-purple-400" />
                <span>Priority support</span>
              </div>
            </div>
            <Button disabled className="w-full bg-white/10 text-white cursor-not-allowed">
              {currentPlan === 'panel' ? 'Current Plan' : 'By Invitation Only'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MerchantConsole;
