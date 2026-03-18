import { Link } from 'react-router-dom';
import { Phone, MessageCircle, Mail, MapPin, Facebook, Instagram } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <img
                src="/autolab_logo.png"
                alt="Auto Lab"
                className="h-14 w-auto object-contain brightness-0 invert"
              />
            </div>
            <p className="text-gray-400 leading-relaxed text-sm">
              Malaysia's trusted destination for premium automotive parts and accessories since 2007. Quality OEM and aftermarket parts with fast delivery nationwide.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading text-sm font-bold uppercase tracking-widest text-white mb-6">Quick Links</h4>
            <div className="space-y-3">
              <Link to="/catalog" className="block text-gray-400 hover:text-lime-400 transition-colors text-sm">
                Shop Parts
              </Link>
              <Link to="/find-shops" className="block text-gray-400 hover:text-lime-400 transition-colors text-sm">
                Find Shops
              </Link>
              <Link to="/about" className="block text-gray-400 hover:text-lime-400 transition-colors text-sm">
                About Us
              </Link>
              <Link to="/merchant-register" className="block text-gray-400 hover:text-lime-400 transition-colors text-sm">
                Become a Merchant
              </Link>
            </div>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-heading text-sm font-bold uppercase tracking-widest text-white mb-6">Customer Service</h4>
            <div className="space-y-4">
              <a href="tel:0342977668" className="flex items-center gap-3 text-gray-400 hover:text-lime-400 transition-colors text-sm">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                03-4297 7668
              </a>
              <a href="mailto:support@autolab.my" className="flex items-center gap-3 text-gray-400 hover:text-lime-400 transition-colors text-sm">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                support@autolab.my
              </a>
              <div className="flex items-center gap-3 text-gray-400 text-sm">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                Cheras, Kuala Lumpur
              </div>
              <p className="text-gray-500 text-xs pl-11">Hours: Mon-Sat 9AM-6PM</p>
            </div>
          </div>

          {/* Follow Us */}
          <div>
            <h4 className="font-heading text-sm font-bold uppercase tracking-widest text-white mb-6">Follow Us</h4>
            <div className="space-y-4">
              <a href="#" className="flex items-center gap-3 text-gray-400 hover:text-lime-400 transition-colors text-sm">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                  <Facebook className="w-4 h-4" />
                </div>
                Facebook
              </a>
              <a href="#" className="flex items-center gap-3 text-gray-400 hover:text-lime-400 transition-colors text-sm">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                  <Instagram className="w-4 h-4" />
                </div>
                Instagram
              </a>
              <a href="#" className="flex items-center gap-3 text-gray-400 hover:text-lime-400 transition-colors text-sm">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              &copy; 2026 Auto Lab Sdn Bhd. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/privacy" className="text-gray-500 hover:text-lime-400 transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-gray-500 hover:text-lime-400 transition-colors">
                Terms of Service
              </Link>
              <Link to="/return-policy" className="text-gray-500 hover:text-lime-400 transition-colors">
                Return Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
