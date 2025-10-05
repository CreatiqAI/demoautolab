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
  Upload
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

        const { error: uploadError } = await supabase.storage
          .from('premium-partners')
          .upload(filePath, file);

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
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    <CheckCircle2 className="h-4 w-4 inline mr-2" />
                    Your partnership is active! Customers can now find your shop on our platform.
                  </p>
                </div>
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
                          Upload photos of your shop to attract more customers
                        </p>
                      </div>
                      <Badge variant="outline">{formData.shop_photos.length + photoFiles.length}/4</Badge>
                    </div>

                    {/* Existing Photos */}
                    {formData.shop_photos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {formData.shop_photos.map((photoUrl, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photoUrl}
                              alt={`Shop photo ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => removeExistingPhoto(photoUrl)}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                        {photoFiles.map((file, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`New photo ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border-2 border-blue-200"
                            />
                            <button
                              type="button"
                              onClick={() => removePhotoFile(index)}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <Badge className="absolute bottom-2 left-2 bg-blue-500">New</Badge>
                          </div>
                        ))}
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
    </div>
  );
}
