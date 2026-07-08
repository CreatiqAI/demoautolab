import { useRef } from 'react';
import { motion, Variants, useScroll, useTransform, useSpring, MotionValue } from 'framer-motion';
import { Shield, Users, BadgeCheck, ArrowRight, Zap, BatteryCharging, Lightbulb, MonitorSmartphone, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { CountUp, Magnetic } from '@/components/MotionBits';

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
    { year: "Today", title: "10+ partners", desc: "From boutique shops to major service centres nationwide." },
    { year: "2026", title: "12V switches on", desc: "Seventeen years of supply, one premium accessories brand." }
];

const STATS = [
    { to: 17, suffix: "+", label: "Years Experience" },
    { to: 10, suffix: "+", label: "Retail Partners" },
    { to: 10, suffix: "K+", label: "Products Supplied" },
    { to: 100, suffix: "%", label: "Vetted Quality" }
];

const VALUES = [
    { icon: Shield, title: "Integrity First", desc: "Honest pricing, honest recommendations — no upsell games." },
    { icon: BadgeCheck, title: "Quality Obsession", desc: "If we wouldn't fit it on our own cars, we don't sell it." },
    { icon: Users, title: "Partner Growth", desc: "We succeed when our merchants succeed. Their win is ours." }
];

const POWERS = [
    { icon: Lightbulb, label: "Lights", note: "LED & ambient" },
    { icon: MonitorSmartphone, label: "Screens", note: "Head units & cameras" },
    { icon: Volume2, label: "Sound", note: "Speakers & amps" }
];

/* A timeline node that fills lime + grows as the scroll progress reaches it. */
const NodeDot = ({ progress, at }: { progress: MotionValue<number>; at: number }) => {
    const backgroundColor = useTransform(progress, [at - 0.05, at], ['#d1d5db', '#84cc16']);
    const scale = useTransform(progress, [at - 0.05, at], [1, 1.5]);
    const boxShadow = useTransform(progress, [at - 0.05, at], ['0 0 0px 0px rgba(132,204,22,0)', '0 0 18px 3px rgba(132,204,22,0.5)']);
    return (
        <motion.span
            style={{ backgroundColor, scale, boxShadow }}
            className="block w-4 h-4 rounded-full ring-4 ring-[#F4F4F0]"
        />
    );
};

/* Scroll-scrubbed journey: a progress line draws across, a glow dot travels,
   nodes light up in sequence, and cards spring in. */
const JourneyTimeline = () => {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.55'] });
    const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });
    const fillWidth = useTransform(progress, [0, 1], ['0%', '100%']);

    return (
        <div ref={ref} className="relative max-w-5xl mx-auto">
            {/* Animated horizontal track (desktop) */}
            <div className="hidden md:block relative h-8 mb-4">
                <div aria-hidden className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 bg-gray-200 rounded-full"></div>
                <motion.div style={{ width: fillWidth }} className="absolute top-1/2 left-0 h-[2px] -translate-y-1/2 bg-lime-500 rounded-full origin-left">
                    <motion.span
                        aria-hidden
                        animate={{ scale: [1, 1.35, 1] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-lime-400 shadow-[0_0_18px_5px_rgba(132,204,22,0.55)]"
                    />
                </motion.div>
                <div className="absolute inset-0 grid grid-cols-3">
                    {MILESTONES.map((_, i) => (
                        <div key={i} className="flex items-center justify-center">
                            <NodeDot progress={progress} at={(i + 0.5) / MILESTONES.length} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Cards */}
            <div className="grid md:grid-cols-3 gap-6">
                {MILESTONES.map((m, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 44, scale: 0.95 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.7, delay: idx * 0.18, ease: EASE_OUT }}
                        whileHover={{ y: -8 }}
                        className="group relative rounded-3xl bg-white border border-gray-100 p-8 transition-shadow duration-300 hover:shadow-[0_28px_70px_-24px_rgba(0,0,0,0.22)]"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <motion.span
                                initial={{ scale: 0, rotate: -35 }}
                                whileInView={{ scale: 1, rotate: 0 }}
                                viewport={{ once: true }}
                                transition={{ type: 'spring', stiffness: 260, damping: 15, delay: 0.25 + idx * 0.18 }}
                                className="w-9 h-9 rounded-full bg-gray-900 text-lime-400 font-mono text-sm flex items-center justify-center shrink-0 transition-colors duration-300 group-hover:bg-lime-500 group-hover:text-gray-900"
                            >0{idx + 1}</motion.span>
                            <span className="flex-1 h-px bg-gray-100"></span>
                        </div>
                        <span className="font-heading font-black text-5xl text-gray-900 block mb-3 tracking-tight transition-colors duration-300 group-hover:text-lime-600">{m.year}</span>
                        <h3 className="text-gray-900 font-bold text-sm uppercase tracking-[0.2em] mb-2">{m.title}</h3>
                        <p className="text-gray-500 text-sm font-light leading-relaxed">{m.desc}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

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
                        style={{ WebkitTextStroke: '1.5px rgba(0,0,0,0.14)' }}
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
                            { img: "/hero/hero-side.jpg", label: "The machine", cls: "mt-10" },
                            { img: "/hero/prod-ambient.jpg", label: "The cabin", cls: "" },
                            { img: "/hero/casing%20socket.png", label: "The craft", cls: "mt-10" }
                        ].map((p, idx) => (
                            <div key={idx} className={`group relative rounded-3xl overflow-hidden aspect-[4/5] md:aspect-[4/3] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.2)] ${p.cls}`}>
                                <img src={p.img} alt={p.label} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent"></div>
                                <span className="absolute bottom-4 left-4 md:bottom-5 md:left-5 text-white text-[10px] md:text-xs font-semibold uppercase tracking-[0.25em]">{p.label}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ============ STORY (cinematic split) ============ */}
            <section className="relative bg-[#0B0B0C] text-white overflow-hidden">
                <div className="lg:grid lg:grid-cols-2 lg:items-stretch">
                    {/* Narrative panel */}
                    <div className="relative z-10 px-6 sm:px-10 lg:px-16 xl:px-24 py-20 md:py-24 flex items-center">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-80px" }}
                            variants={staggerContainer}
                            className="max-w-xl lg:ml-auto"
                        >
                            <motion.p variants={fadeInUp} className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-lime-400 font-semibold mb-7">
                                <span className="w-1.5 h-1.5 rounded-full bg-lime-400"></span>
                                From warehouse to brand
                            </motion.p>
                            <motion.h2 variants={fadeInUp} className="font-heading font-bold uppercase tracking-tight text-4xl sm:text-5xl lg:text-[3.4rem] leading-[0.98] mb-8">
                                12V didn't start<br className="hidden sm:block" /> as a brand. It started<br className="hidden sm:block" /> as a <span className="text-lime-400 italic">warehouse.</span>
                            </motion.h2>
                            <motion.div variants={fadeInUp} className="space-y-5 text-gray-400 text-base md:text-lg font-light leading-relaxed">
                                <p>
                                    It began in 2007 as <span className="text-white">Auto Lab Sdn Bhd</span> — a parts distribution
                                    centre in Cheras, Kuala Lumpur, quietly supplying accessories to workshops and retailers
                                    right across Malaysia.
                                </p>
                                <p>
                                    Seventeen years of sourcing and testing built a network we trust and an eye for what lasts.
                                    <span className="text-white"> 12V is that experience, meeting you directly — same warehouse,
                                    same engineers, a higher standard.</span>
                                </p>
                            </motion.div>
                            <motion.div variants={fadeInUp} className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3 font-mono text-[11px] uppercase tracking-widest text-gray-400">
                                <span><span className="text-lime-400">Est.</span> 2007</span>
                                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                <span>Cheras, KL</span>
                                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                <span><span className="text-lime-400">10+</span> Partners</span>
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* Cinematic render */}
                    <div className="relative h-[300px] sm:h-[420px] lg:h-auto">
                        <img
                            src="/hero/hero-static-night.jpg"
                            alt="12V — built on Auto Lab's heritage since 2007"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        {/* blend the render into the dark panel */}
                        <div aria-hidden className="hidden lg:block absolute inset-y-0 left-0 w-48 bg-gradient-to-r from-[#0B0B0C] to-transparent"></div>
                        <div aria-hidden className="lg:hidden absolute inset-0 bg-gradient-to-b from-[#0B0B0C] via-transparent to-[#0B0B0C]/70"></div>
                    </div>
                </div>
                {/* lime ambience */}
                <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 w-[560px] h-[320px] rounded-full bg-lime-500/10 blur-[130px]"></div>
            </section>

            {/* ============ WHAT 12V STANDS FOR (definition + power tiles) ============ */}
            <section className="py-24 md:py-32 bg-white">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-80px" }}
                        variants={staggerContainer}
                        className="max-w-3xl mx-auto text-center mb-16"
                    >
                        <motion.div variants={fadeInUp} className="flex justify-center mb-7">
                            <Magnetic strength={0.4}>
                                <motion.div
                                    whileHover={{ scale: 1.08 }}
                                    animate={{ scale: [1, 1.04, 1] }}
                                    transition={{ scale: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' } }}
                                    className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]"
                                >
                                    <BatteryCharging className="w-7 h-7 text-lime-400" />
                                </motion.div>
                            </Magnetic>
                        </motion.div>
                        <motion.p variants={fadeInUp} className="text-[11px] uppercase tracking-[0.4em] text-gray-400 font-semibold mb-5">What 12V stands for</motion.p>
                        <motion.h2 variants={fadeInUp} className="font-heading font-bold uppercase tracking-tight text-4xl md:text-5xl text-gray-900 leading-[1.05] mb-6">
                            One line powers <span className="text-lime-600">every car.</span>
                        </motion.h2>
                        <motion.p variants={fadeInUp} className="text-gray-500 text-lg font-light leading-relaxed max-w-2xl mx-auto">
                            Petrol, hybrid or fully electric — every vehicle runs a 12-volt system. It's the universal line
                            behind your lights, your screens and your sound. We build for the one thing every car shares.
                        </motion.p>
                    </motion.div>

                    <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
                        {POWERS.map((it, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.1, ease: EASE_OUT }}
                                className="group rounded-3xl border border-gray-100 bg-[#FAFAF8] p-8 text-center transition-[border-color,background-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-lime-400/60 hover:bg-white hover:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.2)]"
                            >
                                <div className="mx-auto w-12 h-12 rounded-full bg-white border border-gray-100 flex items-center justify-center mb-5 transition-colors duration-300 group-hover:bg-lime-500 group-hover:border-lime-500">
                                    <it.icon className="w-5 h-5 text-gray-900 transition-colors duration-300 group-hover:text-white" />
                                </div>
                                <h3 className="font-heading font-bold uppercase text-sm tracking-[0.15em] text-gray-900 mb-1">{it.label}</h3>
                                <p className="text-gray-400 text-xs font-light">{it.note}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ THE JOURNEY (timeline cards) ============ */}
            <section className="py-24 md:py-28 bg-[#F4F4F0]">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-80px" }}
                        variants={fadeInUp}
                        className="text-center mb-16"
                    >
                        <p className="text-[11px] uppercase tracking-[0.4em] text-gray-400 font-semibold mb-5">The journey</p>
                        <h2 className="font-heading font-bold uppercase tracking-tight text-4xl md:text-5xl text-gray-900">
                            Seventeen years, three chapters.
                        </h2>
                    </motion.div>
                    <JourneyTimeline />
                </div>
            </section>

            {/* ============ BY THE NUMBERS (dark stats band) ============ */}
            <section className="relative py-20 md:py-24 bg-[#0B0B0C] overflow-hidden">
                <div aria-hidden className="pointer-events-none absolute -top-20 right-1/4 w-[420px] h-[260px] rounded-full bg-lime-500/10 blur-[120px]"></div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-8">
                        {STATS.map((stat, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.08, ease: EASE_OUT }}
                                className="group text-center cursor-default"
                            >
                                <CountUp
                                    to={stat.to}
                                    suffix={stat.suffix}
                                    className="font-heading font-black text-5xl md:text-6xl text-white tracking-tight block transition-colors duration-300 group-hover:text-lime-400"
                                />
                                <div className="mx-auto my-3 h-[2px] w-8 bg-lime-500/40 transition-all duration-300 group-hover:w-12 group-hover:bg-lime-400"></div>
                                <div className="text-gray-400 text-[10px] md:text-xs uppercase tracking-[0.25em]">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ CORE VALUES (interactive list) ============ */}
            <section className="py-24 md:py-32 bg-white">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-80px" }}
                            variants={fadeInUp}
                            className="lg:col-span-4 lg:sticky lg:top-28 self-start"
                        >
                            <p className="text-[11px] uppercase tracking-[0.4em] text-gray-400 font-semibold mb-5">What we run on</p>
                            <h2 className="font-heading font-bold uppercase tracking-tight text-4xl md:text-5xl text-gray-900 leading-[1.05]">
                                Core values.
                            </h2>
                            <p className="text-gray-500 font-light mt-5 max-w-xs">
                                The standards behind every product line we put our name on.
                            </p>
                        </motion.div>
                        <div className="lg:col-span-8">
                            {VALUES.map((value, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: idx * 0.1, ease: EASE_OUT }}
                                    className="group flex items-start gap-5 md:gap-6 rounded-2xl px-4 md:px-5 py-7 border-t border-gray-100 last:border-b transition-colors duration-300 hover:bg-[#FAFAF8]"
                                >
                                    <span className="font-mono text-xs text-gray-300 pt-3 transition-colors duration-300 group-hover:text-lime-600">0{idx + 1}</span>
                                    <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center shrink-0 transition-colors duration-300 group-hover:bg-lime-500">
                                        <value.icon className="w-5 h-5 text-lime-400 transition-colors duration-300 group-hover:text-gray-900" />
                                    </div>
                                    <div className="flex-1 pt-0.5">
                                        <h3 className="font-heading font-bold uppercase tracking-tight text-xl md:text-2xl text-gray-900 mb-1 transition-transform duration-300 group-hover:translate-x-1">{value.title}</h3>
                                        <p className="text-gray-500 font-light leading-relaxed">{value.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ FOUNDER QUOTE (testimonial) ============ */}
            <section className="py-24 md:py-28 bg-[#F4F4F0]">
                <div className="container mx-auto px-6">
                    <motion.figure
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-80px" }}
                        variants={fadeInUp}
                        className="max-w-4xl mx-auto"
                    >
                        <span aria-hidden className="font-heading font-black text-6xl text-lime-500 leading-none block mb-4 select-none">&ldquo;</span>
                        <blockquote className="font-heading font-medium normal-case text-2xl sm:text-3xl md:text-[2.4rem] text-gray-900 leading-[1.3] tracking-tight">
                            We spent seventeen years making sure other people's shelves held the right parts.
                            <span className="text-gray-400"> 12V is us finally putting our own name on the standard we always kept.</span>
                        </blockquote>
                        <figcaption className="mt-9 flex items-center gap-4">
                            <span className="w-11 h-11 rounded-full bg-gray-900 text-lime-400 font-heading font-black text-sm flex items-center justify-center">AL</span>
                            <span className="text-xs font-mono uppercase tracking-widest text-gray-500">The founders · Auto Lab Sdn Bhd</span>
                        </figcaption>
                    </motion.figure>
                </div>
            </section>

            {/* ============ SUPPORTED BY + CTA ============ */}
            <section className="relative py-28 md:py-32 bg-[#0B0B0C] overflow-hidden">
                <motion.div
                    aria-hidden
                    animate={{ y: [0, -14, 0] }}
                    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-x-0 -bottom-20 flex justify-center pointer-events-none select-none"
                >
                    <span
                        className="font-heading font-black text-[28vw] leading-none text-transparent"
                        style={{ WebkitTextStroke: '1.2px rgba(255,255,255,0.09)' }}
                    >
                        12V
                    </span>
                </motion.div>
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
                            Every 12V product line is curated and vetted by Auto Lab.
                        </motion.p>
                        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Magnetic strength={0.4}>
                                <Button
                                    onClick={() => navigate('/catalog')}
                                    className="group h-14 px-10 rounded-full bg-white text-gray-900 hover:bg-lime-400 transition-colors duration-300 font-semibold tracking-wide text-sm active:scale-[0.98]"
                                >
                                    Shop the Catalog
                                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                                </Button>
                            </Magnetic>
                            <Magnetic strength={0.4}>
                                <Button
                                    onClick={() => navigate('/merchant-register')}
                                    variant="outline"
                                    className="h-14 px-10 rounded-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white transition-colors duration-300 font-semibold tracking-wide text-sm active:scale-[0.98]"
                                >
                                    Become a Merchant
                                </Button>
                            </Magnetic>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default About;
