import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Bell, BellOff, MessageSquare, Check, AlertCircle } from 'lucide-react';

interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: string;
  is_enabled: boolean;
  whatsapp_phone?: string;
  whatsapp_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

interface NotificationType {
  type: string;
  label: string;
  description: string;
  category: 'orders' | 'products' | 'shop' | 'marketing';
}

const NOTIFICATION_TYPES: NotificationType[] = [
  // Order Notifications
  {
    type: 'order_confirmed',
    label: 'Order Confirmed',
    description: 'When your order is confirmed by the merchant',
    category: 'orders'
  },
  {
    type: 'order_packing',
    label: 'Order Packing',
    description: 'When your order is being packed for shipping',
    category: 'orders'
  },
  {
    type: 'order_shipped',
    label: 'Order Shipped',
    description: 'When your order has been shipped',
    category: 'orders'
  },
  {
    type: 'order_delivered',
    label: 'Order Delivered',
    description: 'When your order has been delivered',
    category: 'orders'
  },
  {
    type: 'order_cancelled',
    label: 'Order Cancelled',
    description: 'When your order is cancelled',
    category: 'orders'
  },
  // Product Notifications
  {
    type: 'new_products',
    label: 'New Products',
    description: 'When new products are added to the catalog',
    category: 'products'
  },
  {
    type: 'price_drops',
    label: 'Price Drops',
    description: 'When products you viewed go on sale',
    category: 'products'
  },
  {
    type: 'back_in_stock',
    label: 'Back in Stock',
    description: 'When out-of-stock products become available',
    category: 'products'
  },
  // Shop Notifications
  {
    type: 'shop_announcements',
    label: 'Shop Announcements',
    description: 'Important announcements from merchants',
    category: 'shop'
  },
  // Marketing Notifications
  {
    type: 'promotions',
    label: 'Promotions & Offers',
    description: 'Exclusive deals and promotional offers',
    category: 'marketing'
  }
];

const CATEGORY_INFO = {
  orders: {
    title: 'Order Updates',
    description: 'Track your orders from confirmation to delivery',
    icon: '📦'
  },
  products: {
    title: 'Product Updates',
    description: 'Stay informed about new products and price changes',
    icon: '🛍️'
  },
  shop: {
    title: 'Shop Communications',
    description: 'Important announcements and updates from merchants',
    icon: '🏪'
  },
  marketing: {
    title: 'Promotions & Marketing',
    description: 'Exclusive deals and special offers',
    icon: '🎁'
  }
};

export default function NotificationSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [phoneEdited, setPhoneEdited] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        toast({
          title: 'Authentication Error',
          description: 'Please log in to manage notification settings',
          variant: 'destructive'
        });
        return;
      }

      setUser(authUser);

      // Get customer profile
      const { data: profileData, error: profileError } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (profileError) throw profileError;
      setCustomerProfile(profileData);

      // Get notification preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', authUser.id);

      if (preferencesError) throw preferencesError;

      if (preferencesData && preferencesData.length > 0) {
        setPreferences(preferencesData);

        // Set WhatsApp phone and opt-in from first preference (they should all be the same)
        const firstPref = preferencesData[0];
        setWhatsappPhone(firstPref.whatsapp_phone || profileData.phone || '');
        setWhatsappOptIn(firstPref.whatsapp_opt_in);
      } else {
        // Initialize default phone from profile
        setWhatsappPhone(profileData.phone || '');
        setWhatsappOptIn(false);
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotification = async (notificationType: string, currentValue: boolean) => {
    try {
      const newValue = !currentValue;

      // Find existing preference
      const existingPref = preferences.find(p => p.notification_type === notificationType);

      if (existingPref) {
        // Update existing preference
        const { error } = await supabase
          .from('notification_preferences')
          .update({ is_enabled: newValue, updated_at: new Date().toISOString() })
          .eq('id', existingPref.id);

        if (error) throw error;

        // Update local state
        setPreferences(prev => prev.map(p =>
          p.notification_type === notificationType
            ? { ...p, is_enabled: newValue, updated_at: new Date().toISOString() }
            : p
        ));
      } else {
        // Create new preference
        const { data, error } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            notification_type: notificationType,
            is_enabled: newValue,
            whatsapp_phone: whatsappPhone,
            whatsapp_opt_in: whatsappOptIn
          })
          .select()
          .single();

        if (error) throw error;

        // Add to local state
        setPreferences(prev => [...prev, data]);
      }

      toast({
        title: 'Updated',
        description: `${notificationType.replace(/_/g, ' ')} notifications ${newValue ? 'enabled' : 'disabled'}`,
        variant: 'default'
      });
    } catch (error: any) {
      console.error('Error toggling notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification preference',
        variant: 'destructive'
      });
    }
  };

  const handleSaveWhatsAppSettings = async () => {
    try {
      setSaving(true);

      // Validate phone number
      if (whatsappOptIn && !whatsappPhone.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a WhatsApp phone number',
          variant: 'destructive'
        });
        return;
      }

      // Phone validation (Malaysian format)
      if (whatsappPhone.trim()) {
        const phoneRegex = /^(\+?60|0)[0-9]{9,10}$/;
        if (!phoneRegex.test(whatsappPhone.replace(/[\s-]/g, ''))) {
          toast({
            title: 'Invalid Phone',
            description: 'Please enter a valid Malaysian phone number',
            variant: 'destructive'
          });
          return;
        }
      }

      // Update all existing preferences with new WhatsApp settings
      if (preferences.length > 0) {
        const { error } = await supabase
          .from('notification_preferences')
          .update({
            whatsapp_phone: whatsappPhone,
            whatsapp_opt_in: whatsappOptIn,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) throw error;
      }

      // Update local state
      setPreferences(prev => prev.map(p => ({
        ...p,
        whatsapp_phone: whatsappPhone,
        whatsapp_opt_in: whatsappOptIn,
        updated_at: new Date().toISOString()
      })));

      setPhoneEdited(false);

      toast({
        title: 'Saved',
        description: 'WhatsApp notification settings updated successfully',
        variant: 'default'
      });
    } catch (error: any) {
      console.error('Error saving WhatsApp settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save WhatsApp settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEnableAll = async (category?: string) => {
    try {
      const typesToEnable = category
        ? NOTIFICATION_TYPES.filter(nt => nt.category === category).map(nt => nt.type)
        : NOTIFICATION_TYPES.map(nt => nt.type);

      for (const notifType of typesToEnable) {
        const existingPref = preferences.find(p => p.notification_type === notifType);

        if (existingPref && !existingPref.is_enabled) {
          await supabase
            .from('notification_preferences')
            .update({ is_enabled: true, updated_at: new Date().toISOString() })
            .eq('id', existingPref.id);
        } else if (!existingPref) {
          await supabase
            .from('notification_preferences')
            .insert({
              user_id: user.id,
              notification_type: notifType,
              is_enabled: true,
              whatsapp_phone: whatsappPhone,
              whatsapp_opt_in: whatsappOptIn
            });
        }
      }

      // Reload preferences
      await loadSettings();

      toast({
        title: 'Enabled',
        description: category ? `All ${category} notifications enabled` : 'All notifications enabled',
        variant: 'default'
      });
    } catch (error: any) {
      console.error('Error enabling all:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable notifications',
        variant: 'destructive'
      });
    }
  };

  const handleDisableAll = async (category?: string) => {
    try {
      const typesToDisable = category
        ? NOTIFICATION_TYPES.filter(nt => nt.category === category).map(nt => nt.type)
        : NOTIFICATION_TYPES.map(nt => nt.type);

      for (const notifType of typesToDisable) {
        const existingPref = preferences.find(p => p.notification_type === notifType);

        if (existingPref && existingPref.is_enabled) {
          await supabase
            .from('notification_preferences')
            .update({ is_enabled: false, updated_at: new Date().toISOString() })
            .eq('id', existingPref.id);
        }
      }

      // Reload preferences
      await loadSettings();

      toast({
        title: 'Disabled',
        description: category ? `All ${category} notifications disabled` : 'All notifications disabled',
        variant: 'default'
      });
    } catch (error: any) {
      console.error('Error disabling all:', error);
      toast({
        title: 'Error',
        description: 'Failed to disable notifications',
        variant: 'destructive'
      });
    }
  };

  const isNotificationEnabled = (notificationType: string): boolean => {
    const pref = preferences.find(p => p.notification_type === notificationType);
    return pref ? pref.is_enabled : false;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-red-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
              <p className="text-gray-600">Please log in to manage notification settings</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
        <p className="text-gray-600">
          Manage how you want to receive updates about orders, products, and promotions
        </p>
      </div>

      {/* WhatsApp Settings Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-green-600" />
            <div>
              <CardTitle>WhatsApp Notifications</CardTitle>
              <CardDescription>
                Receive instant notifications via WhatsApp
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="whatsapp_phone">WhatsApp Phone Number</Label>
            <Input
              id="whatsapp_phone"
              type="tel"
              value={whatsappPhone}
              onChange={(e) => {
                setWhatsappPhone(e.target.value);
                setPhoneEdited(true);
              }}
              placeholder="+60123456789"
              className="mt-2"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter your WhatsApp number in Malaysian format (+60 or 0)
            </p>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="whatsapp_opt_in" className="text-base font-semibold">
                Enable WhatsApp Notifications
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Receive notifications via WhatsApp when enabled
              </p>
            </div>
            <Switch
              id="whatsapp_opt_in"
              checked={whatsappOptIn}
              onCheckedChange={(checked) => {
                setWhatsappOptIn(checked);
                setPhoneEdited(true);
              }}
            />
          </div>

          {phoneEdited && (
            <Button
              onClick={handleSaveWhatsAppSettings}
              disabled={saving}
              className="w-full"
            >
              {saving ? 'Saving...' : 'Save WhatsApp Settings'}
            </Button>
          )}

          {whatsappOptIn && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="text-sm text-green-800">
                  <strong>WhatsApp notifications enabled</strong>
                  <p className="mt-1">You'll receive notifications at {whatsappPhone || 'your registered number'}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Enable or disable all notifications at once</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleEnableAll()}
              className="flex-1"
            >
              <Bell className="h-4 w-4 mr-2" />
              Enable All
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDisableAll()}
              className="flex-1"
            >
              <BellOff className="h-4 w-4 mr-2" />
              Disable All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      {Object.entries(CATEGORY_INFO).map(([categoryKey, categoryInfo]) => {
        const categoryTypes = NOTIFICATION_TYPES.filter(nt => nt.category === categoryKey);

        return (
          <Card key={categoryKey} className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{categoryInfo.icon}</span>
                  <div>
                    <CardTitle>{categoryInfo.title}</CardTitle>
                    <CardDescription>{categoryInfo.description}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEnableAll(categoryKey)}
                  >
                    Enable All
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDisableAll(categoryKey)}
                  >
                    Disable All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryTypes.map((notifType, index) => (
                  <div key={notifType.type}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label htmlFor={notifType.type} className="text-base font-medium cursor-pointer">
                          {notifType.label}
                        </Label>
                        <p className="text-sm text-gray-600 mt-1">
                          {notifType.description}
                        </p>
                      </div>
                      <Switch
                        id={notifType.type}
                        checked={isNotificationEnabled(notifType.type)}
                        onCheckedChange={() => handleToggleNotification(notifType.type, isNotificationEnabled(notifType.type))}
                      />
                    </div>
                    {index < categoryTypes.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Info Footer */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Notification preferences apply to both email and WhatsApp notifications.
            Make sure to enable WhatsApp notifications above to receive messages via WhatsApp.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
