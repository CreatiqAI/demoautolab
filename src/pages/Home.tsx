import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
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
import HeroImage from '@/components/HeroImage';

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } }
};

// Catalog filter per product line (category id, or a search term where a
// single category doesn't capture the line). Applied on redirect to /catalog.
const CAT_NINJA = "category=208a3d72-5dc1-4bff-8ab1-322462fdf0a6";
const CAT_AMBIENT = "category=57530dc7-9e93-4e4f-8008-d685db68c864";
const CAT_LED = "category=e2ddcabc-4d26-4e39-805e-722f0cc2b94f";
const SEARCH_CASING = "search=casing";

// The sticky tour tells a coverage story — outside the car, inside the cabin,
// the sound system, then the wiring that ties it together — rather than a
// per-category product list.
const CHAPTERS = [
  {
    index: "01",
    name: "Outside",
    tagline: "Own the outside.",
    desc: "Ninja Shades, LED headlights and 360° cameras — every upgrade the exterior of your car can wear.",
    img: "/hero/prod-shade.jpg"
  },
  {
    index: "02",
    name: "Inside",
    tagline: "Live in the details.",
    desc: "Ambient lighting and cabin upgrades that transform the space you actually sit in — fitted like OEM.",
    img: "/hero/prod-ambient.jpg"
  },
  {
    index: "03",
    name: "Sound",
    tagline: "Turn it all the way up.",
    desc: "Head units, speakers, amplifiers and subwoofers — a full audio stage built right into your car.",
    img: "/hero/prod-speaker.png"
  },
  {
    index: "04",
    name: "Integration",
    tagline: "Fits like factory.",
    desc: "Casings, sockets and CANbus adaptors that make every install look and run factory-standard.",
    img: "/hero/casing%20socket.png"
  }
];

// Full lineup shown in "Everything we make". Items with a `filter` link into
// the catalog; vendor lines without a category yet are display-only for now.
const LINEUP: { num: string; name: string; desc: string; img: string; filter?: string }[] = [
  { num: "01", name: "Ninja Shades", desc: "Custom-fit magnetic sunshades", img: "/hero/prod-shade.jpg", filter: CAT_NINJA },
  { num: "02", name: "Android Player Casing", desc: "Precision dash casings, factory-finish fit", img: "/hero/casing%20socket.png", filter: SEARCH_CASING },
  { num: "03", name: "Head Unit", desc: "Big-screen Android head units, wireless CarPlay & Android Auto", img: "/hero/prod-headunit.png" },
  { num: "04", name: "Car Speaker", desc: "Coaxial & component upgrades for every door", img: "/hero/prod-speaker.png" },
  { num: "05", name: "Amplifier", desc: "Clean, multi-channel power for your full system", img: "/hero/prod-amplifier.png" },
  { num: "06", name: "360 Camera", desc: "Surround-view parking safety, all-round vision", img: "/hero/prod-camera.png" },
  { num: "07", name: "Ambient Lighting", desc: "App-controlled interior light kits", img: "/hero/prod-ambient.jpg", filter: CAT_AMBIENT },
  { num: "08", name: "LED Bulbs", desc: "Plug-and-play brightness upgrades", img: "/hero/prod-led.jpg", filter: CAT_LED }
];

/* One chapter of the sticky product tour. Visibility is driven by the
   tour's scroll progress so chapters cross-fade as the user scrolls. */
const TourChapter = ({
  progress,
  index,
  total,
  chapter
}: {
  progress: MotionValue<number>;
  index: number;
  total: number;
  chapter: typeof CHAPTERS[number];
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
              <div className="relative rounded-[2rem] overflow-hidden border border-gray-200/80 shadow-[0_30px_80px_-25px_rgba(0,0,0,0.3)] aspect-[4/3] max-h-[46vh] lg:max-h-[60vh] mx-auto">
                <img
                  src={chapter.img}
                  alt={chapter.name}
                  className="w-full h-full object-cover"
                />
                {/* Consistent cinematic gradient so bright and dark shots feel unified */}
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none"></div>
                <div className="absolute bottom-5 left-5 bg-white/90 backdrop-blur-md rounded-full px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-900">
                  {chapter.name}
                </div>
              </div>
            </TiltCard>
          </motion.div>

          {/* Copy */}
          <motion.div style={{ y: textY }} className="w-full lg:w-1/2 pointer-events-auto">
            {/* Obvious index: big solid numeral + lime total + accent bar */}
            <div className="flex items-center gap-4 mb-5">
              <span className="font-heading font-black text-6xl lg:text-8xl leading-none text-gray-900 tracking-tighter">
                {chapter.index}
              </span>
              <div className="flex flex-col gap-2 pt-2">
                <span className="font-mono text-sm font-bold text-lime-600">/ {String(total).padStart(2, '0')}</span>
                <span className="block w-10 h-[3px] rounded-full bg-lime-500"></span>
              </div>
            </div>
            <h3 className="font-heading font-bold uppercase tracking-tight text-4xl lg:text-6xl text-gray-900 mb-4 leading-[0.95]">
              {chapter.tagline}
            </h3>
            <p className="text-gray-500 text-base lg:text-lg font-light leading-relaxed max-w-md">
              {chapter.desc}
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

const Home = () => {
  const navigate = useNavigate();

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

      {/* ============ HERO — scroll-driven 3D car ============ */}
      <HeroImage />

      {/* ============ PRODUCT TOUR (sticky scrollytelling) ============ */}
      <section ref={tourRef} className="relative h-[480vh] bg-[#f7f7f4]">
        <div className="sticky top-0 h-screen overflow-hidden flex items-center">
          {/* Soft ambient glows */}
          <div aria-hidden className="absolute top-1/3 -left-24 w-[520px] h-[520px] rounded-full bg-lime-300/20 blur-[150px] pointer-events-none"></div>
          <div aria-hidden className="absolute bottom-10 right-0 w-[420px] h-[420px] rounded-full bg-emerald-200/25 blur-[150px] pointer-events-none"></div>

          {/* Section label */}
          <div className="absolute top-24 left-0 right-0 text-center z-20">
            <p className="text-[11px] uppercase tracking-[0.4em] text-gray-400 font-semibold">
              Everything, inside &amp; out
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
            />
          ))}

          {/* Progress rail */}
          <div className="absolute right-6 lg:right-12 top-1/2 -translate-y-1/2 z-20 hidden sm:flex flex-col items-center gap-6">
            <div className="relative w-[2px] h-40 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                style={{ scaleY: railScale }}
                className="absolute inset-0 bg-lime-500 origin-top rounded-full"
              />
            </div>
            <div className="flex flex-col gap-3">
              {CHAPTERS.map((c, idx) => (
                <span
                  key={idx}
                  className={`font-mono text-[10px] transition-colors duration-300 ${idx === activeChapter ? 'text-lime-600 font-bold' : 'text-gray-300'}`}
                >
                  {c.index}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ LINEUP INDEX ============ */}
      <section className="py-24 md:py-32 bg-[#FAFAF8]">
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
              Eight product lines, one standard — vetted by Auto Lab engineers.
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
                onClick={() => item.filter && navigate(`/catalog?${item.filter}`)}
                onMouseEnter={() => setPreviewIdx(idx)}
                className={`group w-full grid grid-cols-12 items-center gap-4 py-7 md:py-9 border-b border-gray-200 text-left hover:bg-[#efeee9] transition-colors duration-300 px-2 md:px-4 ${item.filter ? '' : 'cursor-default'}`}
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
                  {item.filter ? (
                    <ArrowUpRight className="w-5 h-5 text-gray-200 group-hover:text-gray-900 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                  ) : (
                    <span className="font-mono text-[9px] uppercase tracking-widest text-gray-300">Vendor</span>
                  )}
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
              { n: 19, suffix: "+", label: "Years of Auto Lab", desc: "Supply-chain experience behind every order since 2007." },
              { n: 500, suffix: "+", label: "Dealers", desc: "Wholesale tier pricing for shops across Malaysia." },
              { n: 100, suffix: "%", label: "Vetted Quality", desc: "Every product line is checked and approved by Auto Lab engineers before it reaches you." }
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
      <section className="py-24 bg-[#FAFAF8]">
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
              text="Every product line is curated and vetted by Auto Lab Sdn Bhd — Malaysia's trusted parts distributor in Cheras, KL since 2007."
              className="text-gray-700 font-light leading-relaxed mb-8"
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
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 32s linear infinite;
        }
        .hero-dots {
          background-image: radial-gradient(rgba(17,24,39,0.05) 1px, transparent 1px);
          background-size: 30px 30px;
          -webkit-mask-image: radial-gradient(ellipse at center, black 40%, transparent 75%);
          mask-image: radial-gradient(ellipse at center, black 40%, transparent 75%);
        }
        @keyframes hero-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 30px) scale(1.12); }
        }
        @keyframes hero-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1.05); }
          50% { transform: translate(-36px, -28px) scale(1); }
        }
        .hero-blob { animation: hero-drift 14s ease-in-out infinite; }
        .hero-blob-2 { animation: hero-drift-2 16s ease-in-out infinite; }
        @keyframes hero-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .hero-float { animation: hero-float 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee, .hero-blob, .hero-blob-2, .hero-float, .animate-pulse {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
