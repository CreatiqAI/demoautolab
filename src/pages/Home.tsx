import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { ArrowRight, ArrowUpRight, ArrowDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useMotionValueEvent,
  useMotionTemplate,
  useSpring,
  AnimatePresence,
  MotionValue,
  Variants
} from 'framer-motion';
import { SplitHeading, CountUp, TiltCard, Magnetic, RevealWords } from '@/components/MotionBits';

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } }
};

const CAR_BRANDS = [
  "TOYOTA", "HONDA", "NISSAN", "MAZDA", "BMW", "MERCEDES", "AUDI", "VOLKSWAGEN",
  "HYUNDAI", "KIA", "SUBARU", "MITSUBISHI", "FORD", "PROTON", "PERODUA"
];

/* Hero showcase image. Primary is the client's generated 12V cabin shot —
   drop the file at public/hero/hero.jpg and it is picked up automatically;
   until then the stock cabin photo below is used as fallback. */
const HERO_IMAGE_PRIMARY = "/hero/hero.jpg";
const HERO_IMAGE_FALLBACK = "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=2000";

const CHAPTERS = [
  {
    index: "01",
    name: "Ninja Shades",
    tagline: "Cool cabin. Clear view.",
    desc: "Custom-fit magnetic sunshades, cut precisely for Malaysian heat.",
    img: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=1200"
  },
  {
    index: "02",
    name: "Casings & Players",
    tagline: "A factory finish for every dash.",
    desc: "Precision Android player casings, paired with big-screen head units.",
    img: "https://images.unsplash.com/photo-1610647752706-3bb12232b3ab?auto=format&fit=crop&q=80&w=1200"
  },
  {
    index: "03",
    name: "Ambient Lighting",
    tagline: "Set the mood in motion.",
    desc: "Interior light kits with app-controlled colour, fitted like OEM.",
    img: "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&q=80&w=1200"
  },
  {
    index: "04",
    name: "LED Bulbs",
    tagline: "See further. Look sharper.",
    desc: "Plug-and-play brightness upgrades for every socket and every car.",
    img: "https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&q=80&w=1200"
  }
];

const LINEUP = [
  { num: "01", name: "Ninja Shades", desc: "Custom-fit magnetic sunshades", img: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=600" },
  { num: "02", name: "Player Casings", desc: "Precision dash casings, factory-finish fit", img: "https://images.unsplash.com/photo-1610647752706-3bb12232b3ab?auto=format&fit=crop&q=80&w=600" },
  { num: "03", name: "Android Players", desc: "Big-screen head units, wireless connectivity", img: "/hero/hero.jpg" },
  { num: "04", name: "Ambient Lighting", desc: "App-controlled interior light kits", img: "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&q=80&w=600" },
  { num: "05", name: "LED Bulbs", desc: "Plug-and-play brightness upgrades", img: "https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&q=80&w=600" }
];

/* One chapter of the sticky product tour. Visibility is driven by the
   tour's scroll progress so chapters cross-fade as the user scrolls. */
const TourChapter = ({
  progress,
  index,
  total,
  chapter,
  onShop
}: {
  progress: MotionValue<number>;
  index: number;
  total: number;
  chapter: typeof CHAPTERS[number];
  onShop: () => void;
}) => {
  const start = index / total;
  const end = (index + 1) / total;
  const fadePad = 0.045;

  const opacity = useTransform(
    progress,
    index === 0
      ? [0, end - fadePad, end]
      : index === total - 1
        ? [start, start + fadePad, 1]
        : [start, start + fadePad, end - fadePad, end],
    index === 0
      ? [1, 1, 0]
      : index === total - 1
        ? [0, 1, 1]
        : [0, 1, 1, 0]
  );
  const imgY = useTransform(progress, [start, end], [60, -60]);
  const imgScale = useTransform(progress, [start, start + fadePad, end], [0.94, 1, 1.02]);
  const textY = useTransform(progress, [start, start + fadePad], [40, 0]);
  const reversed = index % 2 === 1;

  return (
    <motion.div
      style={{ opacity }}
      className="absolute inset-0 flex items-center pointer-events-none"
    >
      <div className="container mx-auto px-6 w-full">
        <div className={`flex flex-col ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-10 lg:gap-24`}>

          {/* Image — tilts toward the cursor */}
          <motion.div
            style={{ y: imgY, scale: imgScale }}
            className="w-full lg:w-1/2 will-change-transform"
          >
            <TiltCard className="pointer-events-auto">
              <div className="relative rounded-[2rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] aspect-[4/3] max-h-[46vh] lg:max-h-[60vh] mx-auto">
                <img
                  src={chapter.img}
                  alt={chapter.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-5 left-5 bg-white/85 backdrop-blur-md rounded-full px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-900">
                  {chapter.name}
                </div>
              </div>
            </TiltCard>
          </motion.div>

          {/* Copy */}
          <motion.div style={{ y: textY }} className="w-full lg:w-1/2 pointer-events-auto">
            <span
              className="block font-heading font-black text-7xl lg:text-9xl leading-none text-transparent mb-4 select-none"
              style={{ WebkitTextStroke: '1.5px rgba(0,0,0,0.14)' }}
            >
              {chapter.index}
            </span>
            <h3 className="font-heading font-bold uppercase tracking-tight text-4xl lg:text-6xl text-gray-900 mb-4 leading-[0.95]">
              {chapter.tagline}
            </h3>
            <p className="text-gray-500 text-base lg:text-lg font-light leading-relaxed mb-8 max-w-md">
              {chapter.desc}
            </p>
            <Button
              onClick={onShop}
              className="group h-12 px-8 rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors duration-300 font-semibold tracking-wide text-sm active:scale-[0.98]"
            >
              Shop {chapter.name}
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

const Home = () => {
  const navigate = useNavigate();

  /* Hero scroll: stage zooms slightly and content drifts as the page scrolls away */
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  const stageScale = useTransform(heroProgress, [0, 1], [1, 1.1]);
  const contentY = useTransform(heroProgress, [0, 1], ["0%", "30%"]);
  const contentOpacity = useTransform(heroProgress, [0, 0.6], [1, 0]);

  /* Product tour scroll */
  const tourRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: tourProgress } = useScroll({
    target: tourRef,
    offset: ["start start", "end end"]
  });
  const [activeChapter, setActiveChapter] = useState(0);
  useMotionValueEvent(tourProgress, "change", (v) => {
    const idx = Math.min(CHAPTERS.length - 1, Math.max(0, Math.floor(v * CHAPTERS.length)));
    setActiveChapter(idx);
  });
  const railScale = useTransform(tourProgress, [0, 1], [0, 1]);

  /* Lineup index: floating image preview that follows the cursor */
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const previewX = useMotionValue(0);
  const previewY = useMotionValue(0);
  const previewSpringX = useSpring(previewX, { stiffness: 220, damping: 24 });
  const previewSpringY = useSpring(previewY, { stiffness: 220, damping: 24 });
  const handleLineupMove = (e: React.MouseEvent<HTMLDivElement>) => {
    previewX.set(e.clientX + 28);
    previewY.set(e.clientY);
  };

  /* Finale CTA: lime spotlight that follows the cursor */
  const ctaX = useMotionValue(50);
  const ctaY = useMotionValue(40);
  const ctaSpotlight = useMotionTemplate`radial-gradient(560px circle at ${ctaX}% ${ctaY}%, rgba(163,230,53,0.14), transparent 70%)`;
  const handleCtaMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    ctaX.set(((e.clientX - rect.left) / rect.width) * 100);
    ctaY.set(((e.clientY - rect.top) / rect.height) * 100);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] font-sans text-gray-900">
      <SEOHead
        title="12V | Premium Car Accessories Malaysia — Ninja Shades, Android Players & Lighting"
        description="12V — premium car accessories, supported by Auto Lab. Ninja Shades sunshades, Android player casings & head units, ambient lighting and LED bulbs. Nationwide delivery from Cheras, KL."
        keywords="12V, ninja shades Malaysia, car android player, android player casing, car ambient light, car LED bulb, Auto Lab"
        canonical="https://autolabs.my/"
      />
      <Header />

      {/* ============ HERO — cinematic stage ============ */}
      <section ref={heroRef} className="relative h-screen min-h-[680px] bg-[#FAFAF8] pt-[88px] px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="relative w-full h-full rounded-[1.75rem] sm:rounded-[2.5rem] overflow-hidden bg-gray-900">

          {/* Background image: entrance zoom-out + scroll zoom-in */}
          <motion.div style={{ scale: stageScale }} className="absolute inset-0 will-change-transform">
            <motion.img
              initial={{ scale: 1.18, opacity: 0.4 }}
              animate={{ scale: 1.04, opacity: 1 }}
              transition={{ duration: 2, ease: EASE_OUT }}
              src={HERO_IMAGE_PRIMARY}
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.endsWith(HERO_IMAGE_FALLBACK)) img.src = HERO_IMAGE_FALLBACK;
              }}
              alt="12V — premium car interior with ambient lighting"
              className="w-full h-full object-cover blur-[2px]"
              style={{ objectPosition: '50% 55%' }}
            />
          </motion.div>

          {/* Legibility gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30"></div>

          {/* Rotating badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.1, duration: 0.7, ease: EASE_OUT }}
            className="absolute top-7 right-7 lg:top-10 lg:right-10 w-24 h-24 lg:w-28 lg:h-28 hidden md:flex items-center justify-center"
          >
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full spin-slow">
              <defs>
                <path id="hero-circle" d="M 50,50 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" />
              </defs>
              <text className="fill-white/80 uppercase" style={{ fontSize: '8.5px', letterSpacing: '2.4px' }}>
                <textPath href="#hero-circle">Premium car accessories · by Auto Lab ·</textPath>
              </text>
            </svg>
            <span className="font-heading font-black text-white text-xl tracking-tighter">
              12<span className="text-lime-400 italic">V</span>
            </span>
          </motion.div>

          {/* Main content — bottom left */}
          <motion.div
            style={{ y: contentY, opacity: contentOpacity }}
            className="absolute inset-x-0 bottom-0 p-7 sm:p-10 lg:p-14 will-change-transform"
          >
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7, ease: EASE_OUT }}
              className="text-[11px] uppercase tracking-[0.4em] text-white/70 font-semibold mb-6"
            >
              12V · Premium Car Accessories · Supported by Auto Lab
            </motion.p>

            <h1 className="font-heading font-black uppercase tracking-tighter leading-[0.9] text-white text-5xl sm:text-7xl lg:text-8xl xl:text-9xl mb-8">
              <span className="block overflow-hidden">
                <motion.span
                  initial={{ y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.45, duration: 1, ease: EASE_OUT }}
                  className="block"
                >
                  Upgrade
                </motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span
                  initial={{ y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.6, duration: 1, ease: EASE_OUT }}
                  className="block"
                >
                  every <span className="text-lime-400 italic">drive.</span>
                </motion.span>
              </span>
            </h1>

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85, duration: 0.8, ease: EASE_OUT }}
                className="text-white/80 text-base sm:text-lg font-light max-w-sm"
              >
                Ninja Shades, Android players, ambient light and LED — accessories that feel factory-fitted.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.8, ease: EASE_OUT }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button
                  onClick={() => navigate('/catalog')}
                  className="group h-14 px-9 rounded-full bg-white text-gray-900 hover:bg-lime-400 transition-colors duration-300 font-semibold tracking-wide text-sm active:scale-[0.98]"
                >
                  Shop the Catalog
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
                <Button
                  onClick={() => navigate('/merchant-register')}
                  variant="outline"
                  className="group h-14 px-9 rounded-full border-white/40 bg-white/10 backdrop-blur-sm text-white hover:bg-white hover:text-gray-900 transition-colors duration-300 font-semibold tracking-wide text-sm active:scale-[0.98]"
                >
                  Become a Merchant
                  <ArrowUpRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.8 }}
            className="absolute bottom-7 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2 text-white/70 text-[10px] uppercase tracking-[0.3em] font-medium"
          >
            <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
            Scroll
          </motion.div>

        </div>
      </section>

      {/* ============ BRAND MARQUEE ============ */}
      <section className="py-6 bg-white border-y border-gray-100 overflow-hidden">
        <div className="flex animate-scroll whitespace-nowrap [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          {[...CAR_BRANDS, ...CAR_BRANDS, ...CAR_BRANDS].map((brand, idx) => (
            <div key={idx} className="flex items-center shrink-0">
              <span className="mx-8 text-gray-300 font-heading font-bold text-lg uppercase tracking-[0.25em]">{brand}</span>
              <span className="w-1 h-1 rounded-full bg-lime-500/60 shrink-0"></span>
            </div>
          ))}
        </div>
      </section>

      {/* ============ PRODUCT TOUR (sticky scrollytelling) ============ */}
      <section ref={tourRef} className="relative h-[480vh] bg-[#FAFAF8]">
        <div className="sticky top-0 h-screen overflow-hidden flex items-center">

          {/* Section label */}
          <div className="absolute top-24 left-0 right-0 text-center z-20">
            <p className="text-[11px] uppercase tracking-[0.4em] text-gray-400 font-semibold">
              The 12V Lineup
            </p>
          </div>

          {/* Chapters */}
          {CHAPTERS.map((chapter, idx) => (
            <TourChapter
              key={idx}
              progress={tourProgress}
              index={idx}
              total={CHAPTERS.length}
              chapter={chapter}
              onShop={() => navigate('/catalog')}
            />
          ))}

          {/* Progress rail */}
          <div className="absolute right-6 lg:right-12 top-1/2 -translate-y-1/2 z-20 hidden sm:flex flex-col items-center gap-6">
            <div className="relative w-[2px] h-40 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                style={{ scaleY: railScale }}
                className="absolute inset-0 bg-gray-900 origin-top rounded-full"
              />
            </div>
            <div className="flex flex-col gap-3">
              {CHAPTERS.map((c, idx) => (
                <span
                  key={idx}
                  className={`font-mono text-[10px] transition-colors duration-300 ${idx === activeChapter ? 'text-gray-900 font-bold' : 'text-gray-300'}`}
                >
                  {c.index}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ LINEUP INDEX ============ */}
      <section className="py-24 md:py-32 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeInUp}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14"
          >
            <h2 className="font-heading font-bold uppercase tracking-tight text-4xl md:text-5xl text-gray-900">
              <SplitHeading text="Everything we make." />
            </h2>
            <p className="text-gray-400 text-sm font-light max-w-xs">
              Five product lines, one standard — vetted by Auto Lab engineers.
            </p>
          </motion.div>

          <div
            className="border-t border-gray-200"
            onMouseMove={handleLineupMove}
            onMouseLeave={() => setPreviewIdx(null)}
          >
            {LINEUP.map((item, idx) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.06, ease: EASE_OUT }}
                onClick={() => navigate('/catalog')}
                onMouseEnter={() => setPreviewIdx(idx)}
                className="group w-full grid grid-cols-12 items-center gap-4 py-7 md:py-9 border-b border-gray-200 text-left hover:bg-[#FAFAF8] transition-colors duration-300 px-2 md:px-4"
              >
                <span className="col-span-2 md:col-span-1 font-mono text-xs text-gray-300 group-hover:text-lime-600 transition-colors duration-300">
                  {item.num}
                </span>
                <h3 className="col-span-10 md:col-span-5 font-heading font-bold uppercase tracking-tight text-2xl md:text-3xl text-gray-900 group-hover:translate-x-2 transition-transform duration-300">
                  {item.name}
                </h3>
                <p className="hidden md:block col-span-5 text-sm text-gray-400 font-light">
                  {item.desc}
                </p>
                <span className="hidden md:flex col-span-1 justify-end">
                  <ArrowUpRight className="w-5 h-5 text-gray-200 group-hover:text-gray-900 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Cursor-following preview image */}
        <AnimatePresence>
          {previewIdx !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              style={{ x: previewSpringX, y: previewSpringY }}
              className="fixed top-0 left-0 z-50 pointer-events-none hidden lg:block"
            >
              <div className="w-64 h-44 rounded-2xl overflow-hidden shadow-[0_30px_70px_-15px_rgba(0,0,0,0.4)] -translate-y-1/2 border-4 border-white">
                <img
                  key={previewIdx}
                  src={LINEUP[previewIdx].img}
                  alt={LINEUP[previewIdx].name}
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ============ STANDARDS ============ */}
      <section className="py-24 bg-[#F4F4F0]">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12 md:gap-8 max-w-5xl mx-auto">
            {[
              { n: 17, suffix: "+", label: "Years of Auto Lab", desc: "Supply-chain experience behind every order since 2007." },
              { n: 500, suffix: "+", label: "Merchant Partners", desc: "Wholesale tier pricing for shops across Malaysia." },
              { n: 24, suffix: "H", label: "Dispatch Window", desc: "Same-day dispatch from the Cheras hub, tracked to your door." }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1, ease: EASE_OUT }}
                className="text-center md:text-left"
              >
                <div className="font-heading font-black text-6xl text-gray-900 mb-3 tracking-tight">
                  <CountUp to={stat.n} suffix={stat.suffix} />
                </div>
                <div className="text-[11px] uppercase tracking-[0.25em] text-lime-700 font-bold mb-3">{stat.label}</div>
                <p className="text-sm text-gray-500 font-light leading-relaxed max-w-[240px] mx-auto md:mx-0">{stat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SUPPORTED BY AUTO LAB ============ */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="max-w-2xl mx-auto text-center"
          >
            <p className="text-[11px] uppercase tracking-[0.4em] text-gray-400 font-semibold mb-6">
              The name behind the name
            </p>
            <h2 className="font-heading font-bold uppercase tracking-tight text-3xl md:text-4xl text-gray-900 mb-5 leading-tight">
              <SplitHeading text="12V is supported by Auto Lab." />
            </h2>
            <RevealWords
              text="Every order is picked, packed and dispatched by Auto Lab Sdn Bhd — Malaysia's trusted parts distributor in Cheras, KL since 2007."
              className="text-gray-500 font-light leading-relaxed mb-8"
            />
            <button
              onClick={() => navigate('/about')}
              className="group inline-flex items-center gap-2 text-sm font-semibold text-gray-900 border-b border-gray-900 pb-1 hover:text-lime-700 hover:border-lime-700 transition-colors duration-300"
            >
              Read our story
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ============ FINALE CTA ============ */}
      <section
        onMouseMove={handleCtaMove}
        className="relative py-28 md:py-36 bg-[#0B0B0C] overflow-hidden"
      >
        <div aria-hidden className="absolute inset-x-0 -bottom-24 flex justify-center pointer-events-none select-none">
          <span
            className="font-heading font-black text-[30vw] leading-none text-transparent"
            style={{ WebkitTextStroke: '1px rgba(255,255,255,0.06)' }}
          >
            12V
          </span>
        </div>
        {/* Cursor spotlight */}
        <motion.div aria-hidden style={{ background: ctaSpotlight }} className="absolute inset-0 pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="font-heading font-black uppercase tracking-tighter text-5xl sm:text-6xl md:text-7xl text-white mb-6 leading-[0.95]">
              Ready to <span className="text-lime-400 italic">upgrade?</span>
            </h2>
            <p className="text-gray-400 text-lg font-light mb-11 max-w-md mx-auto">
              Nationwide delivery. Wholesale tiers for merchants.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Magnetic strength={0.25}>
                <Button
                  onClick={() => navigate('/catalog')}
                  className="group h-14 px-10 rounded-full bg-white text-gray-900 hover:bg-lime-400 transition-colors duration-300 font-semibold tracking-wide text-sm active:scale-[0.98]"
                >
                  Shop the Catalog
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Magnetic>
              <Magnetic strength={0.25}>
                <Button
                  onClick={() => navigate('/merchant-register')}
                  variant="outline"
                  className="h-14 px-10 rounded-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white transition-colors duration-300 font-semibold tracking-wide text-sm active:scale-[0.98]"
                >
                  Become a Merchant
                </Button>
              </Magnetic>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-scroll {
          animation: scroll 45s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }
        .spin-slow {
          animation: spin-slow 18s linear infinite;
          transform-origin: center;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-scroll, .spin-slow {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
