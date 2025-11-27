import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MapPin,
  Phone,
  Search,
  Award,
  Store
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
  const [currentPhotoIndexes, setCurrentPhotoIndexes] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    filterShops();
  }, [shops, selectedState, selectedService, searchQuery]);

  // Auto-rotate shop photos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhotoIndexes((prev) => {
        const newIndexes = { ...prev };
        filteredShops.forEach((shop) => {
          if (shop.shop_photos && shop.shop_photos.length > 1) {
            const currentIndex = newIndexes[shop.id] || 0;
            newIndexes[shop.id] = (currentIndex + 1) % shop.shop_photos.length;
          }
        });
        return newIndexes;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [filteredShops]);

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

    if (selectedState !== 'All States') {
      filtered = filtered.filter(shop => shop.state === selectedState);
    }

    if (selectedService !== 'All Services') {
      filtered = filtered.filter(shop =>
        shop.services_offered?.includes(selectedService)
      );
    }

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
    navigate(`/shop/${shop.id}`);
  };

  const handleClearFilters = () => {
    setSelectedState('All States');
    setSelectedService('All Services');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedState !== 'All States' || selectedService !== 'All Services' || searchQuery;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-1">
        {/* Page Header */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-heading font-bold text-gray-900 uppercase italic mb-2">Find Shops</h1>
          <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">Discover Auto Lab authorized resellers near you.</p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-xl p-4 mb-6 shadow-md">
          <div className="grid md:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search shops, cities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 bg-gray-50 border-gray-200 rounded-xl text-[15px]"
              />
            </div>

            {/* State Filter */}
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="h-12 bg-gray-50 border-gray-200 rounded-xl">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-[280px]">
                {MALAYSIAN_STATES.map((state) => (
                  <SelectItem
                    key={state}
                    value={state}
                    className="cursor-pointer hover:bg-lime-50 focus:bg-lime-50 focus:text-lime-700 rounded-lg mx-1 my-0.5"
                  >
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Service Filter */}
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger className="h-12 bg-gray-50 border-gray-200 rounded-xl">
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-[280px]">
                {SERVICE_TYPES.map((service) => (
                  <SelectItem
                    key={service}
                    value={service}
                    className="cursor-pointer hover:bg-lime-50 focus:bg-lime-50 focus:text-lime-700 rounded-lg mx-1 my-0.5"
                  >
                    {service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
              <span className="text-[13px] font-medium uppercase tracking-wide text-gray-500">
                Showing {filteredShops.length} of {shops.length} shops
              </span>
              <button
                onClick={handleClearFilters}
                className="text-[13px] font-medium uppercase tracking-wide text-lime-600 hover:text-lime-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Shops Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Store className="h-12 w-12 animate-pulse mx-auto mb-4 text-lime-600" />
              <p className="text-gray-500 text-[15px]">Finding shops...</p>
            </div>
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-xl p-8 text-center shadow-md">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-heading font-bold uppercase italic text-gray-900 mb-2">No Shops Found</h3>
            <p className="text-[15px] text-gray-500 mb-5">
              Try adjusting your filters to see more results
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-6 py-2.5 border border-gray-200 text-gray-700 font-bold uppercase tracking-wide text-[13px] hover:bg-gray-100 transition-all rounded-lg"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredShops.map((shop) => {
              const currentPhotoIndex = currentPhotoIndexes[shop.id] || 0;
              const hasPhotos = shop.shop_photos && shop.shop_photos.length > 0;

              return (
                <div
                  key={shop.id}
                  onClick={() => handleViewShop(shop)}
                  className={`bg-white/80 backdrop-blur-xl border border-gray-100 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group ${
                    shop.is_featured ? 'ring-2 ring-lime-400' : ''
                  }`}
                >
                  {/* Shop Photo */}
                  <div className="relative h-48 overflow-hidden bg-gray-100">
                    {hasPhotos ? (
                      <>
                        <img
                          src={shop.shop_photos[currentPhotoIndex]}
                          alt={`${shop.business_name}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />

                        {/* Photo Indicators */}
                        {shop.shop_photos.length > 1 && (
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                            {shop.shop_photos.map((_, index) => (
                              <div
                                key={index}
                                className={`h-1 rounded-full transition-all ${
                                  index === currentPhotoIndex
                                    ? 'w-4 bg-white'
                                    : 'w-1 bg-white/60'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Store className="h-16 w-16 text-gray-300" />
                      </div>
                    )}

                    {/* Featured Badge */}
                    {shop.is_featured && (
                      <Badge className="absolute top-3 right-3 bg-lime-500 text-white border-0 text-[10px] font-bold uppercase tracking-wider">
                        <Award className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Shop Info */}
                  <div className="p-4">
                    <div className="mb-2">
                      <h3 className="font-heading font-bold text-gray-900 uppercase text-[15px] line-clamp-1 group-hover:text-lime-600 transition-colors">
                        {shop.business_name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">{shop.business_type}</p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="line-clamp-1">{shop.city}, {shop.state}</span>
                    </div>

                    {/* Services Tags */}
                    {shop.services_offered && shop.services_offered.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wide rounded">
                          {shop.services_offered[0]}
                        </span>
                        {shop.services_offered.length > 1 && (
                          <span className="px-2 py-0.5 border border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wide rounded">
                            +{shop.services_offered.length - 1} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* CTA Button */}
                    <button className="w-full py-2.5 bg-gray-900 text-white font-bold uppercase tracking-wide text-[13px] hover:bg-lime-600 transition-all rounded-lg">
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
