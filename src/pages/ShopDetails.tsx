import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Facebook,
  Instagram,
  Clock,
  Navigation,
  ExternalLink,
  MessageSquare,
  ArrowLeft,
  Store,
  ChevronLeft,
  ChevronRight,
  X
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

  useEffect(() => {
    if (!shop || !shop.shop_photos || shop.shop_photos.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentPhotoIndex((prev) => (prev + 1) % shop.shop_photos.length);
    }, 4000);

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
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Store className="h-12 w-12 animate-pulse mx-auto mb-4 text-lime-600" />
            <p className="text-gray-500 text-sm">Loading shop details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Store className="h-8 w-8 text-gray-400" />
            </div>
            <h1 className="text-xl font-heading font-bold uppercase italic text-gray-900 mb-2">Shop Not Found</h1>
            <button
              onClick={() => navigate('/find-shops')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-lime-600 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-lime-700 transition-all rounded-lg"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Find Shops
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const displayPhotos = shop.shop_photos && shop.shop_photos.length > 0 ? shop.shop_photos : [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-1">
        {/* Back Button */}
        <button
          onClick={() => navigate('/find-shops')}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-lime-700 mb-6 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Find Shops
        </button>

        {/* Shop Header */}
        <div className="mb-6 md:mb-8 border-b border-gray-200 pb-6">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-heading font-bold text-gray-900 uppercase italic mb-2">
            {shop.business_name}
          </h1>
          <div className="flex items-center gap-3 text-xs md:text-sm text-gray-500">
            <span>{shop.business_type}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {shop.city}, {shop.state}
            </span>
          </div>
        </div>

        {/* Photo Gallery */}
        {displayPhotos.length > 0 && (
          <div className="mb-6 md:mb-8">
            <div
              className="relative rounded-xl md:rounded-2xl overflow-hidden cursor-pointer group bg-gray-100"
              onClick={() => setIsImageModalOpen(true)}
            >
              <img
                src={displayPhotos[currentPhotoIndex]}
                alt={`${shop.business_name}`}
                className="w-full h-[220px] md:h-[320px] lg:h-[400px] object-cover group-hover:scale-105 transition-transform duration-700"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-4 py-2 rounded-full text-sm text-gray-900 font-bold uppercase tracking-wider">
                  Click to enlarge
                </div>
              </div>

              {/* Navigation */}
              {displayPhotos.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-lg transition z-10"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-lg transition z-10"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {displayPhotos.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => { e.stopPropagation(); setCurrentPhotoIndex(index); }}
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
        <div className="grid lg:grid-cols-3 gap-5 md:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-5 md:space-y-6">
            {/* About */}
            <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-xl p-4 md:p-6 shadow-md">
              <h2 className="text-base font-heading font-bold uppercase italic text-gray-900 mb-3 pl-3 border-l-4 border-lime-600">About</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{shop.description}</p>
            </div>

            {/* Services */}
            {shop.services_offered && shop.services_offered.length > 0 && (
              <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-xl p-4 md:p-6 shadow-md">
                <h2 className="text-base font-heading font-bold uppercase italic text-gray-900 mb-4 pl-3 border-l-4 border-lime-600">Services Offered</h2>
                <div className="grid sm:grid-cols-2 gap-2">
                  {shop.services_offered.map((service, index) => (
                    <div key={index} className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="w-1.5 h-1.5 bg-lime-600 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-700 text-xs font-medium">{service}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Operating Hours */}
            {shop.operating_hours && Object.keys(shop.operating_hours).length > 0 && (
              <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-xl p-4 md:p-6 shadow-md">
                <h2 className="text-base font-heading font-bold uppercase italic text-gray-900 mb-4 pl-3 border-l-4 border-lime-600 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Operating Hours
                </h2>
                <div className="space-y-2">
                  {Object.entries(shop.operating_hours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                      <span className="capitalize text-gray-900 font-medium">{day}</span>
                      <span className="text-gray-500">{hours as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-xl p-4 md:p-6 shadow-md">
              <h2 className="text-base font-heading font-bold uppercase italic text-gray-900 mb-4 pl-3 border-l-4 border-lime-600">Location</h2>
              <div className="p-3 bg-gray-50 rounded-lg mb-4">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-lime-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{shop.address}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {shop.postcode} {shop.city}, {shop.state}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleNavigate}
                className="w-full py-2.5 border border-gray-200 text-gray-700 font-bold uppercase tracking-widest text-[10px] hover:bg-lime-600 hover:text-white hover:border-lime-600 transition-all rounded-lg flex items-center justify-center gap-1.5"
              >
                <Navigation className="h-3.5 w-3.5" />
                Get Directions
              </button>
            </div>
          </div>

          {/* Sticky Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white/80 backdrop-blur-xl border border-gray-100 rounded-xl p-4 md:p-5 shadow-lg">
              <h3 className="text-base font-heading font-bold uppercase italic text-gray-900 mb-4">Contact</h3>

              <div className="space-y-2.5 mb-4">
                {/* Phone */}
                <button
                  className="w-full flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 hover:border-lime-600 hover:bg-lime-50 text-left transition group"
                  onClick={() => {
                    handleContactClick('phone');
                    window.location.href = `tel:${shop.contact_phone}`;
                  }}
                >
                  <div className="w-9 h-9 bg-gray-100 group-hover:bg-lime-100 rounded-lg flex items-center justify-center">
                    <Phone className="h-4 w-4 text-gray-600 group-hover:text-lime-600" />
                  </div>
                  <span className="text-gray-900 font-medium text-sm">{shop.contact_phone}</span>
                </button>

                {/* Email */}
                {shop.contact_email && (
                  <button
                    className="w-full flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 hover:border-lime-600 hover:bg-lime-50 text-left transition group"
                    onClick={() => {
                      handleContactClick('email');
                      window.location.href = `mailto:${shop.contact_email}`;
                    }}
                  >
                    <div className="w-9 h-9 bg-gray-100 group-hover:bg-lime-100 rounded-lg flex items-center justify-center">
                      <Mail className="h-4 w-4 text-gray-600 group-hover:text-lime-600" />
                    </div>
                    <span className="text-gray-900 text-xs font-medium truncate">{shop.contact_email}</span>
                  </button>
                )}

                {/* Website */}
                {shop.website_url && (
                  <button
                    className="w-full flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 hover:border-lime-600 hover:bg-lime-50 text-left transition group"
                    onClick={() => {
                      handleContactClick('website');
                      window.open(shop.website_url, '_blank');
                    }}
                  >
                    <div className="w-9 h-9 bg-gray-100 group-hover:bg-lime-100 rounded-lg flex items-center justify-center">
                      <Globe className="h-4 w-4 text-gray-600 group-hover:text-lime-600" />
                    </div>
                    <span className="text-gray-900 font-medium text-sm flex-1">Visit Website</span>
                    <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                )}

                {/* Social Media */}
                {(shop.facebook_url || shop.instagram_url) && (
                  <div className="flex gap-2 pt-1">
                    {shop.facebook_url && (
                      <button
                        className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition group"
                        onClick={() => {
                          handleContactClick('facebook');
                          window.open(shop.facebook_url, '_blank');
                        }}
                      >
                        <Facebook className="h-4 w-4 text-gray-600 group-hover:text-blue-600" />
                      </button>
                    )}
                    {shop.instagram_url && (
                      <button
                        className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-pink-600 hover:bg-pink-50 transition group"
                        onClick={() => {
                          handleContactClick('instagram');
                          window.open(shop.instagram_url, '_blank');
                        }}
                      >
                        <Instagram className="h-4 w-4 text-gray-600 group-hover:text-pink-600" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Primary CTA */}
              <button
                onClick={() => setIsInquiryModalOpen(true)}
                className="w-full py-3 bg-lime-600 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-lime-700 transition-all rounded-lg flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="h-4 w-4" />
                Send Inquiry
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Image Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-black/95">
          <div className="relative w-full h-full flex items-center justify-center min-h-[400px]">
            {displayPhotos[currentPhotoIndex] && (
              <>
                <img
                  src={displayPhotos[currentPhotoIndex]}
                  alt={`${shop.business_name}`}
                  className="max-w-full max-h-[90vh] object-contain"
                />

                {displayPhotos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 rounded-full p-3 shadow-lg transition"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 rounded-full p-3 shadow-lg transition"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 text-gray-900 px-4 py-2 rounded-full text-sm font-bold">
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
        <DialogContent className="sm:max-w-[500px] bg-white border-0 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold uppercase italic text-gray-900">Send Inquiry</DialogTitle>
            <p className="text-sm text-gray-500">Send a message to {shop.business_name}</p>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Your Name *</Label>
              <Input
                value={inquiryForm.customer_name}
                onChange={(e) => setInquiryForm({ ...inquiryForm, customer_name: e.target.value })}
                placeholder="John Doe"
                className="h-12 bg-gray-50 border-gray-200 focus:border-lime-600 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Phone Number *</Label>
              <Input
                value={inquiryForm.customer_phone}
                onChange={(e) => setInquiryForm({ ...inquiryForm, customer_phone: e.target.value })}
                placeholder="+60123456789"
                className="h-12 bg-gray-50 border-gray-200 focus:border-lime-600 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Email (Optional)</Label>
              <Input
                type="email"
                value={inquiryForm.customer_email}
                onChange={(e) => setInquiryForm({ ...inquiryForm, customer_email: e.target.value })}
                placeholder="john@example.com"
                className="h-12 bg-gray-50 border-gray-200 focus:border-lime-600 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Message *</Label>
              <Textarea
                value={inquiryForm.message}
                onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                placeholder="I'm interested in..."
                rows={4}
                className="bg-gray-50 border-gray-200 focus:border-lime-600 rounded-xl"
              />
            </div>

            <button
              onClick={handleSendInquiry}
              disabled={!inquiryForm.customer_name || !inquiryForm.customer_phone || !inquiryForm.message}
              className="w-full py-4 bg-lime-600 text-white font-bold uppercase tracking-widest text-xs hover:bg-lime-700 transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Inquiry
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
