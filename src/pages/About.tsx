import { motion, Variants } from 'framer-motion';
import { Shield, Users, BadgeCheck, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } }
};

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
};

const MILESTONES = [
    { year: "2007", title: "Auto Lab is founded", desc: "A parts distribution centre opens in Cheras, KL." },
    { year: "Today", title: "500+ partners", desc: "From boutique shops to major service centres nationwide." },
    { year: "2026", title: "12V switches on", desc: "Seventeen years of supply, one premium accessories brand." }
];

const STATS = [
    { number: "17+", label: "Years Experience" },
    { number: "500+", label: "Retail Partners" },
    { number: "10K+", label: "Products Supplied" },
    { number: "24H", label: "Dispatch Window" }
];

const VALUES = [
    { icon: Shield, title: "Integrity First", desc: "Honest pricing, honest recommendations." },
    { icon: BadgeCheck, title: "Quality Obsession", desc: "If we wouldn't fit it on our own cars, we don't sell it." },
    { icon: Users, title: "Partner Growth", desc: "We succeed when our merchants succeed." }
];

const About = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-[#FAFAF8] font-sans text-gray-900 overflow-x-hidden">
            <SEOHead
                title="About 12V | Premium Car Accessories — Supported by Auto Lab"
                description="12V is a premium car accessories brand — Ninja Shades, Android players, casings and lighting — supported by Auto Lab Sdn Bhd, Cheras KL, since 2007."
                keywords="about 12V, Auto Lab, car accessories Malaysia, ninja shades, android player"
                canonical="https://autolabs.my/about"
            />
            <Header />

            {/* ============ HERO ============ */}
            <section className="relative pt-40 pb-24 md:pt-48 md:pb-28 bg-[#FAFAF8] overflow-hidden">
                <div aria-hidden className="absolute inset-x-0 top-10 flex justify-center pointer-events-none select-none">
                    <span
                        className="font-heading font-black text-[42vw] leading-none text-transparent"
                        style={{ WebkitTextStroke: '1px rgba(0,0,0,0.05)' }}
                    >
                        12V
                    </span>
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
                        <motion.p variants={fadeInUp} className="text-[11px] uppercase tracking-[0.4em] text-gray-400 font-semibold mb-8">
                            The story behind the name
                        </motion.p>
                        <motion.h1 variants={fadeInUp} className="font-heading font-black uppercase tracking-tighter leading-[0.92] text-5xl sm:text-6xl md:text-8xl text-gray-900 mb-8">
                            Every car runs on <br />
                            <span className="text-gray-300">twelve volts.</span>
                        </motion.h1>
                        <motion.p variants={fadeInUp} className="text-gray-500 text-lg font-light max-w-xl mx-auto">
                            Petrol, hybrid or EV — the 12-volt system is the one constant in every vehicle.
                            That's the standard we named ourselves after.
                        </motion.p>
                    </motion.div>
                </div>
            </section>

            {/* ============ PHOTO BAND ============ */}
            <section className="pb-8 bg-[#FAFAF8]">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: EASE_OUT }}
                        className="grid grid-cols-3 gap-4 md:gap-6"
                    >
                        {[
                            { img: "https://images.unsplash.com/photo-1526726538690-5cbf956ae2fd?auto=format&fit=crop&q=80&w=900", cls: "mt-10" },
                            { img: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=900", cls: "" },
                            { img: "https://images.unsplash.com/photo-1537984822441-cff330075342?auto=format&fit=crop&q=80&w=900", cls: "mt-10" }
                        ].map((p, idx) => (
                            <div key={idx} className={`rounded-3xl overflow-hidden aspect-[4/5] md:aspect-[4/3] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.2)] ${p.cls}`}>
                                <img src={p.img} alt="12V" className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ============ STORY ============ */}
            <section className="py-24 md:py-32 bg-white">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-12 gap-10">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-80px" }}
                            variants={fadeInUp}
                            className="lg:col-span-4"
                        >
                            <p className="text-[11px] uppercase tracking-[0.4em] text-gray-400 font-semibold">
                                From warehouse to brand
                            </p>
                        </motion.div>
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-80px" }}
                            variants={fadeInUp}
                            className="lg:col-span-8"
                        >
                            <h2 className="font-heading font-bold uppercase tracking-tight text-3xl sm:text-4xl md:text-5xl leading-[1.1] text-gray-300 max-w-3xl">
                                12V didn't start as a brand. It started in 2007 as
                                <span className="text-gray-900"> Auto Lab Sdn Bhd</span> — a parts distributor in Cheras
                                that grew into <span className="text-gray-900">500+ partners nationwide</span>.
                                12V is that operation, refined into one accessories brand:
                                <span className="text-lime-700"> same warehouse, same engineers, higher standard.</span>
                            </h2>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ============ MILESTONES ============ */}
            <section className="py-24 bg-[#F4F4F0]">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-3 gap-10 md:gap-8 max-w-5xl mx-auto">
                        {MILESTONES.map((m, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: idx * 0.1, ease: EASE_OUT }}
                                className="relative pt-8"
                            >
                                <div className="absolute top-0 left-0 w-10 h-[3px] bg-lime-500"></div>
                                <span className="font-heading font-black text-5xl text-gray-900 block mb-3 tracking-tight">{m.year}</span>
                                <h3 className="text-gray-900 font-bold text-sm uppercase tracking-[0.2em] mb-2">{m.title}</h3>
                                <p className="text-gray-500 text-sm font-light leading-relaxed max-w-[260px]">{m.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ STATS ============ */}
            <section className="py-20 bg-white border-b border-gray-100">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                        {STATS.map((stat, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.08, ease: EASE_OUT }}
                                className="text-center"
                            >
                                <div className="font-heading font-black text-5xl md:text-6xl text-gray-900 mb-2 tracking-tight">{stat.number}</div>
                                <div className="text-gray-400 text-[10px] md:text-xs uppercase tracking-[0.25em]">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ VALUES ============ */}
            <section className="py-24 md:py-28 bg-white">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-80px" }}
                        variants={fadeInUp}
                        className="text-center mb-14"
                    >
                        <p className="text-[11px] uppercase tracking-[0.4em] text-gray-400 font-semibold mb-5">What we run on</p>
                        <h2 className="font-heading font-bold uppercase tracking-tight text-4xl md:text-5xl text-gray-900">
                            Core values.
                        </h2>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
                        {VALUES.map((value, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.55, delay: idx * 0.1, ease: EASE_OUT }}
                                className="rounded-3xl bg-[#FAFAF8] border border-gray-100 p-9 hover:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] transition-shadow duration-300"
                            >
                                <div className="w-11 h-11 rounded-full bg-gray-900 flex items-center justify-center mb-6">
                                    <value.icon className="w-5 h-5 text-lime-400" />
                                </div>
                                <h3 className="font-heading font-bold uppercase tracking-tight text-xl text-gray-900 mb-2">{value.title}</h3>
                                <p className="text-gray-500 font-light text-sm leading-relaxed">{value.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ SUPPORTED BY + CTA ============ */}
            <section className="relative py-28 md:py-32 bg-[#0B0B0C] overflow-hidden">
                <div aria-hidden className="absolute inset-x-0 -bottom-20 flex justify-center pointer-events-none select-none">
                    <span
                        className="font-heading font-black text-[28vw] leading-none text-transparent"
                        style={{ WebkitTextStroke: '1px rgba(255,255,255,0.06)' }}
                    >
                        12V
                    </span>
                </div>
                <div className="container mx-auto px-6 relative z-10 text-center">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={staggerContainer}
                    >
                        <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 mb-8">
                            <Zap className="w-4 h-4 text-lime-400" />
                            <span className="text-[11px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
                                Supported by Auto Lab Sdn Bhd · Cheras, KL
                            </span>
                        </motion.div>
                        <motion.h2 variants={fadeInUp} className="font-heading font-black uppercase tracking-tighter text-4xl sm:text-5xl md:text-6xl text-white mb-6 leading-[0.95]">
                            Same team since 2007. <br />
                            <span className="text-lime-400 italic">New name on the box.</span>
                        </motion.h2>
                        <motion.p variants={fadeInUp} className="text-gray-400 text-lg font-light mb-11 max-w-md mx-auto">
                            Every 12V order is picked, packed and dispatched by Auto Lab.
                        </motion.p>
                        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button
                                onClick={() => navigate('/catalog')}
                                className="group h-14 px-10 rounded-full bg-white text-gray-900 hover:bg-lime-400 transition-colors duration-300 font-semibold tracking-wide text-sm active:scale-[0.98]"
                            >
                                Shop the Catalog
                                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                            </Button>
                            <Button
                                onClick={() => navigate('/merchant-register')}
                                variant="outline"
                                className="h-14 px-10 rounded-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white transition-colors duration-300 font-semibold tracking-wide text-sm active:scale-[0.98]"
                            >
                                Become a Merchant
                            </Button>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default About;
