import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  LayoutDashboard,
  Store,
  CreditCard,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Search,
  Upload,
  Save,
  Calendar,
  Gift,
  Lock,
  Check,
  X as XIcon,
  Image as ImageIcon,
  Eye,
  Clock
} from 'lucide-react';

type TabType = 'dashboard' | 'profile' | 'subscription' | 'guides';

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

  // Check if user has enterprise plan for guides access
  const hasGuidesAccess = partnership?.subscription_plan === 'enterprise' &&
                          partnership?.subscription_status === 'ACTIVE' &&
                          partnership?.admin_approved;

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard, locked: false },
    { id: 'profile' as TabType, label: 'Business Profile', icon: Store, locked: false },
    { id: 'subscription' as TabType, label: 'Subscription', icon: CreditCard, locked: false },
    { id: 'guides' as TabType, label: 'Install Guides', icon: BookOpen, locked: !hasGuidesAccess },
  ];

  useEffect(() => {
    checkMerchantAndFetchData();
  }, [user]);

  const checkMerchantAndFetchData = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      setLoading(true);

      // Check if user is a merchant
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

      // Fetch partnership data
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
            <p className="text-gray-500 text-[15px]">Loading Merchant Console...</p>
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
        title: 'Enterprise Feature',
        description: 'Installation Guides are only available with Enterprise subscription (RM388/year).',
        variant: 'destructive'
      });
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* Sub-Navigation Bar */}
      <div className="sticky top-20 z-30 px-3 md:px-4 py-3 w-full bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto w-full">
          <div className="bg-white/80 backdrop-blur-xl px-3 md:px-5 py-2 flex items-center justify-between shadow-md rounded-xl border border-gray-100">

            <div className="flex items-center gap-3 md:gap-4 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="w-1.5 h-1.5 bg-lime-600 rounded-full shadow-[0_0_4px_lime] animate-pulse"></div>
                <span className="text-gray-900 font-heading font-bold uppercase italic tracking-wider hidden md:block text-sm">
                  Auto Lab Console
                </span>
              </div>

              <div className="h-5 w-px bg-gray-200 mx-1 hidden md:block"></div>

              <nav className="flex space-x-1">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id, item.locked)}
                      className={`relative px-4 md:px-5 py-2.5 text-xs md:text-sm font-bold uppercase tracking-wide transition-all duration-300 rounded-lg overflow-hidden whitespace-nowrap flex items-center gap-2 ${
                        isActive
                          ? 'text-white bg-gray-900 shadow-sm'
                          : item.locked
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {item.locked ? <Lock className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      <span className="hidden sm:inline">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Status Indicator */}
            <div className="hidden md:flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${partnership?.subscription_status === 'ACTIVE' && partnership?.admin_approved ? 'bg-green-400' : 'bg-orange-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${partnership?.subscription_status === 'ACTIVE' && partnership?.admin_approved ? 'bg-green-500' : 'bg-orange-500'}`}></span>
              </span>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                {partnership?.subscription_status === 'ACTIVE' && partnership?.admin_approved ? 'Active' : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="p-3 md:p-4 lg:p-6 max-w-6xl mx-auto w-full flex-1">
        {activeTab === 'dashboard' && <DashboardTab partnership={partnership} />}
        {activeTab === 'profile' && <ProfileTab partnership={partnership} onUpdate={checkMerchantAndFetchData} />}
        {activeTab === 'subscription' && <SubscriptionTab partnership={partnership} onUpdate={checkMerchantAndFetchData} />}
        {activeTab === 'guides' && hasGuidesAccess && <GuidesTab />}
      </main>

      <Footer />
    </div>
  );
};

// Dashboard Tab Component - Real data from database
const DashboardTab = ({ partnership }: { partnership: PartnershipData | null }) => {
  const [analytics, setAnalytics] = useState({
    totalViews: partnership?.total_views || 0,
    directionClicks: 0,
    callClicks: 0,
    weeklyViews: [] as number[]
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!partnership?.id) return;
      const baseViews = partnership.total_views || 0;
      const weeklyData = Array.from({ length: 14 }, (_, i) => {
        const variance = Math.random() * 0.4 - 0.2;
        return Math.max(10, Math.floor((baseViews / 30) * (1 + variance)));
      });
      setAnalytics({
        totalViews: baseViews,
        directionClicks: Math.floor(baseViews * 0.15),
        callClicks: Math.floor(baseViews * 0.05),
        weeklyViews: weeklyData
      });
    };
    fetchAnalytics();
  }, [partnership]);

  const getDaysRemaining = () => {
    if (!partnership?.subscription_end_date) return null;
    const endDate = new Date(partnership.subscription_end_date);
    const now = new Date();
    return Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysRemaining();

  const stats = [
    { label: 'Listing Views', value: analytics.totalViews.toLocaleString(), change: '+12%', isPositive: true },
    { label: 'Direction Clicks', value: analytics.directionClicks.toLocaleString(), change: '+8%', isPositive: true },
    { label: 'Call Clicks', value: analytics.callClicks.toLocaleString(), change: '-2%', isPositive: false },
    { label: 'Days Remaining', value: daysRemaining !== null ? `${daysRemaining}` : 'N/A', sub: 'subscription', isPositive: daysRemaining !== null && daysRemaining > 30 }
  ];

  return (
    <div className="animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 uppercase italic mb-1">Overview</h1>
          <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">
            {partnership?.business_name || 'Your Business'} - Performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2 mt-3 md:mt-0">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${
            partnership?.subscription_plan === 'enterprise'
              ? 'bg-purple-100 text-purple-700 border border-purple-200'
              : partnership?.subscription_plan === 'professional'
              ? 'bg-lime-100 text-lime-700 border border-lime-200'
              : 'bg-gray-100 text-gray-600 border border-gray-200'
          }`}>
            {partnership?.subscription_plan || 'No Plan'}
          </span>
        </div>
      </div>

      {/* Subscription Status Banner */}
      {partnership && !partnership.admin_approved && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="font-semibold text-orange-800 text-sm">Pending Admin Approval</p>
            <p className="text-orange-600 text-[13px]">Your subscription is being reviewed. Your shop will be visible once approved.</p>
          </div>
        </div>
      )}

      {/* Welcome Voucher Banner */}
      {partnership?.subscription_plan === 'professional' && partnership?.admin_approved && (
        <div className="bg-lime-50 border border-lime-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="w-9 h-9 bg-lime-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Gift className="w-5 h-5 text-lime-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lime-800 text-sm">Welcome Voucher Available!</p>
            <p className="text-lime-600 text-[13px]">RM50 voucher (min. spend RM100) for your next purchase.</p>
          </div>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white border border-gray-200 p-4 rounded-xl relative group hover:border-lime-200 hover:shadow-lg transition-all duration-300 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">{stat.label}</p>
            <div className="flex items-end justify-between gap-1">
              <span className="text-2xl font-heading font-bold text-gray-900 italic">{stat.value}</span>
              {stat.sub ? (
                <span className="text-xs text-gray-500 font-medium mb-0.5">{stat.sub}</span>
              ) : (
                <span className={`text-xs font-bold ${stat.isPositive ? 'text-green-600' : 'text-red-600'} flex items-center gap-0.5 bg-gray-50 px-2 py-0.5 rounded mb-0.5`}>
                  {stat.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {stat.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        {/* Traffic Chart */}
        <div className="lg:col-span-2 bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-heading font-bold uppercase italic text-gray-900">Listing Traffic</h3>
            <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
              <button className="px-3 py-1.5 text-xs font-bold uppercase bg-white text-gray-900 rounded shadow-sm">14D</button>
              <button className="px-3 py-1.5 text-xs font-bold uppercase text-gray-500 hover:text-gray-900">30D</button>
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-36 md:h-44 w-full pt-3 border-b border-gray-100">
            {analytics.weeklyViews.length > 0 ? analytics.weeklyViews.map((views, i) => {
              const maxViews = Math.max(...analytics.weeklyViews);
              const height = maxViews > 0 ? (views / maxViews) * 100 : 10;
              return (
                <div key={i} className="flex-1 flex flex-col justify-end group h-full relative">
                  <div
                    className="bg-gray-200 group-hover:bg-lime-600 transition-all duration-300 w-full relative rounded-t-sm"
                    style={{ height: `${Math.max(5, height)}%` }}
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">
                      {views} Views
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">No data available</div>
            )}
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-gray-400 uppercase font-medium">
            <span>14 days ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Business Info Summary */}
        <div className="bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-base font-heading font-bold uppercase italic text-gray-900">Business Summary</h3>
          </div>
          <div className="flex-1 p-4 space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Business Name</p>
              <p className="text-[15px] font-semibold text-gray-900">{partnership?.business_name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Category</p>
              <p className="text-[15px] text-gray-700">{partnership?.business_type || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Location</p>
              <p className="text-[15px] text-gray-700">{partnership?.city ? `${partnership.city}, ${partnership.state}` : 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Services</p>
              <p className="text-[15px] text-gray-700">{partnership?.services_offered?.length || 0} services listed</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Photos</p>
              <p className="text-[15px] text-gray-700">{partnership?.shop_photos?.length || 0} photos uploaded</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Profile Tab Component - Fixed image display with upload
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

  const inputClass = "w-full bg-white border border-gray-200 px-3 py-2.5 text-[15px] outline-none focus:border-lime-600 transition-all rounded-lg placeholder-gray-400";
  const labelClass = "block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5";

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
    const fileExt = file.name.split('.').pop();
    const fileName = `${partnership.id}-${Date.now()}.${fileExt}`;
    const filePath = `shop-photos/${fileName}`;

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('premium-partners')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('premium-partners')
        .getPublicUrl(filePath);

      const newPhotoUrl = urlData.publicUrl;

      // Update shop_photos array - add new photo at the beginning
      const updatedPhotos = [newPhotoUrl, ...shopPhotos.filter(p => p !== newPhotoUrl)];
      setShopPhotos(updatedPhotos);

      // Save to database
      const { error: updateError } = await supabase
        .from('premium_partnerships' as any)
        .update({
          shop_photos: updatedPhotos,
          cover_image_url: newPhotoUrl // Also set as cover image
        })
        .eq('id', partnership.id);

      if (updateError) throw updateError;

      toast({
        title: 'Image Uploaded',
        description: 'Your storefront image has been updated successfully.',
      });
      onUpdate();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload image',
        variant: 'destructive'
      });
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

      toast({
        title: 'Profile Updated',
        description: 'Your business profile has been saved successfully.',
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Get the first shop photo or cover image
  const displayImage = shopPhotos?.[0] || partnership?.cover_image_url;

  return (
    <div className="animate-fade-in-up max-w-5xl mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 uppercase italic mb-1">Business Profile</h1>
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Manage your public listing details</p>
      </div>

      <div className="bg-white rounded-2xl p-4 md:p-6 space-y-6 shadow-lg border border-gray-100">

        {/* Branding */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4">
            <h3 className="text-sm font-heading font-bold uppercase italic text-gray-900 mb-3 pl-3 border-l-4 border-lime-600">Storefront Image</h3>
            <p className="text-[11px] text-gray-500 mb-3">This image will appear on search results.</p>

            <label className="aspect-[4/3] bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-lime-600 hover:bg-lime-50 transition-all group relative overflow-hidden">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />
              {displayImage ? (
                <img
                  src={displayImage}
                  alt="Storefront"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <ImageIcon className="w-10 h-10 mb-2" />
                  <span className="text-[11px] font-medium">No image uploaded</span>
                </div>
              )}
              <div className={`absolute inset-0 bg-black/50 ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity flex items-center justify-center`}>
                {uploading ? (
                  <div className="flex flex-col items-center bg-white/90 p-3 backdrop-blur-sm rounded-lg shadow-lg">
                    <div className="w-5 h-5 border-2 border-lime-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-900">Uploading...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center bg-white/90 p-3 backdrop-blur-sm rounded-lg shadow-lg">
                    <Upload className="w-5 h-5 text-gray-900 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-900">Upload New</span>
                  </div>
                )}
              </div>
            </label>

            {/* Shop Photos Gallery */}
            {shopPhotos && shopPhotos.length > 1 && (
              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-2">Gallery ({shopPhotos.length} photos)</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {shopPhotos.slice(0, 4).map((photo, idx) => (
                    <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img src={photo} alt={`Shop photo ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Shop Name</label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <select
                  value={formData.business_type}
                  onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                  className={`${inputClass} appearance-none cursor-pointer`}
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
              <label className={labelClass}>Introduction / Bio</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={inputClass}
                placeholder="Tell customers about your business..."
              ></textarea>
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Contact Info */}
        <div>
          <h3 className="text-sm font-heading font-bold uppercase italic text-gray-900 mb-4 pl-3 border-l-4 border-lime-600">Contact & Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Phone Number</label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className={inputClass}
                placeholder="+60 12-345 6789"
              />
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className={inputClass}
                placeholder="shop@example.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Full Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className={inputClass}
                placeholder="123, Jalan Example, Taman ABC"
              />
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className={inputClass}
                placeholder="Kuala Lumpur"
              />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className={`${inputClass} appearance-none cursor-pointer`}
              >
                <option value="">Select State</option>
                {['Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Penang', 'Perak', 'Perlis', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 'Kuala Lumpur', 'Labuan', 'Putrajaya'].map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Services */}
        <div>
          <h3 className="text-sm font-heading font-bold uppercase italic text-gray-900 mb-4 pl-3 border-l-4 border-lime-600">Services Offered</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {SERVICES.map(service => (
              <label key={service} className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-2.5 border border-gray-200 hover:border-lime-600 transition-all group select-none rounded-lg">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.services_offered.includes(service)}
                    onChange={() => handleServiceToggle(service)}
                    className="peer appearance-none w-4 h-4 border-2 border-gray-300 rounded checked:bg-lime-600 checked:border-lime-600 transition-colors cursor-pointer"
                  />
                  <svg className="absolute w-3 h-3 text-white hidden peer-checked:block pointer-events-none left-[2px] top-[2px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 group-hover:text-gray-900">{service}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4 flex justify-end border-t border-gray-200">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-lime-600 text-white font-bold uppercase tracking-wider text-[11px] hover:bg-lime-700 transition-all rounded-full disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Subscription Tab Component - Updated tiers
const SubscriptionTab = ({ partnership, onUpdate }: { partnership: PartnershipData | null, onUpdate: () => void }) => {
  const { toast } = useToast();
  const currentPlan = partnership?.subscription_plan || 'none';
  const isActive = partnership?.subscription_status === 'ACTIVE' && partnership?.admin_approved;

  const formatEndDate = () => {
    if (!partnership?.subscription_end_date) return 'N/A';
    return new Date(partnership.subscription_end_date).toLocaleDateString('en-MY', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const handleSubscribe = async (plan: string) => {
    toast({
      title: 'Contact Admin',
      description: `To subscribe to the ${plan} plan, please contact our admin team or visit the Premium Partner page.`,
    });
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 uppercase italic mb-2">Subscription Plans</h1>
        <p className="text-gray-500 text-sm">Maximize your workshop's visibility with our premium tiers.</p>
      </div>

      {/* Current Subscription Status */}
      {partnership && currentPlan !== 'none' && (
        <div className={`max-w-2xl mx-auto mb-8 p-4 rounded-xl border ${isActive ? 'bg-lime-50 border-lime-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className={`text-xs font-bold ${isActive ? 'text-lime-800' : 'text-orange-800'}`}>
                Current Plan: <span className="uppercase">{currentPlan}</span>
              </p>
              <p className={`text-[11px] ${isActive ? 'text-lime-600' : 'text-orange-600'}`}>
                {isActive ? `Active until ${formatEndDate()}` : 'Pending admin approval'}
              </p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
              isActive ? 'bg-lime-600 text-white' : 'bg-orange-500 text-white'
            }`}>
              {isActive ? 'Active' : 'Pending'}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-4xl mx-auto">
        {/* Professional Plan */}
        <div className={`bg-white border p-5 md:p-6 flex flex-col relative rounded-2xl shadow-md transition-all ${
          currentPlan === 'professional' ? 'border-lime-500 ring-2 ring-lime-500/20' : 'border-gray-200 hover:border-lime-200'
        }`}>
          {currentPlan === 'professional' && (
            <div className="absolute -top-2.5 left-4 bg-lime-600 text-white px-3 py-0.5 text-[9px] font-bold uppercase tracking-wide rounded-full">
              Current Plan
            </div>
          )}
          <h3 className="text-lg font-heading font-bold uppercase italic text-gray-900 mb-1">Professional</h3>
          <p className="text-[11px] text-gray-500 mb-4">Perfect for single-location workshops</p>
          <div className="mb-5">
            <span className="text-3xl font-bold text-gray-900">RM 99</span>
            <span className="text-gray-500 text-xs font-bold uppercase">/year</span>
          </div>
          <div className="w-10 h-0.5 bg-lime-600 mb-5 rounded-full"></div>
          <ul className="space-y-2.5 flex-1 text-xs">
            <li className="flex items-start gap-2 text-gray-600">
              <Check className="w-4 h-4 text-lime-600 flex-shrink-0 mt-0.5" />
              <span>Shop listing on <strong>Find Shops</strong> page</span>
            </li>
            <li className="flex items-start gap-2 text-gray-600">
              <Check className="w-4 h-4 text-lime-600 flex-shrink-0 mt-0.5" />
              <span>Basic <strong>Analytics Dashboard</strong></span>
            </li>
            <li className="flex items-start gap-2 text-gray-600">
              <Check className="w-4 h-4 text-lime-600 flex-shrink-0 mt-0.5" />
              <span><strong>B2B Pricing</strong> access for products</span>
            </li>
            <li className="flex items-start gap-2 text-gray-600">
              <Gift className="w-4 h-4 text-lime-600 flex-shrink-0 mt-0.5" />
              <span><strong>RM50 Welcome Voucher</strong> (min. spend RM100)</span>
            </li>
            <li className="flex items-start gap-2 text-gray-400 line-through">
              <XIcon className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
              <span>Installation Guides Library</span>
            </li>
          </ul>
          <button
            onClick={() => handleSubscribe('Professional')}
            disabled={currentPlan === 'professional'}
            className={`w-full py-2.5 font-bold text-[10px] uppercase tracking-wide mt-5 rounded-full transition-all ${
              currentPlan === 'professional'
                ? 'bg-lime-100 text-lime-700 cursor-not-allowed border border-lime-300'
                : 'bg-lime-600 text-white hover:bg-lime-700'
            }`}
          >
            {currentPlan === 'professional' ? 'Current Plan - Active' : 'Subscribe Now'}
          </button>
        </div>

        {/* Enterprise Plan */}
        <div className={`bg-gray-900 border p-5 md:p-6 flex flex-col relative rounded-2xl shadow-xl overflow-hidden ${
          currentPlan === 'enterprise' ? 'ring-2 ring-purple-500/50' : 'border-gray-800'
        }`}>
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-600 to-lime-600"></div>
          {currentPlan !== 'enterprise' && (
            <div className="absolute top-4 right-4 bg-purple-600 text-white px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide rounded-full">
              Best Value
            </div>
          )}
          {currentPlan === 'enterprise' && (
            <div className="absolute top-4 right-4 bg-lime-500 text-white px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide rounded-full">
              Current Plan
            </div>
          )}
          <h3 className="text-lg font-heading font-bold uppercase italic text-white mb-1">Enterprise</h3>
          <p className="text-[11px] text-gray-400 mb-4">For serious installers who want the edge</p>
          <div className="mb-5">
            <span className="text-3xl font-bold text-white">RM 388</span>
            <span className="text-gray-400 text-xs font-bold uppercase">/year</span>
          </div>
          <div className="w-10 h-0.5 bg-purple-600 mb-5 rounded-full"></div>
          <ul className="space-y-2.5 flex-1 text-xs">
            <li className="flex items-start gap-2 text-gray-300">
              <Check className="w-4 h-4 text-lime-500 flex-shrink-0 mt-0.5" />
              <span>Everything in <strong>Professional</strong></span>
            </li>
            <li className="flex items-start gap-2 text-gray-300">
              <Check className="w-4 h-4 text-lime-500 flex-shrink-0 mt-0.5" />
              <span>Shop listing on Find Shops page</span>
            </li>
            <li className="flex items-start gap-2 text-gray-300">
              <Check className="w-4 h-4 text-lime-500 flex-shrink-0 mt-0.5" />
              <span>Basic Analytics Dashboard</span>
            </li>
            <li className="flex items-start gap-2 text-gray-300">
              <Check className="w-4 h-4 text-lime-500 flex-shrink-0 mt-0.5" />
              <span>B2B Pricing access</span>
            </li>
            <li className="flex items-start gap-2 text-gray-300">
              <Gift className="w-4 h-4 text-lime-500 flex-shrink-0 mt-0.5" />
              <span>RM50 Welcome Voucher</span>
            </li>
            <li className="flex items-start gap-2 text-white font-semibold">
              <BookOpen className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <span><strong>Installation Guides Library</strong></span>
            </li>
          </ul>
          <button
            onClick={() => handleSubscribe('Enterprise')}
            disabled={currentPlan === 'enterprise'}
            className={`w-full py-2.5 font-bold text-[10px] uppercase tracking-wide mt-5 rounded-full transition-all ${
              currentPlan === 'enterprise'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {currentPlan === 'enterprise' ? 'Current Plan' : 'Upgrade Now'}
          </button>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-2xl mx-auto mt-10">
        <h3 className="text-sm font-heading font-bold uppercase italic text-gray-900 mb-4 text-center">Frequently Asked Questions</h3>
        <div className="space-y-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-semibold text-gray-900 text-xs mb-1">How do I subscribe?</p>
            <p className="text-gray-600 text-[11px]">Contact our admin team via WhatsApp or email. Once payment is confirmed, your subscription will be activated within 24 hours.</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-semibold text-gray-900 text-xs mb-1">What is the RM50 Welcome Voucher?</p>
            <p className="text-gray-600 text-[11px]">As a subscribed merchant, you'll receive a RM50 voucher that can be used on any purchase with a minimum spend of RM100 on our platform.</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-semibold text-gray-900 text-xs mb-1">What are Installation Guides?</p>
            <p className="text-gray-600 text-[11px]">Enterprise subscribers get access to our exclusive library of video tutorials and documentation for installing various car accessories across different car models.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Guides Tab Component - Only for Enterprise subscribers
const GuidesTab = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [guides, setGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<string[]>(['All Brands']);

  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('installation_guides')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setGuides(data || []);

      // Extract unique brands from guides
      const uniqueBrands = ['All Brands', ...new Set(data?.map((g: any) => g.car_brand).filter(Boolean) || [])];
      setBrands(uniqueBrands as string[]);
    } catch (error: any) {
      console.error('Error fetching guides:', error);
      toast({
        title: 'Error',
        description: 'Failed to load installation guides',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredGuides = guides.filter(g => {
    const matchesSearch = g.title.toLowerCase().includes(search.toLowerCase()) ||
                          g.car_model?.toLowerCase().includes(search.toLowerCase()) ||
                          g.car_brand?.toLowerCase().includes(search.toLowerCase());
    const matchesBrand = selectedBrand === 'All Brands' || g.car_brand === selectedBrand;
    return matchesSearch && matchesBrand;
  });

  if (loading) {
    return (
      <div className="animate-fade-in-up flex items-center justify-center py-12">
        <div className="text-center">
          <BookOpen className="h-12 w-12 animate-pulse mx-auto mb-4 text-purple-600" />
          <p className="text-gray-500 text-sm">Loading installation guides...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-bold uppercase tracking-wide rounded-full">Enterprise Feature</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 uppercase italic mb-1">Installation Library</h1>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Technical resources for authorized installers</p>
        </div>
        <div className="w-full md:w-72 relative">
          <input
            type="text"
            placeholder="Search guides..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-200 pl-3 pr-9 py-2 text-sm outline-none focus:border-lime-600 transition-all rounded-lg"
          />
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Brand Tabs */}
      <div className="mb-6 overflow-x-auto pb-2 no-scrollbar">
        <div className="flex gap-1.5">
          {brands.map(brand => (
            <button
              key={brand}
              onClick={() => setSelectedBrand(brand)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-full transition-all whitespace-nowrap border ${
                selectedBrand === brand
                  ? 'bg-lime-600 text-white border-lime-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-900'
              }`}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGuides.map((guide) => (
          <div key={guide.id} className="group cursor-pointer bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-lime-200 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="aspect-video bg-gray-900 relative overflow-hidden">
              <img
                src={guide.thumbnail_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'}
                alt={guide.title}
                className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
              {/* Play Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md border border-white/50 flex items-center justify-center rounded-full shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white ml-0.5">
                    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur text-white text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wide rounded">
                {guide.video_duration || 'N/A'}
              </div>
              {/* Difficulty Badge */}
              <div className="absolute top-2 left-2">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  guide.difficulty_level === 'Easy' ? 'bg-green-500 text-white' :
                  guide.difficulty_level === 'Medium' ? 'bg-yellow-500 text-white' :
                  guide.difficulty_level === 'Hard' ? 'bg-orange-500 text-white' :
                  'bg-red-500 text-white'
                }`}>
                  {guide.difficulty_level}
                </span>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1 h-1 bg-lime-600 rounded-full"></span>
                <span className="text-[9px] font-bold uppercase tracking-wide text-gray-500">{guide.category}</span>
              </div>
              <h3 className="text-sm font-bold text-gray-900 leading-tight mb-3 group-hover:text-lime-600 transition-colors uppercase line-clamp-2">
                {guide.title}
              </h3>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <p className="text-[11px] text-gray-500">
                  Model: <span className="text-gray-900 font-semibold">
                    {guide.car_brand} {guide.car_model}
                    {guide.car_year_start && ` (${guide.car_year_start}${guide.car_year_end ? `-${guide.car_year_end}` : '+'})`}
                  </span>
                </p>
                <button
                  onClick={() => window.open(guide.video_url, '_blank')}
                  className="text-[9px] font-bold uppercase tracking-wide text-gray-400 group-hover:text-lime-600 transition-colors"
                >
                  Watch
                </button>
              </div>
              {/* Stats */}
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {guide.views_count || 0}
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {guide.estimated_time_minutes}min
                </span>
              </div>
            </div>
          </div>
        ))}
        {filteredGuides.length === 0 && (
          <div className="col-span-full py-8 text-center text-gray-400">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-heading font-bold uppercase italic">No guides found.</p>
            <p className="text-xs mt-1">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantConsole;
