import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Facebook,
  Instagram,
  Clock,
  Crown,
  Navigation,
  ExternalLink,
  MessageSquare,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Shop {
  id: string;
  business_name: string;
  business_type: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  services_offered: string[];
  operating_hours: any;
  website_url: string;
  facebook_url: string;
  instagram_url: string;
  subscription_plan: string;
  is_featured: boolean;
  logo_url: string | null;
  cover_image_url: string | null;
  shop_photos: string[];
  total_views: number;
  display_priority: number;
}

export default function ShopDetails() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    message: ''
  });

  useEffect(() => {
    fetchShopDetails();
  }, [shopId]);

  const fetchShopDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('premium_partnerships' as any)
        .select('*')
        .eq('id', shopId)
        .eq('subscription_status', 'ACTIVE')
        .eq('admin_approved', true)
        .single();

      if (error) throw error;

      setShop(data as any);

      // Increment view count
      await (supabase.rpc as any)('increment_partnership_views', { p_partnership_id: shopId });
    } catch (error) {
      console.error('Error fetching shop:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shop details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContactClick = async (type: string) => {
    if (!shop) return;
    await (supabase.rpc as any)('increment_partnership_clicks', { p_partnership_id: shop.id });
  };

  const handleNavigate = async () => {
    if (!shop) return;
    await (supabase.rpc as any)('increment_partnership_clicks', { p_partnership_id: shop.id });

    if (shop.latitude && shop.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`,
        '_blank'
      );
    } else {
      const address = `${shop.address}, ${shop.postcode} ${shop.city}, ${shop.state}`;
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
        '_blank'
      );
    }
  };

  const handleSendInquiry = async () => {
    if (!shop) return;

    try {
      const { error } = await supabase
        .from('partner_inquiries' as any)
        .insert([{
          partnership_id: shop.id,
          ...inquiryForm,
          inquiry_type: 'General Question'
        } as any]);

      if (error) throw error;

      await (supabase.rpc as any)('increment_partnership_inquiries', { p_partnership_id: shop.id });

      toast({
        title: 'Inquiry Sent',
        description: 'Your message has been sent to the shop. They will contact you soon.'
      });

      setIsInquiryModalOpen(false);
      setInquiryForm({ customer_name: '', customer_phone: '', customer_email: '', message: '' });
    } catch (error) {
      console.error('Error sending inquiry:', error);
      toast({
        title: 'Error',
        description: 'Failed to send inquiry. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const nextPhoto = () => {
    if (!shop?.shop_photos) return;
    setCurrentPhotoIndex((prev) => (prev + 1) % shop.shop_photos.length);
  };

  const prevPhoto = () => {
    if (!shop?.shop_photos) return;
    setCurrentPhotoIndex((prev) => (prev - 1 + shop.shop_photos.length) % shop.shop_photos.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Shop Not Found</h1>
          <Button onClick={() => navigate('/find-shops')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Find Shops
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section with Photos */}
      <div className="relative h-[70vh] min-h-[500px] bg-gray-900">
        {shop.shop_photos && shop.shop_photos.length > 0 ? (
          <>
            <img
              src={shop.shop_photos[currentPhotoIndex]}
              alt={shop.business_name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20"></div>

            {/* Photo Navigation */}
            {shop.shop_photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/30 shadow-xl h-12 w-12"
                  onClick={prevPhoto}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/30 shadow-xl h-12 w-12"
                  onClick={nextPhoto}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>

                {/* Photo Indicators */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
                  {shop.shop_photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === currentPhotoIndex ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
            <MapPin className="h-32 w-32 text-white/30" />
          </div>
        )}

        {/* Shop Name Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="container mx-auto max-w-7xl">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-white hover:bg-white/20 backdrop-blur-sm mb-6 border border-white/30"
              onClick={() => navigate('/find-shops')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Find Shops
            </Button>
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg">
                {shop.business_name}
              </h1>
              <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg w-fit px-3 py-1">
                <Crown className="h-4 w-4 mr-1.5" />
                Authorized Partner
              </Badge>
            </div>
            <p className="text-white/95 text-lg md:text-xl font-medium drop-shadow">{shop.business_type}</p>
          </div>
        </div>
      </div>

      {/* Shop Details */}
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-4 text-gray-900">About</h2>
                <p className="text-gray-700 leading-relaxed text-base">{shop.description}</p>
              </CardContent>
            </Card>

            {/* Services */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-5 text-gray-900">Services Offered</h2>
                <div className="grid grid-cols-2 gap-3">
                  {shop.services_offered?.map((service, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100"
                    >
                      <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                      <span className="text-sm font-medium text-gray-800">{service}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Operating Hours */}
            {shop.operating_hours && (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-5 flex items-center gap-2 text-gray-900">
                    <Clock className="h-6 w-6 text-blue-600" />
                    Operating Hours
                  </h2>
                  <div className="space-y-3">
                    {Object.entries(shop.operating_hours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <span className="font-semibold capitalize text-gray-800">{day}</span>
                        <span className="text-gray-600 font-medium">{hours as string}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card className="sticky top-4 border-0 shadow-lg">
              <CardContent className="p-6 space-y-5">
                <h2 className="text-xl font-bold text-gray-900">Contact Information</h2>

                {/* Location */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">{shop.address}</p>
                      <p className="text-gray-600 text-sm mt-1">{shop.postcode} {shop.city}, {shop.state}</p>
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <Button
                  variant="outline"
                  className="w-full justify-start border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                  size="lg"
                  onClick={() => {
                    handleContactClick('phone');
                    window.location.href = `tel:${shop.contact_phone}`;
                  }}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  {shop.contact_phone}
                </Button>

                {/* Email */}
                {shop.contact_email && (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                    size="lg"
                    onClick={() => {
                      handleContactClick('email');
                      window.location.href = `mailto:${shop.contact_email}`;
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {shop.contact_email}
                  </Button>
                )}

                {/* Website */}
                {shop.website_url && (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                    size="lg"
                    onClick={() => {
                      handleContactClick('website');
                      window.open(shop.website_url, '_blank');
                    }}
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Visit Website
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </Button>
                )}

                {/* Social Media */}
                {(shop.facebook_url || shop.instagram_url) && (
                  <div className="flex gap-3">
                    {shop.facebook_url && (
                      <Button
                        variant="outline"
                        className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          handleContactClick('facebook');
                          window.open(shop.facebook_url, '_blank');
                        }}
                      >
                        <Facebook className="h-4 w-4 mr-2" />
                        Facebook
                      </Button>
                    )}
                    {shop.instagram_url && (
                      <Button
                        variant="outline"
                        className="flex-1 border-pink-300 text-pink-700 hover:bg-pink-50"
                        onClick={() => {
                          handleContactClick('instagram');
                          window.open(shop.instagram_url, '_blank');
                        }}
                      >
                        <Instagram className="h-4 w-4 mr-2" />
                        Instagram
                      </Button>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md"
                    size="lg"
                    onClick={handleNavigate}
                  >
                    <Navigation className="h-5 w-5 mr-2" />
                    Get Directions
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-gray-300 hover:bg-gray-50"
                    size="lg"
                    onClick={() => setIsInquiryModalOpen(true)}
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Send Inquiry
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Inquiry Modal */}
      <Dialog open={isInquiryModalOpen} onOpenChange={setIsInquiryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Inquiry</DialogTitle>
            <DialogDescription>
              Send a message to {shop.business_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="customer_name">Your Name *</Label>
              <Input
                id="customer_name"
                value={inquiryForm.customer_name}
                onChange={(e) => setInquiryForm({ ...inquiryForm, customer_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="customer_phone">Phone Number *</Label>
              <Input
                id="customer_phone"
                value={inquiryForm.customer_phone}
                onChange={(e) => setInquiryForm({ ...inquiryForm, customer_phone: e.target.value })}
                placeholder="+60123456789"
              />
            </div>

            <div>
              <Label htmlFor="customer_email">Email (Optional)</Label>
              <Input
                id="customer_email"
                type="email"
                value={inquiryForm.customer_email}
                onChange={(e) => setInquiryForm({ ...inquiryForm, customer_email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>

            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={inquiryForm.message}
                onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                placeholder="I'm interested in..."
                rows={4}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSendInquiry}
              disabled={!inquiryForm.customer_name || !inquiryForm.customer_phone || !inquiryForm.message}
            >
              Send Inquiry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
