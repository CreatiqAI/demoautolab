import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  RotateCcw
} from 'lucide-react';

export default function MyReturns() {
  const whatsappNumber = '60342977668';
  const whatsappMessage = encodeURIComponent(
    'Hi, I would like to check on my return/refund status.\n\nOrder No: '
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
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
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <RotateCcw className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 uppercase italic mb-3">
            My Returns
          </h1>
          <p className="text-gray-600">
            All returns and refunds are handled directly by our admin team.
            Contact us to check on your return status or submit a new request.
          </p>
        </div>

        {/* Contact options */}
        <div className="space-y-4">
          <a
            href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Card className="hover:shadow-md transition-all border-green-200 hover:border-green-400">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">Chat with Admin on WhatsApp</h3>
                  <p className="text-sm text-gray-500">Fastest way to check your return status</p>
                </div>
              </CardContent>
            </Card>
          </a>

          <a href="tel:+60342977668" className="block">
            <Card className="hover:shadow-md transition-all">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">Call Us: 03-4297 7668</h3>
                  <p className="text-sm text-gray-500">Mon-Fri, 9am-6pm</p>
                </div>
              </CardContent>
            </Card>
          </a>
        </div>

        {/* Link to submit new return */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 mb-3 text-sm">Need to submit a new return request?</p>
          <Link to="/return-request">
            <Button className="bg-lime-600 hover:bg-lime-700">
              <RotateCcw className="h-4 w-4 mr-2" />
              Request Return / Refund
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
