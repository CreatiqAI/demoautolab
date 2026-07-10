import type { ReactNode } from 'react';

interface AuthBrandPanelProps {
  eyebrow?: string;
  title?: ReactNode;
  subtitle?: string;
}

/**
 * The dark hero brand panel shown on the left of the auth / register pages.
 * Shared so /auth, /register and /merchant-register stay visually identical;
 * copy is overridable per page.
 */
export default function AuthBrandPanel({
  eyebrow = 'Premium Car Accessories',
  title,
  subtitle = "Malaysia's premier automotive accessories network — quality parts, fast dispatch, trusted since 2007.",
}: AuthBrandPanelProps) {
  return (
    <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-[#0a0a0a]">
      <img
        src="/hero/hero-static-night.jpg"
        alt="12V — premium car accessories"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/55 to-black/40"></div>
      <div aria-hidden className="pointer-events-none absolute -bottom-20 left-1/4 w-[440px] h-[280px] rounded-full bg-lime-500/15 blur-[120px]"></div>

      {/* Wordmark */}
      <div className="absolute top-8 left-12 flex items-center gap-2.5 text-white z-10">
        <span className="font-heading font-black text-2xl tracking-tight">12V</span>
        <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] border-l border-white/20 pl-2.5">By Auto Lab</span>
      </div>

      <div className="absolute inset-0 flex flex-col justify-end px-12 pb-14">
        <div className="max-w-md">
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-lime-400 font-semibold mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400"></span> {eyebrow}
          </span>
          <h1 className="font-heading font-black uppercase text-4xl xl:text-5xl text-white leading-[0.95] mb-6">
            {title ?? (
              <>
                Upgrade<br />
                <span className="text-lime-400 italic">your ride.</span>
              </>
            )}
          </h1>
          <p className="text-gray-300 text-base leading-relaxed max-w-sm">{subtitle}</p>
          <div className="flex items-center gap-6 mt-8">
            <div>
              <div className="font-heading text-3xl font-black text-lime-400">19+</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Years</div>
            </div>
            <div className="w-px h-10 bg-white/15"></div>
            <div>
              <div className="font-heading text-3xl font-black text-lime-400">500+</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Dealers</div>
            </div>
            <div className="w-px h-10 bg-white/15"></div>
            <div>
              <div className="font-heading text-3xl font-black text-lime-400">10K+</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Products</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
