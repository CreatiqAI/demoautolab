import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  sizes?: string;
  priority?: boolean;
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

  // Generate WebP version URL if the source is from Supabase
  const getOptimizedSrc = (originalSrc: string) => {
    if (originalSrc.includes('supabase')) {
      // For Supabase, you could add image transformations
      // Example: add quality=80 parameter for better compression
      const url = new URL(originalSrc);
      url.searchParams.set('quality', '80');
      return url.toString();
    }
    return originalSrc;
  };

  const optimizedSrc = getOptimizedSrc(imageSrc);

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