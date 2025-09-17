import { Link } from 'react-router-dom';
import { Package, Star, Phone, MessageCircle } from 'lucide-react';

const Footer = () => {
  return (
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
  );
};

export default Footer;