import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus, Edit, Trash2, Settings as SettingsIcon, Store, Users, Database,
  Mail, Shield, Palette, Globe, CreditCard, Bell, Package, Truck, FileText,
  AlertTriangle, CheckCircle, Info, Save, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Category = Tables<'categories'>;

const USER_ROLES: Array<{ value: Enums<'user_role'>; label: string }> = [
  { value: 'customer', label: 'Customer' },
  { value: 'merchant', label: 'Merchant' },
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' },
];

interface SystemSettings {
  // Store Settings
  storeName: string;
  storeDescription: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  storeWebsite: string;
  storeLogo: string;

  // Business Settings
  currency: string;
  taxRate: number;
  shippingEnabled: boolean;
  shippingRate: number;
  freeShippingThreshold: number;

  // Email Settings
  emailNotifications: boolean;
  orderNotifications: boolean;
  lowStockAlerts: boolean;
  marketingEmails: boolean;

  // Security Settings
  requireEmailVerification: boolean;
  passwordMinLength: number;
  sessionTimeout: number;
  twoFactorAuth: boolean;

  // Inventory Settings
  lowStockThreshold: number;
  autoReorderEnabled: boolean;
  stockAlertEmails: boolean;

  // Payment Settings
  paymentMethods: string[];
  paymentGateway: string;

  // Theme Settings
  primaryColor: string;
  darkMode: boolean;

  // Maintenance Settings
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export default function Settings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    // Store Settings
    storeName: 'AutoMot Hub',
    storeDescription: 'Premium automotive parts and accessories',
    storeAddress: '123 Auto Street, Kuala Lumpur, Malaysia',
    storePhone: '+60 12-345-6789',
    storeEmail: 'info@automothub.com',
    storeWebsite: 'https://automothub.com',
    storeLogo: '',

    // Business Settings
    currency: 'MYR',
    taxRate: 6.0,
    shippingEnabled: true,
    shippingRate: 15.00,
    freeShippingThreshold: 200.00,

    // Email Settings
    emailNotifications: true,
    orderNotifications: true,
    lowStockAlerts: true,
    marketingEmails: false,

    // Security Settings
    requireEmailVerification: true,
    passwordMinLength: 8,
    sessionTimeout: 30,
    twoFactorAuth: false,

    // Inventory Settings
    lowStockThreshold: 10,
    autoReorderEnabled: false,
    stockAlertEmails: true,

    // Payment Settings
    paymentMethods: ['credit_card', 'bank_transfer'],
    paymentGateway: 'stripe',

    // Theme Settings
    primaryColor: '#3b82f6',
    darkMode: false,

    // Maintenance Settings
    maintenanceMode: false,
    maintenanceMessage: 'We are currently performing maintenance. Please check back later.',
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    active: true
  });

  useEffect(() => {
    fetchCategories();
    loadSystemSettings();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSystemSettings = async () => {
    // In a real app, this would load from database
    // For now, we'll use the default settings
    console.log('Loading system settings...');
  };

  const saveSystemSettings = async () => {
    try {
      setSaving(true);
      // In a real app, this would save to database
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Generate a URL-friendly slug from the name
      const slug = categoryForm.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim();

      // Prepare simplified form data
      const formData = {
        name: categoryForm.name,
        description: categoryForm.description || null,
        slug: slug,
        active: categoryForm.active,
        image_url: null,
        sort_order: 0,
        parent_id: null
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(formData)
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast({
          title: "Success",
          description: "Category updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([formData]);
        if (error) throw error;
        toast({
          title: "Success",
          description: "Category created successfully",
        });
      }

      fetchCategories();
      setIsCategoryDialogOpen(false);
      resetCategoryForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save category",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      active: category.active
    });
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
      fetchCategories();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      active: true
    });
    setEditingCategory(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your system settings and configurations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="general" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Store className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">General</span>
            <span className="sm:hidden">Gen</span>
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <CreditCard className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Business</span>
            <span className="sm:hidden">Biz</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Shield className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Security</span>
            <span className="sm:hidden">Sec</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Bell className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Notifications</span>
            <span className="sm:hidden">Notif</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Package className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Inventory</span>
            <span className="sm:hidden">Inv</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Database className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">System</span>
            <span className="sm:hidden">Sys</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Store Information
              </CardTitle>
              <CardDescription>
                Basic information about your store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input
                    id="storeName"
                    value={systemSettings.storeName}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, storeName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeEmail">Store Email</Label>
                  <Input
                    id="storeEmail"
                    type="email"
                    value={systemSettings.storeEmail}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, storeEmail: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeDescription">Store Description</Label>
                <Textarea
                  id="storeDescription"
                  value={systemSettings.storeDescription}
                  onChange={(e) => setSystemSettings(prev => ({ ...prev, storeDescription: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="storePhone">Phone Number</Label>
                  <Input
                    id="storePhone"
                    value={systemSettings.storePhone}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, storePhone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeWebsite">Website</Label>
                  <Input
                    id="storeWebsite"
                    value={systemSettings.storeWebsite}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, storeWebsite: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeAddress">Store Address</Label>
                <Textarea
                  id="storeAddress"
                  value={systemSettings.storeAddress}
                  onChange={(e) => setSystemSettings(prev => ({ ...prev, storeAddress: e.target.value }))}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Theme & Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of your store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={systemSettings.primaryColor}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-20"
                    />
                    <Input
                      value={systemSettings.primaryColor}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="darkMode"
                    checked={systemSettings.darkMode}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, darkMode: checked }))}
                  />
                  <Label htmlFor="darkMode">Enable Dark Mode</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Settings */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Business Configuration
              </CardTitle>
              <CardDescription>
                Configure your business and financial settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={systemSettings.currency}
                    onValueChange={(value) => setSystemSettings(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MYR">Malaysian Ringgit (MYR)</SelectItem>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="SGD">Singapore Dollar (SGD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={systemSettings.taxRate}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex items-center space-x-2 mt-8">
                  <Switch
                    id="shippingEnabled"
                    checked={systemSettings.shippingEnabled}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, shippingEnabled: checked }))}
                  />
                  <Label htmlFor="shippingEnabled">Enable Shipping</Label>
                </div>
              </div>

              {systemSettings.shippingEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
                  <div className="space-y-2">
                    <Label htmlFor="shippingRate">Shipping Rate ({systemSettings.currency})</Label>
                    <Input
                      id="shippingRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={systemSettings.shippingRate}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, shippingRate: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="freeShippingThreshold">Free Shipping Threshold ({systemSettings.currency})</Label>
                    <Input
                      id="freeShippingThreshold"
                      type="number"
                      step="0.01"
                      min="0"
                      value={systemSettings.freeShippingThreshold}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, freeShippingThreshold: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Settings
              </CardTitle>
              <CardDescription>
                Configure payment methods and gateways
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Payment Gateway</Label>
                <Select
                  value={systemSettings.paymentGateway}
                  onValueChange={(value) => setSystemSettings(prev => ({ ...prev, paymentGateway: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="razorpay">Razorpay</SelectItem>
                    <SelectItem value="manual">Manual Processing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Accepted Payment Methods</Label>
                <div className="space-y-2">
                  {[
                    { id: 'credit_card', label: 'Credit/Debit Cards' },
                    { id: 'bank_transfer', label: 'Bank Transfer' },
                    { id: 'paypal', label: 'PayPal' },
                    { id: 'cash_on_delivery', label: 'Cash on Delivery' }
                  ].map((method) => (
                    <div key={method.id} className="flex items-center space-x-2">
                      <Switch
                        id={method.id}
                        checked={systemSettings.paymentMethods.includes(method.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSystemSettings(prev => ({
                              ...prev,
                              paymentMethods: [...prev.paymentMethods, method.id]
                            }));
                          } else {
                            setSystemSettings(prev => ({
                              ...prev,
                              paymentMethods: prev.paymentMethods.filter(m => m !== method.id)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={method.id}>{method.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Configuration
              </CardTitle>
              <CardDescription>
                Manage security settings and user authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requireEmailVerification"
                      checked={systemSettings.requireEmailVerification}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, requireEmailVerification: checked }))}
                    />
                    <Label htmlFor="requireEmailVerification">Require Email Verification</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="twoFactorAuth"
                      checked={systemSettings.twoFactorAuth}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, twoFactorAuth: checked }))}
                    />
                    <Label htmlFor="twoFactorAuth">Enable Two-Factor Authentication</Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                    <Input
                      id="passwordMinLength"
                      type="number"
                      min="6"
                      max="50"
                      value={systemSettings.passwordMinLength}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, passwordMinLength: parseInt(e.target.value) || 8 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      min="5"
                      max="480"
                      value={systemSettings.sessionTimeout}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 30 }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Configure email notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="emailNotifications"
                    checked={systemSettings.emailNotifications}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                  <Label htmlFor="emailNotifications">Enable Email Notifications</Label>
                </div>

                {systemSettings.emailNotifications && (
                  <div className="pl-6 space-y-3 border-l-2 border-muted">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="orderNotifications"
                        checked={systemSettings.orderNotifications}
                        onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, orderNotifications: checked }))}
                      />
                      <Label htmlFor="orderNotifications">Order Notifications</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="lowStockAlerts"
                        checked={systemSettings.lowStockAlerts}
                        onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, lowStockAlerts: checked }))}
                      />
                      <Label htmlFor="lowStockAlerts">Low Stock Alerts</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="marketingEmails"
                        checked={systemSettings.marketingEmails}
                        onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, marketingEmails: checked }))}
                      />
                      <Label htmlFor="marketingEmails">Marketing Emails</Label>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Settings */}
        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory Management
              </CardTitle>
              <CardDescription>
                Configure inventory and stock management settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                  <Input
                    id="lowStockThreshold"
                    type="number"
                    min="0"
                    value={systemSettings.lowStockThreshold}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 10 }))}
                  />
                </div>
                <div className="flex items-center space-x-2 mt-8">
                  <Switch
                    id="stockAlertEmails"
                    checked={systemSettings.stockAlertEmails}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, stockAlertEmails: checked }))}
                  />
                  <Label htmlFor="stockAlertEmails">Stock Alert Emails</Label>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="autoReorderEnabled"
                  checked={systemSettings.autoReorderEnabled}
                  onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, autoReorderEnabled: checked }))}
                />
                <Label htmlFor="autoReorderEnabled">Enable Auto-Reorder</Label>
              </div>

              {systemSettings.autoReorderEnabled && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Auto-reorder will automatically create purchase orders when stock falls below the threshold.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Categories Section - Moved here */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Product Categories</CardTitle>
                  <CardDescription>
                    Manage product categories for better organization
                  </CardDescription>
                </div>
                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetCategoryForm(); setIsCategoryDialogOpen(true); }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingCategory ? 'Edit Category' : 'Add New Category'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingCategory
                          ? 'Update category information'
                          : 'Create a new product category'}
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCategorySubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Category Name *</Label>
                        <Input
                          id="name"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                          placeholder="e.g., Engine Parts, Suspension, Brakes"
                          required
                        />
                        <p className="text-sm text-muted-foreground">
                          URL will be auto-generated from the category name
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                          id="description"
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                          placeholder="Brief description of this category"
                          rows={2}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="active"
                          checked={categoryForm.active}
                          onCheckedChange={(checked) => setCategoryForm({...categoryForm, active: checked})}
                        />
                        <Label htmlFor="active">Active Category</Label>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCategoryDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>

            <CardContent>
              {loading && categories.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No categories yet. Create your first category!
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((category) => {
                        return (
                          <TableRow key={category.id}>
                            <TableCell>
                              <div className="font-medium">{category.name}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                {category.description || '—'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={category.active ? 'default' : 'secondary'}>
                                {category.active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(category.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditCategory(category)}
                                  title="Edit Category"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCategory(category.id)}
                                  title="Delete Category"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Maintenance Mode
              </CardTitle>
              <CardDescription>
                Control site availability and maintenance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="maintenanceMode"
                  checked={systemSettings.maintenanceMode}
                  onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, maintenanceMode: checked }))}
                />
                <Label htmlFor="maintenanceMode">Enable Maintenance Mode</Label>
              </div>

              {systemSettings.maintenanceMode && (
                <div className="space-y-2">
                  <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                  <Textarea
                    id="maintenanceMessage"
                    value={systemSettings.maintenanceMessage}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, maintenanceMessage: e.target.value }))}
                    rows={3}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Information
              </CardTitle>
              <CardDescription>
                Current system status and information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Database Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Connection:</span>
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Connected
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Version:</span>
                      <span>PostgreSQL 15</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Storage Used:</span>
                      <span>2.4 GB</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Application Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Version:</span>
                      <span>v1.2.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Environment:</span>
                      <Badge variant="outline">Production</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Backup:</span>
                      <span>2 hours ago</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div>
                <h4 className="font-semibold mb-3">User Roles</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {USER_ROLES.map((role) => (
                    <div key={role.value} className="flex justify-between">
                      <span>{role.label}:</span>
                      <Badge variant="outline">{role.value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button - Fixed at bottom */}
      <div className="flex justify-end space-x-2 pt-6 border-t">
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset Changes
        </Button>
        <Button onClick={saveSystemSettings} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save All Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}