import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, PackageOpen, Loader2, ArrowRight, RefreshCw, CalendarClock } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import CatalogProductCard, { type CatalogCardProduct } from '@/components/CatalogProductCard';

const PAGE_SIZE = 24;

// Shape returned by the get_new_arrivals RPC (a superset of the card props).
interface NewArrivalProduct extends CatalogCardProduct {
  slug: string;
  category_id: string | null;
  new_arrival_at: string | null;
  total_count?: number;
}

function MetaChip({ icon: Icon, children }: { icon: typeof Sparkles; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm">
      <Icon className="h-3.5 w-3.5 text-lime-600" />
      {children}
    </span>
  );
}

export default function NewArrivals() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
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

  // Hero entrance — above the fold, seen once per visit, so a gentle reveal is
  // appropriate. Custom ease-out curve; no vertical motion under reduced-motion.
  const ease = [0.23, 1, 0.32, 1] as const;
  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
  };
  const fadeUp: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col overflow-x-clip">
      <SEOHead
        title="New Arrivals | 12V — Supported by Auto Lab"
        description="The latest car parts and accessories added to 12V — fresh drops from the last 30 days."
      />
      <Header />

      <main className="flex-1">
        {/* ---- Hero (light, on-brand) ---- */}
        <section className="relative bg-gradient-to-b from-white to-[#FAFAF8]">
          <div aria-hidden className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[720px] h-[360px] rounded-full bg-lime-300/25 blur-[140px]" />
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="relative container mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 pb-8 text-center"
          >
            <motion.p
              variants={fadeUp}
              className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-lime-600 mb-4"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Just Landed
            </motion.p>

            <motion.h1
              variants={fadeUp}
              className="font-heading font-bold uppercase tracking-tight text-4xl sm:text-5xl md:text-6xl text-gray-900 mb-4"
            >
              New <span className="text-lime-600 italic">Arrivals</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="max-w-xl mx-auto text-sm md:text-base text-gray-500 leading-relaxed mb-7"
            >
              Fresh drops, straight to the front. Everything here launched in the last 30 days —
              once the window closes, it rolls into the main catalog.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-2.5">
              {total > 0 && (
                <MetaChip icon={Sparkles}>
                  {total} new {total === 1 ? 'product' : 'products'}
                </MetaChip>
              )}
              <MetaChip icon={RefreshCw}>Updated continuously</MetaChip>
              <MetaChip icon={CalendarClock}>30-day window</MetaChip>
              <button
                onClick={() => navigate('/catalog')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors ml-1"
              >
                Browse full catalog
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          </motion.div>
        </section>

        {/* ---- Product grid ---- */}
        <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-10">
          {!isLoading && total > 0 && (
            <div className="mb-5 sm:mb-6">
              <h2 className="font-heading font-bold uppercase tracking-tight text-xl sm:text-2xl text-gray-900">Latest products</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {total} {total === 1 ? 'item' : 'items'} added in the last 30 days
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
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
            <div className="bg-white border border-gray-200/80 rounded-3xl p-12 sm:p-16 text-center shadow-[0_10px_40px_-24px_rgba(0,0,0,0.25)] max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-[#f7f7f4] ring-1 ring-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <PackageOpen className="h-8 w-8 text-lime-500" />
              </div>
              <h3 className="text-xl font-heading font-bold uppercase tracking-tight text-gray-900 mb-2">
                No new arrivals right now
              </h3>
              <p className="text-[15px] text-gray-500 mb-6 max-w-md mx-auto leading-relaxed">
                {isError
                  ? 'Something went wrong loading new arrivals. Please try again.'
                  : "We haven't added anything new in the last 30 days. Explore the full catalog in the meantime — there's plenty to discover."}
              </p>
              <Button variant="hero" onClick={() => navigate('/catalog')} className="transition-transform active:scale-[0.98]">
                Browse Catalog
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-5">
                {products.map((product, i) => (
                  <div
                    key={product.id}
                    className="na-card"
                    style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                  >
                    {/* Suppress the redundant "New" badge — every item on this page is new. */}
                    <CatalogProductCard
                      product={{ ...product, is_new_arrival: false }}
                      onClick={() => handleProductView(product.id)}
                    />
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-10 flex flex-col items-center gap-3">
                  <p className="text-xs text-gray-400">
                    Showing {products.length} of {total}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setLimit((l) => l + PAGE_SIZE)}
                    disabled={isFetching}
                    className="min-w-44 transition-transform active:scale-[0.98]"
                  >
                    {isFetching ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      <>
                        Load more
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />

      {/* Staggered card entrance — CSS (off main thread), reduced-motion aware. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes naFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
            @keyframes naFade { from { opacity: 0; } to { opacity: 1; } }
            .na-card { animation: naFadeUp 0.5s cubic-bezier(0.23, 1, 0.32, 1) both; }
            @media (prefers-reduced-motion: reduce) { .na-card { animation-name: naFade; } }
          `,
        }}
      />
    </div>
  );
}
