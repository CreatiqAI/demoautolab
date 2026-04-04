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
    <div className="bg-gray-50 flex flex-col">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 max-w-2xl min-h-[calc(100vh-80px)]">
        <Link
          to="/my-orders"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Orders
        </Link>

        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">My Returns</h2>
          <p className="text-sm text-muted-foreground">
            All returns and refunds are handled by our admin team. Contact us to check your status or submit a new request.
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
                  <h3 className="font-semibold text-sm text-gray-900">Chat with Admin on WhatsApp</h3>
                  <p className="text-sm text-muted-foreground">Fastest way to check your return status</p>
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
                  <h3 className="font-semibold text-sm text-gray-900">Call Us: 03-4297 7668</h3>
                  <p className="text-sm text-muted-foreground">Mon-Fri, 9am-6pm</p>
                </div>
              </CardContent>
            </Card>
          </a>
        </div>

        {/* Link to submit new return */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">Need to submit a new return request?</p>
          <Link to="/return-request">
            <Button>
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
