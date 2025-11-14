import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Star, ThumbsUp, Calendar, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ReviewImage {
  id: string;
  url: string;
  display_order: number;
}

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  title: string | null;
  comment: string;
  helpful_count: number;
  verified_purchase: boolean;
  created_at: string;
  images?: ReviewImage[];
}

interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  rating_5_count: number;
  rating_4_count: number;
  rating_3_count: number;
  rating_2_count: number;
  rating_1_count: number;
}

interface ReviewsSectionProps {
  productId: string;
  onWriteReview: () => void;
}

export const ReviewsSection = ({ productId, onWriteReview }: ReviewsSectionProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [sortBy, setSortBy] = useState<string>("recent");
  const [loading, setLoading] = useState(true);
  const [helpfulVotes, setHelpfulVotes] = useState<Set<string>>(new Set());
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageGallery, setImageGallery] = useState<ReviewImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchReviewStats();
    fetchReviews();
    loadHelpfulVotes();
  }, [productId, sortBy]);

  const fetchReviewStats = async () => {
    try {
      const { data, error } = await supabase.rpc("get_product_review_stats", {
        p_product_id: productId,
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error("Error fetching review stats:", error);
    }
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_product_reviews", {
        p_product_id: productId,
        p_limit: 20,
        p_offset: 0,
        p_sort_by: sortBy,
      });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadHelpfulVotes = () => {
    const votes = localStorage.getItem("review_helpful_votes");
    if (votes) {
      setHelpfulVotes(new Set(JSON.parse(votes)));
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    if (helpfulVotes.has(reviewId)) {
      toast({
        title: "Already voted",
        description: "You have already marked this review as helpful",
        variant: "destructive",
      });
      return;
    }

    // Generate user identifier (could be email, session ID, or IP)
    const userIdentifier = localStorage.getItem("user_session_id") || `guest_${Date.now()}`;
    if (!localStorage.getItem("user_session_id")) {
      localStorage.setItem("user_session_id", userIdentifier);
    }

    try {
      const { data, error } = await supabase.rpc("mark_review_helpful", {
        p_review_id: reviewId,
        p_user_identifier: userIdentifier,
      });

      if (error) throw error;

      if (data) {
        // Update local state
        const newHelpfulVotes = new Set(helpfulVotes);
        newHelpfulVotes.add(reviewId);
        setHelpfulVotes(newHelpfulVotes);
        localStorage.setItem("review_helpful_votes", JSON.stringify(Array.from(newHelpfulVotes)));

        // Refresh reviews to show updated count
        fetchReviews();

        toast({
          title: "Thank you!",
          description: "Your feedback has been recorded",
        });
      }
    } catch (error) {
      console.error("Error marking review as helpful:", error);
      toast({
        title: "Error",
        description: "Could not record your feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderStars = (rating: number, size: "sm" | "md" | "lg" = "md") => {
    const sizeClasses = {
      sm: "w-3 h-3",
      md: "w-4 h-4",
      lg: "w-5 h-5",
    };

    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingPercentage = (count: number) => {
    if (!stats || stats.total_reviews === 0) return 0;
    return Math.round((count / stats.total_reviews) * 100);
  };

  const openImageModal = (images: ReviewImage[], index: number) => {
    setImageGallery(images);
    setCurrentImageIndex(index);
    setSelectedImage(images[index].url);
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
    setSelectedImage(imageGallery[newIndex].url);
  };

  if (loading) {
    return <div className="text-center py-8">Loading reviews...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Review Summary */}
      {stats && stats.total_reviews > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Average Rating */}
              <div className="flex flex-col items-center justify-center text-center">
                <div className="text-5xl font-bold mb-2">
                  {stats.average_rating.toFixed(1)}
                </div>
                {renderStars(Math.round(stats.average_rating), "lg")}
                <div className="text-sm text-muted-foreground mt-2">
                  Based on {stats.total_reviews} review{stats.total_reviews !== 1 ? "s" : ""}
                </div>
                <Button onClick={onWriteReview} className="mt-4">
                  Write a Review
                </Button>
              </div>

              {/* Rating Breakdown */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = stats[`rating_${rating}_count` as keyof ReviewStats] as number;
                  const percentage = getRatingPercentage(count);
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-16">
                        <span className="text-sm font-medium">{rating}</span>
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      </div>
                      <Progress value={percentage} className="h-2 flex-1" />
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Reviews Yet */}
      {(!stats || stats.total_reviews === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-xl font-semibold mb-2">No reviews yet</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to share your experience with this product
            </p>
            <Button onClick={onWriteReview}>Write the First Review</Button>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {reviews.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Customer Reviews</h3>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="rating_high">Highest Rating</SelectItem>
                <SelectItem value="rating_low">Lowest Rating</SelectItem>
                <SelectItem value="helpful">Most Helpful</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{review.customer_name}</span>
                        {review.verified_purchase && (
                          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                            <CheckCircle className="w-3 h-3" />
                            Verified Purchase
                          </span>
                        )}
                      </div>
                      {renderStars(review.rating, "sm")}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(review.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {review.title && (
                    <h4 className="font-semibold mb-2">{review.title}</h4>
                  )}

                  <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">
                    {review.comment}
                  </p>

                  {/* Review Images */}
                  {review.images && review.images.length > 0 && (
                    <div className="mb-4">
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                        {review.images.map((image, index) => (
                          <button
                            key={image.id}
                            onClick={() => openImageModal(review.images!, index)}
                            className="rounded overflow-hidden border hover:border-blue-500 hover:shadow-md transition-all cursor-pointer bg-gray-100"
                          >
                            <img
                              src={image.url}
                              alt={`Review image ${index + 1}`}
                              className="w-full h-auto"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator className="my-3" />

                  <div className="flex items-center gap-2">
                    <Button
                      variant={helpfulVotes.has(review.id) ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => handleMarkHelpful(review.id)}
                      disabled={helpfulVotes.has(review.id)}
                      className="text-xs"
                    >
                      <ThumbsUp className="w-3 h-3 mr-1" />
                      Helpful ({review.helpful_count})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
};
