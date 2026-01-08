import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Upload,
  X,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar
} from 'lucide-react';

type TabType = 'listings' | 'create';

interface SecondhandListing {
  id: string;
  title: string;
  description: string;
  original_price: number;
  selling_price: number;
  is_negotiable: boolean;
  condition: string;
  year_purchased: number;
  months_used: number;
  reason_for_selling: string;
  car_brand: string;
  car_model: string;
  compatible_years: string;
  images: string[];
  status: string;
  admin_notes: string;
  views_count: number;
  inquiry_count: number;
  created_at: string;
  product_category: string;
}

const CONDITION_OPTIONS = [
  { value: 'like_new', label: 'Like New', description: 'Barely used, excellent condition' },
  { value: 'good', label: 'Good', description: 'Used but well-maintained' },
  { value: 'fair', label: 'Fair', description: 'Shows signs of wear' },
  { value: 'damaged', label: 'Damaged', description: 'Has defects or damage' }
];

const PRODUCT_CATEGORIES = [
  'Android Head Unit',
  'Display Screen',
  'Camera System',
  'Audio System',
  'Navigation Device',
  'Dash Cam',
  'Car Accessories',
  'Interior Parts',
  'Exterior Parts',
  'Other'
];

export default function My2ndHandListings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('listings');
  const [loading, setLoading] = useState(true);
  const [isMerchant, setIsMerchant] = useState(false);
  const [merchantProfileId, setMerchantProfileId] = useState<string | null>(null);
  const [listings, setListings] = useState<SecondhandListing[]>([]);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    product_category: '',
    original_price: '',
    selling_price: '',
    is_negotiable: false,
    condition: '',
    year_purchased: '',
    months_used: '',
    reason_for_selling: '',
    car_brand: '',
    car_model: '',
    compatible_years: ''
  });

  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  useEffect(() => {
    checkMerchantAndFetchListings();
  }, [user]);

  const checkMerchantAndFetchListings = async () => {
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
          description: '2nd Hand Marketplace is only available for merchant accounts.',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }

      setIsMerchant(true);
      setMerchantProfileId(profile.id);

      // Fetch listings
      await fetchListings(profile.id);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchListings = async (profileId: string) => {
    const { data, error } = await supabase
      .from('secondhand_listings')
      .select('*')
      .eq('seller_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching listings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your listings',
        variant: 'destructive'
      });
      return;
    }

    setListings(data || []);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedImages.length + files.length > 5) {
      toast({
        title: 'Too Many Images',
        description: 'Maximum 5 images allowed per listing',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `secondhand/${merchantProfileId}/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        return publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      setUploadedImages([...uploadedImages, ...urls]);

      toast({
        title: 'Success',
        description: `${files.length} image(s) uploaded successfully`
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload images',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }
    if (!formData.product_category) {
      toast({ title: 'Error', description: 'Product category is required', variant: 'destructive' });
      return;
    }
    if (!formData.selling_price || parseFloat(formData.selling_price) <= 0) {
      toast({ title: 'Error', description: 'Valid selling price is required', variant: 'destructive' });
      return;
    }
    if (!formData.condition) {
      toast({ title: 'Error', description: 'Condition is required', variant: 'destructive' });
      return;
    }
    if (uploadedImages.length === 0) {
      toast({ title: 'Error', description: 'At least 1 image is required', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('secondhand_listings')
        .insert({
          seller_id: merchantProfileId,
          title: formData.title,
          description: formData.description,
          product_category: formData.product_category,
          original_price: formData.original_price ? parseFloat(formData.original_price) : null,
          selling_price: parseFloat(formData.selling_price),
          is_negotiable: formData.is_negotiable,
          condition: formData.condition,
          year_purchased: formData.year_purchased ? parseInt(formData.year_purchased) : null,
          months_used: formData.months_used ? parseInt(formData.months_used) : null,
          reason_for_selling: formData.reason_for_selling,
          car_brand: formData.car_brand,
          car_model: formData.car_model,
          compatible_years: formData.compatible_years,
          images: uploadedImages,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Listing submitted for admin approval. You will be notified once approved.'
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        product_category: '',
        original_price: '',
        selling_price: '',
        is_negotiable: false,
        condition: '',
        year_purchased: '',
        months_used: '',
        reason_for_selling: '',
        car_brand: '',
        car_model: '',
        compatible_years: ''
      });
      setUploadedImages([]);

      // Refresh listings and switch to listings tab
      await fetchListings(merchantProfileId!);
      setActiveTab('listings');
    } catch (error: any) {
      console.error('Submit error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create listing',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pending Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case 'sold':
        return <Badge className="bg-purple-500"><DollarSign className="w-3 h-3 mr-1" /> Sold</Badge>;
      case 'expired':
        return <Badge className="bg-gray-500"><Calendar className="w-3 h-3 mr-1" /> Expired</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getConditionBadge = (condition: string) => {
    const colors: any = {
      like_new: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      fair: 'bg-yellow-100 text-yellow-800',
      damaged: 'bg-red-100 text-red-800'
    };
    return <Badge className={colors[condition] || ''}>{condition.replace('_', ' ').toUpperCase()}</Badge>;
  };

  if (loading && !isMerchant) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <Package className="h-12 w-12 animate-pulse mx-auto mb-4 text-lime-600" />
            <p className="text-gray-500 text-[15px]">Loading...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-1">
        {/* Page Header */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-heading font-bold text-gray-900 uppercase italic mb-2">
            My 2nd Hand Listings
          </h1>
          <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">
            Sell your used automotive parts to customers
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'listings' ? 'default' : 'outline'}
            onClick={() => setActiveTab('listings')}
            className="flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            My Listings ({listings.length})
          </Button>
          <Button
            variant={activeTab === 'create' ? 'default' : 'outline'}
            onClick={() => setActiveTab('create')}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Listing
          </Button>
        </div>

        {/* My Listings Tab */}
        {activeTab === 'listings' && (
          <div className="space-y-4">
            {listings.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings yet</h3>
                <p className="text-gray-500 mb-4">Create your first 2nd hand listing to start selling</p>
                <Button onClick={() => setActiveTab('create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Listing
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map((listing) => (
                  <div key={listing.id} className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    {/* Image */}
                    <div className="aspect-video bg-gray-100 relative">
                      {listing.images && listing.images.length > 0 ? (
                        <img
                          src={listing.images[0]}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Package className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        {getStatusBadge(listing.status)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-1 truncate">{listing.title}</h3>
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">{listing.description}</p>

                      <div className="flex items-center gap-2 mb-3">
                        {getConditionBadge(listing.condition)}
                        {listing.product_category && (
                          <Badge variant="outline" className="text-[10px]">{listing.product_category}</Badge>
                        )}
                      </div>

                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-2xl font-bold text-lime-600">
                          RM {listing.selling_price.toFixed(2)}
                        </span>
                        {listing.original_price && (
                          <span className="text-sm text-gray-400 line-through">
                            RM {listing.original_price.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {listing.views_count || 0} views
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {listing.inquiry_count || 0} inquiries
                        </div>
                      </div>

                      {/* Admin Notes (if rejected) */}
                      {listing.status === 'rejected' && listing.admin_notes && (
                        <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
                          <p className="text-xs text-red-800 font-semibold mb-1">Rejection Reason:</p>
                          <p className="text-xs text-red-700">{listing.admin_notes}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" disabled>
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" disabled>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Listing Tab */}
        {activeTab === 'create' && (
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Information */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">Product Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., BMW 12.3 inch Android Head Unit"
                      maxLength={100}
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the product condition, features, and any defects..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.product_category} onValueChange={(val) => setFormData({ ...formData, product_category: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition">Condition *</Label>
                    <Select value={formData.condition} onValueChange={(val) => setFormData({ ...formData, condition: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div>
                              <div className="font-semibold">{opt.label}</div>
                              <div className="text-xs text-gray-500">{opt.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="original_price">Original Price (RM)</Label>
                    <Input
                      id="original_price"
                      type="number"
                      step="0.01"
                      value={formData.original_price}
                      onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                      placeholder="e.g., 1500.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="selling_price">Selling Price (RM) *</Label>
                    <Input
                      id="selling_price"
                      type="number"
                      step="0.01"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                      placeholder="e.g., 800.00"
                      required
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_negotiable}
                        onChange={(e) => setFormData({ ...formData, is_negotiable: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm font-medium">Price negotiable</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Usage History */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">Usage History</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="year_purchased">Year Purchased</Label>
                    <Input
                      id="year_purchased"
                      type="number"
                      value={formData.year_purchased}
                      onChange={(e) => setFormData({ ...formData, year_purchased: e.target.value })}
                      placeholder="e.g., 2022"
                      min="2000"
                      max={new Date().getFullYear()}
                    />
                  </div>

                  <div>
                    <Label htmlFor="months_used">Months Used</Label>
                    <Input
                      id="months_used"
                      type="number"
                      value={formData.months_used}
                      onChange={(e) => setFormData({ ...formData, months_used: e.target.value })}
                      placeholder="e.g., 18"
                      min="0"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="reason">Reason for Selling</Label>
                    <Textarea
                      id="reason"
                      value={formData.reason_for_selling}
                      onChange={(e) => setFormData({ ...formData, reason_for_selling: e.target.value })}
                      placeholder="e.g., Upgrading to newer model..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Compatibility */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">Vehicle Compatibility</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="car_brand">Car Brand</Label>
                    <Input
                      id="car_brand"
                      value={formData.car_brand}
                      onChange={(e) => setFormData({ ...formData, car_brand: e.target.value })}
                      placeholder="e.g., BMW"
                    />
                  </div>

                  <div>
                    <Label htmlFor="car_model">Car Model</Label>
                    <Input
                      id="car_model"
                      value={formData.car_model}
                      onChange={(e) => setFormData({ ...formData, car_model: e.target.value })}
                      placeholder="e.g., 3 Series"
                    />
                  </div>

                  <div>
                    <Label htmlFor="compatible_years">Compatible Years</Label>
                    <Input
                      id="compatible_years"
                      value={formData.compatible_years}
                      onChange={(e) => setFormData({ ...formData, compatible_years: e.target.value })}
                      placeholder="e.g., 2015-2020"
                    />
                  </div>
                </div>
              </div>

              {/* Images */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">Product Images *</h3>
                <p className="text-sm text-gray-500 mb-4">Upload 1-5 clear photos of the product</p>

                {/* Image Preview Grid */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    {uploadedImages.map((url, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                        <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                {uploadedImages.length < 5 && (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-lime-500 hover:bg-lime-50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      {uploading ? 'Uploading...' : 'Click to upload images'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {uploadedImages.length}/5 images uploaded
                    </p>
                  </label>
                )}
              </div>

              {/* Submit */}
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-gray-500">
                  * Required fields. Your listing will be reviewed by admin before publication.
                </p>
                <Button type="submit" disabled={loading || uploading} size="lg">
                  {loading ? 'Submitting...' : 'Submit for Approval'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
