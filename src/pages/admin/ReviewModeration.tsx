import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, CheckCircle, XCircle, Calendar, Mail, User, Package, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ReviewImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  customer_email: string;
  user_id: string | null;
  rating: number;
  title: string | null;
  comment: string;
  status: string;
  helpful_count: number;
  verified_purchase: boolean;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
  images?: ReviewImage[];
}

interface ReviewWithProduct extends Review {
  product_name: string;
}

export default function ReviewModeration() {
  const [pendingReviews, setPendingReviews] = useState<ReviewWithProduct[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<ReviewWithProduct[]>([]);
  const [rejectedReviews, setRejectedReviews] = useState<ReviewWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageGallery, setImageGallery] = useState<ReviewImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // Check authentication first
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.email);

      // Fetch all reviews with product information
      const { data, error } = await supabase
        .from('product_reviews')
        .select(`
          *,
          products_new!product_reviews_product_id_fkey (name)
        `)
        .order('created_at', { ascending: false });

      console.log('Fetch reviews - Error:', error);
      console.log('Fetch reviews - Data:', data);

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      // Fetch images for all reviews
      const reviewIds = (data || []).map((r: any) => r.id);
      const { data: imagesData } = await supabase
        .from('review_images')
        .select('*')
        .in('review_id', reviewIds)
        .order('display_order', { ascending: true });

      // Group images by review_id
      const imagesByReview: Record<string, ReviewImage[]> = {};
      (imagesData || []).forEach((img: any) => {
        if (!imagesByReview[img.review_id]) {
          imagesByReview[img.review_id] = [];
        }
        imagesByReview[img.review_id].push({
          id: img.id,
          image_url: img.image_url,
          display_order: img.display_order,
        });
      });

      // Transform and categorize reviews
      const transformedReviews = (data || []).map((review: any) => ({
        ...review,
        product_name: review.products_new?.name || 'Unknown Product',
        images: imagesByReview[review.id] || [],
      }));

      setPendingReviews(transformedReviews.filter((r: Review) => r.status === 'pending'));
      setApprovedReviews(transformedReviews.filter((r: Review) => r.status === 'approved'));
      setRejectedReviews(transformedReviews.filter((r: Review) => r.status === 'rejected'));
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reviews. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId: string) => {
    setActionLoading(reviewId);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('product_reviews')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id || null,
        })
        .eq('id', reviewId);

      if (error) throw error;

      toast({
        title: 'Review Approved',
        description: 'The review has been approved and is now visible to customers.',
      });

      await fetchReviews();
    } catch (error: any) {
      console.error('Error approving review:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve review. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (reviewId: string) => {
    setActionLoading(reviewId);
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({ status: 'rejected' })
        .eq('id', reviewId);

      if (error) throw error;

      toast({
        title: 'Review Rejected',
        description: 'The review has been rejected and will not be visible to customers.',
      });

      await fetchReviews();
    } catch (error: any) {
      console.error('Error rejecting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject review. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (reviewId: string) => {
    setActionLoading(reviewId);
    try {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      toast({
        title: 'Review Deleted',
        description: 'The review has been permanently deleted.',
      });

      await fetchReviews();
    } catch (error: any) {
      console.error('Error deleting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete review. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
      setReviewToDelete(null);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openImageModal = (images: ReviewImage[], index: number) => {
    setImageGallery(images);
    setCurrentImageIndex(index);
    setSelectedImage(images[index].image_url);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setImageGallery([]);
    setCurrentImageIndex(0);
  };

  const navigateImage = (direction: "prev" | "next") => {
    const newIndex = direction === "prev"
      ? (currentImageIndex - 1 + imageGallery.length) % imageGallery.length
      : (currentImageIndex + 1) % imageGallery.length;
    setCurrentImageIndex(newIndex);
    setSelectedImage(imageGallery[newIndex].image_url);
  };

  const ReviewCard = ({ review, showActions = true }: { review: ReviewWithProduct; showActions?: boolean }) => (
    <Card>
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-semibold">{review.customer_name}</span>
              {review.verified_purchase && (
                <Badge variant="default" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified Purchase
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {review.status.toUpperCase()}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {review.customer_email}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(review.created_at)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Package className="w-3 h-3" />
              <span className="font-medium">{review.product_name}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {renderStars(review.rating)}
            <span className="text-xs text-gray-500">
              {review.helpful_count} helpful vote{review.helpful_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Review Content */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          {review.title && (
            <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
          )}
          <p className="text-gray-700 whitespace-pre-wrap">{review.comment}</p>
        </div>

        {/* Review Images */}
        {review.images && review.images.length > 0 && (
          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">
              Attached Images ({review.images.length})
            </h5>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {review.images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => openImageModal(review.images!, index)}
                  className="relative rounded overflow-hidden border border-gray-300 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group bg-gray-100"
                >
                  <img
                    src={image.image_url}
                    alt={`Review image ${index + 1}`}
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium">
                      View
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2">
            {review.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleApprove(review.id)}
                  disabled={actionLoading === review.id}
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {actionLoading === review.id ? 'Approving...' : 'Approve'}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReject(review.id)}
                  disabled={actionLoading === review.id}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {actionLoading === review.id ? 'Rejecting...' : 'Reject'}
                </Button>
              </>
            )}

            {review.status === 'approved' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(review.id)}
                  disabled={actionLoading === review.id}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Unapprove
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setReviewToDelete(review.id)}
                  disabled={actionLoading === review.id}
                >
                  Delete
                </Button>
              </>
            )}

            {review.status === 'rejected' && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleApprove(review.id)}
                  disabled={actionLoading === review.id}
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setReviewToDelete(review.id)}
                  disabled={actionLoading === review.id}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Review Moderation</h2>
        <p className="text-muted-foreground">
          Manage customer reviews and ratings for your products
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReviews.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting moderation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Reviews</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedReviews.length}</div>
            <p className="text-xs text-muted-foreground">
              Live on product pages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected Reviews</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedReviews.length}</div>
            <p className="text-xs text-muted-foreground">
              Not shown to customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingReviews.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedReviews.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedReviews.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingReviews.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Pending Reviews
                </h3>
                <p className="text-gray-600 text-center">
                  All reviews have been moderated. New reviews will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedReviews.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Approved Reviews
                </h3>
                <p className="text-gray-600 text-center">
                  Approved reviews will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            approvedReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedReviews.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <XCircle className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Rejected Reviews
                </h3>
                <p className="text-gray-600 text-center">
                  Rejected reviews will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            rejectedReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Image Lightbox Modal */}
      <Dialog open={selectedImage !== null} onOpenChange={closeImageModal}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 border-0">
          <div className="relative w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
            {selectedImage && (
              <>
                <img
                  src={selectedImage}
                  alt="Review image"
                  className="max-w-full max-h-[95vh] w-auto h-auto object-contain"
                />

                {/* Navigation Buttons */}
                {imageGallery.length > 1 && (
                  <>
                    <button
                      onClick={() => navigateImage("prev")}
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
                      onClick={() => navigateImage("next")}
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
                      {currentImageIndex + 1} / {imageGallery.length}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!reviewToDelete} onOpenChange={() => setReviewToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the review
              from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reviewToDelete && handleDelete(reviewToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
