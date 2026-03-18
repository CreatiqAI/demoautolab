import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import {
  Shield,
  Users,
  Package,
  ArrowRight,
  Zap,
  CheckCircle2,
  ChevronRight,
  Gauge,
  Cpu,
  Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, Variants } from 'framer-motion';

const Home = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroY = useTransform(scrollYProgress, [0, 0.5], ["0%", "40%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const carBrands = [
    "TOYOTA", "HONDA", "NISSAN", "MAZDA", "BMW", "MERCEDES", "AUDI", "VOLKSWAGEN",
    "HYUNDAI", "KIA", "SUBARU", "MITSUBISHI", "FORD", "PROTON", "PERODUA"
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-[#070707] overflow-x-hidden font-sans text-white">
      <SEOHead
        title="Car Parts Malaysia | Premium Automotive Parts | AUTO LAB"
        description="Premium car parts & automotive parts in Malaysia. Located in Cheras, KL. Fast delivery. Elevate your ride with Auto Lab."
        keywords="car parts Malaysia, auto parts KL, automotive parts, performance parts, Cheras, Kuala Lumpur"
        canonical="https://autolabs.my/"
      />
      <Header />

      {/* Hero Section: Refined Premium Aesthetic */}
      <section className="relative w-full h-screen min-h-[750px] overflow-hidden bg-[#070707]">
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <motion.div
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="w-full h-full"
          >
            <img
              src="https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=2000"
              alt="Luxury Sports Car Detail"
              className="w-full h-full object-cover opacity-40 grayscale-[0.5]"
            />
            {/* Soft Ambient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#070707] via-transparent to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-transparent to-black/20"></div>
          </motion.div>
        </div>

        {/* Hero Content: Asymmetrical Layout */}
        <div className="relative z-10 container mx-auto px-6 h-full flex flex-col justify-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-4xl"
          >
            {/* Accent badge */}
            <motion.div
              variants={fadeInUp}
              className="flex items-center gap-4 mb-8"
            >
              <div className="h-[1px] w-12 bg-lime-500/50"></div>
              <span className="text-xs uppercase tracking-[0.5em] text-lime-400 font-medium">Est. 2007 • Authority in Parts</span>
            </motion.div>

            {/* Main Headline: Refined Scale & Wording */}
            <motion.h1
              variants={fadeInUp}
              className="text-5xl md:text-7xl lg:text-8xl font-heading font-black text-white leading-[0.9] mb-8 tracking-tighter"
            >
              <span className="block opacity-90">THE AUTO LAB</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40 italic pr-8">
                COLLECTIVE
              </span>
            </motion.h1>

            {/* Sub-headline / Description */}
            <motion.div variants={fadeInUp} className="max-w-xl mb-12">
              <p className="text-lg md:text-xl text-gray-400 leading-relaxed font-light">
                AutoLab represents the pinnacle of automotive enhancement. We curate and engineer the world's most <span className="text-white border-b border-lime-500/30">exclusive components</span> for those who transcend the ordinary.
              </p>
            </motion.div>

            {/* Actions: Ultra-Sleek Interaction */}
            <motion.div
              variants={fadeInUp}
              className="flex items-center gap-10"
            >
              <Button
                onClick={() => navigate('/catalog')}
                className="group relative h-16 px-10 bg-white text-black hover:bg-lime-500 hover:text-white rounded-none transition-all duration-700 overflow-hidden min-w-[240px]"
              >
                {/* Minimalist Slide Effect */}
                <div className="absolute inset-0 bg-lime-600 translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-700 ease-[0.22,1,0.36,1]"></div>

                <span className="relative z-10 font-bold uppercase tracking-[0.2em] flex items-center justify-between w-full transition-colors duration-500 text-sm">
                  EXPLORE CATALOGUE
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-500" />
                </span>
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Technical Sidebar - Right side */}
        <div className="absolute right-0 top-0 h-full w-24 hidden xl:flex flex-col items-center justify-center border-l border-white/5 space-y-24">
          <div className="rotate-90 origin-center text-[10px] uppercase tracking-[1em] text-white/20 whitespace-nowrap">
            PREMIUM • PRECISION • POWER
          </div>
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`w-1 h-1 rounded-full ${i === 1 ? 'bg-lime-500' : 'bg-white/10'}`}></div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0f0f0f] py-4 border-y border-white/5 relative z-20 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="flex animate-scroll whitespace-nowrap opacity-30">
          {[...carBrands, ...carBrands, ...carBrands].map((brand, idx) => (
            <div key={idx} className="mx-6 md:mx-10 text-gray-400 font-heading font-black text-xl md:text-2xl uppercase tracking-[0.2em] hover:text-lime-500 transition-all cursor-default">
              {brand}
            </div>
          ))}
        </div>
      </section>

      {/* Grid-based Avant-Garde Categories */}
      <section id="categories" className="py-32 relative z-20 bg-[#070707] overflow-hidden">
        {/* Glow behind grid */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-lime-600/10 rounded-[100%] blur-[120px] pointer-events-none"></div>

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16"
          >
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-[1px] bg-lime-500"></div>
                <span className="uppercase tracking-[0.3em] text-lime-500 font-bold text-[10px]">Discover</span>
              </div>
              <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter">
                Premium <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-600">Categories</span>
              </h2>
            </div>
            <Button variant="outline" className="rounded-none border-white/10 text-white hover:bg-white hover:text-black w-fit px-8 h-10 uppercase tracking-[0.2em] font-bold text-xs transition-all duration-500" onClick={() => navigate('/catalog')}>
              View All Parts
            </Button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[350px]">
            {[
              { title: "Performance Tuning", img: "https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?auto=format&fit=crop&q=80&w=1200", colSpan: "lg:col-span-2" },
              { title: "Smart Media", img: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&q=80&w=600", colSpan: "lg:col-span-1" },
              { title: "Luxury Interior", img: "https://images.unsplash.com/photo-1563720360172-67b8f3dce741?auto=format&fit=crop&q=80&w=600", colSpan: "lg:col-span-1" },
              { title: "Aero Exterior", img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800", colSpan: "lg:col-span-2" }
            ].map((cat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className={`group relative rounded-[2rem] overflow-hidden cursor-pointer glass-dark-panel hover:border-lime-500/50 transition-all duration-500 ${cat.colSpan}`}
                onClick={() => navigate('/catalog')}
              >
                <img src={cat.img} alt={cat.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-60 group-hover:opacity-40 filter grayscale group-hover:grayscale-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>

                {/* Content */}
                <div className="absolute inset-0 p-8 md:p-10 flex flex-col justify-end">
                  <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <h3 className="text-2xl md:text-3xl font-heading font-black text-white uppercase tracking-tight mb-2 tracking-wide">{cat.title}</h3>
                    <div className="flex items-center gap-2 text-lime-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                      <span className="uppercase tracking-[0.2em] text-[10px] font-bold">Explore</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Split - Asymmetrical */}
      <section className="py-24 bg-[#0a0a0a] relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-lime-600/5 blur-[150px] pointer-events-none"></div>
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative aspect-square lg:aspect-[4/5] rounded-[2rem] overflow-hidden group border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            >
              <img
                src="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=800"
                alt="Auto Lab Workshop"
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-transparent to-lime-500/20 mix-blend-overlay"></div>

              <div className="absolute bottom-10 left-10 right-10 p-6 glass-dark-panel rounded-2xl border border-white/10">
                <div className="flex items-center gap-5">
                  <div className="text-lime-500">
                    <span className="text-5xl font-heading font-black">17+</span>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg uppercase tracking-[0.1em] mb-1">Years of Authority</h4>
                    <p className="text-gray-400 text-xs">Trusted wholesale partner since 2007</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-10"
            >
              <div>
                <motion.div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-[1px] bg-lime-500"></div>
                  <span className="uppercase tracking-[0.3em] text-lime-500 font-bold text-[10px]">The Masterclass</span>
                </motion.div>
                <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase leading-[1.1] mb-6 tracking-tighter">
                  ENGINEERED FOR <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-green-600">PERFECTION.</span>
                </h2>
                <p className="text-gray-400 text-lg leading-relaxed font-light">
                  We don't just supply parts. We architect driving experiences. Our curated selection undergoes extreme scrutiny to guarantee unmatched reliability and performance.
                </p>
              </div>

              <div className="grid gap-6">
                {[
                  { icon: <Shield />, title: "Bulletproof Warranty", desc: "Exhaustive coverage on all premium components." },
                  { icon: <Zap />, title: "Hyper-Fast Logistics", desc: "98% in-stock rate with same-day dispatching." },
                  { icon: <Users />, title: "Exclusive Partnership", desc: "Dedicated engineering support for our network." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-5 p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors hover:border-lime-500/30">
                    <div className="w-12 h-12 rounded-full bg-lime-500/20 flex items-center justify-center text-lime-400 shrink-0 border border-lime-500/20">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-base uppercase tracking-widest mb-1">{item.title}</h4>
                      <p className="text-gray-400 text-xs leading-relaxed font-light">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => navigate('/about')}
                className="group h-12 px-8 rounded-none text-xs font-bold uppercase tracking-[0.3em] bg-white text-black hover:bg-lime-500 hover:text-white transition-all duration-500 shadow-xl"
              >
                Our Legacy <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Massive Dark CTA */}
      <section className="py-32 relative overflow-hidden bg-[#000]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511407397940-d57f68e81203?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center bg-fixed opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto glass-dark-panel rounded-[3rem] p-12 md:p-20 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-lime-500/10 to-transparent"></div>

            <div className="relative z-10 flex flex-col items-center">
              <Package className="w-12 h-12 text-lime-500 mb-6 opacity-80" />
              <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase leading-tight tracking-tighter mb-6">
                Redefine Your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-600">Standards.</span>
              </h2>
              <p className="text-lg text-gray-400 font-light mb-10 max-w-xl">
                Step into the future of automotive upgrades. Immerse yourself in our full product ecosystem.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 w-full justify-center">
                <Button
                  className="group h-16 px-12 rounded-none bg-white text-black hover:bg-lime-600 hover:text-white transition-all duration-700 uppercase tracking-[0.3em] font-bold text-sm w-full sm:w-auto shadow-2xl"
                  onClick={() => navigate('/catalog')}
                >
                  Launch Catalog <ArrowRight className="ml-3 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />

      {/* Custom CSS for ticker animations */}
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-scroll {
          animation: scroll 40s linear infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
      `}</style>
    </div>
  );
};

export default Home;


