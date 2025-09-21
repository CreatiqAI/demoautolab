import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import { 
  Search, 
  Shield, 
  Truck, 
  ArrowRight,
  Star,
  Users,
  Package,
  CheckCircle,
  Building2,
  Target,
  Lightbulb,
  HeadphonesIcon,
  Handshake,
  Leaf,
  Calendar,
  TrendingUp,
  Award,
  ChevronDown,
  Play,
  Zap,
  Globe,
  MessageCircle,
  Phone,
  MapPin
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import heroImage from '@/assets/hero-automotive.jpg';

const Home = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState({});
  const navigate = useNavigate();
  const aboutRef = useRef(null);
  const aboutTopRef = useRef(null);
  const missionRef = useRef(null);

  // Smooth scrolling effect
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for animations
  useEffect(() => {
    const observers = [];
    const elements = document.querySelectorAll('[data-animate]');
    
    elements.forEach((element) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            element.classList.add('animate-in');
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(element);
      observers.push(observer);
    });

    return () => observers.forEach(obs => obs.disconnect());
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/catalog');
    }
  };

  const scrollToSection = (ref) => {
    if (ref.current) {
      const elementRect = ref.current.getBoundingClientRect();
      const absoluteElementTop = elementRect.top + window.pageYOffset;
      const middle = absoluteElementTop - (window.innerHeight / 6);

      window.scrollTo({
        top: middle,
        behavior: 'smooth'
      });
    }
  };

  const stats = [
    { label: "Years Experience", value: "17+", icon: Calendar, color: "from-blue-500 to-blue-600" },
    { label: "Business Partners", value: "500+", icon: Handshake, color: "from-green-500 to-green-600" },
    { label: "Product Categories", value: "100+", icon: Package, color: "from-purple-500 to-purple-600" },
    { label: "Happy Customers", value: "5000+", icon: Users, color: "from-orange-500 to-orange-600" }
  ];

  const features = [
    {
      icon: Shield,
      title: "Premium Quality",
      description: "Only genuine OEM and trusted aftermarket parts from reputable brands",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Truck,
      title: "Fast Delivery",
      description: "Same-day shipping across Klang Valley, nationwide delivery within 3-5 days",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Users,
      title: "Expert Support",
      description: "Our automotive experts help you find the right parts for your specific vehicle",
      color: "from-purple-500 to-violet-500"
    }
  ];

  const missionPoints = [
    {
      number: "01",
      title: "Meet Customer Needs",
      description: "Provide a wide range of the latest and trending automotive accessories and decoration products, ensuring customer satisfaction with every purchase.",
      icon: Users,
      color: "from-blue-500 to-blue-600"
    },
    {
      number: "02",
      title: "Innovation and Style",
      description: "Continuously monitor market trends and introduce forward-thinking products and technologies to ensure our offerings remain trendsetting.",
      icon: Lightbulb,
      color: "from-purple-500 to-purple-600"
    },
    {
      number: "03",
      title: "Quality Assurance",
      description: "Implement a rigorous quality control system to guarantee that every product we offer meets high standards, earning customer trust through exceptional quality.",
      icon: Shield,
      color: "from-green-500 to-green-600"
    },
    {
      number: "04",
      title: "Excellence in Customer Service",
      description: "Establish a customer-centric service philosophy that responds rapidly to customer needs, providing professional consultation and support to ensure customer satisfaction.",
      icon: HeadphonesIcon,
      color: "from-orange-500 to-orange-600"
    },
    {
      number: "05",
      title: "Industry Collaboration",
      description: "Build strong partnerships to promote industry progress, share market information and resources, and achieve mutual benefits.",
      icon: Handshake,
      color: "from-cyan-500 to-cyan-600"
    },
    {
      number: "06",
      title: "Social Responsibility",
      description: "Uphold sustainable development principles in our business operations by focusing on environmental protection and actively participating in community service to contribute positively to society.",
      icon: Leaf,
      color: "from-emerald-500 to-emerald-600"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-in {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .animate-in.from-left {
          animation: fadeInLeft 0.6s ease-out forwards;
        }
        
        .animate-in.from-right {
          animation: fadeInRight 0.6s ease-out forwards;
        }
        
        .animate-in.scale {
          animation: scaleIn 0.6s ease-out forwards;
        }
        
        [data-animate] {
          opacity: 0;
        }
        
        .parallax-bg {
          transform: translateY(0px);
        }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        }
        
        .glass-button {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .floating {
          animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .glass-effect {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-208px * 10));
          }
        }

        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
      `}</style>

      <SEOHead 
        title="Car Parts Malaysia | Auto Parts Kuala Lumpur | AUTO LABS"
        description="Premium car parts & automotive parts in Malaysia. Located in Cheras, KL. Honda, Toyota, brake pads, engine oil & more. Fast delivery. Call 03-4297 7668"
        keywords="car parts Malaysia, auto parts KL, automotive parts, brake pads, engine oil, Honda parts, Toyota parts, Cheras, Kuala Lumpur"
        canonical="https://autolabs.my/"
      />
      <Header />

      {/* Hero Section - Refined Glass Design */}
      <section className="relative h-[calc(95.5vh-4rem)] flex flex-col overflow-hidden">
        {/* Background Image with Minimal Overlay */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${heroImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: 'blur(6px)',
              transform: 'scale(1.05)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/5 to-white/20" />
        </div>

        {/* Subtle Floating Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-40 h-40 bg-white/5 rounded-full blur-2xl floating"></div>
          <div className="absolute bottom-20 left-20 w-32 h-32 bg-blue-400/10 rounded-full blur-xl floating" style={{animationDelay: '3s'}}></div>
        </div>

        {/* Main Hero Content */}
        <div className="relative z-10 flex-1 flex items-center">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto text-center">

              {/* Elegant Glass Card */}
              <div data-animate className="relative mb-0">
                {/* Multi-layer Glass Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-white/15 backdrop-blur-3xl rounded-[2rem] border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.1)]"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 via-transparent to-cyan-400/5 rounded-[2rem]"></div>

                {/* Content */}
                <div className="relative px-8 py-10 md:px-16 md:py-14">

                  {/* Hero Title */}
                  <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-none mb-6">
                    <span className="block">Auto Lab</span>
                    <span className="block bg-gradient-to-r from-blue-300 via-cyan-200 to-blue-100 bg-clip-text text-transparent">
                      Sdn Bhd
                    </span>
                  </h1>

                  {/* Elegant Tagline */}
                  <p className="text-xl md:text-2xl text-white/95 font-light leading-relaxed mb-10 max-w-4xl mx-auto">
                    Premier Car Accessories Wholesaler
                    <span className="block mt-2 text-lg md:text-xl text-white/80">
                      Automotive Excellence • Innovation • Quality
                    </span>
                  </p>

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-10 py-4 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-500 border-0 text-lg"
                      onClick={() => navigate('/catalog')}
                    >
                      <Package className="mr-2 w-5 h-5" />
                      Explore Catalog
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      className="bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 font-semibold px-10 py-4 rounded-full border-2 border-white/40 hover:border-white/60 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-500 text-lg"
                      onClick={() => scrollToSection(aboutTopRef)}
                    >
                      <Play className="mr-2 w-5 h-5" />
                      Discover More
                    </Button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trusted Partners Section - Bottom of First Screen */}
        <div className="relative z-10 pb-6">
          <div className="container mx-auto px-6">
            <div data-animate className="text-center mb-6">
              <p className="text-white/90 text-lg font-medium">
                Trusted by Leading Automotive Brands
              </p>
            </div>

            {/* Brands Container */}
            <div data-animate className="max-w-6xl mx-auto">
              {/* Infinite Horizontal Scrolling Carousel */}
              <div className="overflow-hidden py-6">
                <div className="flex space-x-12 w-max animate-scroll">
                  {/* Original sequence */}
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">HONDA</span>
                  </div>
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">TOYOTA</span>
                  </div>
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">NISSAN</span>
                  </div>
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">MAZDA</span>
                  </div>
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">PERODUA</span>
                  </div>
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">PROTON</span>
                  </div>
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">BMW</span>
                  </div>
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">MERCEDES</span>
                  </div>
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">AUDI</span>
                  </div>
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">LEXUS</span>
                  </div>

                  {/* Duplicate sequence for seamless loop */}
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">HONDA</span>
                  </div>
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">TOYOTA</span>
                  </div>
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">NISSAN</span>
                  </div>
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">MAZDA</span>
                  </div>
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">PERODUA</span>
                  </div>
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">PROTON</span>
                  </div>
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">BMW</span>
                  </div>
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">MERCEDES</span>
                  </div>
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">AUDI</span>
                  </div>
                  <div className="flex items-center justify-center w-32 h-16 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-300 hover:scale-105">
                    <span className="text-white/90 font-bold text-lg tracking-wide">LEXUS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Features Section with Interactive Cards */}
      <section className="py-20 bg-white relative">
        <div className="container mx-auto px-6">
          <div data-animate className="text-center space-y-4 mb-16">
            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
              Why Choose Us
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
              Experience the Difference
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're committed to providing the best automotive parts and service in Malaysia
            </p>
          </div>

          {/* Stats Section */}
          <div data-animate className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {stats.map((stat, index) => (
              <Card key={index} className="group glass-card hover:shadow-2xl transition-all duration-500 border-0 hover:-translate-y-4">
                <CardContent className="p-8 text-center">
                  <div className={`w-16 h-16 mx-auto mb-6 bg-gradient-to-r ${stat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mb-2">{stat.value}</div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                data-animate
                className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                <CardContent className="p-8 relative z-10">
                  <div className={`w-20 h-20 mx-auto mb-6 bg-gradient-to-r ${feature.color} rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-center">{feature.title}</h3>
                  <p className="text-gray-600 text-center leading-relaxed">{feature.description}</p>
                  <div className="flex justify-center mt-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section ref={aboutRef} className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 relative overflow-hidden">
        <div ref={aboutTopRef} className="absolute top-0 left-0"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.02)_1px,transparent_0)] bg-[length:40px_40px] opacity-50"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div data-animate className="text-center space-y-4 mb-16">
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
              <Building2 className="w-4 h-4 mr-2" />
              About Auto Lab
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold gradient-text">
              17 Years of Automotive Excellence
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Malaysia's Premier Car Accessories Wholesaler Since 2007
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
            <div data-animate className="from-left space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Founded in 2007</h3>
                    <p className="text-gray-600">Building Excellence for Over 17 Years</p>
                  </div>
                </div>
                
                <p className="text-lg text-gray-700 leading-relaxed">
                  Founded in 2007, Auto Lab Sdn Bhd is a wholesale company specializing in automotive accessories. We are dedicated to providing our customers with the latest and most popular automotive accessories and decoration products, ensuring that we meet market demands and stay ahead of fashion trends.
                </p>
                
                <p className="text-lg text-gray-700 leading-relaxed">
                  Through exceptional product quality and outstanding customer service, we have established a solid reputation in the industry and built long-term partnerships with various retailers and distributors across Malaysia.
                </p>
              </div>
            </div>

            <div data-animate className="from-right">
              <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white border-0 shadow-2xl">
                <CardContent className="p-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <Target className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold">Our Vision</h3>
                  </div>
                  <p className="text-lg leading-relaxed text-blue-50">
                    Our vision is to become a significant leader in the Malaysian aftermarket automotive sector, driving industry development through innovation, quality, and sustainability, while enhancing customers' driving experiences and establishing our brand identity.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section ref={missionRef} className="py-20 bg-white relative">
        <div className="container mx-auto px-6">
          <div data-animate className="text-center space-y-4 mb-16">
            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
              Our Mission
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
              Six Pillars of Excellence
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Fundamental principles that guide everything we do at Auto Lab
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {missionPoints.map((point, index) => (
              <Card 
                key={index} 
                data-animate
                className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-700 hover:-translate-y-3"
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${point.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                <CardContent className="p-8 relative z-10">
                  <div className="flex items-start space-x-4 mb-6">
                    <div className={`w-16 h-16 bg-gradient-to-r ${point.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <point.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-3">
                        <h3 className="text-xl font-bold text-gray-900">{point.title}</h3>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{point.description}</p>
                  
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_24%,rgba(255,255,255,0.05)_25%,rgba(255,255,255,0.05)_26%,transparent_27%,transparent_74%,rgba(255,255,255,0.05)_75%,rgba(255,255,255,0.05)_76%,transparent_77%)] bg-[length:40px_40px] opacity-20"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div data-animate className="text-center space-y-8 max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
              Ready to Partner with 
              <span className="gradient-text block mt-2">Malaysia's Best?</span>
            </h2>
            <p className="text-xl text-blue-100 leading-relaxed">
              Join hundreds of satisfied retailers and distributors who trust Auto Lab Sdn Bhd for their automotive accessory needs
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mt-12">
              <Button 
                size="lg" 
                className="glass-button text-white hover:bg-white/25 text-lg px-10 py-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-white/30"
              >
                <MessageCircle className="mr-3 w-5 h-5" />
                Contact Us Today
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="glass-button text-white hover:bg-white/25 text-lg px-10 py-4 rounded-full border border-white/30"
                onClick={() => navigate('/catalog')}
              >
                <Package className="mr-3 w-5 h-5" />
                Browse Catalog
              </Button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 mt-16 pt-16 border-t border-white/20">
              <div className="text-center">
                <Phone className="w-8 h-8 text-blue-400 mx-auto mb-4" />
                <h4 className="text-white font-semibold mb-2">Call Us</h4>
                <p className="text-blue-200">03-4297 7668</p>
              </div>
              <div className="text-center">
                <MapPin className="w-8 h-8 text-blue-400 mx-auto mb-4" />
                <h4 className="text-white font-semibold mb-2">Visit Us</h4>
                <p className="text-blue-200">Cheras, Kuala Lumpur</p>
              </div>
              <div className="text-center">
                <Globe className="w-8 h-8 text-blue-400 mx-auto mb-4" />
                <h4 className="text-white font-semibold mb-2">Online</h4>
                <p className="text-blue-200">24/7 Support</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-black text-white py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold">Auto Lab</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Malaysia's trusted destination for premium automotive parts and accessories since 2007.
              </p>
              <div className="flex gap-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-6 text-white">Quick Links</h4>
              <div className="space-y-3">
                <Link to="/catalog" className="block text-gray-400 hover:text-blue-400 transition-colors">Shop Parts</Link>
                <Link to="/about" className="block text-gray-400 hover:text-blue-400 transition-colors">About Us</Link>
                <Link to="/contact" className="block text-gray-400 hover:text-blue-400 transition-colors">Contact</Link>
                <Link to="/support" className="block text-gray-400 hover:text-blue-400 transition-colors">Support</Link>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-6 text-white">Customer Service</h4>
              <div className="space-y-3 text-gray-400">
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  03-4297 7668
                </p>
                <p className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  support@autolab.my
                </p>
                <p>Hours: Mon-Sat 9AM-6PM</p>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-6 text-white">Follow Us</h4>
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors cursor-pointer">
                    <span className="text-white font-bold text-sm">f</span>
                  </div>
                  <span className="text-gray-400 hover:text-blue-400 transition-colors cursor-pointer">Facebook</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center hover:from-purple-600 hover:to-pink-600 transition-all cursor-pointer">
                    <span className="text-white font-bold text-sm">@</span>
                  </div>
                  <span className="text-gray-400 hover:text-purple-400 transition-colors cursor-pointer">Instagram</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors cursor-pointer">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-gray-400 hover:text-green-400 transition-colors cursor-pointer">WhatsApp</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400">&copy; 2024 Auto Lab Sdn Bhd. All rights reserved. | Privacy Policy | Terms of Service</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;