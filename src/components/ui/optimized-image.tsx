import { useState } from 'react';
import { transformImage } from '@/lib/imageTransform';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  sizes?: string;
  priority?: boolean;
  /** Target render width passed to the Supabase image CDN. Defaults to 800. */
  transformWidth?: number;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage = ({
  src,
  alt,
  className = '',
  fallback = '/placeholder.svg',
  sizes,
  priority = false,
  transformWidth = 800,
  onLoad,
  onError
}: OptimizedImageProps) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    setImageSrc(fallback);
    onError?.();
  };

  // Rewrite Supabase Storage object URLs to resized CDN URLs. Non-Supabase URLs
  // (and the local fallback) pass through unchanged.
  const optimizedSrc = transformImage(imageSrc, { width: transformWidth, quality: 80 });

  return (
    <div className="relative">
      {isLoading && !hasError && (
        <div className={`absolute inset-0 bg-gray-200 animate-pulse rounded ${className}`} />
      )}
      <img
        src={optimizedSrc}
        alt={alt}
        className={className}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        style={{
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />
    </div>
  );
};

export default OptimizedImage;