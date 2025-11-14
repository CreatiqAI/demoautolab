import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  ArrowLeft
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
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
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

  // Auto-swipe images
  useEffect(() => {
    if (!shop || !shop.shop_photos || shop.shop_photos.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentPhotoIndex((prev) => (prev + 1) % shop.shop_photos.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [shop]);

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
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-white">
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

  const displayPhotos = shop.shop_photos && shop.shop_photos.length > 0 ? shop.shop_photos : [];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Back Button */}
      <div className="border-b border-gray-200 bg-white">
        <div className="container mx-auto max-w-7xl px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/find-shops')}
            className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-6 py-8">
        {/* Title Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold mb-2 text-gray-900">{shop.business_name}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>{shop.business_type}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {shop.city}, {shop.state}
            </span>
          </div>
        </div>

        {/* Single Image with Auto-Swipe */}
        {displayPhotos.length > 0 && (
          <div className="mb-10">
            <div
              className="relative rounded-xl overflow-hidden cursor-pointer group flex justify-center"
              onClick={() => setIsImageModalOpen(true)}
            >
              <img
                src={displayPhotos[currentPhotoIndex]}
                alt={`${shop.business_name} - Photo ${currentPhotoIndex + 1}`}
                className="max-h-[450px] w-auto transition-transform group-hover:scale-105"
              />

              {/* Click to enlarge hint */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-4 py-2 rounded-full text-sm text-gray-900 font-medium">
                  Click to enlarge
                </div>
              </div>

              {/* Navigation Arrows */}
              {displayPhotos.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prevPhoto();
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-lg transition z-10"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nextPhoto();
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-lg transition z-10"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>

                  {/* Photo Indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {displayPhotos.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPhotoIndex(index);
                        }}
                        className={`h-2 rounded-full transition-all ${
                          index === currentPhotoIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-10">
            {/* About */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-900">About</h2>
              <p className="text-gray-700 leading-relaxed">{shop.description}</p>
            </div>

            {/* Services */}
            {shop.services_offered && shop.services_offered.length > 0 && (
              <div className="pt-10 border-t border-gray-200">
                <h2 className="text-xl font-semibold mb-5 text-gray-900">Services offered</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {shop.services_offered.map((service, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <div className="w-1.5 h-1.5 bg-gray-900 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">{service}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Operating Hours */}
            {shop.operating_hours && (
              <div className="pt-10 border-t border-gray-200">
                <h2 className="text-xl font-semibold mb-5 flex items-center gap-2 text-gray-900">
                  <Clock className="h-5 w-5" />
                  Operating hours
                </h2>
                <div className="space-y-3">
                  {Object.entries(shop.operating_hours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between py-2">
                      <span className="capitalize text-gray-900 font-medium">{day}</span>
                      <span className="text-gray-600">{hours as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            <div className="pt-10 border-t border-gray-200">
              <h2 className="text-xl font-semibold mb-5 text-gray-900">Location</h2>
              <div className="p-4 bg-gray-50 rounded-lg mb-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">{shop.address}</p>
                    <p className="text-gray-600 text-sm mt-1">
                      {shop.postcode} {shop.city}, {shop.state}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full border-gray-300 hover:bg-gray-50 text-gray-900 hover:text-gray-900"
                onClick={handleNavigate}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Get directions
              </Button>
            </div>
          </div>

          {/* Sticky Sidebar - Contact Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-5 text-gray-900">Contact</h3>

              <div className="space-y-3 mb-6">
                {/* Phone */}
                <button
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-left transition"
                  onClick={() => {
                    handleContactClick('phone');
                    window.location.href = `tel:${shop.contact_phone}`;
                  }}
                >
                  <Phone className="h-5 w-5 text-gray-600 flex-shrink-0" />
                  <span className="text-gray-900">{shop.contact_phone}</span>
                </button>

                {/* Email */}
                {shop.contact_email && (
                  <button
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-left transition"
                    onClick={() => {
                      handleContactClick('email');
                      window.location.href = `mailto:${shop.contact_email}`;
                    }}
                  >
                    <Mail className="h-5 w-5 text-gray-600 flex-shrink-0" />
                    <span className="text-gray-900 text-sm truncate">{shop.contact_email}</span>
                  </button>
                )}

                {/* Website */}
                {shop.website_url && (
                  <button
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-left transition"
                    onClick={() => {
                      handleContactClick('website');
                      window.open(shop.website_url, '_blank');
                    }}
                  >
                    <Globe className="h-5 w-5 text-gray-600 flex-shrink-0" />
                    <span className="text-gray-900 flex-1">Visit website</span>
                    <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </button>
                )}

                {/* Social Media */}
                {(shop.facebook_url || shop.instagram_url) && (
                  <div className="flex gap-2 pt-2">
                    {shop.facebook_url && (
                      <button
                        className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                        onClick={() => {
                          handleContactClick('facebook');
                          window.open(shop.facebook_url, '_blank');
                        }}
                      >
                        <Facebook className="h-5 w-5 text-gray-600" />
                      </button>
                    )}
                    {shop.instagram_url && (
                      <button
                        className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                        onClick={() => {
                          handleContactClick('instagram');
                          window.open(shop.instagram_url, '_blank');
                        }}
                      >
                        <Instagram className="h-5 w-5 text-gray-600" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Primary Action */}
              <Button
                className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11 rounded-lg"
                onClick={() => setIsInquiryModalOpen(true)}
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                Send inquiry
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Enlarge Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 border-0">
          <div className="relative w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
            {displayPhotos[currentPhotoIndex] && (
              <>
                <img
                  src={displayPhotos[currentPhotoIndex]}
                  alt={`${shop.business_name} - Photo ${currentPhotoIndex + 1}`}
                  className="max-w-full max-h-[95vh] w-auto h-auto object-contain"
                />

                {/* Navigation Buttons */}
                {displayPhotos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute -left-16 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 transition-all shadow-lg hover:scale-110"
                      aria-label="Previous image"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                        className="w-6 h-6"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute -right-16 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 transition-all shadow-lg hover:scale-110"
                      aria-label="Next image"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                        className="w-6 h-6"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>

                    {/* Image Counter */}
                    <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 bg-white/90 text-gray-800 px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                      {currentPhotoIndex + 1} / {displayPhotos.length}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Inquiry Modal */}
      <Dialog open={isInquiryModalOpen} onOpenChange={setIsInquiryModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send inquiry</DialogTitle>
            <DialogDescription>
              Send a message to {shop.business_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="customer_name">Your name *</Label>
              <Input
                id="customer_name"
                value={inquiryForm.customer_name}
                onChange={(e) => setInquiryForm({ ...inquiryForm, customer_name: e.target.value })}
                placeholder="John Doe"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="customer_phone">Phone number *</Label>
              <Input
                id="customer_phone"
                value={inquiryForm.customer_phone}
                onChange={(e) => setInquiryForm({ ...inquiryForm, customer_phone: e.target.value })}
                placeholder="+60123456789"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="customer_email">Email (optional)</Label>
              <Input
                id="customer_email"
                type="email"
                value={inquiryForm.customer_email}
                onChange={(e) => setInquiryForm({ ...inquiryForm, customer_email: e.target.value })}
                placeholder="john@example.com"
                className="mt-1.5"
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
                className="mt-1.5"
              />
            </div>

            <Button
              className="w-full bg-gray-900 hover:bg-gray-800"
              onClick={handleSendInquiry}
              disabled={!inquiryForm.customer_name || !inquiryForm.customer_phone || !inquiryForm.message}
            >
              Send inquiry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
