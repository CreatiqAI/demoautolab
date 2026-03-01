import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  Mail,
  Clock,
  Shield,
  Package,
  AlertTriangle
} from 'lucide-react';

export default function ReturnRequest() {
  const whatsappNumber = '60342977668';
  const whatsappMessage = encodeURIComponent(
    'Hi, I would like to request a return/refund for my order. My order details:\n\nOrder No: \nReason: '
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        {/* Back button */}
        <Link
          to="/my-orders"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-lime-700 mb-6 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Orders
        </Link>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-lime-600" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 uppercase italic mb-3">
            Return & Refund
          </h1>
          <p className="text-gray-600 max-w-lg mx-auto">
            For all returns and refunds, please contact our admin team directly.
            We'll handle your request personally to ensure the best resolution.
          </p>
        </div>

        {/* Contact Admin Card */}
        <Card className="mb-6 border-2 border-lime-200 bg-lime-50/50">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
              Contact Us for Returns
            </h2>

            <div className="grid gap-4 md:grid-cols-2 mb-6">
              {/* WhatsApp - Primary */}
              <a
                href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="p-5 bg-green-50 border-2 border-green-200 rounded-xl hover:border-green-400 hover:shadow-md transition-all text-center group">
                  <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <MessageCircle className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-bold text-green-800 text-lg mb-1">WhatsApp</h3>
                  <p className="text-sm text-green-700 font-medium">Fastest Response</p>
                  <p className="text-xs text-green-600 mt-2">Tap to chat with us</p>
                </div>
              </a>

              {/* Phone */}
              <a href="tel:+60342977668" className="block">
                <div className="p-5 bg-blue-50 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all text-center group">
                  <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Phone className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-bold text-blue-800 text-lg mb-1">Call Us</h3>
                  <p className="text-sm text-blue-700 font-medium">03-4297 7668</p>
                  <p className="text-xs text-blue-600 mt-2">Mon-Fri, 9am-6pm</p>
                </div>
              </a>
            </div>

            {/* Email */}
            <a
              href="mailto:support@autolab.my?subject=Return%20Request&body=Order%20No%3A%20%0AReason%3A%20"
              className="block w-full"
            >
              <div className="p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:shadow-sm transition-all flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="h-6 w-6 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">Email Support</h3>
                  <p className="text-sm text-gray-600">support@autolab.my</p>
                </div>
                <span className="text-xs text-gray-400">Reply within 24hrs</span>
              </div>
            </a>
          </CardContent>
        </Card>

        {/* What to prepare */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-lime-600" />
              When Contacting Us, Please Prepare:
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="w-6 h-6 bg-lime-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-medium text-gray-800">Your Order Number</p>
                  <p className="text-sm text-gray-500">Found in your order history or confirmation email</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="w-6 h-6 bg-lime-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-medium text-gray-800">Reason for Return</p>
                  <p className="text-sm text-gray-500">Defective product, wrong item received, etc.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="w-6 h-6 bg-lime-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-medium text-gray-800">Photos of the Issue</p>
                  <p className="text-sm text-gray-500">Take clear photos showing the defect or wrong item</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Policy summary */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Return Policy Summary
            </h3>
            <ul className="space-y-2 text-sm text-amber-800">
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
                Returns accepted within 7 days of delivery
              </li>
              <li className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-600 flex-shrink-0" />
                Only for defective or wrong items (no change of mind)
              </li>
              <li className="flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-600 flex-shrink-0" />
                Items must be in original condition
              </li>
            </ul>
            <Link to="/return-policy" className="inline-block mt-4">
              <Button variant="outline" size="sm" className="border-amber-300 text-amber-800 hover:bg-amber-100">
                View Full Return Policy
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
