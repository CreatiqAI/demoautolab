import { motion, Variants } from 'framer-motion';
import { Shield, Users, Package, Clock, Award } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';

const About = () => {
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

    return (
        <div className="min-h-screen bg-background font-sans">
            <SEOHead
                title="About Auto Lab | Premium Car Parts Distributor Malaysia"
                description="Learn about Auto Lab Sdn Bhd, Malaysia's trusted wholesale partner for automotive accessories since 2007. We supply premium quality parts to retailers nationwide."
                keywords="about auto lab, car parts distributor Malaysia, automotive wholesale, auto accessories supplier"
                canonical="https://autolabs.my/about"
            />
            <Header />

            {/* Hero Section */}
            <section className="relative py-32 bg-gray-900 overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=2000"
                        alt="Auto Lab Workshop"
                        className="w-full h-full object-cover opacity-30"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent"></div>
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={staggerContainer}
                        className="max-w-4xl mx-auto"
                    >
                        <motion.span variants={fadeInUp} className="text-lime-500 font-bold tracking-[0.2em] uppercase text-sm mb-4 block">
                            Since 2007
                        </motion.span>
                        <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-heading font-bold text-white mb-8 italic">
                            DRIVING <span className="text-lime-500">EXCELLENCE</span>
                        </motion.h1>
                        <motion.p variants={fadeInUp} className="text-xl text-gray-300 leading-relaxed font-light">
                            For over 17 years, Auto Lab has been the backbone of Malaysia's automotive aftermarket industry,
                            connecting premium manufacturers with passionate retailers.
                        </motion.p>
                    </motion.div>
                </div>
            </section>

            {/* Our Story */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <h2 className="text-4xl font-heading font-bold text-gray-900 mb-6 italic">
                                OUR <span className="text-lime-600">STORY</span>
                            </h2>
                            <div className="space-y-6 text-gray-600 text-lg leading-relaxed">
                                <p>
                                    Founded in Kuala Lumpur, Auto Lab began with a simple mission: to provide Malaysian car enthusiasts with access to high-quality, reliable automotive upgrades without the premium markup.
                                </p>
                                <p>
                                    What started as a small distribution center has grown into a nationwide network. Today, we serve over 500 active partners, ranging from boutique performance shops to major service centers.
                                </p>
                                <p>
                                    Our success is built on a foundation of technical expertise. We don't just move boxes; we understand every product we sell. Our team of automotive engineers rigorously tests new additions to our catalog to ensure they meet our strict standards for performance and durability.
                                </p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="relative"
                        >
                            <div className="grid grid-cols-2 gap-4">
                                <img src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=600" className="rounded-2xl shadow-lg mt-12" alt="Performance Parts" />
                                <img src="https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=600" className="rounded-2xl shadow-lg" alt="Warehouse" />
                            </div>
                            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-lime-50/50 rounded-full blur-3xl"></div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-20 bg-gray-900 border-y border-gray-800">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { number: "17+", label: "Years Experience", icon: Clock },
                            { number: "500+", label: "Retail Partners", icon: Users },
                            { number: "10k+", label: "Products Sold", icon: Package },
                            { number: "100%", label: "Satisfaction", icon: Award },
                        ].map((stat, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="text-center"
                            >
                                <div className="w-12 h-12 bg-lime-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <stat.icon className="w-6 h-6 text-lime-500" />
                                </div>
                                <div className="text-4xl font-heading font-bold text-white mb-2">{stat.number}</div>
                                <div className="text-gray-400 text-sm uppercase tracking-wider">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="py-24 bg-gray-50">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-heading font-bold text-gray-900 mb-4 italic">
                            CORE <span className="text-lime-600">VALUES</span>
                        </h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            These principles guide every decision we make and every partnership we build.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { title: "Integrity First", desc: "We believe in transparent pricing and honest recommendations. If a product isn't right for your needs, we'll tell you." },
                            { title: "Quality Obsession", desc: "We refuse to stock inferior components. Every item in our inventory is something we'd install on our own cars." },
                            { title: "Partner Growth", desc: "We succeed when our partners succeed. We provide marketing support and technical training to help our dealers thrive." }
                        ].map((value, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.2 }}
                                className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                            >
                                <div className="w-12 h-1 bg-lime-500 mb-6"></div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">{value.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{value.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default About;
