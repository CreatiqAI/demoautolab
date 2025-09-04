import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import { 
  Search, 
  Zap, 
  Shield, 
  Truck, 
  ArrowRight,
  Star,
  Users,
  Package,
  CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from '@/assets/hero-automotive.jpg';

const Home = () => {

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-white overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="AutoMot Hub - Car Parts Store"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-black space-y-6">
              <Badge className="bg-gray-800 text-white">
                Malaysia's #1 Car Parts Store
              </Badge>
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight text-black">
                Premium Car Parts
                <br />
                <span className="text-gray-700">Delivered Fast</span>
              </h1>
              <p className="text-lg text-black/90 max-w-lg">
                Quality automotive parts for all makes and models. From brake pads to engine components, 
                we've got everything you need to keep your vehicle running smoothly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="default" size="xl" asChild>
                  <Link to="/catalog">Browse Categories</Link>
                </Button>
              </div>
            </div>

            {/* Hero Features */}
            <div className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-white/90 backdrop-blur border-gray-200">
                  <CardContent className="p-6 text-center text-black">
                    <Zap className="h-8 w-8 mx-auto mb-2 text-gray-700" />
                    <h3 className="font-semibold">Fast Delivery</h3>
                    <p className="text-sm opacity-90">Same day shipping</p>
                  </CardContent>
                </Card>
                <Card className="bg-white/90 backdrop-blur border-gray-200">
                  <CardContent className="p-6 text-center text-black">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-gray-700" />
                    <h3 className="font-semibold">Quality Parts</h3>
                    <p className="text-sm opacity-90">OEM & premium brands</p>
                  </CardContent>
                </Card>
              </div>
              <Card className="bg-white/90 backdrop-blur border-gray-200">
                <CardContent className="p-6 text-center text-black">
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-700">10,000+</div>
                      <div className="text-sm opacity-90">Parts Available</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-700">5,000+</div>
                      <div className="text-sm opacity-90">Happy Customers</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Search Bar Section */}
      <section className="py-12 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-2xl font-bold text-black">
              Find the Right Parts for Your Vehicle
            </h2>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input 
                  placeholder="Search by part name, brand, or vehicle model..." 
                  className="pl-12 h-14 text-lg border-gray-300"
                />
              </div>
              <Button variant="default" size="xl">
                Search
              </Button>
            </div>
            <p className="text-gray-600">
              Try searching: "brake pads", "oil filter", "Honda Civic", "Toyota Camry"
            </p>
          </div>
        </div>
      </section>



      {/* Why Choose Us */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold text-foreground">Why Choose Autolab?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We're committed to providing the best automotive parts and service in Malaysia
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-accent rounded-full flex items-center justify-center">
                  <Shield className="h-8 w-8 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Premium Quality</h3>
                <p className="text-muted-foreground">
                  Only genuine OEM and trusted aftermarket parts from reputable brands
                </p>
                <div className="flex justify-center mt-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-accent rounded-full flex items-center justify-center">
                  <Truck className="h-8 w-8 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Fast Delivery</h3>
                <p className="text-muted-foreground">
                  Same-day shipping across Klang Valley, nationwide delivery within 3-5 days
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">Free shipping over RM 200</span>
                </div>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-accent rounded-full flex items-center justify-center">
                  <Users className="h-8 w-8 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Expert Support</h3>
                <p className="text-muted-foreground">
                  Our automotive experts help you find the right parts for your specific vehicle
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">24/7 customer service</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gray-900">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto text-white space-y-6">
            <h2 className="text-3xl font-bold">
              Ready to Get Your Car Back on the Road?
            </h2>
            <p className="text-lg opacity-90">
              Join thousands of satisfied customers who trust Autolab for their automotive parts needs
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted text-muted-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-hero rounded-lg">
                  <Package className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">Autolab</span>
              </div>
              <p className="text-sm opacity-80 mb-4">
                Malaysia's trusted destination for premium automotive parts and accessories.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2 text-sm">
                <Link to="/catalog" className="block hover:text-primary transition-fast">Shop Parts</Link>
                <Link to="/contact" className="block hover:text-primary transition-fast">Contact</Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Customer Service</h4>
              <div className="space-y-2 text-sm">
                <p>Phone: +60 3-1234 5678</p>
                <p>Email: support@autolab.my</p>
                <p>Hours: Mon-Sat 9AM-6PM</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Follow Us</h4>
              <div className="flex gap-4">
                <Button variant="ghost" size="sm">Facebook</Button>
                <Button variant="ghost" size="sm">Instagram</Button>
                <Button variant="ghost" size="sm">WhatsApp</Button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border/20 mt-8 pt-8 text-center text-sm opacity-80">
            <p>&copy; 2024 Autolab. All rights reserved. | Privacy Policy | Terms of Service</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;