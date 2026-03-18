import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  User,
  Bell,
  Mail,
  Phone,
  Save,
  MessageCircle,
  ShoppingBag,
  Newspaper,
  Tag as TagIcon,
  Package,
  Calendar,
  Building,
  FileText,
  ExternalLink,
  Crown,
  Clock,
  CreditCard,
  AlertTriangle,
  Shield,
  Info
} from 'lucide-react';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  customer_type: 'normal' | 'merchant';
  created_at: string;
}

interface MerchantRegistration {
  company_name: string;
  business_registration_no: string;
  tax_id: string | null;
  business_type: string;
  address: string;
  status: string;
  email: string | null;
  company_profile_url: string | null;
  ssm_document_url: string | null;
  bank_proof_url: string | null;
  payment_slip_url: string | null;
  workshop_photos: string[];
  referral_code: string | null;
  created_at: string;
}

interface PartnershipData {
  subscription_plan: 'professional' | 'panel';
  subscription_status: string;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  billing_cycle: string;
  yearly_fee: number;
  admin_approved: boolean;
  business_name: string;
}

interface NotificationPreferences {
  id?: string;
  customer_id: string;
  notify_new_products: boolean;
  notify_car_news: boolean;
  notify_promotions: boolean;
  notify_order_status: boolean;
  whatsapp_enabled: boolean;
  phone_number: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [merchantReg, setMerchantReg] = useState<MerchantRegistration | null>(null);
  const [partnership, setPartnership] = useState<PartnershipData | null>(null);
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    customer_id: '',
    notify_new_products: true,
    notify_car_news: true,
    notify_promotions: true,
    notify_order_status: true,
    whatsapp_enabled: true,
    phone_number: ''
  });

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      navigate('/auth');
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch customer profile
      const { data: profileData, error: profileError } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;

      setProfile({
        id: profileData.id,
        name: profileData.full_name || profileData.name || '',
        email: profileData.email,
        phone: profileData.phone,
        date_of_birth: profileData.date_of_birth || null,
        customer_type: profileData.customer_type,
        created_at: profileData.created_at
      });

      // Fetch merchant registration data if merchant
      if (profileData.customer_type === 'merchant') {
        try {
          const { data: merchantData } = await supabase
            .from('merchant_registrations' as any)
            .select('*')
            .eq('customer_id', profileData.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (merchantData) {
            setMerchantReg(merchantData as any);
          }
        } catch {
          // Merchant registration might not exist
        }

        // Fetch partnership/subscription data
        try {
          const { data: partnershipData } = await supabase
            .from('premium_partnerships' as any)
            .select('subscription_plan, subscription_status, subscription_start_date, subscription_end_date, billing_cycle, yearly_fee, admin_approved, business_name')
            .eq('merchant_id', profileData.id)
            .maybeSingle();

          if (partnershipData) {
            setPartnership(partnershipData as any);
          }
        } catch {
          // premium_partnerships table may not exist
        }
      }

      // Fetch notification preferences
      const { data: notifData } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('customer_id', profileData.id)
        .single();

      if (notifData) {
        setNotifications({
          id: notifData.id,
          customer_id: notifData.customer_id,
          notify_new_products: notifData.notify_new_products ?? true,
          notify_car_news: notifData.notify_car_news ?? true,
          notify_promotions: notifData.notify_promotions ?? true,
          notify_order_status: notifData.notify_order_status ?? true,
          whatsapp_enabled: notifData.whatsapp_enabled ?? true,
          phone_number: notifData.phone_number || profileData.phone || ''
        });
      } else {
        setNotifications({
          customer_id: profileData.id,
          notify_new_products: true,
          notify_car_news: true,
          notify_promotions: true,
          notify_order_status: true,
          whatsapp_enabled: true,
          phone_number: profileData.phone || ''
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!profile) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          customer_id: profile.id,
          notify_new_products: notifications.notify_new_products,
          notify_car_news: notifications.notify_car_news,
          notify_promotions: notifications.notify_promotions,
          notify_order_status: notifications.notify_order_status,
          whatsapp_enabled: notifications.whatsapp_enabled,
          phone_number: notifications.phone_number,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'customer_id'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Notification preferences saved successfully!'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save notification preferences',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const getSubscriptionInfo = () => {
    if (!partnership || !partnership.subscription_start_date || !partnership.subscription_end_date) {
      return null;
    }

    const start = new Date(partnership.subscription_start_date);
    const end = new Date(partnership.subscription_end_date);
    const now = new Date();

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = totalDays - daysRemaining;
    const progressPercent = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

    const isExpired = daysRemaining < 0;
    const isExpiringSoon = daysRemaining <= 30 && daysRemaining > 0;

    return { totalDays, daysRemaining: Math.max(0, daysRemaining), daysElapsed, progressPercent, isExpired, isExpiringSoon, start, end };
  };

  const getProgressColor = (percent: number, isExpired: boolean) => {
    if (isExpired) return 'bg-gray-300';
    if (percent >= 75) return '[&>div]:bg-red-500';
    if (percent >= 50) return '[&>div]:bg-yellow-500';
    return '[&>div]:bg-green-500';
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default';
      case 'PENDING': return 'secondary';
      case 'EXPIRED':
      case 'CANCELLED':
      case 'SUSPENDED': return 'destructive';
      default: return 'secondary';
    }
  };

  const isMerchant = profile?.customer_type === 'merchant';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <User className="h-12 w-12 animate-pulse mx-auto mb-4 text-lime-600" />
            <p className="text-gray-500">Loading settings...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const subscriptionInfo = getSubscriptionInfo();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="flex-1">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Page Header */}
          <div className="mb-8 border-b border-gray-200 pb-6 text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 uppercase tracking-wide mb-3">Account <span className="text-lime-600 italic">Settings</span></h1>
            <p className="text-sm md:text-base text-gray-500 uppercase tracking-widest font-medium">Manage your account, subscription, and preferences</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="profile" className="max-w-4xl">
            <TabsList className={`mb-6 ${isMerchant ? 'grid grid-cols-3 w-full sm:w-auto sm:inline-grid' : 'grid grid-cols-2 w-full sm:w-auto sm:inline-grid'}`}>
              <TabsTrigger value="profile" className="gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              {isMerchant && (
                <TabsTrigger value="subscription" className="gap-2">
                  <Crown className="w-4 h-4" />
                  <span className="hidden sm:inline">Subscription</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
            </TabsList>

            {/* ===== PROFILE TAB ===== */}
            <TabsContent value="profile">
              <div className="space-y-6">
                {/* Profile Header Card */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-full bg-lime-100 flex items-center justify-center text-lime-700 text-xl font-bold shrink-0">
                        {profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-gray-900 truncate">{profile?.name}</h2>
                        <p className="text-sm text-gray-500">{profile?.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={isMerchant ? 'default' : 'secondary'}>
                            {isMerchant ? 'Merchant' : 'Customer'}
                          </Badge>
                          {partnership && partnership.subscription_status === 'ACTIVE' && partnership.admin_approved && (
                            <Badge variant="outline" className="border-lime-300 text-lime-700">
                              {partnership.subscription_plan === 'panel' ? 'Panel' : 'Professional'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          <Phone className="w-3.5 h-3.5 inline mr-1.5" />
                          Phone Number
                        </label>
                        <p className="text-gray-900 font-medium">{profile?.phone || 'Not set'}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          <Calendar className="w-3.5 h-3.5 inline mr-1.5" />
                          Date of Birth
                        </label>
                        <p className="text-gray-900 font-medium">
                          {profile?.date_of_birth
                            ? new Date(profile.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                            : 'Not set'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          <Calendar className="w-3.5 h-3.5 inline mr-1.5" />
                          Member Since
                        </label>
                        <p className="text-gray-900 font-medium">
                          {profile?.created_at
                            ? new Date(profile.created_at).toLocaleDateString('en-MY', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Merchant Business Information */}
                {isMerchant && merchantReg && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="w-5 h-5 text-lime-600" />
                        Business Information
                      </CardTitle>
                      <CardDescription>Your registered merchant details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Company Name</label>
                          <p className="text-gray-900 font-medium">{merchantReg.company_name}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Business Type</label>
                          <p className="text-gray-900 font-medium">{merchantReg.business_type}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Registration No.</label>
                          <p className="text-gray-900 font-medium">{merchantReg.business_registration_no}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Tax ID</label>
                          <p className="text-gray-900 font-medium">{merchantReg.tax_id || 'Not provided'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-500 mb-1">Business Address</label>
                          <p className="text-gray-900 font-medium">{merchantReg.address}</p>
                        </div>
                        {merchantReg.company_profile_url && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-500 mb-1">Website</label>
                            <a href={merchantReg.company_profile_url} target="_blank" rel="noopener noreferrer" className="text-lime-600 hover:text-lime-700 font-medium flex items-center gap-1">
                              {merchantReg.company_profile_url}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Application Status</label>
                          <Badge variant={merchantReg.status === 'APPROVED' ? 'default' : 'secondary'}>
                            {merchantReg.status}
                          </Badge>
                        </div>
                        {merchantReg.referral_code && (
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Referral Code</label>
                            <p className="text-gray-900 font-medium font-mono">{merchantReg.referral_code}</p>
                          </div>
                        )}
                      </div>

                      {/* Documents */}
                      <Separator />
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">
                          <FileText className="w-3.5 h-3.5 inline mr-1.5" />
                          Submitted Documents
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {merchantReg.ssm_document_url && (
                            <a href={merchantReg.ssm_document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors">
                              <FileText className="w-3 h-3" /> SSM Document
                            </a>
                          )}
                          {merchantReg.bank_proof_url && (
                            <a href={merchantReg.bank_proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors">
                              <FileText className="w-3 h-3" /> Bank Proof
                            </a>
                          )}
                          {merchantReg.payment_slip_url && (
                            <a href={merchantReg.payment_slip_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors">
                              <FileText className="w-3 h-3" /> Payment Slip
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Workshop Photos */}
                      {merchantReg.workshop_photos && merchantReg.workshop_photos.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">Workshop Photos</label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                              {merchantReg.workshop_photos.map((photo, i) => (
                                <a key={i} href={photo} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity">
                                  <img src={photo} alt={`Workshop ${i + 1}`} className="w-full h-full object-cover" />
                                </a>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* ===== SUBSCRIPTION TAB (Merchant Only) ===== */}
            {isMerchant && (
              <TabsContent value="subscription">
                <div className="space-y-6">
                  {!partnership ? (
                    /* No Partnership */
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-8">
                          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                            <Crown className="w-8 h-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Subscription</h3>
                          <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
                            You don't have an active premium partnership yet. Subscribe to get featured listing, priority display, and more benefits.
                          </p>
                          <Button
                            onClick={() => navigate('/premium-partner')}
                            variant="hero"
                            className="mt-4 text-[13px] h-10 px-6"
                          >
                            <Crown className="w-4 h-4 mr-2" />
                            Explore Premium Plans
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {/* Warning Banners */}
                      {subscriptionInfo?.isExpired && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Your subscription has expired. Please renew to continue enjoying premium benefits.
                          </AlertDescription>
                        </Alert>
                      )}

                      {subscriptionInfo?.isExpiringSoon && (
                        <Alert className="border-yellow-300 bg-yellow-50">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-800">
                            Your subscription expires in <strong>{subscriptionInfo.daysRemaining} day{subscriptionInfo.daysRemaining !== 1 ? 's' : ''}</strong>. Renew soon to avoid service interruption.
                          </AlertDescription>
                        </Alert>
                      )}

                      {partnership.subscription_status === 'PENDING' && (
                        <Alert className="border-blue-300 bg-blue-50">
                          <Info className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-blue-800">
                            Your subscription is pending admin approval. You'll be notified once it's activated.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Subscription Overview Card */}
                      <Card>
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <CardTitle className="flex items-center gap-2">
                              <Shield className="w-5 h-5 text-lime-600" />
                              Subscription Overview
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant={getStatusBadgeVariant(partnership.subscription_status)}>
                                {partnership.subscription_status}
                              </Badge>
                              <Badge variant="outline" className="border-lime-300 text-lime-700">
                                {partnership.subscription_plan === 'panel' ? 'Panel' : 'Professional'}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {subscriptionInfo ? (
                            <div className="space-y-6">
                              {/* Countdown */}
                              <div className="text-center py-4">
                                <div className={`text-5xl font-bold mb-1 ${
                                  subscriptionInfo.isExpired
                                    ? 'text-red-500'
                                    : subscriptionInfo.isExpiringSoon
                                    ? 'text-yellow-500'
                                    : 'text-lime-600'
                                }`}>
                                  {subscriptionInfo.isExpired ? 0 : subscriptionInfo.daysRemaining}
                                </div>
                                <p className="text-sm text-gray-500">
                                  {subscriptionInfo.isExpired ? 'Days since expired' : 'Days remaining'}
                                </p>
                              </div>

                              {/* Progress Bar */}
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>Start</span>
                                  <span>{Math.round(subscriptionInfo.progressPercent)}% elapsed</span>
                                  <span>End</span>
                                </div>
                                <Progress
                                  value={subscriptionInfo.progressPercent}
                                  className={`h-3 ${getProgressColor(subscriptionInfo.progressPercent, subscriptionInfo.isExpired)}`}
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>
                                    {subscriptionInfo.start.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                  <span>
                                    {subscriptionInfo.end.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">Awaiting activation</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Plan Details Card */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-lime-600" />
                            Plan Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Plan</label>
                              <p className="text-lg font-semibold text-gray-900">
                                {partnership.subscription_plan === 'panel' ? 'Panel' : 'Professional'}
                              </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Fee</label>
                              <p className="text-lg font-semibold text-gray-900">
                                {partnership.subscription_plan === 'panel'
                                  ? 'RM350.00 / month'
                                  : `RM${partnership.yearly_fee?.toFixed(2) || '99.00'} / year`
                                }
                              </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Billing Cycle</label>
                              <p className="text-lg font-semibold text-gray-900 capitalize">
                                {partnership.billing_cycle || (partnership.subscription_plan === 'panel' ? 'Monthly' : 'Yearly')}
                              </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Next Renewal</label>
                              <p className="text-lg font-semibold text-gray-900">
                                {partnership.subscription_end_date
                                  ? new Date(partnership.subscription_end_date).toLocaleDateString('en-MY', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric'
                                    })
                                  : 'N/A'}
                              </p>
                            </div>
                          </div>

                          {partnership.business_name && (
                            <>
                              <Separator className="my-4" />
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Business Name</label>
                                <p className="text-gray-900 font-medium">{partnership.business_name}</p>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </TabsContent>
            )}

            {/* ===== NOTIFICATIONS TAB ===== */}
            <TabsContent value="notifications">
              <div className="space-y-6">
                {/* WhatsApp Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                      WhatsApp Notifications
                    </CardTitle>
                    <CardDescription>
                      Receive updates via WhatsApp to your registered phone number
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        WhatsApp Phone Number
                      </label>
                      <input
                        type="tel"
                        value={notifications.phone_number}
                        onChange={(e) =>
                          setNotifications({ ...notifications, phone_number: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                        placeholder="+60123456789"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Include country code (e.g., +60 for Malaysia)
                      </p>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          notifications.whatsapp_enabled ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <MessageCircle className={`w-5 h-5 ${
                            notifications.whatsapp_enabled ? 'text-green-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Enable WhatsApp Notifications</p>
                          <p className="text-sm text-gray-500">Master toggle for all WhatsApp notifications</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.whatsapp_enabled}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, whatsapp_enabled: checked })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Notification Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                      Choose which notifications you want to receive via WhatsApp
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* New Products */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          notifications.notify_new_products ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <ShoppingBag className={`w-5 h-5 ${
                            notifications.notify_new_products ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">New Products Related to My Car</p>
                          <p className="text-sm text-gray-500">Get notified when new products matching your car are added</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.notify_new_products}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, notify_new_products: checked })
                        }
                        disabled={!notifications.whatsapp_enabled}
                      />
                    </div>

                    <Separator />

                    {/* Car News */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          notifications.notify_car_news ? 'bg-purple-100' : 'bg-gray-100'
                        }`}>
                          <Newspaper className={`w-5 h-5 ${
                            notifications.notify_car_news ? 'text-purple-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Car News & Updates</p>
                          <p className="text-sm text-gray-500">Stay updated with automotive news and industry trends</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.notify_car_news}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, notify_car_news: checked })
                        }
                        disabled={!notifications.whatsapp_enabled}
                      />
                    </div>

                    <Separator />

                    {/* Promotions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          notifications.notify_promotions ? 'bg-orange-100' : 'bg-gray-100'
                        }`}>
                          <TagIcon className={`w-5 h-5 ${
                            notifications.notify_promotions ? 'text-orange-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Promotions & Special Offers</p>
                          <p className="text-sm text-gray-500">Receive exclusive deals, vouchers, and promotional offers</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.notify_promotions}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, notify_promotions: checked })
                        }
                        disabled={!notifications.whatsapp_enabled}
                      />
                    </div>

                    <Separator />

                    {/* Order Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          notifications.notify_order_status ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <Package className={`w-5 h-5 ${
                            notifications.notify_order_status ? 'text-green-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Order Status Updates</p>
                          <p className="text-sm text-gray-500">Get real-time updates on your order status and delivery</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.notify_order_status}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, notify_order_status: checked })
                        }
                        disabled={!notifications.whatsapp_enabled}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveNotifications}
                    disabled={saving}
                    variant="hero"
                    className="text-[13px] h-10 px-6"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  );
}
