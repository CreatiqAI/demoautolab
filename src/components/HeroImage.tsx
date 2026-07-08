import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowUpRight, ArrowDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, Variants } from 'framer-motion';

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

const CAR_BRANDS = [
  'TOYOTA', 'HONDA', 'NISSAN', 'MAZDA', 'BMW', 'MERCEDES', 'AUDI', 'VOLKSWAGEN',
  'HYUNDAI', 'KIA', 'SUBARU', 'MITSUBISHI', 'FORD', 'PROTON', 'PERODUA'
];
const PRODUCTS = ['Ninja Shades', 'Android Players', 'Ambient Lighting', 'LED Bulbs'];

const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } };
const item: Variants = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } } };

/** 12V hero — cinematic centered night. Static render, sharp and fast. */
export default function HeroImage() {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.04, 1.16]);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '34%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex flex-col bg-[#0a0a0b] overflow-hidden pt-16 sm:pt-20">
      {/* Render */}
      <motion.img
        src="/hero/hero-static-night.jpg"
        alt="12V — GWM Tank 300 with premium car accessories"
        style={{ scale: imgScale, objectPosition: '50% 46%' }}
        className="absolute inset-0 w-full h-full object-cover will-change-transform"
      />

      {/* Cinematic scrims: top + bottom vignette, and a soft centre spotlight for text */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/85 pointer-events-none"></div>
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 45% at 50% 42%, rgba(0,0,0,0.55), transparent 70%)' }}></div>
      {/* subtle lime ambience */}
      <div aria-hidden className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[700px] h-[360px] rounded-full bg-lime-500/10 blur-[130px] pointer-events-none"></div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          style={{ y: contentY, opacity: contentOpacity }}
          className="container mx-auto px-6 text-center flex flex-col items-center"
        >
          {/* Eyebrow with flanking rules */}
          <motion.div variants={item} className="flex items-center gap-4 mb-7">
            <span className="hidden sm:block h-px w-10 bg-white/25"></span>
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-white/75 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"></span>
              Premium Car Accessories · Supported by Auto Lab
            </span>
            <span className="hidden sm:block h-px w-10 bg-white/25"></span>
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={item} className="font-heading font-black uppercase tracking-tighter leading-[0.86] text-white text-6xl sm:text-7xl lg:text-8xl xl:text-9xl mb-7 drop-shadow-[0_2px_30px_rgba(0,0,0,0.6)]">
            Upgrade every <br className="hidden sm:block" /><span className="text-lime-400 italic">drive.</span>
          </motion.h1>

          {/* Product line */}
          <motion.p variants={item} className="text-white/70 text-xs sm:text-sm uppercase tracking-[0.28em] font-medium mb-10">
            {PRODUCTS.join('  ·  ')}
          </motion.p>

          {/* CTAs */}
          <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate('/catalog')}
              className="group h-14 px-10 rounded-full bg-white text-gray-900 hover:bg-lime-400 transition-colors duration-300 font-semibold tracking-wide text-sm active:scale-[0.98] shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
            >
              Shop the Catalog
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
            <Button
              onClick={() => navigate('/merchant-register')}
              variant="outline"
              className="group h-14 px-10 rounded-full border-white/40 bg-white/10 backdrop-blur-sm text-white hover:bg-white hover:text-gray-900 transition-colors duration-300 font-semibold tracking-wide text-sm active:scale-[0.98]"
            >
              Become a Merchant
              <ArrowUpRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
            </Button>
          </motion.div>

          {/* Trust row */}
          <motion.div variants={item} className="flex items-center gap-6 sm:gap-8 mt-11 font-mono text-[11px] tracking-widest text-white/55">
            <span><span className="text-lime-400">17+</span> YEARS</span>
            <span className="w-px h-3 bg-white/20"></span>
            <span><span className="text-lime-400">10+</span> MERCHANTS</span>
            <span className="w-px h-3 bg-white/20"></span>
            <span><span className="text-lime-400">100%</span> VETTED</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div style={{ opacity: cueOpacity }} className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 text-white/60 text-[10px] uppercase tracking-[0.3em] font-medium">
        <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
        Scroll to explore
      </motion.div>

      {/* Endless brand marquee */}
      <div className="relative z-10 border-t border-white/10 bg-white/[0.04] backdrop-blur-sm py-5 overflow-hidden">
        <div className="flex w-max animate-marquee [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          {[...CAR_BRANDS, ...CAR_BRANDS].map((brand, idx) => (
            <div key={idx} className="flex items-center shrink-0">
              <span className="mx-7 text-white/25 font-heading font-bold text-lg uppercase tracking-[0.25em]">{brand}</span>
              <span className="w-1 h-1 rounded-full bg-lime-500/70 shrink-0"></span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 34s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .animate-marquee, .animate-pulse { animation: none; } }
      `}</style>
    </section>
  );
}
