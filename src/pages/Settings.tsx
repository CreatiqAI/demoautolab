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
  Info,
  CheckCircle
} from 'lucide-react';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  customer_type: 'normal' | 'merchant';
  created_at: string;
  car_make_name?: string | null;
  car_model_name?: string | null;
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
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [customerCars, setCustomerCars] = useState<Array<{ car_make_name: string; car_model_name: string | null; is_primary: boolean }>>([]);
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
    if (authLoading) return; // Wait for auth to initialize
    if (user) {
      fetchData();
    } else {
      navigate('/auth');
    }
  }, [user, authLoading]);

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
        created_at: profileData.created_at,
        car_make_name: profileData.car_make_name || null,
        car_model_name: profileData.car_model_name || null,
      });

      // Fetch all customer cars
      const { data: carsData } = await supabase
        .from('customer_cars' as any)
        .select('car_make_name, car_model_name, is_primary, sort_order')
        .eq('customer_id', profileData.id)
        .order('sort_order', { ascending: true });

      if (carsData && (carsData as any[]).length > 0) {
        setCustomerCars(carsData as any[]);
      } else if (profileData.car_make_name) {
        // Fallback: use single car from customer_profiles
        setCustomerCars([{
          car_make_name: profileData.car_make_name,
          car_model_name: profileData.car_model_name || null,
          is_primary: true,
        }]);
      }

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
            <User className="h-12 w-12 animate-pulse mx-auto mb-4 text-gray-600" />
            <p className="text-gray-500">Loading settings...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const subscriptionInfo = getSubscriptionInfo();

  return (
    <div className="bg-gray-50 flex flex-col">
      <Header />

      <div className="min-h-[calc(100vh-80px)]">
        <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Account Settings</h2>
            <p className="text-sm text-muted-foreground">Manage your account, subscription, and preferences</p>
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
              <Card>
                <CardContent className="pt-6">
                  {/* Profile Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-semibold shrink-0">
                      {profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{profile?.name}</h3>
                      <p className="text-xs text-muted-foreground">{profile?.email}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      <Badge variant={isMerchant ? 'default' : 'secondary'} className="text-[11px]">
                        {isMerchant ? 'Merchant' : 'Customer'}
                      </Badge>
                      {partnership && partnership.subscription_status === 'ACTIVE' && partnership.admin_approved && (
                        <Badge variant="outline" className="border-gray-300 text-gray-600 text-[11px]">
                          {partnership.subscription_plan === 'panel' ? 'Panel' : 'Professional'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Personal Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                      <p className="text-gray-900">{profile?.phone || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Date of Birth</p>
                      <p className="text-gray-900">
                        {profile?.date_of_birth
                          ? new Date(profile.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                          : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Member Since</p>
                      <p className="text-gray-900">
                        {profile?.created_at
                          ? new Date(profile.created_at).toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' })
                          : 'N/A'}
                      </p>
                    </div>
                    {customerCars.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Vehicles</p>
                        <div className="flex flex-wrap gap-1.5">
                          {customerCars.map((car, i) => (
                            <span key={i} className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
                              {car.car_make_name}{car.car_model_name ? ` ${car.car_model_name}` : ''}
                              {car.is_primary && <span className="text-[10px] text-muted-foreground">(Primary)</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Merchant Business Info */}
                  {isMerchant && merchantReg && (
                    <>
                      <Separator className="my-6" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Business Information</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Company Name</p>
                            <p className="text-gray-900">{merchantReg.company_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Business Type</p>
                            <p className="text-gray-900">{merchantReg.business_type}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Registration No.</p>
                            <p className="text-gray-900">{merchantReg.business_registration_no}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Tax ID</p>
                            <p className="text-gray-900">{merchantReg.tax_id || 'Not provided'}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground mb-0.5">Address</p>
                            <p className="text-gray-900">{merchantReg.address}</p>
                          </div>
                          {merchantReg.company_profile_url && (
                            <div className="col-span-2">
                              <p className="text-xs text-muted-foreground mb-0.5">Website</p>
                              <a href={merchantReg.company_profile_url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-700 hover:text-gray-900 inline-flex items-center gap-1">
                                {merchantReg.company_profile_url}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                            <Badge variant={merchantReg.status === 'APPROVED' ? 'default' : 'secondary'} className="text-[11px]">
                              {merchantReg.status}
                            </Badge>
                          </div>
                          {merchantReg.referral_code && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Referral Code</p>
                              <p className="text-gray-900 font-mono text-xs">{merchantReg.referral_code}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Documents */}
                      {(merchantReg.ssm_document_url || merchantReg.bank_proof_url || merchantReg.payment_slip_url) && (
                        <>
                          <Separator className="my-6" />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Documents</p>
                            <div className="flex flex-wrap gap-2">
                              {merchantReg.ssm_document_url && (
                                <a href={merchantReg.ssm_document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded text-xs text-gray-700 transition-colors">
                                  <FileText className="w-3 h-3" /> SSM Document
                                </a>
                              )}
                              {merchantReg.bank_proof_url && (
                                <a href={merchantReg.bank_proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded text-xs text-gray-700 transition-colors">
                                  <FileText className="w-3 h-3" /> Bank Proof
                                </a>
                              )}
                              {merchantReg.payment_slip_url && (
                                <a href={merchantReg.payment_slip_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded text-xs text-gray-700 transition-colors">
                                  <FileText className="w-3 h-3" /> Payment Slip
                                </a>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Workshop Photos */}
                      {merchantReg.workshop_photos && merchantReg.workshop_photos.length > 0 && (
                        <>
                          <Separator className="my-6" />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Workshop Photos</p>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                              {merchantReg.workshop_photos.map((photo, i) => (
                                <a key={i} href={photo} target="_blank" rel="noopener noreferrer" className="aspect-square rounded overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity">
                                  <img src={photo} alt={`Workshop ${i + 1}`} className="w-full h-full object-cover" />
                                </a>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== SUBSCRIPTION TAB (Merchant Only) ===== */}
            {isMerchant && (
              <TabsContent value="subscription">
                <div className="space-y-6">
                  {!partnership && merchantReg && merchantReg.status === 'APPROVED' ? (
                    /* Approved merchant with basic plan — show merchant plan details */
                    <Card>
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Shield className="w-5 h-5 text-gray-600" />
                            Merchant Plan
                          </CardTitle>
                          <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground mb-0.5">Plan</p>
                              <p className="font-medium">Merchant Subscription</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-0.5">Billing</p>
                              <p className="font-medium">RM 99 / year</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-0.5">Company</p>
                              <p className="font-medium">{merchantReg.company_name}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-0.5">Subscribed Since</p>
                              <p className="font-medium">
                                {new Date(merchantReg.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-0.5">Next Renewal</p>
                              <p className="font-medium">
                                {(() => {
                                  const renewalDate = new Date(merchantReg.created_at);
                                  renewalDate.setFullYear(renewalDate.getFullYear() + 1);
                                  // If renewal is past, keep adding years until future
                                  while (renewalDate < new Date()) {
                                    renewalDate.setFullYear(renewalDate.getFullYear() + 1);
                                  }
                                  return renewalDate.toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' });
                                })()}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-0.5">Days Until Renewal</p>
                              <p className={`font-medium ${(() => {
                                const renewalDate = new Date(merchantReg.created_at);
                                renewalDate.setFullYear(renewalDate.getFullYear() + 1);
                                while (renewalDate < new Date()) {
                                  renewalDate.setFullYear(renewalDate.getFullYear() + 1);
                                }
                                const days = Math.ceil((renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                return days <= 30 ? 'text-red-600' : days <= 60 ? 'text-yellow-600' : 'text-green-600';
                              })()}`}>
                                {(() => {
                                  const renewalDate = new Date(merchantReg.created_at);
                                  renewalDate.setFullYear(renewalDate.getFullYear() + 1);
                                  while (renewalDate < new Date()) {
                                    renewalDate.setFullYear(renewalDate.getFullYear() + 1);
                                  }
                                  const days = Math.ceil((renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                  return `${days} days`;
                                })()}
                              </p>
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <p className="text-sm font-medium text-gray-900 mb-3">Your Benefits</p>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {[
                                { label: 'Merchant Pricing', desc: 'Access to wholesale/merchant pricing on all products' },
                                { label: 'Installation Guides', desc: 'Step-by-step installation guides for all products' },
                                { label: 'RM50 Welcome Voucher', desc: 'One-time welcome voucher on your first order' },
                                { label: 'Priority Support', desc: 'Dedicated support channel for merchants' },
                              ].map(b => (
                                <div key={b.label} className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50">
                                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{b.label}</p>
                                    <p className="text-xs text-muted-foreground">{b.desc}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : !partnership ? (
                    /* No partnership and no approved merchant reg */
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-8">
                          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                            <Crown className="w-8 h-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Subscription</h3>
                          <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
                            Contact our team to learn about merchant subscription plans.
                          </p>
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
                              <Shield className="w-5 h-5 text-gray-600" />
                              Subscription Overview
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant={getStatusBadgeVariant(partnership.subscription_status)}>
                                {partnership.subscription_status}
                              </Badge>
                              <Badge variant="outline" className="border-gray-300 text-gray-700">
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
                                    : 'text-gray-600'
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
                            <CreditCard className="w-5 h-5 text-gray-600" />
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
              <Card>
                <CardContent className="pt-6">
                  {/* WhatsApp Number */}
                  <div className="mb-6">
                    <p className="text-xs text-muted-foreground mb-1.5">WhatsApp Number</p>
                    <input
                      type="tel"
                      value={notifications.phone_number}
                      onChange={(e) =>
                        setNotifications({ ...notifications, phone_number: e.target.value })
                      }
                      className="w-full max-w-xs px-3 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                      placeholder="+60123456789"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">Include country code (e.g., +60 for Malaysia)</p>
                  </div>

                  <Separator className="mb-4" />

                  {/* Notification Toggles */}
                  <div className="space-y-0 divide-y divide-gray-100">
                    {/* Master WhatsApp Toggle */}
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm text-gray-900">WhatsApp Notifications</p>
                        <p className="text-xs text-muted-foreground">Master toggle for all notifications</p>
                      </div>
                      <Switch
                        checked={notifications.whatsapp_enabled}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, whatsapp_enabled: checked })
                        }
                      />
                    </div>

                    {/* New Products */}
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm text-gray-900">New Products</p>
                        <p className="text-xs text-muted-foreground">Products matching your car</p>
                      </div>
                      <Switch
                        checked={notifications.notify_new_products}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, notify_new_products: checked })
                        }
                        disabled={!notifications.whatsapp_enabled}
                      />
                    </div>

                    {/* Car News */}
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm text-gray-900">Car News & Updates</p>
                        <p className="text-xs text-muted-foreground">Automotive news and trends</p>
                      </div>
                      <Switch
                        checked={notifications.notify_car_news}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, notify_car_news: checked })
                        }
                        disabled={!notifications.whatsapp_enabled}
                      />
                    </div>

                    {/* Promotions */}
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm text-gray-900">Promotions & Offers</p>
                        <p className="text-xs text-muted-foreground">Deals, vouchers, and special offers</p>
                      </div>
                      <Switch
                        checked={notifications.notify_promotions}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, notify_promotions: checked })
                        }
                        disabled={!notifications.whatsapp_enabled}
                      />
                    </div>

                    {/* Order Status */}
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm text-gray-900">Order Status</p>
                        <p className="text-xs text-muted-foreground">Real-time order and delivery updates</p>
                      </div>
                      <Switch
                        checked={notifications.notify_order_status}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, notify_order_status: checked })
                        }
                        disabled={!notifications.whatsapp_enabled}
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end mt-6">
                    <Button
                      onClick={handleSaveNotifications}
                      disabled={saving}
                      className="text-[13px] h-9 px-5 bg-gray-900 text-white hover:bg-gray-800 transition-colors rounded disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      {saving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  );
}
