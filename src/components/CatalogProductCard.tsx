import { transformImage } from '@/lib/imageTransform';

// Shared product card used by the catalog grid and the "Similar Products"
// recommendations, so both render identically (incl. the desktop hover specs
// overlay and the touch-friendly inline chips).
export interface CatalogCardProduct {
  id: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  year_from?: number | null;
  year_to?: number | null;
  category_name?: string | null;
  vendor_name?: string | null;
  image_url?: string | null;
  image_type?: string | null;
  component_count?: number;
  featured?: boolean;
  /** True while within its 30-day New Arrivals window. */
  is_new_arrival?: boolean;
}

interface CatalogProductCardProps {
  product: CatalogCardProduct;
  onClick: () => void;
}

const CatalogProductCard = ({ product, onClick }: CatalogProductCardProps) => {
  const isVideo = product.image_type === 'video';
  const imageUrl = product.image_url || '/placeholder.svg';
  const componentCount = product.component_count ?? 0;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group relative flex flex-col"
    >
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {isVideo ? (
          <video
            src={`${imageUrl}#t=0.1`}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <img
            src={transformImage(imageUrl, { width: 600, quality: 70 })}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
        )}

        {(product.is_new_arrival || product.featured) && (
          <div className="absolute top-1.5 left-1.5 flex flex-col items-start gap-1">
            {product.is_new_arrival && (
              <span className="px-1.5 py-0.5 bg-lime-600 text-white text-[9px] font-bold rounded shadow-lg">
                New
              </span>
            )}
            {product.featured && (
              <span className="px-1.5 py-0.5 bg-amber-600 text-white text-[9px] font-bold rounded shadow-lg">
                Premium
              </span>
            )}
          </div>
        )}

        {product.vendor_name && (
          <div className="absolute top-1.5 right-1.5">
            <span
              className="px-1.5 py-0.5 bg-white/90 backdrop-blur-sm text-gray-700 text-[9px] font-medium rounded shadow-sm border border-gray-200 max-w-[110px] truncate inline-block"
              title={`Sold by ${product.vendor_name}`}
            >
              Sold by {product.vendor_name}
            </span>
          </div>
        )}
      </div>

      {/* Hover specs overlay — desktop only (hidden on touch where hover sticks and breaks the layout) */}
      <div className="absolute top-[50%] left-0 right-0 bottom-0 hidden [@media(hover:hover)]:flex items-center justify-center px-2 py-1.5 pointer-events-none">
        <div className="backdrop-blur-lg bg-black/5 rounded-lg p-2.5 border-2 border-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out w-full h-full flex flex-col justify-center overflow-y-auto shadow-lg no-scrollbar">
          <div className="mb-1.5">
            <div className="flex items-center gap-1 mb-1">
              <div className="w-1 h-3 bg-gray-400 rounded-full shadow-sm"></div>
              <h4 className="text-black font-bold text-[10px] uppercase tracking-wide">Specifications</h4>
            </div>
            <div className="h-0.5 bg-gradient-to-r from-gray-400 via-gray-300/70 to-transparent rounded-full"></div>
          </div>
          <div className="space-y-1">
            {product.brand && (
              <div className="flex items-center justify-between bg-white/40 backdrop-blur-sm rounded px-1.5 py-1 border border-gray-300/60 shadow-sm">
                <span className="text-[9px] font-medium text-gray-700 uppercase tracking-wide">Brand</span>
                <span className="text-[10px] font-bold text-black truncate ml-2 max-w-[60%] text-right">{product.brand}</span>
              </div>
            )}
            {product.model && (
              <div className="flex items-center justify-between bg-white/40 backdrop-blur-sm rounded px-1.5 py-1 border border-gray-300/60 shadow-sm">
                <span className="text-[9px] font-medium text-gray-700 uppercase tracking-wide">Model</span>
                <span className="text-[10px] font-bold text-black truncate ml-2 max-w-[60%] text-right">{product.model}</span>
              </div>
            )}
            {product.category_name && (
              <div className="flex items-center justify-between bg-white/40 backdrop-blur-sm rounded px-1.5 py-1 border border-gray-300/60 shadow-sm">
                <span className="text-[9px] font-medium text-gray-700 uppercase tracking-wide">Category</span>
                <span className="text-[10px] font-bold text-black truncate ml-2 max-w-[50%] text-right">{product.category_name}</span>
              </div>
            )}
            {product.year_from && product.year_to && (
              <div className="flex items-center justify-between bg-white/40 backdrop-blur-sm rounded px-1.5 py-1 border border-gray-300/60 shadow-sm">
                <span className="text-[9px] font-medium text-gray-700 uppercase tracking-wide">Year</span>
                <span className="text-[10px] font-bold text-black truncate ml-2">{product.year_from}-{product.year_to}</span>
              </div>
            )}
            {componentCount > 0 && (
              <div className="flex items-center justify-between bg-gray-800/80 backdrop-blur-sm rounded px-1.5 py-1 border border-gray-600/60 shadow-sm">
                <span className="text-[9px] font-bold text-gray-200 uppercase tracking-wide">Components</span>
                <span className="text-[10px] font-bold text-white truncate ml-2">{componentCount} Included</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-2 sm:p-3 flex-1 flex flex-col">
        {product.brand && (
          <div className="mb-1 sm:mb-1.5">
            <span className="inline-block px-1 sm:px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[8px] sm:text-[9px] font-semibold rounded uppercase tracking-wide truncate max-w-full">
              {product.brand}
            </span>
          </div>
        )}
        <h3 className="font-sans text-gray-900 text-[11px] sm:text-xs font-semibold mb-1.5 sm:mb-2 line-clamp-2 leading-snug flex-1">
          {product.name}
        </h3>

        {/* Inline specs for touch devices (hover overlay handles desktop) */}
        {(product.model || (product.year_from && product.year_to)) && (
          <div className="[@media(hover:hover)]:hidden flex flex-wrap gap-1 mb-1.5">
            {product.model && (
              <span className="inline-flex items-center px-1.5 py-0.5 bg-lime-50 text-lime-700 text-[9px] font-semibold rounded border border-lime-100 truncate max-w-full">
                {product.model}
              </span>
            )}
            {product.year_from && product.year_to && (
              <span className="inline-flex items-center px-1.5 py-0.5 bg-gray-50 text-gray-600 text-[9px] font-medium rounded border border-gray-100">
                {product.year_from}–{product.year_to}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-[8px] sm:text-[9px] text-gray-400 pt-1 sm:pt-1.5 border-t border-gray-100">
          <span className="uppercase tracking-wider font-medium truncate max-w-[60%]">
            {product.category_name || 'Details'}
          </span>
          {componentCount > 0 ? (
            <span className="font-semibold text-gray-600 truncate">
              {componentCount} {componentCount === 1 ? 'Part' : 'Parts'}
            </span>
          ) : (
            <span className="font-semibold text-gray-600 hidden sm:inline">View Details</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogProductCard;
