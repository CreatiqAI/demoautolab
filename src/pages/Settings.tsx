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
import {
  User,
  Bell,
  Mail,
  Phone,
  Save,
  Store,
  MessageCircle,
  ShoppingBag,
  Newspaper,
  Tag as TagIcon,
  Package
} from 'lucide-react';

type TabType = 'account' | 'notifications';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  customer_type: 'normal' | 'merchant';
  created_at: string;
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
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
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
        customer_type: profileData.customer_type,
        created_at: profileData.created_at
      });

      // Fetch notification preferences
      const { data: notifData, error: notifError } = await supabase
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
        // Create default notification preferences if not exists
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
      console.error('Error fetching data:', error);
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

      // Upsert notification preferences
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
      console.error('Error saving notifications:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save notification preferences',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="flex-1">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your account and preferences</p>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('account')}
                className={`inline-flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'account'
                    ? 'border-lime-600 text-lime-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Account Details</span>
              </button>

              <button
                onClick={() => setActiveTab('notifications')}
                className={`inline-flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'notifications'
                    ? 'border-lime-600 text-lime-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="max-w-4xl">
            {activeTab === 'account' && (
              <div className="space-y-6">
                {/* Account Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>Your personal details and account type</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <User className="w-4 h-4 inline mr-2" />
                          Full Name
                        </label>
                        <p className="text-gray-900 font-medium">{profile?.name}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Mail className="w-4 h-4 inline mr-2" />
                          Email Address
                        </label>
                        <p className="text-gray-900 font-medium">{profile?.email}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Phone className="w-4 h-4 inline mr-2" />
                          Phone Number
                        </label>
                        <p className="text-gray-900 font-medium">{profile?.phone || 'Not set'}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Account Type
                        </label>
                        <Badge variant={profile?.customer_type === 'merchant' ? 'default' : 'secondary'}>
                          {profile?.customer_type === 'merchant' ? 'Merchant' : 'Customer'}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  </CardContent>
                </Card>

                {/* Merchant Console Link */}
                {profile?.customer_type === 'merchant' && (
                  <Card className="border-lime-200 bg-lime-50">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-lime-100 rounded-lg flex items-center justify-center">
                            <Store className="w-5 h-5 text-lime-700" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Merchant Console</h3>
                            <p className="text-sm text-gray-600 mt-0.5">
                              Manage your business profile, subscriptions, and access premium features
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => navigate('/merchant-console')}
                          className="bg-lime-600 hover:bg-lime-700"
                        >
                          <Store className="w-4 h-4 mr-2" />
                          Open Console
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'notifications' && (
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
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            notifications.whatsapp_enabled ? 'bg-green-100' : 'bg-gray-100'
                          }`}
                        >
                          <MessageCircle
                            className={`w-5 h-5 ${
                              notifications.whatsapp_enabled ? 'text-green-600' : 'text-gray-400'
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Enable WhatsApp Notifications</p>
                          <p className="text-sm text-gray-500">
                            Master toggle for all WhatsApp notifications
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.whatsapp_enabled}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              whatsapp_enabled: e.target.checked
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-600"></div>
                      </label>
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
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            notifications.notify_new_products ? 'bg-blue-100' : 'bg-gray-100'
                          }`}
                        >
                          <ShoppingBag
                            className={`w-5 h-5 ${
                              notifications.notify_new_products ? 'text-blue-600' : 'text-gray-400'
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">New Products Related to My Car</p>
                          <p className="text-sm text-gray-500">
                            Get notified when new products matching your car are added
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.notify_new_products}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              notify_new_products: e.target.checked
                            })
                          }
                          disabled={!notifications.whatsapp_enabled}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-600 peer-disabled:opacity-50"></div>
                      </label>
                    </div>

                    <Separator />

                    {/* Car News */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            notifications.notify_car_news ? 'bg-purple-100' : 'bg-gray-100'
                          }`}
                        >
                          <Newspaper
                            className={`w-5 h-5 ${
                              notifications.notify_car_news ? 'text-purple-600' : 'text-gray-400'
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Car News & Updates</p>
                          <p className="text-sm text-gray-500">
                            Stay updated with automotive news and industry trends
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.notify_car_news}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              notify_car_news: e.target.checked
                            })
                          }
                          disabled={!notifications.whatsapp_enabled}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-600 peer-disabled:opacity-50"></div>
                      </label>
                    </div>

                    <Separator />

                    {/* Promotions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            notifications.notify_promotions ? 'bg-orange-100' : 'bg-gray-100'
                          }`}
                        >
                          <TagIcon
                            className={`w-5 h-5 ${
                              notifications.notify_promotions ? 'text-orange-600' : 'text-gray-400'
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Promotions & Special Offers</p>
                          <p className="text-sm text-gray-500">
                            Receive exclusive deals, vouchers, and promotional offers
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.notify_promotions}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              notify_promotions: e.target.checked
                            })
                          }
                          disabled={!notifications.whatsapp_enabled}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-600 peer-disabled:opacity-50"></div>
                      </label>
                    </div>

                    <Separator />

                    {/* Order Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            notifications.notify_order_status ? 'bg-green-100' : 'bg-gray-100'
                          }`}
                        >
                          <Package
                            className={`w-5 h-5 ${
                              notifications.notify_order_status ? 'text-green-600' : 'text-gray-400'
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Order Status Updates</p>
                          <p className="text-sm text-gray-500">
                            Get real-time updates on your order status and delivery
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.notify_order_status}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              notify_order_status: e.target.checked
                            })
                          }
                          disabled={!notifications.whatsapp_enabled}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-600 peer-disabled:opacity-50"></div>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveNotifications}
                    disabled={saving}
                    className="bg-lime-600 hover:bg-lime-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
