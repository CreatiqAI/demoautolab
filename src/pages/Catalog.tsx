import { useState, useEffect, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Package, ChevronLeft, ChevronRight, X, Loader2, SlidersHorizontal } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PageTransition from '@/components/PageTransition';
import { transformImage } from '@/lib/imageTransform';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 24;

type SortOption = 'relevance' | 'newest' | 'featured';

const SORT_LABELS: Record<SortOption, string> = {
  relevance: 'Best match',
  newest: 'Newest',
  featured: 'Featured',
};

// Shape returned by the catalog_search_products RPC.
interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  model: string | null;
  year_from: number | null;
  year_to: number | null;
  featured: boolean;
  category_id: string | null;
  category_name: string | null;
  vendor_name: string | null;
  image_url: string | null;
  image_type: string | null;
  component_count: number;
  match_score?: number;
  is_full_match: boolean;
  total_count?: number;
  full_count?: number;
}

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

// Debounce a fast-changing value (the search box) so we don't hit the DB on every keystroke.
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL is the source of truth for filters/sort/page; the search box keeps a fast local value.
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounced(searchInput.trim(), 250);

  const selectedCategory = searchParams.get('category') || 'all';
  const selectedBrand = searchParams.get('brand') || 'all';
  const sort = (searchParams.get('sort') as SortOption) || 'relevance';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Merge updates into the URL. Filter/search/sort changes reset pagination to page 1.
  const updateParams = (updates: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') next.delete(key);
      else next.set(key, value);
    });
    if (resetPage) next.delete('page');
    setSearchParams(next);
  };

  // Keep an external URL change (e.g. nav from header search) in sync with the input.
  useEffect(() => {
    const fromUrl = searchParams.get('search') || '';
    setSearchInput((prev) => (prev === fromUrl ? prev : fromUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('search')]);

  // Push the debounced search term into the URL.
  useEffect(() => {
    const current = searchParams.get('search') || '';
    if (debouncedSearch !== current) {
      updateParams({ search: debouncedSearch || null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Categories for the filter chips.
  const { data: categories = [] } = useQuery<ProductCategory[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, description')
        .eq('active', true)
        .order('name', { ascending: true });
      return error || !data ? [] : (data as ProductCategory[]);
    },
  });

  // Distinct brands for the brand filter.
  const { data: brands = [] } = useQuery<string[]>({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products_new' as any)
        .select('brand')
        .eq('active', true)
        .eq('approval_status', 'APPROVED');
      if (error || !data) return [];
      return [...new Set((data as any).map((d: any) => d.brand).filter(Boolean))].sort() as string[];
    },
  });

  // Main product query — fully server-driven (search, filter, sort, paginate).
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['catalog', debouncedSearch, selectedCategory, selectedBrand, sort, page],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<{ products: CatalogProduct[]; total: number }> => {
      const offset = (page - 1) * PAGE_SIZE;
      const { data: rpcData, error } = await supabase.rpc('catalog_search_products' as any, {
        p_query: debouncedSearch,
        p_category: selectedCategory === 'all' ? null : selectedCategory,
        p_brand: selectedBrand === 'all' ? null : selectedBrand,
        p_sort: sort,
        p_limit: PAGE_SIZE,
        p_offset: offset,
      });

      if (error) {
        // Safety net: if the RPC is unavailable, fall back to a basic direct query
        // so the catalog still renders (no fuzzy ranking, but never a blank page).
        return fallbackQuery(debouncedSearch, selectedCategory, selectedBrand, offset);
      }

      const rows = (rpcData as CatalogProduct[]) || [];
      const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
      const fullCount = rows.length > 0 ? Number(rows[0].full_count ?? 0) : 0;
      return { products: rows, total, fullCount };
    },
  });

  const products = data?.products ?? [];
  const total = data?.total ?? 0;
  const fullCount = data?.fullCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Split the current page into exact matches (cover ALL search words) and
  // related/closest matches (cover only some). Only meaningful while searching.
  const exactMatches = products.filter((p) => p.is_full_match);
  const relatedMatches = products.filter((p) => !p.is_full_match);
  const showSections = !!debouncedSearch && relatedMatches.length > 0;

  const hasActiveFilters = selectedCategory !== 'all' || selectedBrand !== 'all' || !!debouncedSearch;

  const clearAll = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const goToPage = (next: number) => {
    const clamped = Math.min(Math.max(next, 1), totalPages);
    updateParams({ page: clamped === 1 ? null : String(clamped) }, false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  const handleProductView = (id: string) => navigate(`/product/${id}`);

  const categoryName = useMemo(
    () => categories.find((c) => c.id === selectedCategory)?.name,
    [categories, selectedCategory]
  );

  // Windowed page numbers for the paginator (e.g. 1 … 4 5 [6] 7 8 … 20).
  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    const window = 1;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - window && i <= page + window)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== 'ellipsis') {
        pages.push('ellipsis');
      }
    }
    return pages;
  }, [page, totalPages]);

  const renderChip = (
    label: string,
    active: boolean,
    onClick: () => void,
    key: string
  ) => (
    <button
      key={key}
      onClick={onClick}
      className={cn(
        'whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all',
        active
          ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900'
      )}
    >
      {label}
    </button>
  );

  const renderCard = (product: CatalogProduct) => {
    const isVideo = product.image_type === 'video';
    const imageUrl = product.image_url || '/placeholder.svg';
    return (
      <div
        key={product.id}
        onClick={() => handleProductView(product.id)}
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

          {product.featured && (
            <div className="absolute top-1.5 left-1.5">
              <span className="px-1.5 py-0.5 bg-amber-600 text-white text-[9px] font-bold rounded shadow-lg">
                Premium
              </span>
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

        {/* Hover specs overlay — bottom half of card */}
        <div className="absolute top-[50%] left-0 right-0 bottom-0 flex items-center justify-center px-2 py-1.5 pointer-events-none">
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
              {product.component_count > 0 && (
                <div className="flex items-center justify-between bg-gray-800/80 backdrop-blur-sm rounded px-1.5 py-1 border border-gray-600/60 shadow-sm">
                  <span className="text-[9px] font-bold text-gray-200 uppercase tracking-wide">Components</span>
                  <span className="text-[10px] font-bold text-white truncate ml-2">{product.component_count} Included</span>
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
          <div className="flex items-center justify-between text-[8px] sm:text-[9px] text-gray-400 pt-1 sm:pt-1.5 border-t border-gray-100">
            <span className="uppercase tracking-wider font-medium truncate max-w-[60%]">
              {product.category_name || 'Details'}
            </span>
            {product.component_count > 0 ? (
              <span className="font-semibold text-gray-600 truncate">
                {product.component_count} {product.component_count === 1 ? 'Part' : 'Parts'}
              </span>
            ) : (
              <span className="font-semibold text-gray-600 hidden sm:inline">View Details</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGrid = (items: CatalogProduct[]) => (
    <div
      className={cn(
        'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-5 transition-opacity',
        isFetching && 'opacity-60'
      )}
    >
      {items.map(renderCard)}
    </div>
  );

  return (
    <PageTransition>
      <div className="bg-gray-50 flex flex-col min-h-screen">
        <Header />

        <main className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8 flex-1">
          {/* Page Header */}
          <div className="mb-5 text-center lg:text-left">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-heading font-bold text-gray-900 uppercase tracking-wide mb-2">
              Product <span className="text-lime-600 italic">Catalog</span>
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-500 uppercase tracking-widest font-medium">
              Search by car, model, year, or the parts inside
            </p>
          </div>

          {/* Hero Search */}
          <div className="relative max-w-2xl mx-auto lg:mx-0 mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search products, models, years, or components..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-12 pr-24 h-12 sm:h-14 bg-white border-gray-200 rounded-2xl text-sm sm:text-base shadow-sm focus-visible:ring-lime-500"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isFetching && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Toolbar: result count + sort + mobile filter toggle */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">
              {isLoading ? 'Searching…' : `${total} Product${total !== 1 ? 's' : ''}`}
            </p>
            <div className="flex items-center gap-2">
              <Select value={sort} onValueChange={(v) => updateParams({ sort: v === 'relevance' ? null : v })}>
                <SelectTrigger className="h-9 w-[140px] bg-white border-gray-200 rounded-lg text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-lg">
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-xs cursor-pointer">
                      {SORT_LABELS[opt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setMobileFiltersOpen((o) => !o)}
                className="lg:hidden h-9 px-3 text-xs gap-1.5 border-gray-200"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
              </Button>
            </div>
          </div>

          {/* Filter chips */}
          <div className={cn('space-y-3 mb-5', !mobileFiltersOpen && 'hidden lg:block')}>
            {/* Category chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0 pr-1">Category</span>
              {renderChip('All', selectedCategory === 'all', () => updateParams({ category: null }), 'cat-all')}
              {categories.map((c) =>
                renderChip(c.name, selectedCategory === c.id, () => updateParams({ category: c.id }), c.id)
              )}
            </div>

            {/* Brand chips */}
            {brands.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0 pr-1">Brand</span>
                {renderChip('All', selectedBrand === 'all', () => updateParams({ brand: null }), 'brand-all')}
                {brands.map((b) =>
                  renderChip(b, selectedBrand === b, () => updateParams({ brand: b }), b)
                )}
              </div>
            )}
          </div>

          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap mb-5">
              {debouncedSearch && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-lime-50 text-lime-700 text-[11px] font-bold rounded-lg border border-lime-200">
                  "{debouncedSearch}"
                  <button onClick={() => setSearchInput('')} aria-label="Remove search">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-[11px] font-bold rounded-lg">
                  {categoryName}
                  <button onClick={() => updateParams({ category: null })} aria-label="Remove category">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedBrand !== 'all' && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-[11px] font-bold rounded-lg">
                  {selectedBrand}
                  <button onClick={() => updateParams({ brand: null })} aria-label="Remove brand">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button onClick={clearAll} className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 underline underline-offset-2 ml-1">
                Clear all
              </button>
            </div>
          )}

          {/* Products Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-3">
                    <Skeleton className="h-4 w-16 mb-2 rounded" />
                    <Skeleton className="h-4 w-full mb-1.5" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : total === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-serif font-semibold text-gray-900 mb-2">No Products Found</h3>
              <p className="text-[15px] text-gray-500 mb-6">
                {isError
                  ? 'Something went wrong loading products. Please try again.'
                  : 'Try a different search term or clear your filters.'}
              </p>
              {hasActiveFilters && (
                <Button variant="hero" onClick={clearAll}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : showSections ? (
            <div className="space-y-2">
              {exactMatches.length > 0 && (
                <section>
                  <div className="flex items-baseline gap-2 mb-3">
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Exact matches</h2>
                    <span className="text-xs text-gray-400 font-medium normal-case">
                      {fullCount} for "{debouncedSearch}"
                    </span>
                  </div>
                  {renderGrid(exactMatches)}
                </section>
              )}
              <section>
                <div
                  className={cn(
                    'flex items-baseline gap-2 mb-3',
                    exactMatches.length > 0 && 'mt-8 pt-6 border-t border-gray-200'
                  )}
                >
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Related products</h2>
                  <span className="text-xs text-gray-400 font-medium normal-case">
                    matching part of your search
                  </span>
                </div>
                {renderGrid(relatedMatches)}
              </section>
            </div>
          ) : (
            renderGrid(products)
          )}

          {/* Pagination */}
          {total > 0 && totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-1.5 flex-wrap">
              <Button
                variant="outline"
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="h-9 px-3 text-xs"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {pageNumbers.map((p, i) =>
                p === 'ellipsis' ? (
                  <span key={`e${i}`} className="px-1 text-gray-400 text-xs">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={cn(
                      'h-9 min-w-9 px-2 rounded-lg text-xs font-bold transition-all',
                      p === page ? 'bg-gray-900 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
                    )}
                  >
                    {p}
                  </button>
                )
              )}
              <Button
                variant="outline"
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                className="h-9 px-3 text-xs"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Results summary */}
          {total > 0 && (
            <p className="text-center mt-6 mb-4 text-xs font-medium uppercase tracking-widest text-gray-400">
              Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} of {total} products
            </p>
          )}
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
};

// Basic non-fuzzy fallback used only if the search RPC is unavailable.
async function fallbackQuery(
  query: string,
  category: string,
  brand: string,
  offset: number
): Promise<{ products: CatalogProduct[]; total: number; fullCount: number }> {
  let q = supabase
    .from('products_new' as any)
    .select(
      `id, name, slug, brand, model, year_from, year_to, featured, category_id,
       categories ( name ),
       vendors:vendor_id ( business_name ),
       product_images_new ( url, is_primary, sort_order, media_type )`,
      { count: 'exact' }
    )
    .eq('active', true)
    .eq('approval_status', 'APPROVED');

  if (category !== 'all') q = q.eq('category_id', category);
  if (brand !== 'all') q = q.eq('brand', brand);
  if (query) q = q.ilike('name', `%${query}%`);

  const { data, error, count } = await q
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error || !data) return { products: [], total: 0, fullCount: 0 };

  const products: CatalogProduct[] = (data as any[]).map((item) => {
    const images = Array.isArray(item.product_images_new) ? item.product_images_new : [];
    const primary =
      images.filter((m: any) => m.media_type !== 'video').sort((a: any, b: any) => (a.is_primary === b.is_primary ? (a.sort_order ?? 0) - (b.sort_order ?? 0) : a.is_primary ? -1 : 1))[0] ||
      images[0];
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      brand: item.brand,
      model: item.model,
      year_from: item.year_from,
      year_to: item.year_to,
      featured: !!item.featured,
      category_id: item.category_id,
      category_name: item.categories?.name ?? null,
      vendor_name: item.vendors?.business_name ?? null,
      image_url: primary?.url ?? null,
      image_type: primary?.media_type ?? 'image',
      component_count: 0,
      is_full_match: true,
    };
  });

  return { products, total: count ?? products.length, fullCount: count ?? products.length };
}

export default Catalog;
