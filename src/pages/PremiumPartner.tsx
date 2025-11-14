import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Store,
  Crown,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  MapPin,
  Phone,
  Mail,
  Globe,
  Facebook,
  Instagram,
  Calendar,
  DollarSign,
  Eye,
  MousePointer,
  MessageSquare,
  Image as ImageIcon,
  X,
  Upload,
  AlertCircle
} from 'lucide-react';
import AddressAutocompleteSimple from '@/components/AddressAutocompleteSimple';

interface Partnership {
  id: string;
  business_name: string;
  business_type: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  description: string;
  services_offered: string[];
  subscription_status: string;
  subscription_plan: string;
  monthly_fee: number;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  admin_approved: boolean;
  rejection_reason: string | null;
  is_featured: boolean;
  logo_url: string | null;
  shop_photos: string[];
  total_views: number;
  total_clicks: number;
  total_inquiries: number;
  created_at: string;
}

const SUBSCRIPTION_PLAN = {
  id: 'PREMIUM',
  name: 'Premium Partner',
  price: 149,
  features: [
    '✓ Listed on Find Authorized Shops page',
    '✓ TOP PRIORITY in search results',
    '✓ Premium Partner badge (builds customer trust)',
    '✓ Business profile with full contact details',
    '✓ Display business address & location with Google Maps',
    '✓ Show services offered & operating hours',
    '✓ Customer inquiry form (get leads directly)',
    '✓ Link to your social media (Facebook, Instagram, Website)',
    '✓ Advanced analytics (views, clicks, inquiries)',
    '✓ 5% discount on Auto Lab wholesale orders',
    '✓ Access to exclusive partner promotions',
    '✓ Promoted on Auto Lab social media',
    '✓ Priority customer support',
    '✓ Early access to new product launches'
  ],
  description: 'Become an authorized Auto Lab reseller and get featured on our platform to reach more customers'
};

const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
  'Pahang', 'Penang', 'Perak', 'Perlis', 'Sabah',
  'Sarawak', 'Selangor', 'Terengganu', 'Kuala Lumpur',
  'Labuan', 'Putrajaya'
];

const BUSINESS_TYPES = [
  'Auto Accessories Shop',
  'Workshop & Service Center',
  'Car Audio Specialist',
  'Tire & Rim Shop',
  'Paint & Body Shop',
  'Performance Tuning',
  'Auto Detailing',
  'General Auto Parts'
];

const SERVICES = [
  'Installation Service',
  'Repair & Maintenance',
  'Consultation',
  'Product Sourcing',
  'Warranty Service',
  'Custom Orders',
  'Delivery Available'
];

export default function PremiumPartner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    business_name: '',
    business_registration_no: '',
    business_type: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    description: '',
    services_offered: [] as string[],
    website_url: '',
    facebook_url: '',
    instagram_url: '',
    shop_photos: [] as string[]
  });

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  useEffect(() => {
    checkMerchantAndFetchPartnership();
  }, [user]);

  const checkMerchantAndFetchPartnership = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      // Check if user is a merchant
      const { data: profile } = await supabase
        .from('customer_profiles' as any)
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profile || (profile as any).customer_type !== 'merchant') {
        toast({
          title: 'Access Denied',
          description: 'This page is only available for merchant customers.',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }

      setCustomerProfile(profile);

      // Check for existing partnership
      const { data: existingPartnership } = await supabase
        .from('premium_partnerships' as any)
        .select('*')
        .eq('merchant_id', (profile as any).id)
        .single();

      if (existingPartnership) {
        setPartnership(existingPartnership as any);
        // Pre-fill form with existing data
        setFormData({
          business_name: (existingPartnership as any).business_name || '',
          business_registration_no: (existingPartnership as any).business_registration_no || '',
          business_type: (existingPartnership as any).business_type || '',
          contact_person: (existingPartnership as any).contact_person || '',
          contact_phone: (existingPartnership as any).contact_phone || '',
          contact_email: (existingPartnership as any).contact_email || '',
          address: (existingPartnership as any).address || '',
          city: (existingPartnership as any).city || '',
          state: (existingPartnership as any).state || '',
          postcode: (existingPartnership as any).postcode || '',
          description: (existingPartnership as any).description || '',
          services_offered: (existingPartnership as any).services_offered || [],
          website_url: (existingPartnership as any).website_url || '',
          facebook_url: (existingPartnership as any).facebook_url || '',
          instagram_url: (existingPartnership as any).instagram_url || '',
          shop_photos: (existingPartnership as any).shop_photos || []
        });
      }
    } catch (error) {
      console.error('Error checking merchant status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceToggle = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services_offered: prev.services_offered.includes(service)
        ? prev.services_offered.filter(s => s !== service)
        : [...prev.services_offered, service]
    }));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const currentPhotosCount = formData.shop_photos.length;
    const maxPhotos = 4;

    if (currentPhotosCount + files.length > maxPhotos) {
      toast({
        title: 'Too Many Photos',
        description: `You can only upload up to ${maxPhotos} photos. You currently have ${currentPhotosCount} photo(s).`,
        variant: 'destructive'
      });
      return;
    }

    setPhotoFiles(prev => [...prev, ...files]);
  };

  const removePhotoFile = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (photoUrl: string) => {
    setFormData(prev => ({
      ...prev,
      shop_photos: prev.shop_photos.filter(url => url !== photoUrl)
    }));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (photoFiles.length === 0) return formData.shop_photos;

    setUploadingPhotos(true);
    const uploadedUrls: string[] = [...formData.shop_photos];

    try {
      for (const file of photoFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${customerProfile.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `shop-photos/${fileName}`;

        // Upload with high quality settings
        const { error: uploadError } = await supabase.storage
          .from('premium-partners')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('premium-partners')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      setPhotoFiles([]);
      return uploadedUrls;
    } catch (error: any) {
      console.error('Error uploading photos:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload some photos. Please try again.',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Upload photos first
      const shopPhotos = await uploadPhotos();

      const partnershipData = {
        merchant_id: customerProfile.id,
        ...formData,
        shop_photos: shopPhotos,
        subscription_plan: SUBSCRIPTION_PLAN.id,
        monthly_fee: SUBSCRIPTION_PLAN.price,
        subscription_status: partnership ? partnership.subscription_status : 'PENDING',
        admin_approved: partnership ? partnership.admin_approved : false,
        updated_at: new Date().toISOString()
      };

      if (partnership) {
        // Update existing partnership
        const { error } = await supabase
          .from('premium_partnerships' as any)
          .update(partnershipData)
          .eq('id', partnership.id);

        if (error) throw error;

        toast({
          title: 'Application Updated',
          description: 'Your premium partner application has been updated successfully.'
        });
      } else {
        // Create new partnership
        const { error } = await supabase
          .from('premium_partnerships' as any)
          .insert([partnershipData as any]);

        if (error) throw error;

        toast({
          title: 'Application Submitted',
          description: 'Your application has been submitted for admin review. You will be notified once approved.'
        });
      }

      // Refresh data
      await checkMerchantAndFetchPartnership();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit application',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>;
      case 'PENDING':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case 'SUSPENDED':
      case 'CANCELLED':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            <h1 className="text-3xl font-bold">Premium Partner Program</h1>
          </div>
          <p className="text-muted-foreground">
            Become an authorized Auto Lab reseller and get featured on our platform
          </p>
        </div>

        {/* Existing Partnership Status */}
        {partnership && (
          <Card className="mb-8 border-2 border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    {partnership.business_name}
                  </CardTitle>
                  <CardDescription>{partnership.business_type}</CardDescription>
                </div>
                {getStatusBadge(partnership.subscription_status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Info */}
              {partnership.subscription_status === 'PENDING' && !partnership.admin_approved && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <Clock className="h-4 w-4 inline mr-2" />
                    Your application is pending admin review. You will be notified once approved.
                  </p>
                </div>
              )}

              {partnership.admin_approved === false && partnership.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 font-medium mb-1">Application Rejected</p>
                  <p className="text-sm text-red-700">{partnership.rejection_reason}</p>
                </div>
              )}

              {partnership.subscription_status === 'ACTIVE' && partnership.admin_approved && (
                <>
                  {/* Check if subscription is expired or about to expire */}
                  {partnership.subscription_end_date && (() => {
                    const endDate = new Date(partnership.subscription_end_date);
                    const now = new Date();
                    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                    // Subscription has expired
                    if (daysUntilExpiry < 0) {
                      return (
                        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-5">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-100 rounded-full">
                              <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                            </div>
                            <div className="flex-1">
                              <p className="text-base font-bold text-red-900 mb-2">⚠️ Subscription Expired - Action Required</p>
                              <p className="text-sm text-red-800 mb-3">
                                Your subscription expired on <strong>{endDate.toLocaleDateString('en-MY')}</strong>.
                                Your shop is <strong>NO LONGER VISIBLE</strong> on the Find Shops page and you are losing potential customers.
                              </p>
                              <div className="bg-white rounded-lg p-4 mb-3 border border-red-200">
                                <p className="text-sm font-semibold text-red-900 mb-2">📞 How to Renew:</p>
                                <div className="space-y-2 text-sm text-gray-800">
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-red-600" />
                                    <span>Call us: <strong className="text-red-700">03-4297 7668</strong></span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-red-600" />
                                    <span>Email: <strong className="text-red-700">support@autolab.my</strong></span>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-2">
                                    💳 Monthly Fee: RM {partnership.monthly_fee}/month
                                  </p>
                                </div>
                              </div>
                              <Button
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => window.location.href = 'tel:03-4297 7668'}
                              >
                                <Phone className="h-4 w-4 mr-2" />
                                Call to Renew Now
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Subscription expiring within 7 days
                    if (daysUntilExpiry <= 7) {
                      return (
                        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-5">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-orange-100 rounded-full">
                              <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0" />
                            </div>
                            <div className="flex-1">
                              <p className="text-base font-bold text-orange-900 mb-2">⏰ Subscription Expiring Soon</p>
                              <p className="text-sm text-orange-800 mb-3">
                                Your subscription will expire in <strong className="text-lg">{daysUntilExpiry}</strong> day{daysUntilExpiry !== 1 ? 's' : ''} on <strong>{endDate.toLocaleDateString('en-MY')}</strong>.
                                Renew now to avoid service interruption.
                              </p>
                              <div className="bg-white rounded-lg p-4 mb-3 border border-orange-200">
                                <p className="text-sm font-semibold text-orange-900 mb-2">📞 Renew Your Subscription:</p>
                                <div className="space-y-2 text-sm text-gray-800">
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-orange-600" />
                                    <span>Call us: <strong className="text-orange-700">03-4297 7668</strong></span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-orange-600" />
                                    <span>Email: <strong className="text-orange-700">support@autolab.my</strong></span>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-2">
                                    💳 Monthly Fee: RM {partnership.monthly_fee}/month
                                  </p>
                                </div>
                              </div>
                              <Button
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                                onClick={() => window.location.href = 'tel:03-4297 7668'}
                              >
                                <Phone className="h-4 w-4 mr-2" />
                                Renew Subscription
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Subscription expiring within 30 days (warning)
                    if (daysUntilExpiry <= 30) {
                      return (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-yellow-800 mb-1">Subscription Renewal Reminder</p>
                              <p className="text-sm text-yellow-700 mb-2">
                                Your subscription will expire in {daysUntilExpiry} days on {endDate.toLocaleDateString('en-MY')}.
                              </p>
                              <p className="text-xs text-yellow-700">
                                Contact us at <strong>03-4297 7668</strong> to renew and continue enjoying premium benefits.
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Subscription is active and not expiring soon
                    return (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-800">
                          <CheckCircle2 className="h-4 w-4 inline mr-2" />
                          Your partnership is active! Customers can now find your shop on our platform.
                        </p>
                      </div>
                    );
                  })()}
                </>
              )}

              {/* Subscription Details */}
              <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                  <p className="font-semibold flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    {partnership.subscription_plan}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Monthly Fee</p>
                  <p className="font-semibold">RM {partnership.monthly_fee}/month</p>
                </div>
                {partnership.subscription_end_date && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Valid Until</p>
                    <p className="font-semibold">
                      {new Date(partnership.subscription_end_date).toLocaleDateString('en-MY')}
                    </p>
                  </div>
                )}
              </div>

              {/* Statistics */}
              {partnership.subscription_status === 'ACTIVE' && (
                <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Eye className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Profile Views</p>
                      <p className="text-lg font-semibold">{partnership.total_views}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <MousePointer className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Contact Clicks</p>
                      <p className="text-lg font-semibold">{partnership.total_clicks}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Inquiries</p>
                      <p className="text-lg font-semibold">{partnership.total_inquiries}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Renewal Information - Always visible for existing partnerships */}
        {partnership && (
          <Card className="mb-8 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Subscription Renewal Information
              </CardTitle>
              <CardDescription>
                How to renew or extend your premium partnership subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded-lg p-5 border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Subscription Details
                </h4>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Current Status</p>
                    <p className="font-semibold text-gray-900">
                      {partnership.subscription_status}
                      {partnership.admin_approved && ' (Approved)'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Monthly Fee</p>
                    <p className="font-semibold text-gray-900">RM {partnership.monthly_fee}/month</p>
                  </div>
                  {partnership.subscription_end_date && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Valid Until</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(partnership.subscription_end_date).toLocaleDateString('en-MY', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Days Remaining</p>
                        <p className="font-semibold text-gray-900">
                          {(() => {
                            const endDate = new Date(partnership.subscription_end_date);
                            const now = new Date();
                            const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            return daysLeft > 0 ? `${daysLeft} days` : 'Expired';
                          })()}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg p-5 border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Phone className="h-5 w-5 text-blue-600" />
                  Contact Us to Renew
                </h4>
                <p className="text-sm text-gray-700 mb-4">
                  To renew or extend your subscription, please contact our team using any of the methods below:
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded">
                      <Phone className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Phone</p>
                      <a href="tel:03-4297 7668" className="font-semibold text-blue-700 hover:text-blue-800">
                        03-4297 7668
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Email</p>
                      <a href="mailto:support@autolab.my" className="font-semibold text-blue-700 hover:text-blue-800">
                        support@autolab.my
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Visit Us</p>
                      <p className="font-semibold text-gray-900">Cheras, Kuala Lumpur</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg p-4 border border-blue-300">
                <p className="text-sm text-blue-900">
                  <strong>💡 Pro Tip:</strong> Renew early to ensure uninterrupted service and maintain your visibility on the Find Shops page!
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => window.location.href = 'tel:03-4297 7668'}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call to Renew
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.location.href = 'mailto:support@autolab.my?subject=Premium Partnership Renewal'}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email Us
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscription Plan Info */}
        <Card className="mb-8 border-2 border-primary bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Crown className="h-6 w-6 text-yellow-600" />
                  {SUBSCRIPTION_PLAN.name}
                </CardTitle>
                <CardDescription className="mt-2 text-base">
                  {SUBSCRIPTION_PLAN.description}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-primary">
                  RM {SUBSCRIPTION_PLAN.price}
                </div>
                <div className="text-sm text-muted-foreground">/month</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
              {SUBSCRIPTION_PLAN.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{feature.replace('✓ ', '')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Application Form */}
        <div>
            <Card>
              <CardHeader>
                <CardTitle>
                  {partnership ? 'Update' : 'Apply for'} Premium Partnership
                </CardTitle>
                <CardDescription>
                  Fill in your business details to become an authorized Auto Lab reseller
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitApplication} className="space-y-6">
                  {/* Business Information */}
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Business Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="business_name">Business Name *</Label>
                        <Input
                          id="business_name"
                          value={formData.business_name}
                          onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="business_registration_no">Registration No (SSM)</Label>
                        <Input
                          id="business_registration_no"
                          value={formData.business_registration_no}
                          onChange={(e) => setFormData({ ...formData, business_registration_no: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="business_type">Business Type *</Label>
                        <Select
                          value={formData.business_type}
                          onValueChange={(value) => setFormData({ ...formData, business_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                          <SelectContent>
                            {BUSINESS_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="description">Business Description *</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={3}
                          placeholder="Describe your business, expertise, and what makes you special..."
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Contact Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contact_person">Contact Person *</Label>
                        <Input
                          id="contact_person"
                          value={formData.contact_person}
                          onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact_phone">Contact Phone *</Label>
                        <Input
                          id="contact_phone"
                          type="tel"
                          value={formData.contact_phone}
                          onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="contact_email">Contact Email</Label>
                        <Input
                          id="contact_email"
                          type="email"
                          value={formData.contact_email}
                          onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Shop Location
                    </h3>
                    <div className="space-y-4">
                      <AddressAutocompleteSimple
                        value={formData.address}
                        onChange={(address) => setFormData({ ...formData, address })}
                        placeholder="Enter shop address..."
                        required
                      />
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State *</Label>
                          <Select
                            value={formData.state}
                            onValueChange={(value) => setFormData({ ...formData, state: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              {MALAYSIAN_STATES.map((state) => (
                                <SelectItem key={state} value={state}>{state}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="postcode">Postcode *</Label>
                          <Input
                            id="postcode"
                            value={formData.postcode}
                            onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Services Offered */}
                  <div>
                    <h3 className="font-semibold mb-4">Services Offered</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {SERVICES.map((service) => (
                        <Button
                          key={service}
                          type="button"
                          variant={formData.services_offered.includes(service) ? 'default' : 'outline'}
                          className="justify-start"
                          onClick={() => handleServiceToggle(service)}
                        >
                          {formData.services_offered.includes(service) && (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                          )}
                          {service}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Social Media */}
                  <div>
                    <h3 className="font-semibold mb-4">Online Presence (Optional)</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="website_url" className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Website URL
                        </Label>
                        <Input
                          id="website_url"
                          type="url"
                          value={formData.website_url}
                          onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="facebook_url" className="flex items-center gap-2">
                          <Facebook className="h-4 w-4" />
                          Facebook Page
                        </Label>
                        <Input
                          id="facebook_url"
                          type="url"
                          value={formData.facebook_url}
                          onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                          placeholder="https://facebook.com/yourpage"
                        />
                      </div>
                      <div>
                        <Label htmlFor="instagram_url" className="flex items-center gap-2">
                          <Instagram className="h-4 w-4" />
                          Instagram Profile
                        </Label>
                        <Input
                          id="instagram_url"
                          type="url"
                          value={formData.instagram_url}
                          onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                          placeholder="https://instagram.com/yourprofile"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shop Photos Upload */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="flex items-center gap-2 text-base">
                          <ImageIcon className="h-5 w-5" />
                          Shop Photos (Max 4)
                        </Label>
                        <p className="text-sm text-gray-500 mt-1">
                          Upload high-quality photos of your shop to attract more customers
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          💡 Tip: Use clear, well-lit photos for best results
                        </p>
                      </div>
                      <Badge variant="outline">{formData.shop_photos.length + photoFiles.length}/4</Badge>
                    </div>

                    {/* Existing Photos */}
                    {formData.shop_photos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {formData.shop_photos.map((photoUrl, index) => (
                          <div key={index} className="relative group">
                            <div
                              className="w-full h-48 bg-gray-50 rounded-lg border-2 border-gray-200 overflow-hidden cursor-pointer hover:border-blue-400 transition-all"
                              onClick={() => setPreviewImage(photoUrl)}
                            >
                              <img
                                src={photoUrl}
                                alt={`Shop photo ${index + 1}`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeExistingPhoto(photoUrl);
                              }}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* New Photos to Upload */}
                    {photoFiles.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {photoFiles.map((file, index) => {
                          const previewUrl = URL.createObjectURL(file);
                          return (
                            <div key={index} className="relative group">
                              <div
                                className="w-full h-48 bg-gray-50 rounded-lg border-2 border-blue-300 overflow-hidden cursor-pointer hover:border-blue-500 transition-all"
                                onClick={() => setPreviewImage(previewUrl)}
                              >
                                <img
                                  src={previewUrl}
                                  alt={`New photo ${index + 1}`}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removePhotoFile(index);
                                }}
                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              >
                                <X className="h-4 w-4" />
                              </button>
                              <Badge className="absolute bottom-2 left-2 bg-blue-500 shadow-lg">New</Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Upload Button */}
                    {formData.shop_photos.length + photoFiles.length < 4 && (
                      <div>
                        <input
                          type="file"
                          id="shop-photos"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                        <label htmlFor="shop-photos">
                          <Button type="button" variant="outline" className="w-full" asChild>
                            <span>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Shop Photos
                            </span>
                          </Button>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button type="submit" size="lg" disabled={submitting || uploadingPhotos}>
                      {uploadingPhotos ? 'Uploading Photos...' : submitting ? 'Submitting...' : partnership ? 'Update Application' : 'Submit Application'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
        </div>
      </div>

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <div className="relative w-full h-[80vh] bg-black flex items-center justify-center">
            <img
              src={previewImage || ''}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-900 rounded-full p-2 shadow-xl transition-all"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
