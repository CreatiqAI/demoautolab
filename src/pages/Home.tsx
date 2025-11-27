import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import {
  Shield,
  Users,
  Package,
  Target,
  Lightbulb,
  Handshake,
  MessageCircle,
  Phone,
  MapPin,
  ArrowRight,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, Variants, useScroll, useTransform } from 'framer-motion';

const Home = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  // Car brands for the scrolling ticker
  const carBrands = [
    "TOYOTA", "HONDA", "NISSAN", "MAZDA", "BMW", "MERCEDES", "AUDI", "VOLKSWAGEN",
    "HYUNDAI", "KIA", "SUBARU", "MITSUBISHI", "FORD", "PROTON", "PERODUA"
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-background overflow-x-hidden font-sans">
      <SEOHead
        title="Car Parts Malaysia | Auto Parts Kuala Lumpur | AUTO LAB"
        description="Premium car parts & automotive parts in Malaysia. Located in Cheras, KL. Honda, Toyota, brake pads, engine oil & more. Fast delivery. Call 03-4297 7668"
        keywords="car parts Malaysia, auto parts KL, automotive parts, brake pads, engine oil, Honda parts, Toyota parts, Cheras, Kuala Lumpur"
        canonical="https://autolabs.my/"
      />
      <Header />

      {/* Hero Section */}
      <section className="relative w-full h-[100dvh] min-h-[700px] overflow-hidden bg-gray-900 flex items-center">
        {/* Parallax Background */}
        <motion.div style={{ y }} className="absolute inset-0 w-full h-[120%] -top-[10%]">
          <img
            src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=2000"
            alt="Sports Car"
            className="w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent/30"></div>
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent"></div>
        </motion.div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 pt-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-4xl"
          >
            <motion.div variants={fadeInUp} className="flex items-center gap-4 mb-6">
              <div className="h-[2px] w-12 md:w-20 bg-lime-500 shadow-[0_0_15px_rgba(132,204,22,0.8)]"></div>
              <span className="text-sm md:text-base font-bold uppercase tracking-[0.3em] text-lime-400 drop-shadow-md">
                Premium Automotive Upgrades
              </span>
            </motion.div>

            {/* Fixed clipping issue by adding extra padding-right and overflow-visible */}
            <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl lg:text-8xl font-heading font-bold text-white tracking-tight mb-8 leading-[1.1] italic drop-shadow-2xl pr-8 overflow-visible">
              UPGRADE <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-lime-500 to-green-600 filter drop-shadow-lg inline-block pr-6">
                YOUR RIDE
              </span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="max-w-xl text-lg md:text-xl text-gray-300 font-light leading-relaxed mb-10 border-l-4 border-lime-500 pl-6">
              Experience the perfect fusion of technology and performance.
              From precision chassis reinforcement to advanced Android systems.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-wrap gap-4">
              <Button
                onClick={() => navigate('/catalog')}
                className="group relative h-14 px-8 bg-gradient-to-r from-lime-600 to-lime-500 hover:from-lime-500 hover:to-lime-400 text-white text-sm font-bold uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(101,163,13,0.4)] hover:shadow-[0_0_35px_rgba(101,163,13,0.6)] transition-all hover:scale-105 border border-lime-400/30 overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] z-0"></div>
                <span className="relative z-10 flex items-center">
                  Shop Now <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={() => document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' })}
                className="group relative h-14 px-8 bg-white/5 text-white border-white/20 hover:bg-white/10 hover:text-white text-sm font-bold uppercase tracking-widest rounded-full backdrop-blur-md transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] overflow-hidden"
              >
                <div className="absolute inset-0 rounded-full border border-white/50 scale-105 opacity-0 group-hover:animate-ping"></div>
                <span className="relative z-10">Explore Categories</span>
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-widest text-white/50">Scroll to Explore</span>
          <div className="w-[1px] h-16 bg-gradient-to-b from-lime-500 to-transparent opacity-50"></div>
        </motion.div>
      </section>

      {/* Brand Ticker - New Section */}
      <section className="bg-black py-8 border-y border-white/10 overflow-hidden relative z-20">
        <div className="flex animate-scroll whitespace-nowrap">
          {[...carBrands, ...carBrands, ...carBrands].map((brand, idx) => (
            <div key={idx} className="mx-8 md:mx-12 text-gray-600 font-heading font-bold text-xl md:text-2xl uppercase tracking-widest hover:text-lime-500 transition-colors cursor-default">
              {brand}
            </div>
          ))}
        </div>
      </section>

      {/* Featured Categories */}
      <section id="categories" className="py-24 bg-background relative z-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="font-heading text-4xl md:text-5xl font-bold italic mb-4 text-gray-900">
              SHOP BY <span className="text-lime-600">CATEGORY</span>
            </h2>
            <div className="h-1 w-24 bg-lime-500 mx-auto rounded-full"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Performance", img: "https://images.unsplash.com/photo-1600706432502-77c0e78c1c1a?auto=format&fit=crop&q=80&w=600", count: "120+ Items" },
              { title: "Audio & Video", img: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&q=80&w=600", count: "85+ Items" },
              { title: "Interior", img: "https://images.unsplash.com/photo-1563720360172-67b8f3dce741?auto=format&fit=crop&q=80&w=600", count: "200+ Items" },
              { title: "Exterior", img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=600", count: "150+ Items" }
            ].map((cat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group relative h-[360px] rounded-2xl overflow-hidden cursor-pointer shadow-lg"
                onClick={() => navigate('/catalog')}
              >
                <img src={cat.img} alt={cat.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
                <div className="absolute bottom-0 left-0 p-8 w-full">
                  <h3 className="text-3xl font-heading font-bold text-white italic mb-2 group-hover:text-lime-400 transition-colors">{cat.title}</h3>
                  <p className="text-gray-300 text-sm font-medium flex items-center justify-between border-t border-white/20 pt-4 mt-2">
                    {cat.count}
                    <span className="w-8 h-8 rounded-full bg-lime-600 flex items-center justify-center transform translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </span>
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Us Preview Section */}
      <section className="py-24 bg-gray-50 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                <img
                  src="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=800"
                  alt="Auto Lab Team"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Decorative Elements */}
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-lime-500/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="absolute -bottom-6 -right-6 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 z-20"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-lime-100 p-3 rounded-full">
                    <Shield className="w-8 h-8 text-lime-600" />
                  </div>
                  <div>
                    <div className="font-heading text-3xl font-bold text-gray-900">17+</div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Years of Trust</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div>
                <span className="text-lime-600 font-bold tracking-widest uppercase text-sm mb-2 block">Who We Are</span>
                <h2 className="font-heading text-4xl md:text-5xl font-bold text-gray-900 italic leading-tight mb-6">
                  MALAYSIA'S PREMIER <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-600 to-green-700">AUTO ACCESSORIES</span>
                </h2>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Since 2007, Auto Lab Sdn Bhd has been the trusted wholesale partner for automotive accessories across Malaysia. We deliver quality products and exceptional service to retailers nationwide.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <Users className="w-8 h-8 text-lime-600 mb-4" />
                  <div className="font-bold text-3xl text-gray-900 mb-1">500+</div>
                  <div className="text-sm text-gray-500 font-medium uppercase">Active Partners</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <Package className="w-8 h-8 text-lime-600 mb-4" />
                  <div className="font-bold text-3xl text-gray-900 mb-1">1000+</div>
                  <div className="text-sm text-gray-500 font-medium uppercase">Products In Stock</div>
                </div>
              </div>

              <Button
                onClick={() => navigate('/about')}
                variant="outline"
                className="group h-12 px-8 border-2 border-lime-600 text-lime-600 hover:bg-lime-600 hover:text-white font-bold uppercase tracking-widest transition-all hover:shadow-lg hover:scale-105 rounded-full"
              >
                Learn More About Us <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The Auto Lab Difference - High Class Design */}
      <section className="py-24 bg-gray-900 relative overflow-hidden">
        {/* Subtle Background Texture */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }}></div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-gray-800/20 to-transparent"></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="lg:col-span-5"
            >
              <h2 className="font-heading text-4xl md:text-6xl font-bold text-white italic mb-6 leading-none">
                THE <span className="text-lime-500 block">DIFFERENCE</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                We don't just sell parts; we provide engineered solutions. Our commitment to quality and precision sets the standard in the Malaysian automotive industry.
              </p>

              <div className="space-y-6">
                {[
                  { title: "Premium Quality Assurance", desc: "Every component is rigorously tested to meet OEM specifications." },
                  { title: "Nationwide Logistics", desc: "Same-day dispatch for Klang Valley, rapid delivery throughout Malaysia." },
                  { title: "Technical Expertise", desc: "Direct access to our engineering team for installation support." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="mt-1">
                      <CheckCircle2 className="w-6 h-6 text-lime-500" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg mb-1">{item.title}</h4>
                      <p className="text-gray-500 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <div className="lg:col-span-7 grid md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-gray-800 p-8 rounded-3xl border border-gray-700 hover:border-lime-500/50 transition-colors group"
              >
                <Shield className="w-12 h-12 text-lime-500 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl font-heading font-bold text-white mb-4">WARRANTY PROTECTION</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Comprehensive warranty coverage on all electronic and mechanical components for your peace of mind.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="bg-gray-800 p-8 rounded-3xl border border-gray-700 hover:border-lime-500/50 transition-colors group md:mt-12"
              >
                <Zap className="w-12 h-12 text-lime-500 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl font-heading font-bold text-white mb-4">RAPID FULFILLMENT</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Advanced inventory management ensures 98% of our catalog is in stock and ready for immediate dispatch.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden bg-white">
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto bg-gray-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
            {/* Background Accents */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
              <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-lime-900/20 via-gray-900/50 to-gray-900"></div>
            </div>

            <div className="relative z-10 space-y-8">
              <motion.h2
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="font-heading text-4xl md:text-6xl font-bold text-white leading-tight italic"
              >
                READY TO <span className="text-lime-500">UPGRADE?</span>
              </motion.h2>
              <p className="text-xl text-gray-300 font-light max-w-2xl mx-auto">
                Join Malaysia's fastest growing network of automotive retailers and enthusiasts.
              </p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-6"
              >
                <Button
                  className="group relative h-12 px-8 bg-gradient-to-r from-lime-600 to-lime-500 hover:from-lime-500 hover:to-lime-400 text-white text-sm font-bold uppercase tracking-widest rounded-full shadow-[0_0_25px_rgba(101,163,13,0.5)] hover:shadow-[0_0_40px_rgba(101,163,13,0.7)] hover:scale-105 transition-all border border-lime-400/30 overflow-hidden"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] z-0"></div>
                  <span className="relative z-10 flex items-center">
                    <MessageCircle className="mr-2 w-4 h-4 group-hover:rotate-12 transition-transform" />
                    Contact Us Today
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-12 px-8 border-2 border-gray-300 !text-gray-900 !bg-white hover:!bg-white hover:!border-lime-600 hover:!text-gray-900 text-sm font-bold uppercase tracking-widest rounded-full hover:scale-105 transition-all"
                  onClick={() => navigate('/catalog')}
                >
                  <Package className="mr-2 w-4 h-4" />
                  Browse Catalog
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Custom CSS for animations */}
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
