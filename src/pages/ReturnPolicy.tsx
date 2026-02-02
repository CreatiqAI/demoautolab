import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Truck,
  CreditCard,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';

export default function ReturnPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Back button */}
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-lime-700 mb-6 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Shop
        </Link>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-heading font-bold text-gray-900 uppercase italic mb-4">
            Return & Refund Policy
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We want you to be completely satisfied with your purchase. If you're not happy with your order,
            here's everything you need to know about our return process.
          </p>
        </div>

        {/* Quick summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-lime-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">7-Day Return Window</h3>
              <p className="text-sm text-gray-500">
                From the date of delivery
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CreditCard className="h-6 w-6 text-lime-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Full Refund</h3>
              <p className="text-sm text-gray-500">
                To original payment method
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Truck className="h-6 w-6 text-lime-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Free Return Shipping</h3>
              <p className="text-sm text-gray-500">
                For defective items
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed policy */}
        <div className="space-y-8">
          {/* Eligible returns */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                Eligible for Return
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-green-800">Defective or Damaged Products</h4>
                    <p className="text-sm text-green-700 mt-1">
                      If your product arrived damaged, is broken, or doesn't work properly, you can request a full refund.
                      Photos of the defect are required.
                    </p>
                    <p className="text-xs text-green-600 mt-2 font-medium">
                      Free return shipping provided
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-green-800">Wrong Item Received</h4>
                    <p className="text-sm text-green-700 mt-1">
                      If you received a different product than what you ordered, we'll make it right.
                      You can choose a refund or exchange for the correct item.
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Customer pays return shipping
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Not eligible */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <XCircle className="h-6 w-6 text-red-600" />
                Not Eligible for Return
              </h2>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-red-800">Change of Mind</h4>
                    <p className="text-sm text-red-700">
                      We do not accept returns simply because you changed your mind or no longer need the product.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-red-800">Past Return Window</h4>
                    <p className="text-sm text-red-700">
                      Items returned after the 7-day window will not be accepted.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-red-800">Items Not in Original Condition</h4>
                    <p className="text-sm text-red-700">
                      Products that have been installed, used, or modified cannot be returned.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Refund options */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-blue-600" />
                Refund Options
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Full Refund</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Refund will be processed to your original payment method.
                  </p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• FPX: 3-5 business days</li>
                    <li>• Credit/Debit Card: 5-10 business days</li>
                    <li>• E-wallets: 1-3 business days</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Exchange</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    We'll send you a replacement item once we receive the return.
                  </p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Same product replacement</li>
                    <li>• Ships within 2-3 business days</li>
                    <li>• Free shipping for exchange</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Process steps */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-6 w-6 text-purple-600" />
                How to Request a Return
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-lime-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Submit Return Request</h4>
                    <p className="text-sm text-gray-600">
                      Go to "My Orders", find your order, and click "Request Return". Select the items you want to return
                      and provide the reason with photos (for defective items).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-lime-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Wait for Approval</h4>
                    <p className="text-sm text-gray-600">
                      Our team will review your request within 1-2 business days. You'll receive a notification
                      once approved.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-lime-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Ship the Item Back</h4>
                    <p className="text-sm text-gray-600">
                      Pack the item securely and ship it to our return address. For defective items, we'll provide
                      a prepaid shipping label. Add your tracking number in "My Returns".
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-lime-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Receive Your Refund</h4>
                    <p className="text-sm text-gray-600">
                      Once we receive and inspect the item, your refund will be processed within 3-5 business days.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important notes */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
                Important Notes
              </h2>

              <ul className="space-y-2 text-sm text-amber-800">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">•</span>
                  Keep all original packaging until you're sure you don't need to return the item.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">•</span>
                  Return requests must be submitted within 7 days of delivery date.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">•</span>
                  Items must be returned in their original condition with all accessories and documentation.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">•</span>
                  We reserve the right to reject returns that don't meet our return criteria.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">•</span>
                  Shipping costs for wrong item returns are the customer's responsibility.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Contact section */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <HelpCircle className="h-6 w-6 text-blue-600" />
                Need Help?
              </h2>

              <p className="text-gray-600 mb-4">
                If you have any questions about our return policy or need assistance with a return,
                please don't hesitate to contact us.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Email Support</h4>
                  <p className="text-sm text-gray-600">support@autolabs.my</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Phone Support</h4>
                  <p className="text-sm text-gray-600">03-4297 7668</p>
                  <p className="text-xs text-gray-500">Mon-Fri, 9am-6pm</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            Ready to start a return?
          </p>
          <Link to="/my-orders">
            <Button className="bg-lime-600 hover:bg-lime-700">
              Go to My Orders
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
