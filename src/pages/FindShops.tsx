import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Star,
  Award,
  Crown,
  Navigation,
  Search,
  Filter,
  ExternalLink,
  MessageSquare
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

const MALAYSIAN_STATES = [
  'All States',
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
  'Pahang', 'Penang', 'Perak', 'Perlis', 'Sabah',
  'Sarawak', 'Selangor', 'Terengganu', 'Kuala Lumpur',
  'Labuan', 'Putrajaya'
];

const SERVICE_TYPES = [
  'All Services',
  'Installation Service',
  'Repair & Maintenance',
  'Consultation',
  'Product Sourcing',
  'Warranty Service',
  'Custom Orders',
  'Delivery Available'
];

export default function FindShops() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shops, setShops] = useState<Shop[]>([]);
  const [filteredShops, setFilteredShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedService, setSelectedService] = useState('All Services');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    message: ''
  });

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    filterShops();
  }, [shops, selectedState, selectedService, searchQuery]);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase.rpc as any)('get_active_partnerships');

      if (error) throw error;

      setShops((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching shops:', error);
      toast({
        title: 'Error',
        description: 'Failed to load authorized shops',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterShops = () => {
    let filtered = [...shops];

    // Filter by state
    if (selectedState !== 'All States') {
      filtered = filtered.filter(shop => shop.state === selectedState);
    }

    // Filter by service
    if (selectedService !== 'All Services') {
      filtered = filtered.filter(shop =>
        shop.services_offered?.includes(selectedService)
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(shop =>
        shop.business_name.toLowerCase().includes(query) ||
        shop.city.toLowerCase().includes(query) ||
        shop.description?.toLowerCase().includes(query)
      );
    }

    setFilteredShops(filtered);
  };

  const handleViewShop = async (shop: Shop) => {
    // Navigate to full shop details page
    navigate(`/shop/${shop.id}`);
  };

  const handleContactClick = async (shop: Shop, type: string) => {
    // Increment click count
    try {
      await (supabase.rpc as any)('increment_partnership_clicks', {
        p_partnership_id: shop.id
      });
    } catch (error) {
      console.error('Error incrementing clicks:', error);
    }

    // Open appropriate contact method
    if (type === 'phone') {
      window.location.href = `tel:${shop.contact_phone}`;
    } else if (type === 'email' && shop.contact_email) {
      window.location.href = `mailto:${shop.contact_email}`;
    } else if (type === 'website' && shop.website_url) {
      window.open(shop.website_url, '_blank');
    } else if (type === 'facebook' && shop.facebook_url) {
      window.open(shop.facebook_url, '_blank');
    } else if (type === 'instagram' && shop.instagram_url) {
      window.open(shop.instagram_url, '_blank');
    }
  };

  const handleNavigate = (shop: Shop) => {
    const address = `${shop.address}, ${shop.postcode} ${shop.city}, ${shop.state}`;
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  const handleInquiry = async () => {
    if (!selectedShop) return;

    try {
      const { error } = await supabase
        .from('partner_inquiries' as any)
        .insert([{
          partnership_id: selectedShop.id,
          ...inquiryForm,
          inquiry_type: 'General Question'
        } as any]);

      if (error) throw error;

      // Update inquiry count
      await (supabase.rpc as any)('increment_partnership_inquiries', {
        p_partnership_id: selectedShop.id
      });

      toast({
        title: 'Inquiry Sent',
        description: 'Your inquiry has been sent to the shop. They will contact you soon.'
      });

      setIsInquiryModalOpen(false);
      setInquiryForm({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        message: ''
      });
    } catch (error: any) {
      console.error('Error sending inquiry:', error);
      toast({
        title: 'Error',
        description: 'Failed to send inquiry',
        variant: 'destructive'
      });
    }
  };

  const getPlanBadge = (plan: string) => {
    return <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <Crown className="h-3 w-3 mr-1" />
      Authorized Partner
    </Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Find Authorized Shops</h1>
          <p className="text-muted-foreground">
            Discover trusted Auto Lab authorized resellers near you for installation and services
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search shops, cities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by state" />
                  </SelectTrigger>
                  <SelectContent>
                    {MALAYSIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by service" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((service) => (
                      <SelectItem key={service} value={service}>{service}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(selectedState !== 'All States' || selectedService !== 'All Services' || searchQuery) && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>
                  Showing {filteredShops.length} of {shops.length} shops
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedState('All States');
                    setSelectedService('All Services');
                    setSearchQuery('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shops Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : filteredShops.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No shops found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters to see more results
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShops.map((shop) => (
              <Card
                key={shop.id}
                className={`group hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden bg-white border-0 ${
                  shop.is_featured ? 'ring-2 ring-yellow-400 ring-offset-2' : 'hover:ring-1 hover:ring-gray-200'
                }`}
                onClick={() => handleViewShop(shop)}
              >
                {/* Shop Photo Background - Full Image */}
                <div className="relative h-64 overflow-hidden">
                  {shop.shop_photos && shop.shop_photos.length > 0 ? (
                    <>
                      <img
                        src={shop.shop_photos[0]}
                        alt={shop.business_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                    </>
                  ) : (
                    <>
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <MapPin className="h-20 w-20 text-white/30" />
                      </div>
                    </>
                  )}

                  {/* Badges */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                    {shop.is_featured && (
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black shadow-lg">
                        <Award className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                </div>

                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-bold text-gray-900 line-clamp-1">
                    {shop.business_name}
                  </CardTitle>
                  <CardDescription className="text-sm font-medium text-gray-600">
                    {shop.business_type}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {shop.description}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="font-medium">{shop.city}, {shop.state}</span>
                  </div>

                  {shop.services_offered && shop.services_offered.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {shop.services_offered.slice(0, 3).map((service, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border-0"
                        >
                          {service}
                        </Badge>
                      ))}
                      {shop.services_offered.length > 3 && (
                        <Badge variant="outline" className="text-xs text-gray-600 border-gray-300">
                          +{shop.services_offered.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContactClick(shop, 'phone');
                      }}
                    >
                      <Phone className="h-4 w-4 mr-1.5" />
                      Call
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate(shop);
                      }}
                    >
                      <Navigation className="h-4 w-4 mr-1.5" />
                      Directions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Shop Details Modal */}
        <Dialog open={!!selectedShop} onOpenChange={(open) => !open && setSelectedShop(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedShop && (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <DialogTitle className="text-2xl">{selectedShop.business_name}</DialogTitle>
                      <DialogDescription>{selectedShop.business_type}</DialogDescription>
                    </div>
                    {getPlanBadge(selectedShop.subscription_plan)}
                  </div>
                </DialogHeader>

                {/* Shop Photos Gallery */}
                {selectedShop.shop_photos && selectedShop.shop_photos.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Shop Photos</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedShop.shop_photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`${selectedShop.business_name} - Photo ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-colors cursor-pointer"
                          onClick={() => window.open(photo, '_blank')}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2">About</h4>
                    <p className="text-sm text-muted-foreground">{selectedShop.description}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Location</h4>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p>{selectedShop.address}</p>
                        <p>{selectedShop.postcode} {selectedShop.city}, {selectedShop.state}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Services Offered</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedShop.services_offered?.map((service, index) => (
                        <Badge key={index} variant="secondary">{service}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Contact</h4>
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleContactClick(selectedShop, 'phone')}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        {selectedShop.contact_phone}
                      </Button>

                      {selectedShop.contact_email && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handleContactClick(selectedShop, 'email')}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          {selectedShop.contact_email}
                        </Button>
                      )}

                      {selectedShop.website_url && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handleContactClick(selectedShop, 'website')}
                        >
                          <Globe className="h-4 w-4 mr-2" />
                          Visit Website
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </Button>
                      )}

                      <div className="flex gap-2">
                        {selectedShop.facebook_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleContactClick(selectedShop, 'facebook')}
                          >
                            <Facebook className="h-4 w-4 mr-1" />
                            Facebook
                          </Button>
                        )}
                        {selectedShop.instagram_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleContactClick(selectedShop, 'instagram')}
                          >
                            <Instagram className="h-4 w-4 mr-1" />
                            Instagram
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setIsInquiryModalOpen(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Inquiry
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleNavigate(selectedShop)}
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Get Directions
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Inquiry Modal */}
        <Dialog open={isInquiryModalOpen} onOpenChange={setIsInquiryModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Inquiry</DialogTitle>
              <DialogDescription>
                Send a message to {selectedShop?.business_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Your Name *</label>
                <Input
                  value={inquiryForm.customer_name}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, customer_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Phone Number *</label>
                <Input
                  type="tel"
                  value={inquiryForm.customer_phone}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, customer_phone: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Email (Optional)</label>
                <Input
                  type="email"
                  value={inquiryForm.customer_email}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, customer_email: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Message *</label>
                <textarea
                  className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md"
                  value={inquiryForm.message}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                  placeholder="Tell them what you need..."
                  required
                />
              </div>

              <Button
                className="w-full"
                onClick={handleInquiry}
                disabled={!inquiryForm.customer_name || !inquiryForm.customer_phone || !inquiryForm.message}
              >
                Send Inquiry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
