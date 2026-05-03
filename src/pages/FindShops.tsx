import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Search, Award, Store, Loader2, Sparkles } from 'lucide-react';
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
  'Labuan', 'Putrajaya',
];

const SERVICE_TYPES = [
  'All Services',
  'Installation Service', 'Repair & Maintenance', 'Consultation',
  'Product Sourcing', 'Warranty Service', 'Custom Orders',
  'Delivery Available',
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
  const [currentPhotoIndexes, setCurrentPhotoIndexes] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    void fetchShops();
  }, []);

  useEffect(() => {
    filterShops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shops, selectedState, selectedService, searchQuery]);

  // Auto-rotate shop photos for cards that have multiple photos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhotoIndexes((prev) => {
        const next = { ...prev };
        filteredShops.forEach((shop) => {
          if (shop.shop_photos && shop.shop_photos.length > 1) {
            next[shop.id] = ((next[shop.id] ?? 0) + 1) % shop.shop_photos.length;
          }
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [filteredShops]);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('premium_partnerships' as any)
        .select('*')
        .eq('subscription_plan', 'panel')
        .eq('subscription_status', 'ACTIVE')
        .eq('admin_approved', true)
        .eq('is_publicly_listed', true)
        .gt('subscription_end_date', new Date().toISOString())
        .order('is_featured', { ascending: false })
        .order('total_views', { ascending: false });
      if (error) throw error;
      setShops((data as any) || []);
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to load authorized Panel shops', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filterShops = () => {
    let filtered = [...shops];
    if (selectedState !== 'All States') filtered = filtered.filter((s) => s.state === selectedState);
    if (selectedService !== 'All Services') filtered = filtered.filter((s) => s.services_offered?.includes(selectedService));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.business_name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q)
      );
    }
    setFilteredShops(filtered);
  };

  const handleClearFilters = () => {
    setSelectedState('All States');
    setSelectedService('All Services');
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedState !== 'All States' || selectedService !== 'All Services' || !!searchQuery;

  return (
    <div className="bg-gray-50 flex flex-col">
      <Header />

      <main className="container mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8 min-h-[calc(100vh-80px)] flex-1">
        {/* Page header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              Find Authorized Shops
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                <Sparkles className="h-3 w-3 mr-1" />Panel
              </Badge>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Our top authorized Panel shops across Malaysia — invitation only.
            </p>
          </div>
        </div>

        {/* Filters card */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-4 gap-3">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search shop name, city, description…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger>
                  <SelectValue placeholder="All states" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {MALAYSIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue placeholder="All services" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {SERVICE_TYPES.map((service) => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <div className="mt-3 pt-3 border-t flex items-center justify-between gap-3 flex-wrap">
                <span className="text-xs text-gray-500">
                  Showing <span className="font-semibold text-gray-900">{filteredShops.length}</span> of {shops.length} shops
                </span>
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-7">
                  Clear filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shops list */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Finding shops...
          </div>
        ) : filteredShops.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <MapPin className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">No shops found</h3>
              <p className="text-sm text-gray-500 mb-4">Try adjusting your filters to see more results.</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredShops.map((shop) => {
              const currentPhotoIndex = currentPhotoIndexes[shop.id] || 0;
              const hasPhotos = shop.shop_photos && shop.shop_photos.length > 0;
              return (
                <Card
                  key={shop.id}
                  onClick={() => navigate(`/shop/${shop.id}`)}
                  className={`overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                    shop.is_featured ? 'ring-1 ring-amber-300' : ''
                  }`}
                >
                  {/* Photo */}
                  <div className="relative h-40 sm:h-44 bg-gray-100 overflow-hidden">
                    {hasPhotos ? (
                      <>
                        <img
                          src={shop.shop_photos[currentPhotoIndex]}
                          alt={shop.business_name}
                          className="w-full h-full object-cover"
                        />
                        {shop.shop_photos.length > 1 && (
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                            {shop.shop_photos.map((_, idx) => (
                              <div
                                key={idx}
                                className={`h-1 rounded-full transition-all ${
                                  idx === currentPhotoIndex ? 'w-4 bg-white' : 'w-1 bg-white/60'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Store className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                    {shop.is_featured && (
                      <Badge className="absolute top-2 right-2 bg-amber-500 hover:bg-amber-500 text-white text-[10px]">
                        <Award className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>

                  {/* Body */}
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-base line-clamp-1">
                        {shop.business_name}
                      </h3>
                      {shop.business_type && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{shop.business_type}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="line-clamp-1">
                        {[shop.city, shop.state].filter(Boolean).join(', ')}
                      </span>
                    </div>

                    {/* Service tags */}
                    {shop.services_offered && shop.services_offered.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {shop.services_offered[0]}
                        </Badge>
                        {shop.services_offered.length > 1 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{shop.services_offered.length - 1} more
                          </Badge>
                        )}
                      </div>
                    )}

                    <Button variant="outline" className="w-full" size="sm">
                      View details
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
