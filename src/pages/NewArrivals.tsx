import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, PackageOpen, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PageTransition from '@/components/PageTransition';
import CatalogProductCard, { type CatalogCardProduct } from '@/components/CatalogProductCard';

const PAGE_SIZE = 24;

// Shape returned by the get_new_arrivals RPC (a superset of the card props).
interface NewArrivalProduct extends CatalogCardProduct {
  slug: string;
  category_id: string | null;
  new_arrival_at: string | null;
  total_count?: number;
}

export default function NewArrivals() {
  const navigate = useNavigate();
  // "Load more" grows the fetch window; the feed is small (30-day window) so
  // re-fetching limit rows each time is cheaper than paginating + de-duping.
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['new-arrivals', limit],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<{ products: NewArrivalProduct[]; total: number }> => {
      const { data: rows, error } = await supabase.rpc('get_new_arrivals' as any, {
        p_limit: limit,
        p_offset: 0,
      });
      if (error) throw error;
      const products = (rows as NewArrivalProduct[]) ?? [];
      const total = products.length > 0 ? Number(products[0].total_count ?? 0) : 0;
      return { products, total };
    },
  });

  const products = data?.products ?? [];
  const total = data?.total ?? 0;
  const hasMore = products.length < total;

  const handleProductView = (id: string) => navigate(`/product/${id}`);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <PageTransition>
        <main className="flex-1">
          {/* Hero */}
          <section className="bg-gradient-to-br from-lime-600 to-emerald-700 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-semibold uppercase tracking-widest mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                Just Landed
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">New Arrivals</h1>
              <p className="mt-2 text-sm sm:text-base text-white/85 max-w-2xl">
                The latest products added to our catalog. Each item stays here for 30 days
                from its launch — check back often so you never miss what's new.
              </p>
            </div>
          </section>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {/* Result count */}
            {!isLoading && total > 0 && (
              <p className="text-xs text-gray-500 mb-4">
                {total} new {total === 1 ? 'product' : 'products'}
              </p>
            )}

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-5">
                {Array.from({ length: 8 }).map((_, i) => (
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
                  <PackageOpen className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-serif font-semibold text-gray-900 mb-2">
                  No new arrivals right now
                </h3>
                <p className="text-[15px] text-gray-500 mb-6 max-w-md mx-auto">
                  {isError
                    ? 'Something went wrong loading new arrivals. Please try again.'
                    : "We haven't added anything new in the last 30 days. Browse the full catalog in the meantime."}
                </p>
                <Button variant="hero" onClick={() => navigate('/catalog')}>
                  Browse Catalog
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-5">
                  {products.map((product) => (
                    <CatalogProductCard
                      key={product.id}
                      product={product}
                      onClick={() => handleProductView(product.id)}
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setLimit((l) => l + PAGE_SIZE)}
                      disabled={isFetching}
                      className="min-w-40"
                    >
                      {isFetching ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading…
                        </>
                      ) : (
                        'Load more'
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </PageTransition>

      <Footer />
    </div>
  );
}
