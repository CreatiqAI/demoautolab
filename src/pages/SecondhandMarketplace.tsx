import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, MessageSquare, Eye, ChevronLeft, ChevronRight, MapPin, Clock, Tag, X } from 'lucide-react';

interface SecondhandListing {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  category: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'used';
  selling_price: number;
  original_price?: number;
  images: string[];
  location?: string;
  usage_history?: string;
  compatible_cars?: string[];
  view_count: number;
  inquiry_count: number;
  status: string;
  created_at: string;
  seller_shop_name?: string;
  seller_phone?: string;
}

interface InquiryFormData {
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  message: string;
}

const CATEGORIES = [
  'Head Units & Displays',
  'Dashcams & Cameras',
  'Audio Systems',
  'GPS & Navigation',
  'Sensors & Electronics',
  'Accessories',
  'Other'
];

const CONDITION_LABELS = {
  new: { label: 'Brand New', color: 'bg-green-500' },
  like_new: { label: 'Like New', color: 'bg-blue-500' },
  good: { label: 'Good', color: 'bg-yellow-500' },
  fair: { label: 'Fair', color: 'bg-orange-500' },
  used: { label: 'Used', color: 'bg-gray-500' }
};

export default function SecondhandMarketplace() {
  const { toast } = useToast();
  const [listings, setListings] = useState<SecondhandListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<SecondhandListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedListing, setSelectedListing] = useState<SecondhandListing | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showInquiryDialog, setShowInquiryDialog] = useState(false);
  const [inquiryForm, setInquiryForm] = useState<InquiryFormData>({
    buyer_name: '',
    buyer_phone: '',
    buyer_email: '',
    message: ''
  });
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [listings, searchQuery, selectedCategory, selectedCondition, priceRange]);

  const fetchListings = async () => {
    try {
      setLoading(true);

      // Fetch approved listings with seller information
      const { data, error } = await supabase
        .from('secondhand_listings')
        .select(`
          *,
          premium_partnerships!secondhand_listings_seller_id_fkey(
            shop_name,
            phone
          )
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedListings = data?.map((listing: any) => ({
        ...listing,
        seller_shop_name: listing.premium_partnerships?.shop_name,
        seller_phone: listing.premium_partnerships?.phone
      })) || [];

      setListings(formattedListings);
      setFilteredListings(formattedListings);
    } catch (error: any) {
      console.error('Error fetching listings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load listings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...listings];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(listing =>
        listing.title.toLowerCase().includes(query) ||
        listing.description.toLowerCase().includes(query) ||
        listing.category.toLowerCase().includes(query) ||
        listing.seller_shop_name?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(listing => listing.category === selectedCategory);
    }

    // Condition filter
    if (selectedCondition !== 'all') {
      filtered = filtered.filter(listing => listing.condition === selectedCondition);
    }

    // Price range filter
    if (priceRange.min) {
      filtered = filtered.filter(listing => listing.selling_price >= parseFloat(priceRange.min));
    }
    if (priceRange.max) {
      filtered = filtered.filter(listing => listing.selling_price <= parseFloat(priceRange.max));
    }

    setFilteredListings(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedCondition('all');
    setPriceRange({ min: '', max: '' });
  };

  const handleViewListing = async (listing: SecondhandListing) => {
    setSelectedListing(listing);
    setCurrentImageIndex(0);

    // Increment view count
    try {
      await supabase
        .from('secondhand_listings')
        .update({ view_count: listing.view_count + 1 })
        .eq('id', listing.id);

      // Update local state
      setListings(prev => prev.map(l =>
        l.id === listing.id ? { ...l, view_count: l.view_count + 1 } : l
      ));
    } catch (error) {
      console.error('Error updating view count:', error);
    }
  };

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedListing) return;

    // Validation
    if (!inquiryForm.buyer_name.trim() || !inquiryForm.buyer_phone.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and phone number are required',
        variant: 'destructive'
      });
      return;
    }

    // Phone validation (Malaysian format)
    const phoneRegex = /^(\+?60|0)[0-9]{9,10}$/;
    if (!phoneRegex.test(inquiryForm.buyer_phone.replace(/[\s-]/g, ''))) {
      toast({
        title: 'Invalid Phone',
        description: 'Please enter a valid Malaysian phone number',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSubmittingInquiry(true);

      const { error } = await supabase
        .from('secondhand_inquiries')
        .insert({
          listing_id: selectedListing.id,
          buyer_name: inquiryForm.buyer_name,
          buyer_phone: inquiryForm.buyer_phone,
          buyer_email: inquiryForm.buyer_email || null,
          message: inquiryForm.message || null,
          status: 'pending'
        });

      if (error) throw error;

      // Increment inquiry count
      await supabase
        .from('secondhand_listings')
        .update({ inquiry_count: selectedListing.inquiry_count + 1 })
        .eq('id', selectedListing.id);

      // Update local state
      setListings(prev => prev.map(l =>
        l.id === selectedListing.id ? { ...l, inquiry_count: l.inquiry_count + 1 } : l
      ));

      toast({
        title: 'Inquiry Sent!',
        description: 'The seller will contact you soon via WhatsApp or phone call',
        variant: 'default'
      });

      // Reset form and close dialog
      setInquiryForm({
        buyer_name: '',
        buyer_phone: '',
        buyer_email: '',
        message: ''
      });
      setShowInquiryDialog(false);
    } catch (error: any) {
      console.error('Error submitting inquiry:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit inquiry. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const nextImage = () => {
    if (selectedListing && selectedListing.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === selectedListing.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const previousImage = () => {
    if (selectedListing && selectedListing.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? selectedListing.images.length - 1 : prev - 1
      );
    }
  };

  const formatPrice = (price: number) => {
    return `RM ${price.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const activeFilterCount = () => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedCondition !== 'all') count++;
    if (priceRange.min || priceRange.max) count++;
    return count;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading marketplace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">2nd Hand Marketplace</h1>
        <p className="text-gray-600">
          Browse quality used automotive parts from verified merchants
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search by title, description, or seller..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount() > 0 && (
              <Badge className="ml-2 bg-blue-600">{activeFilterCount()}</Badge>
            )}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Condition</Label>
                  <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Conditions</SelectItem>
                      {Object.entries(CONDITION_LABELS).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Min Price (RM)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Max Price (RM)</Label>
                  <Input
                    type="number"
                    placeholder="10000"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                  />
                </div>
              </div>

              {activeFilterCount() > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredListings.length} {filteredListings.length === 1 ? 'listing' : 'listings'}
      </div>

      {/* Listings Grid */}
      {filteredListings.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Tag className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Listings Found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || activeFilterCount() > 0
                  ? 'Try adjusting your filters or search query'
                  : 'No approved listings available at the moment'}
              </p>
              {(searchQuery || activeFilterCount() > 0) && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <Card key={listing.id} className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
              <div onClick={() => handleViewListing(listing)}>
                {/* Image */}
                <div className="relative h-48 bg-gray-200">
                  {listing.images && listing.images.length > 0 ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Tag className="h-12 w-12 text-gray-400" />
                    </div>
                  )}

                  {/* Condition Badge */}
                  <Badge className={`absolute top-2 right-2 ${CONDITION_LABELS[listing.condition].color} text-white`}>
                    {CONDITION_LABELS[listing.condition].label}
                  </Badge>

                  {/* Discount Badge */}
                  {listing.original_price && listing.original_price > listing.selling_price && (
                    <Badge className="absolute top-2 left-2 bg-red-600 text-white">
                      {Math.round((1 - listing.selling_price / listing.original_price) * 100)}% OFF
                    </Badge>
                  )}
                </div>

                <CardHeader>
                  <CardTitle className="line-clamp-2 text-lg">{listing.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{listing.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {/* Price */}
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatPrice(listing.selling_price)}
                      </div>
                      {listing.original_price && listing.original_price > listing.selling_price && (
                        <div className="text-sm text-gray-500 line-through">
                          {formatPrice(listing.original_price)}
                        </div>
                      )}
                    </div>

                    {/* Seller Info */}
                    <div className="text-sm text-gray-600">
                      <div className="font-medium">{listing.seller_shop_name || 'Merchant'}</div>
                      {listing.location && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <MapPin className="h-3 w-3" />
                          {listing.location}
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {listing.view_count}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {listing.inquiry_count}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(listing.created_at)}
                      </div>
                    </div>

                    {/* Category */}
                    <Badge variant="outline">{listing.category}</Badge>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Listing Detail Dialog */}
      {selectedListing && (
        <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedListing.title}</DialogTitle>
              <DialogDescription>
                Listed by {selectedListing.seller_shop_name || 'Merchant'} • {formatDate(selectedListing.created_at)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Image Gallery */}
              {selectedListing.images && selectedListing.images.length > 0 && (
                <div className="relative">
                  <div className="relative h-96 bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={selectedListing.images[currentImageIndex]}
                      alt={`${selectedListing.title} - Image ${currentImageIndex + 1}`}
                      className="w-full h-full object-contain"
                    />

                    {selectedListing.images.length > 1 && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                          onClick={previousImage}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                          onClick={nextImage}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>

                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                          {currentImageIndex + 1} / {selectedListing.images.length}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Navigation */}
                  {selectedListing.images.length > 1 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto">
                      {selectedListing.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Thumbnail ${idx + 1}`}
                          className={`h-16 w-16 object-cover rounded cursor-pointer ${
                            idx === currentImageIndex ? 'ring-2 ring-blue-600' : 'opacity-60'
                          }`}
                          onClick={() => setCurrentImageIndex(idx)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Price and Condition */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-blue-600">
                    {formatPrice(selectedListing.selling_price)}
                  </div>
                  {selectedListing.original_price && selectedListing.original_price > selectedListing.selling_price && (
                    <div className="text-lg text-gray-500 line-through">
                      {formatPrice(selectedListing.original_price)}
                    </div>
                  )}
                </div>
                <Badge className={`${CONDITION_LABELS[selectedListing.condition].color} text-white text-lg px-4 py-2`}>
                  {CONDITION_LABELS[selectedListing.condition].label}
                </Badge>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedListing.description}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-gray-600 mb-1">Category</h4>
                  <Badge variant="outline">{selectedListing.category}</Badge>
                </div>

                {selectedListing.location && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-600 mb-1">Location</h4>
                    <p className="text-gray-700">{selectedListing.location}</p>
                  </div>
                )}
              </div>

              {/* Usage History */}
              {selectedListing.usage_history && (
                <div>
                  <h3 className="font-semibold mb-2">Usage History</h3>
                  <p className="text-gray-700">{selectedListing.usage_history}</p>
                </div>
              )}

              {/* Compatible Cars */}
              {selectedListing.compatible_cars && selectedListing.compatible_cars.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Compatible Cars</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedListing.compatible_cars.map((car, idx) => (
                      <Badge key={idx} variant="secondary">{car}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {selectedListing.view_count} views
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {selectedListing.inquiry_count} inquiries
                </div>
              </div>

              {/* Contact Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={() => setShowInquiryDialog(true)}
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                Send Inquiry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Inquiry Form Dialog */}
      <Dialog open={showInquiryDialog} onOpenChange={setShowInquiryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Inquiry</DialogTitle>
            <DialogDescription>
              Submit your contact details and the seller will reach out to you
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitInquiry} className="space-y-4">
            <div>
              <Label htmlFor="buyer_name">Your Name *</Label>
              <Input
                id="buyer_name"
                value={inquiryForm.buyer_name}
                onChange={(e) => setInquiryForm(prev => ({ ...prev, buyer_name: e.target.value }))}
                placeholder="John Tan"
                required
              />
            </div>

            <div>
              <Label htmlFor="buyer_phone">WhatsApp Number *</Label>
              <Input
                id="buyer_phone"
                type="tel"
                value={inquiryForm.buyer_phone}
                onChange={(e) => setInquiryForm(prev => ({ ...prev, buyer_phone: e.target.value }))}
                placeholder="+60123456789"
                required
              />
              <p className="text-sm text-gray-500 mt-1">Seller will contact you via WhatsApp</p>
            </div>

            <div>
              <Label htmlFor="buyer_email">Email (Optional)</Label>
              <Input
                id="buyer_email"
                type="email"
                value={inquiryForm.buyer_email}
                onChange={(e) => setInquiryForm(prev => ({ ...prev, buyer_email: e.target.value }))}
                placeholder="john@example.com"
              />
            </div>

            <div>
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                value={inquiryForm.message}
                onChange={(e) => setInquiryForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="I'm interested in this item. Is it still available?"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowInquiryDialog(false)}
                disabled={submittingInquiry}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={submittingInquiry}
              >
                {submittingInquiry ? 'Sending...' : 'Send Inquiry'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
