import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Target, 
  Users, 
  Lightbulb, 
  Shield, 
  HeadphonesIcon, 
  Handshake, 
  Leaf,
  Star,
  Calendar,
  TrendingUp,
  Award
} from 'lucide-react';

export default function AboutUs() {
  const missionPoints = [
    {
      number: "01",
      title: "Meet Customer Needs",
      description: "Provide a wide range of the latest and trending automotive accessories and decoration products, ensuring customer satisfaction with every purchase.",
      icon: Users,
      color: "bg-blue-500"
    },
    {
      number: "02", 
      title: "Innovation and Style",
      description: "Continuously monitor market trends and introduce forward-thinking products and technologies to ensure our offerings remain trendsetting.",
      icon: Lightbulb,
      color: "bg-purple-500"
    },
    {
      number: "03",
      title: "Quality Assurance", 
      description: "Implement a rigorous quality control system to guarantee that every product we offer meets high standards, earning customer trust through exceptional quality.",
      icon: Shield,
      color: "bg-green-500"
    },
    {
      number: "04",
      title: "Excellence in Customer Service",
      description: "Establish a customer-centric service philosophy that responds rapidly to customer needs, providing professional consultation and support to ensure customer satisfaction.",
      icon: HeadphonesIcon,
      color: "bg-orange-500"
    },
    {
      number: "05", 
      title: "Industry Collaboration",
      description: "Build strong partnerships to promote industry progress, share market information and resources, and achieve mutual benefits.",
      icon: Handshake,
      color: "bg-cyan-500"
    },
    {
      number: "06",
      title: "Social Responsibility",
      description: "Uphold sustainable development principles in our business operations by focusing on environmental protection and actively participating in community service to contribute positively to society.",
      icon: Leaf,
      color: "bg-emerald-500"
    }
  ];

  const stats = [
    { label: "Years in Business", value: "17+", icon: Calendar },
    { label: "Satisfied Partners", value: "500+", icon: Handshake },
    { label: "Product Categories", value: "100+", icon: Award },
    { label: "Market Growth", value: "25%", icon: TrendingUp }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-blue-500/20 text-blue-200 border-blue-400/30 text-sm px-4 py-2">
              <Building2 className="w-4 h-4 mr-2" />
              Established 2007
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Auto Lab Sdn Bhd
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
              Malaysia's Premier Car Accessories Wholesaler
            </p>
            <div className="flex justify-center items-center space-x-2 text-blue-200">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="ml-2 text-sm">Trusted by Industry Leaders</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <stat.icon className="w-8 h-8" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-blue-100 text-blue-700 border-blue-200">
                Our Story
              </Badge>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Car Accessories Wholesaler
              </h2>
            </div>
            
            <Card className="bg-white shadow-lg border-0">
              <CardContent className="p-8 md:p-12">
                <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
                  <p className="text-lg mb-6 first-line:text-xl first-line:font-semibold first-line:text-gray-900">
                    Founded in 2007, Auto Lab Sdn Bhd is a wholesale company specializing in automotive accessories. We are dedicated to providing our customers with the latest and most popular automotive accessories and decoration products, ensuring that we meet market demands and stay ahead of fashion trends.
                  </p>
                  <p className="text-lg">
                    Through exceptional product quality and outstanding customer service, we have established a solid reputation in the industry and built long-term partnerships with various retailers and distributors across Malaysia and beyond.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Vision Section */}
      <div className="py-20 bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-full mb-8">
              <Target className="w-10 h-10" />
            </div>
            <h2 className="text-4xl font-bold mb-8">Our Vision</h2>
            <p className="text-xl leading-relaxed text-blue-100">
              Our vision is to become a significant leader in the Malaysian aftermarket automotive sector, driving industry development through innovation, quality, and sustainability, while enhancing customers' driving experiences and establishing our brand identity.
            </p>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-purple-100 text-purple-700 border-purple-200">
                Our Mission
              </Badge>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                What Drives Us Forward
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Our mission is built on six fundamental pillars that guide everything we do
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {missionPoints.map((point, index) => (
                <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`flex-shrink-0 w-12 h-12 ${point.color} rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                        <point.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="text-2xl font-bold text-gray-300">{point.number}</span>
                          <h3 className="text-lg font-bold text-gray-900">{point.title}</h3>
                        </div>
                        <p className="text-gray-600 leading-relaxed">{point.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="py-20 bg-gradient-to-r from-slate-900 to-blue-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold mb-6">
              Ready to Partner With Us?
            </h2>
            <p className="text-xl text-blue-200 mb-8">
              Join hundreds of satisfied retailers and distributors who trust Auto Lab Sdn Bhd for their automotive accessory needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button className="group relative px-8 py-4 bg-white text-blue-900 font-semibold rounded-xl overflow-hidden shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-out">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-center">
                  <span className="mr-2">Contact Us Today</span>
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </button>
              <button className="group relative px-8 py-4 border-2 border-white text-white font-semibold rounded-xl overflow-hidden shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-out">
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-center group-hover:text-blue-900 transition-colors duration-300">
                  <svg className="w-5 h-5 mr-2 transform group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>View Our Catalog</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}