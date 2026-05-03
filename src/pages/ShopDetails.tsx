import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Loader2,
  Sparkles,
  Award,
  CheckCircle2,
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
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    message: '',
  });

  useEffect(() => {
    void fetchShopDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        .maybeSingle();
      if (error) throw error;
      setShop(data as any);
      await (supabase.rpc as any)('increment_partnership_views', { p_partnership_id: shopId });
    } catch {
      toast({ title: 'Error', description: 'Failed to load shop details', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleContactClick = async () => {
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
    setSubmittingInquiry(true);
    try {
      const { error } = await supabase
        .from('partner_inquiries' as any)
        .insert([
          {
            partnership_id: shop.id,
            ...inquiryForm,
            inquiry_type: 'General Question',
          } as any,
        ]);
      if (error) throw error;
      await (supabase.rpc as any)('increment_partnership_inquiries', { p_partnership_id: shop.id });
      toast({
        title: 'Inquiry sent',
        description: 'Your message has been sent to the shop. They will contact you soon.',
        variant: 'success',
      });
      setIsInquiryModalOpen(false);
      setInquiryForm({ customer_name: '', customer_phone: '', customer_email: '', message: '' });
    } catch {
      toast({ title: 'Error', description: 'Failed to send inquiry. Please try again.', variant: 'destructive' });
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const nextPhoto = () => {
    if (!shop?.shop_photos) return;
    setCurrentPhotoIndex((p) => (p + 1) % shop.shop_photos.length);
  };
  const prevPhoto = () => {
    if (!shop?.shop_photos) return;
    setCurrentPhotoIndex((p) => (p - 1 + shop.shop_photos.length) % shop.shop_photos.length);
  };

  if (loading) {
    return (
      <div className="bg-gray-50 flex flex-col">
        <Header />
        <div className="min-h-[calc(100vh-80px)] flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-lime-600" />
            <p className="text-gray-500 text-sm">Loading shop details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="bg-gray-50 flex flex-col">
        <Header />
        <div className="min-h-[calc(100vh-80px)] flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="py-10">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Store className="h-8 w-8 text-gray-400" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Shop not found</h1>
              <p className="text-sm text-gray-500 mb-4">
                This listing may be inactive or no longer available.
              </p>
              <Button onClick={() => navigate('/find-shops')}>
                <ArrowLeft className="h-4 w-4 mr-2" />Back to Find Shops
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const displayPhotos = shop.shop_photos && shop.shop_photos.length > 0 ? shop.shop_photos : [];
  const isPanel = shop.subscription_plan === 'panel';

  return (
    <div className="bg-gray-50 flex flex-col">
      <Header />

      <main className="container mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8 min-h-[calc(100vh-80px)] flex-1">
        {/* Back link */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/find-shops')}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Find Shops
        </Button>

        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
              {shop.business_name}
              {isPanel && (
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Sparkles className="h-3 w-3 mr-1" />Panel
                </Badge>
              )}
              {shop.is_featured && (
                <Badge className="bg-lime-500 hover:bg-lime-600 text-white">
                  <Award className="h-3 w-3 mr-1" />Featured
                </Badge>
              )}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 flex-wrap">
              {shop.business_type && <span>{shop.business_type}</span>}
              {shop.business_type && (shop.city || shop.state) && <span>·</span>}
              {(shop.city || shop.state) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {[shop.city, shop.state].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Photo gallery */}
        {displayPhotos.length > 0 && (
          <div className="mb-6">
            <div
              className="relative rounded-lg overflow-hidden cursor-pointer group bg-gray-100 border"
              onClick={() => setIsImageModalOpen(true)}
            >
              <img
                src={displayPhotos[currentPhotoIndex]}
                alt={shop.business_name}
                className="w-full h-[200px] sm:h-[260px] md:h-[360px] lg:h-[440px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1.5 rounded text-xs text-gray-900 font-medium">
                  Click to enlarge
                </div>
              </div>
              {displayPhotos.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-md transition z-10"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-md transition z-10"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {displayPhotos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); setCurrentPhotoIndex(idx); }}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === currentPhotoIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/60'
                        }`}
                        aria-label={`Photo ${idx + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Content grid */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
            {/* About */}
            {shop.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {shop.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Services */}
            {shop.services_offered && shop.services_offered.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Services Offered</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {shop.services_offered.map((service, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-2 rounded-md border bg-gray-50"
                      >
                        <CheckCircle2 className="h-4 w-4 text-lime-600 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{service}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Operating hours */}
            {shop.operating_hours && Object.keys(shop.operating_hours).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Operating Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="divide-y divide-gray-100">
                    {Object.entries(shop.operating_hours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between py-2 text-sm">
                        <dt className="capitalize text-gray-900 font-medium">{day}</dt>
                        <dd className="text-gray-500">{hours as string}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            )}

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border bg-gray-50 p-3 mb-3">
                  <p className="text-sm font-medium text-gray-900">{shop.address}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[shop.postcode, shop.city, shop.state].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Button variant="outline" className="w-full" onClick={handleNavigate}>
                  <Navigation className="h-4 w-4 mr-2" />
                  Get directions
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="lg:sticky lg:top-24">
              <CardHeader>
                <CardTitle className="text-base">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {shop.contact_phone && (
                  <a
                    href={`tel:${shop.contact_phone}`}
                    onClick={() => void handleContactClick()}
                    className="flex items-center gap-3 p-3 rounded-md border hover:border-lime-500 hover:bg-lime-50/50 transition-colors group"
                  >
                    <div className="w-9 h-9 bg-gray-100 group-hover:bg-lime-100 rounded-md flex items-center justify-center">
                      <Phone className="h-4 w-4 text-gray-600 group-hover:text-lime-700" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{shop.contact_phone}</span>
                  </a>
                )}

                {shop.contact_email && (
                  <a
                    href={`mailto:${shop.contact_email}`}
                    onClick={() => void handleContactClick()}
                    className="flex items-center gap-3 p-3 rounded-md border hover:border-lime-500 hover:bg-lime-50/50 transition-colors group"
                  >
                    <div className="w-9 h-9 bg-gray-100 group-hover:bg-lime-100 rounded-md flex items-center justify-center">
                      <Mail className="h-4 w-4 text-gray-600 group-hover:text-lime-700" />
                    </div>
                    <span className="text-sm text-gray-900 truncate">{shop.contact_email}</span>
                  </a>
                )}

                {shop.website_url && (
                  <a
                    href={shop.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => void handleContactClick()}
                    className="flex items-center gap-3 p-3 rounded-md border hover:border-lime-500 hover:bg-lime-50/50 transition-colors group"
                  >
                    <div className="w-9 h-9 bg-gray-100 group-hover:bg-lime-100 rounded-md flex items-center justify-center">
                      <Globe className="h-4 w-4 text-gray-600 group-hover:text-lime-700" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 flex-1">Website</span>
                    <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                  </a>
                )}

                {(shop.facebook_url || shop.instagram_url) && (
                  <div className="flex gap-2 pt-1">
                    {shop.facebook_url && (
                      <a
                        href={shop.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => void handleContactClick()}
                        className="flex-1 flex items-center justify-center p-2.5 rounded-md border hover:border-blue-500 hover:bg-blue-50/50 transition-colors"
                        aria-label="Facebook"
                      >
                        <Facebook className="h-4 w-4 text-gray-600" />
                      </a>
                    )}
                    {shop.instagram_url && (
                      <a
                        href={shop.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => void handleContactClick()}
                        className="flex-1 flex items-center justify-center p-2.5 rounded-md border hover:border-pink-500 hover:bg-pink-50/50 transition-colors"
                        aria-label="Instagram"
                      >
                        <Instagram className="h-4 w-4 text-gray-600" />
                      </a>
                    )}
                  </div>
                )}

                <Button
                  className="w-full mt-2 bg-lime-600 hover:bg-lime-700"
                  onClick={() => setIsInquiryModalOpen(true)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send inquiry
                </Button>
              </CardContent>
            </Card>
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
                  alt={shop.business_name}
                  className="max-w-full max-h-[90vh] object-contain"
                />
                {displayPhotos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 rounded-full p-2.5 shadow-lg transition"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 rounded-full p-2.5 shadow-lg transition"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 text-gray-900 px-3 py-1.5 rounded-full text-xs font-medium">
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
              Send a message to {shop.business_name}. They'll reach out using the contact details you provide.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="inq-name">
                Your name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="inq-name"
                value={inquiryForm.customer_name}
                onChange={(e) => setInquiryForm({ ...inquiryForm, customer_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inq-phone">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="inq-phone"
                value={inquiryForm.customer_phone}
                onChange={(e) => setInquiryForm({ ...inquiryForm, customer_phone: e.target.value })}
                placeholder="+60 12-345 6789"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inq-email">Email (optional)</Label>
              <Input
                id="inq-email"
                type="email"
                value={inquiryForm.customer_email}
                onChange={(e) => setInquiryForm({ ...inquiryForm, customer_email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inq-message">
                Message <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="inq-message"
                rows={4}
                value={inquiryForm.message}
                onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                placeholder="I'm interested in…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInquiryModalOpen(false)} disabled={submittingInquiry}>
              Cancel
            </Button>
            <Button
              onClick={handleSendInquiry}
              disabled={
                submittingInquiry ||
                !inquiryForm.customer_name ||
                !inquiryForm.customer_phone ||
                !inquiryForm.message
              }
              className="bg-lime-600 hover:bg-lime-700"
            >
              {submittingInquiry ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              Send inquiry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
