import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Star, Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface ReviewFormProps {
  productId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ReviewForm = ({ productId, onSuccess, onCancel }: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const MAX_IMAGES = 5;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate number of files
    if (selectedFiles.length + files.length > MAX_IMAGES) {
      toast({
        title: "Too many images",
        description: `You can only upload up to ${MAX_IMAGES} images`,
        variant: "destructive",
      });
      return;
    }

    // Validate file sizes and types
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 5MB`,
          variant: "destructive",
        });
        continue;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image`,
          variant: "destructive",
        });
        continue;
      }

      validFiles.push(file);
    }

    // Create preview URLs
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));

    setSelectedFiles([...selectedFiles, ...validFiles]);
    setPreviewUrls([...previewUrls, ...newPreviewUrls]);
  };

  const removeImage = (index: number) => {
    // Revoke the preview URL to free memory
    URL.revokeObjectURL(previewUrls[index]);

    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
  };

  const uploadImages = async (reviewId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${reviewId}_${i}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('review-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('review-images')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a star rating",
        variant: "destructive",
      });
      return;
    }

    if (!customerName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    if (!customerEmail.trim() || !isValidEmail(customerEmail)) {
      toast({
        title: "Valid email required",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (!comment.trim()) {
      toast({
        title: "Review required",
        description: "Please write your review",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();

      // Insert review
      const { data: reviewData, error: reviewError } = await supabase
        .from("product_reviews")
        .insert({
          product_id: productId,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim().toLowerCase(),
          user_id: user?.id || null,
          rating: rating,
          title: title.trim() || null,
          comment: comment.trim(),
          status: "pending", // Reviews need admin approval
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      // Upload images if any selected
      if (selectedFiles.length > 0 && reviewData) {
        try {
          const imageUrls = await uploadImages(reviewData.id);

          // Insert image records
          const imageRecords = imageUrls.map((url, index) => ({
            review_id: reviewData.id,
            image_url: url,
            display_order: index,
          }));

          const { error: imagesError } = await supabase
            .from("review_images")
            .insert(imageRecords);

          if (imagesError) {
            console.error("Error saving image records:", imagesError);
            // Don't fail the whole review submission if images fail
          }
        } catch (imageError) {
          console.error("Error uploading images:", imageError);
          // Don't fail the whole review submission if images fail
        }
      }

      toast({
        title: "Review submitted!",
        description: "Thank you for your feedback. Your review is pending approval.",
      });

      // Reset form
      setRating(0);
      setCustomerName("");
      setCustomerEmail("");
      setTitle("");
      setComment("");
      setSelectedFiles([]);
      // Clean up preview URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast({
        title: "Submission failed",
        description: error.message || "Could not submit your review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const renderStarRating = () => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 ${
                star <= (hoverRating || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write a Review</CardTitle>
        <CardDescription>
          Share your experience with this product to help other customers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating */}
          <div className="space-y-2">
            <Label>Your Rating *</Label>
            {renderStarRating()}
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                You rated this product {rating} out of 5 stars
              </p>
            )}
          </div>

          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customerName">Your Name *</Label>
            <Input
              id="customerName"
              type="text"
              placeholder="Enter your name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              maxLength={100}
            />
          </div>

          {/* Customer Email */}
          <div className="space-y-2">
            <Label htmlFor="customerEmail">Your Email *</Label>
            <Input
              id="customerEmail"
              type="email"
              placeholder="your.email@example.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Your email will not be published
            </p>
          </div>

          {/* Review Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Review Title (Optional)</Label>
            <Input
              id="title"
              type="text"
              placeholder="Give your review a title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
            />
          </div>

          {/* Review Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Your Review *</Label>
            <Textarea
              id="comment"
              placeholder="Tell us about your experience with this product..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              rows={6}
              maxLength={2000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length} / 2000 characters
            </p>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Add Photos (Optional)</Label>
            <div className="space-y-3">
              {/* Upload Button */}
              {selectedFiles.length < MAX_IMAGES && (
                <div>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Label
                    htmlFor="image-upload"
                    className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Click to upload images (max {MAX_IMAGES}, up to 5MB each)
                    </span>
                  </Label>
                </div>
              )}

              {/* Image Previews */}
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <div className="bg-gray-100 rounded border overflow-hidden">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-auto"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                <ImageIcon className="w-3 h-3 inline mr-1" />
                {selectedFiles.length} / {MAX_IMAGES} images selected
              </p>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Your review will be checked by our team before being published
          </p>
        </form>
      </CardContent>
    </Card>
  );
};
